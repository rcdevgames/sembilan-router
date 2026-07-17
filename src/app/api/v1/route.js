// GET /v1 — root of the OpenAI-compatible API. Per design, this must NOT list
// models (that is /v1/models only, and requires an API key). The bare /v1 root
// is not a valid endpoint, so return 404 to avoid exposing any data without auth.
export async function GET() {
  return new Response(
    JSON.stringify({ error: { message: "Not found. Use /v1/models to list models.", type: "invalid_request_error" } }),
    { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
