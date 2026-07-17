// Add per-key limits & restrictions to apiKeys: expiry, max tokens, max requests,
// allowed models. Idempotent — ALTER TABLE ADD COLUMN fails if the column exists,
// so we guard with PRAGMA table_info.
import { getAdapter } from "../driver.js";

const NEW_COLUMNS = [
  ["expiresAt", "TEXT"],
  ["maxTokens", "INTEGER"],
  ["maxRequests", "INTEGER"],
  ["allowedModels", "TEXT"],
];

function existingColumns(db) {
  const rows = db.all(`PRAGMA table_info(apiKeys)`);
  return new Set(rows.map((r) => r.name));
}

export default {
  version: 2,
  name: "apikey-limits",
  up(db) {
    // db may be the adapter or a raw handle; both expose .all/.run/.exec
    const handle = db || (async () => getAdapter())();
    const cols = existingColumns(handle);
    for (const [col, type] of NEW_COLUMNS) {
      if (!cols.has(col)) {
        handle.exec(`ALTER TABLE apiKeys ADD COLUMN ${col} ${type}`);
      }
    }
  },
};
