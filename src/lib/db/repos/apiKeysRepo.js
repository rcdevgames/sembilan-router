import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

function parseAllowedModels(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt || null,
    maxTokens: row.maxTokens != null && row.maxTokens !== "" ? Number(row.maxTokens) || null : null,
    maxRequests: row.maxRequests != null && row.maxRequests !== "" ? Number(row.maxRequests) || null : null,
    allowedModels: parseAllowedModels(row.allowedModels),
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function createApiKey(name, machineId, opts = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId, name);
  const now = new Date().toISOString();
  const allowedModels = Array.isArray(opts.allowedModels) ? opts.allowedModels : [];
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: now,
    expiresAt: opts.expiresAt || null,
    maxTokens: opts.maxTokens != null && opts.maxTokens !== "" ? Number(opts.maxTokens) || null : null,
    maxRequests: opts.maxRequests != null && opts.maxRequests !== "" ? Number(opts.maxRequests) || null : null,
    allowedModels,
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, expiresAt, maxTokens, maxRequests, allowedModels) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, apiKey.createdAt, apiKey.expiresAt, apiKey.maxTokens, apiKey.maxRequests, JSON.stringify(allowedModels)]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToKey(row), ...data };
    const allowedModels = Array.isArray(merged.allowedModels) ? merged.allowedModels : [];
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, expiresAt = ?, maxTokens = ?, maxRequests = ?, allowedModels = ? WHERE id = ?`,
      [
        merged.key,
        merged.name,
        merged.machineId,
        merged.isActive ? 1 : 0,
        merged.expiresAt || null,
        merged.maxTokens != null && merged.maxTokens !== "" ? Number(merged.maxTokens) || null : null,
        merged.maxRequests != null && merged.maxRequests !== "" ? Number(merged.maxRequests) || null : null,
        JSON.stringify(allowedModels),
        id,
      ]
    );
    result = { ...merged, allowedModels };
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}

// Full record lookup by raw key value (for limit/model enforcement).
export async function getApiKeyByKey(key) {
  if (!key) return null;
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  return rowToKey(row);
}
