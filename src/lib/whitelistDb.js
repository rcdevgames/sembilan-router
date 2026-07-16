// Shim → re-export from new SQLite-based DB layer (src/lib/db/)
export {
  getModelWhitelist, setModelWhitelist,
  addToWhitelist, removeFromWhitelist, clearModelWhitelist,
} from "@/lib/db/index.js";
