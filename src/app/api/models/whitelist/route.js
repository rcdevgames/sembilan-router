import { NextResponse } from "next/server";
import {
  getModelWhitelist,
  setModelWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  clearModelWhitelist,
} from "@/lib/whitelistDb";

export const dynamic = "force-dynamic";

// GET /api/models/whitelist → { models: ["openai/gpt-4o", ...] }
export async function GET() {
  try {
    const models = await getModelWhitelist();
    return NextResponse.json({ models });
  } catch (error) {
    console.log("Error fetching model whitelist:", error);
    return NextResponse.json({ error: "Failed to fetch whitelist" }, { status: 500 });
  }
}

// PUT /api/models/whitelist  body: { models: [...] } — replace entire whitelist
export async function PUT(request) {
  try {
    const { models } = await request.json();
    if (!Array.isArray(models)) {
      return NextResponse.json({ error: "models[] required" }, { status: 400 });
    }
    const next = await setModelWhitelist(models);
    return NextResponse.json({ models: next });
  } catch (error) {
    console.log("Error setting model whitelist:", error);
    return NextResponse.json({ error: "Failed to set whitelist" }, { status: 500 });
  }
}

// POST /api/models/whitelist  body: { models: [...] } — add ids
export async function POST(request) {
  try {
    const { models } = await request.json();
    if (!Array.isArray(models)) {
      return NextResponse.json({ error: "models[] required" }, { status: 400 });
    }
    const next = await addToWhitelist(models);
    return NextResponse.json({ models: next });
  } catch (error) {
    console.log("Error adding to model whitelist:", error);
    return NextResponse.json({ error: "Failed to add to whitelist" }, { status: 500 });
  }
}

// DELETE /api/models/whitelist  body: { models: [...] } | { clear: true }
export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.clear) {
      await clearModelWhitelist();
      return NextResponse.json({ models: [] });
    }
    const { models } = body;
    if (!Array.isArray(models)) {
      return NextResponse.json(
        { error: "models[] required (or pass { clear: true })" },
        { status: 400 }
      );
    }
    const next = await removeFromWhitelist(models);
    return NextResponse.json({ models: next });
  } catch (error) {
    console.log("Error removing from model whitelist:", error);
    return NextResponse.json({ error: "Failed to remove from whitelist" }, { status: 500 });
  }
}
