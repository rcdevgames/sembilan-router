// Catch-all for disabled (media/non-text) endpoints in text-only builds.
// next.config.mjs beforeFiles rewrites /v1/{images,videos,audio,embeddings,search,web}/*
// (and /api/v1/... equivalents) here. Returns a JSON 404 so API clients get a
// clean error instead of an HTML 404 page.

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

function disabled() {
  return Response.json(
    {
      error: {
        message: "This endpoint is disabled in this text-only build.",
        type: "endpoint_disabled",
      },
    },
    { status: 404, headers }
  );
}

export async function GET() {
  return disabled();
}
export async function POST() {
  return disabled();
}
export async function PUT() {
  return disabled();
}
export async function DELETE() {
  return disabled();
}
export async function PATCH() {
  return disabled();
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}
