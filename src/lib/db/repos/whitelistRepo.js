import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// Model whitelist — which provider models are exposed in /v1/models.
// Stored in the kv table (scope="modelWhitelist", key="whitelist") as a JSON
// array of full model ids, e.g. ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"].
// Combos are always exposed regardless of this list.
const SCOPE = "modelWhitelist";
const KEY = "whitelist";

export async function getModelWhitelist() {
  const db = await getAdapter();
  const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
  return row ? (parseJson(row.value, []) || []) : [];
}

// Replace the entire whitelist
export async function setModelWhitelist(ids) {
  const db = await getAdapter();
  const merged = Array.from(
    new Set((ids || []).filter((id) => typeof id === "string" && id.trim()))
  );
  db.run(
    `INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
    [SCOPE, KEY, stringifyJson(merged)]
  );
  return merged;
}

// Merge ids into the whitelist (atomic read-merge-write)
export async function addToWhitelist(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return getModelWhitelist();
  const db = await getAdapter();
  let result = [];
  db.transaction(() => {
    const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
    const current = row ? (parseJson(row.value, []) || []) : [];
    result = Array.from(new Set([...current, ...ids]));
    db.run(
      `INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
      [SCOPE, KEY, stringifyJson(result)]
    );
  });
  return result;
}

// Remove ids from the whitelist (atomic read-merge-write)
export async function removeFromWhitelist(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return getModelWhitelist();
  const db = await getAdapter();
  let result = [];
  db.transaction(() => {
    const row = db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
    const current = row ? (parseJson(row.value, []) || []) : [];
    const removeSet = new Set(ids);
    result = current.filter((id) => !removeSet.has(id));
    db.run(
      `INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
      [SCOPE, KEY, stringifyJson(result)]
    );
  });
  return result;
}

export async function clearModelWhitelist() {
  const db = await getAdapter();
  db.run(`DELETE FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
  return [];
}
