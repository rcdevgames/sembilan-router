import path from "path";
import fs from "fs";
import crypto from "crypto";
import { DATA_DIR } from "@/lib/dataDir.js";

let cachedApiKeySecret = null;
function loadApiKeySecret() {
  if (cachedApiKeySecret) return cachedApiKeySecret;
  if (process.env.API_KEY_SECRET) {
    cachedApiKeySecret = process.env.API_KEY_SECRET;
    return cachedApiKeySecret;
  }
  const file = path.join(DATA_DIR, "api-key-secret");
  try {
    cachedApiKeySecret = fs.readFileSync(file, "utf8").trim();
    if (cachedApiKeySecret) return cachedApiKeySecret;
  } catch {}
  fs.mkdirSync(DATA_DIR, { recursive: true });
  cachedApiKeySecret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, cachedApiKeySecret, { mode: 0o600 });
  return cachedApiKeySecret;
}

const API_KEY_SECRET = loadApiKeySecret();

/**
 * Generate 6-char random keyId
 */
function generateKeyId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate CRC (8-char HMAC)
 */
function generateCrc(machineId, keyId) {
  return crypto
    .createHmac("sha256", API_KEY_SECRET)
    .update(machineId + keyId)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Generate API key with machineId embedded
 * Format: sk-{machineId}-{keyId}-{crc8}
 * @param {string} machineId - 16-char machine ID
 * @returns {{ key: string, keyId: string }}
 */
export function generateApiKeyWithMachine(machineId) {
  const keyId = generateKeyId();
  const crc = generateCrc(machineId, keyId);
  const key = `sk-${machineId}-${keyId}-${crc}`;
  return { key, keyId };
}

/**
 * Parse API key and extract machineId + keyId
 * Supports both formats:
 * - New: sk-{machineId}-{keyId}-{crc8}
 * - Old: sk-{random8}
 * @param {string} apiKey
 * @returns {{ machineId: string, keyId: string, isNewFormat: boolean } | null}
 */
export function parseApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  const parts = apiKey.split("-");
  
  // New format: sk-{machineId}-{keyId}-{crc8} = 4 parts
  if (parts.length === 4) {
    const [, machineId, keyId, crc] = parts;
    
    // Validate CRC
    const expectedCrc = generateCrc(machineId, keyId);
    if (crc !== expectedCrc) return null;
    
    return { machineId, keyId, isNewFormat: true };
  }
  
  // Old format: sk-{random8} = 2 parts
  if (parts.length === 2) {
    return { machineId: null, keyId: parts[1], isNewFormat: false };
  }
  
  return null;
}

/**
 * Verify API key CRC (only for new format)
 * @param {string} apiKey
 * @returns {boolean}
 */
export function verifyApiKeyCrc(apiKey) {
  const parsed = parseApiKey(apiKey);
  if (!parsed) return false;
  
  // Old format doesn't have CRC, always valid if parsed
  if (!parsed.isNewFormat) return true;
  
  // New format already verified in parseApiKey
  return true;
}

/**
 * Check if API key is new format (contains machineId)
 * @param {string} apiKey
 * @returns {boolean}
 */
export function isNewFormatKey(apiKey) {
  const parsed = parseApiKey(apiKey);
  return parsed?.isNewFormat === true;
}

