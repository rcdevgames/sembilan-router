/**
 * E2E test for /api/user-usage
 * Run: cd tests && npx vitest run unit/user-usage-api.test.js
 *
 * Requires dev server running on http://localhost:20128
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:20128";
let apiKey = null;

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  Object.assign(headers, opts.headers || {});
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

describe("/api/user-usage E2E", () => {
  beforeAll(async () => {
    // Create an API key via the keys API
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "123456" }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";
    const token = cookie.split(";")[0];

    const createRes = await fetch(`${BASE}/api/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: token },
      body: JSON.stringify({ name: "Test Usage Key" }),
    });
    const keyData = await createRes.json();
    apiKey = keyData?.key?.key;
    expect(apiKey).toBeTruthy();
  });

  it("returns 401 without API key", async () => {
    const { status, json } = await apiFetch("/api/user-usage");
    expect(status).toBe(401);
    expect(json.error).toMatch(/missing api key/i);
  });

  it("returns 401 with invalid key", async () => {
    const { status, json } = await apiFetch("/api/user-usage", {
      headers: { Authorization: "Bearer sr-fakekey-fake-12345678" },
    });
    expect(status).toBe(401);
  });

  it("returns full usage data with valid key", async () => {
    const { status, json } = await apiFetch("/api/user-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(status).toBe(200);
    expect(json.key).toBeTruthy();
    expect(json.key.name).toBe("Test Usage Key");
    expect(json.key.key).toBe(apiKey);
    expect(json.key.allowedModels).toBeInstanceOf(Array);
    expect(json.key.expiresAt === null || typeof json.key.expiresAt === "string").toBe(true);
    expect(json.usage).toBeTruthy();
    expect(typeof json.usage.totalTokens).toBe("number");
    expect(typeof json.usage.totalRequests).toBe("number");
    expect(Array.isArray(json.history)).toBe(true);
    expect(typeof json.endpoint).toBe("string");
  });

  it("returns empty history for new key", async () => {
    const { json } = await apiFetch("/api/user-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(json.history.length).toBe(0);
  });

  it("key with expired date is rejected", async () => {
    // Create expired key
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "123456" }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";
    const token = cookie.split(";")[0];

    const createRes = await fetch(`${BASE}/api/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: token },
      body: JSON.stringify({ name: "Expired Key", expiresAt: "2020-01-01T00:00:00.000Z" }),
    });
    const keyData = await createRes.json();
    const expiredKey = keyData?.key?.key;
    expect(expiredKey).toBeTruthy();

    const { status, json } = await apiFetch("/api/user-usage", {
      headers: { Authorization: `Bearer ${expiredKey}` },
    });
    expect(status).toBe(403);
    expect(json.error).toMatch(/expired/i);
  });
});
