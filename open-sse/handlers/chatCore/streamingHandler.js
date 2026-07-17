import { FORMATS } from "../../translator/formats.js";
import { needsTranslation } from "../../translator/index.js";
import { createSSETransformStreamWithLogger, createPassthroughStreamWithLogger } from "../../utils/stream.js";
import { pipeWithDisconnect } from "../../utils/streamHandler.js";
import { PROVIDERS } from "../../config/providers.js";
import { STREAM_STALL_TIMEOUT_MS, HTTP_STATUS } from "../../config/runtimeConfig.js";
import { createErrorResult } from "../../utils/error.js";
import { buildAbortedResponsesTerminalBytes } from "../../utils/responsesStreamHelpers.js";
import { buildRequestDetail, extractRequestConfig, saveUsageStats, formatDoneLine } from "./requestDetail.js";
import { saveRequestDetail } from "@/lib/usageDb.js";
import { SSE_HEADERS_CORS as SSE_HEADERS } from "../../utils/sseConstants.js";

// Codex returns Responses API SSE → which client format to translate INTO, by request sourceFormat.
// Gemini-family all map to ANTIGRAVITY decoder; unknown sources fall back to OPENAI.
const CODEX_SOURCE_TO_TARGET = {
  [FORMATS.OPENAI_RESPONSES]: FORMATS.OPENAI_RESPONSES,
  [FORMATS.CLAUDE]: FORMATS.CLAUDE,
  [FORMATS.ANTIGRAVITY]: FORMATS.ANTIGRAVITY,
  [FORMATS.GEMINI]: FORMATS.ANTIGRAVITY,
  [FORMATS.GEMINI_CLI]: FORMATS.ANTIGRAVITY,
};

/**
 * Determine which SSE transform stream to use based on provider/format.
 */
function buildTransformStream({ provider, sourceFormat, targetFormat, userAgent, reqLogger, toolNameMap, model, connectionId, body, onStreamComplete, apiKey }) {
  const isDroidCLI = userAgent?.toLowerCase().includes("droid") || userAgent?.toLowerCase().includes("codex-cli");
  // Responses-API providers (e.g. codex) emit Responses SSE → translate into client format
  const isResponsesProvider = PROVIDERS[provider]?.format === FORMATS.OPENAI_RESPONSES;
  const needsCodexTranslation = isResponsesProvider && targetFormat === FORMATS.OPENAI_RESPONSES && !isDroidCLI;

  if (needsCodexTranslation) {
    const codexTarget = CODEX_SOURCE_TO_TARGET[sourceFormat] || FORMATS.OPENAI;
    return createSSETransformStreamWithLogger(FORMATS.OPENAI_RESPONSES, codexTarget, provider, reqLogger, toolNameMap, model, connectionId, body, onStreamComplete, apiKey);
  }

  if (needsTranslation(targetFormat, sourceFormat)) {
    return createSSETransformStreamWithLogger(targetFormat, sourceFormat, provider, reqLogger, toolNameMap, model, connectionId, body, onStreamComplete, apiKey);
  }

  return createPassthroughStreamWithLogger(provider, reqLogger, model, connectionId, body, onStreamComplete, apiKey);
}

// Patterns that mark a streamed SSE chunk as carrying real output (text / tool / reasoning).
// Intentionally broad across OpenAI / Claude / Gemini / Responses formats: it is safer to
// over-detect output (skip the empty-fallback) than to false-flag a valid response as empty.
const SSE_OUTPUT_PATTERNS = [
  /"content"\s*:\s*"[^"]/",            // OpenAI delta.content (>=1 char)
  /"reasoning_content"\s*:\s*"[^"]/", // OpenAI / generic reasoning
  /"tool_calls"\s*:\s*\[./,           // OpenAI tool_calls (non-empty array)
  /"text_delta"/,                     // Claude text
  /"thinking_delta"/,                 // Claude thinking
  /"input_json_delta"/,               // Claude tool input
  /"content_block_start"[\s\S]{0,80}"tool_use"/, // Claude tool-use block
  /"output_text"\s*:\s*"[^"]/",      // Responses API text
  /"function_call_arguments"\s*:\s*"/, // Responses tool args
  /"functionCall"\s*:/,               // Gemini function call
  /"parts"\s*:\s*\[[\s\S]{0,60}"text"\s*:/, // Gemini text part
];

function sseTextHasOutput(text) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    for (const re of SSE_OUTPUT_PATTERNS) if (re.test(payload)) return true;
  }
  return false;
}

// First-token buffering: read the (client-format) stream until real output appears,
// the stream ends, or a safety cap is hit. Returns { empty, reader, chunks, ended }.
// Never throws — on any failure returns empty:false so the caller streams normally.
async function bufferUntilOutputOrEnd(stream, { maxBytes = 1048576, maxMs = 30000 } = {}) {
  let reader;
  try { reader = stream.getReader(); }
  catch { return { empty: false, reader: null, chunks: [] }; }
  const decoder = new TextDecoder();
  const chunks = [];
  let textBuf = "";
  let totalBytes = 0;
  const start = Date.now();
  try {
    while (true) {
      if (totalBytes >= maxBytes || Date.now() - start > maxMs) {
        return { empty: false, reader, chunks }; // safety cap → keep streaming
      }
      const { done, value } = await reader.read();
      if (done) {
        return { empty: !sseTextHasOutput(textBuf), reader, chunks, ended: true };
      }
      chunks.push(value);
      totalBytes += value.length;
      textBuf += decoder.decode(value, { stream: true });
      if (sseTextHasOutput(textBuf)) return { empty: false, reader, chunks };
    }
  } catch (e) {
    return { empty: false, reader, chunks, error: e };
  }
}

/**
 * Handle streaming response — pipe provider SSE through transform stream to client.
 */
export async function handleStreamingResponse({ providerResponse, provider, model, sourceFormat, targetFormat, userAgent, body, stream, translatedBody, finalBody, requestStartTime, connectionId, apiKey, clientRawRequest, onRequestSuccess, reqLogger, toolNameMap, streamController, onStreamComplete, streamDetailId, pxpipe, reqTag, log }) {
  if (onRequestSuccess) {
    Promise.resolve()
      .then(onRequestSuccess)
      .catch(err => {
        console.error("[ChatCore] onRequestSuccess failed:", err?.message || err);
      });
  }

  // When upstream returns HTML/text instead of SSE (e.g. Cloudflare 5xx error
  // page), piping it through the SSE transform stream causes Next.js
  // "failed to pipe response" and crashes the chat router. Read the body,
  // pull a short human-readable message from the <title>, sanitize it, and
  // return a clean JSON error instead. The message is stripped of HTML tags
  // and clamped so untrusted upstream text never reaches the client verbatim
  // (the UI may render error.message as HTML).
  const upstreamContentType = (providerResponse.headers.get('content-type') || '').toLowerCase();
  if (upstreamContentType && !upstreamContentType.includes('text/event-stream') && !upstreamContentType.includes('application/json')) {
    const bodyText = await providerResponse.text().catch(() => '');
    const titleMatch = bodyText.match(/<title>([^<]+)<\/title>/i);
    const sanitizedTitle = (titleMatch?.[1] || '').replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, 160);
    const shortMsg = sanitizedTitle
      || (bodyText.length < 200 ? bodyText.replace(/<[^>]*>/g, '').trim().slice(0, 160) : `Upstream returned non-SSE response (${upstreamContentType})`);
    const status = providerResponse.status || 502;
    if (log?.errorLine) log.errorLine(reqTag, "✗", `BLOCKED ${status} · ${provider}/${model} · non-SSE (${upstreamContentType})\n    ${shortMsg}`);
    else console.warn(`[STREAM] ${provider} | ${model} | blocked pipe: ${shortMsg} [${status}]`);
    streamController?.handleError?.(new Error(`upstream non-SSE: ${status}`));
    return {
      success: false,
      response: new Response(JSON.stringify({ error: { message: `[${status}]: ${shortMsg}` } }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }),
    };
  }

  const transformStream = buildTransformStream({ provider, sourceFormat, targetFormat, userAgent, reqLogger, toolNameMap, model, connectionId, body, onStreamComplete, apiKey });

  // Responses passthrough: synthesize response.failed + [DONE] if the stream aborts/stalls before a terminal event
  const isResponsesPassthrough = sourceFormat === FORMATS.OPENAI_RESPONSES && targetFormat === FORMATS.OPENAI_RESPONSES;
  const onAbortTerminal = isResponsesPassthrough ? buildAbortedResponsesTerminalBytes : null;
  const stallTimeoutMs = PROVIDERS[provider]?.stallTimeoutMs || STREAM_STALL_TIMEOUT_MS;
  const transformedBody = pipeWithDisconnect(providerResponse, transformStream, streamController, onAbortTerminal, stallTimeoutMs);

  saveRequestDetail(buildRequestDetail({
    provider, model, connectionId,
    latency: { ttft: 0, total: Date.now() - requestStartTime },
    tokens: { prompt_tokens: 0, completion_tokens: 0 },
    request: extractRequestConfig(body, stream),
    providerRequest: finalBody || translatedBody || null,
    providerResponse: "[Streaming - raw response not captured]",
    response: { content: "[Streaming in progress...]", thinking: null, type: "streaming" },
    pxpipe,
    status: "success"
  }, { id: streamDetailId })).catch(err => {
    console.error("[RequestDetail] Failed to save streaming request:", err.message);
  });

  // First-token buffering: hold the stream until real output (text/tool/reasoning)
  // arrives or the stream ends. Ends with no output → return an error so chat.js
  // falls back to the next account. Tool-call / reasoning-only streams are valid.
  // Any probe failure → stream normally (never breaks streaming).
  let probe = null;
  try {
    probe = await bufferUntilOutputOrEnd(transformedBody);
  } catch (err) {
    log?.warn?.("STREAM", `empty-probe failed for ${provider}/${model}: ${err?.message || err}`);
  }

  if (probe?.empty) {
    streamController?.handleError?.(new Error("empty streaming response"));
    if (log?.errorLine) log.errorLine(reqTag, "✗", `EMPTY STREAM · ${provider}/${model} · no content → fallback`);
    return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `Provider '${provider}' returned an empty streaming response (no content)`);
  }

  // Replay buffered chunks (if any), then continue piping the rest of the stream.
  const replayStream = (probe && probe.reader)
    ? new ReadableStream({
        async start(controller) {
          try {
            for (const c of probe.chunks) controller.enqueue(c);
            if (probe.ended) { controller.close(); return; }
            const r = probe.reader;
            while (true) {
              const { done, value } = await r.read();
              if (done) { controller.close(); return; }
              controller.enqueue(value);
            }
          } catch (e) {
            try { controller.error(e); } catch {}
          }
        },
        cancel(reason) {
          try { probe.reader?.cancel?.(reason); } catch {}
        },
      })
    : transformedBody;

  return {
    success: true,
    response: new Response(replayStream, { headers: SSE_HEADERS })
  };
}

/**
 * Build onStreamComplete callback for streaming usage tracking.
 */
export function buildOnStreamComplete({ provider, model, connectionId, apiKey, requestStartTime, body, stream, finalBody, translatedBody, clientRawRequest, pxpipe, reqTag, log }) {
  const streamDetailId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const onStreamComplete = (contentObj, usage, ttftAt) => {
    const latency = {
      ttft: ttftAt ? ttftAt - requestStartTime : Date.now() - requestStartTime,
      total: Date.now() - requestStartTime
    };
    const safeContent = contentObj?.content || "[Empty streaming response]";
    const safeThinking = contentObj?.thinking || null;

    saveRequestDetail(buildRequestDetail({
      provider, model, connectionId,
      latency,
      tokens: usage || { prompt_tokens: 0, completion_tokens: 0 },
      request: extractRequestConfig(body, stream),
      providerRequest: finalBody || translatedBody || null,
      providerResponse: safeContent,
      response: { content: safeContent, thinking: safeThinking, type: "streaming" },
      pxpipe,
      status: "success"
    }, { id: streamDetailId })).catch(err => {
      console.error("[RequestDetail] Failed to update streaming content:", err.message);
    });

    // Persist stream usage to DB (no console line; the "📊 done" line below is authoritative)
    saveUsageStats({ provider, model, tokens: usage, connectionId, apiKey, endpoint: clientRawRequest?.endpoint, label: "STREAM USAGE", silent: true });
    if (log?.line) log.line(reqTag, "📊", formatDoneLine({ usage, latency }));
  };

  return { onStreamComplete, streamDetailId };
}
