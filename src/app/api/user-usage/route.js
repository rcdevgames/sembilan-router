import { NextResponse } from "next/server";
import { getApiKeyByKey, getApiKeyUsageTotals, getUsageHistory } from "@/lib/db/index.js";

export async function GET(request) {
  const auth = request.headers.get("Authorization") || "";
  const apiKey = auth.replace(/^Bearer\s+/i, "").trim();
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const key = await getApiKeyByKey(apiKey);
  if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (key.isActive === false) return NextResponse.json({ error: "API key is disabled" }, { status: 403 });

  if (key.expiresAt) {
    const exp = new Date(key.expiresAt).getTime();
    if (!Number.isNaN(exp) && Date.now() > exp) {
      return NextResponse.json({ error: "API key has expired" }, { status: 403 });
    }
  }

  const usage = await getApiKeyUsageTotals(apiKey);

  // Recent 50 usage history rows for this key
  const history = await getUsageHistory({ apiKey });

  return NextResponse.json({
    key: {
      name: key.name,
      key: apiKey,
      allowedModels: key.allowedModels || [],
      maxTokens: key.maxTokens || null,
      maxRequests: key.maxRequests || null,
      expiresAt: key.expiresAt || null,
      createdAt: key.createdAt,
    },
    usage: {
      totalTokens: usage.totalTokens,
      totalRequests: usage.totalRequests,
    },
    history: history.slice(-50).reverse(),
    endpoint: process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host") || "localhost:20128"}`,
  });
}
