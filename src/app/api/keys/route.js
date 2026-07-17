import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getApiKeyUsageTotals } from "@/lib/db/index.js";
import { getConsistentMachineId } from "@/shared/utils/machineId";

export const dynamic = "force-dynamic";

// GET /api/keys - List API keys (with per-key usage totals)
export async function GET() {
  try {
    const keys = await getApiKeys();
    const withUsage = await Promise.all(
      keys.map(async (k) => {
        const usage = k.key ? await getApiKeyUsageTotals(k.key) : { totalTokens: 0, totalRequests: 0 };
        return { ...k, usage };
      })
    );
    return NextResponse.json({ keys: withUsage });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, expiresAt, maxTokens, maxRequests, allowedModels } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();

    // Limits are mutually exclusive — maxTokens wins if both supplied.
    const numOrNull = (v) => (v === "" || v === null || v === undefined) ? null : (Number(v) || null);
    const hasTokens = maxTokens !== undefined && maxTokens !== null && maxTokens !== "";
    const hasRequests = maxRequests !== undefined && maxRequests !== null && maxRequests !== "";

    const apiKey = await createApiKey(name, machineId, {
      expiresAt: expiresAt || null,
      maxTokens: hasTokens ? numOrNull(maxTokens) : null,
      maxRequests: !hasTokens && hasRequests ? numOrNull(maxRequests) : null,
      allowedModels: Array.isArray(allowedModels) ? allowedModels.slice(0, 1) : [],
    });

    return NextResponse.json(apiKey, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
