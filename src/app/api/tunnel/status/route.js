import { NextResponse } from "next/server";
import { getTailscaleStatus } from "@/lib/tunnel";

// Survive hot reload; one cache per process.
const statusCache = (global.__tunnelStatusCache ??= { value: null, fetchedAt: 0 });

const STATUS_CACHE_TTL_MS = 3000; // coalesce rapid polls

// Tailscale-only — Cloudflare tunnel removed (use Tailscale per project policy).
export async function GET() {
  try {
    let tailscale = statusCache.value;
    if (!tailscale || Date.now() - statusCache.fetchedAt >= STATUS_CACHE_TTL_MS) {
      tailscale = await getTailscaleStatus();
      statusCache.value = tailscale;
      statusCache.fetchedAt = Date.now();
    }
    return NextResponse.json({ tunnel: null, tailscale });
  } catch (error) {
    console.error("Tunnel status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
