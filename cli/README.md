# Sembilan Router

> A **text-focused** personal fork of [9Router](https://github.com/decolua/9router) — a local AI routing gateway.

[![npm version](https://img.shields.io/npm/v/@rcdevgames/sembilan-router.svg)](https://www.npmjs.com/package/@rcdevgames/sembilan-router)
[![License](https://img.shields.io/npm/l/@rcdevgames/sembilan-router.svg)](https://github.com/rcdevgames/sembilan-router/blob/deploy/LICENSE)

`@rcdevgames/sembilan-router` is a local gateway that exposes one OpenAI-compatible endpoint (`/v1`) and routes your **text / chat** traffic across upstream providers — with combos (fallback chains), multi-account rotation, automatic token refresh, RTK token compression, and usage tracking.

> ⚠️ This is **not** the upstream project. It is a fork tailored for **text-only** use. For the full-featured original (image, audio, video, embeddings, web tools, cloud sync, …) see [decolua/9router](https://github.com/decolua/9router).

---

## What's different from upstream

- **Text only.** Image / Video / TTS / STT / Embedding / Web-search & fetch are hidden from the dashboard and **blocked at the router** (`404 JSON`). Only chat-style traffic is served: `/v1/chat/completions`, `/v1/messages`, `/v1/responses`.
- **Model whitelist.** `/v1/models` exposes your **combos** plus only the **provider models you explicitly allow** — managed from a new **Model Whitelist** page in the dashboard. No more hundreds of raw upstream models leaking into your client.
- **Own release pipeline.** Published under the `@rcdevgames` npm scope; releases are cut by pushing a `v*` tag on the `deploy` branch (auto-published via GitHub Actions).

Everything else — combos, fallback, format translation, RTK token saver, usage analytics — is inherited from 9Router.

---

## Install

```bash
npm install -g @rcdevgames/sembilan-router
9router
```

The dashboard opens at `http://localhost:20128/dashboard`, the API at `http://localhost:20128/v1`.

Point any OpenAI / Anthropic-compatible client at it:

```
Endpoint: http://localhost:20128/v1
API Key:  <copy from the dashboard>
Model:    <a combo name, or a whitelisted model id>
```

## CLI options

```bash
9router                 # start with defaults
9router --port 8080     # custom port
9router --no-browser    # don't open the browser
9router --skip-update   # skip auto-update check
9router --help          # show all options
```

## Data location

- **macOS / Linux:** `~/.9router/`
- **Windows:** `%APPDATA%/9router/`

---

## Attribution

This project is a fork of **[9Router](https://github.com/decolua/9router)** by [decolua](https://github.com/decolua), which in turn builds on ideas from [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI). All credit for the core routing engine goes to them; this fork only adjusts the surface area for personal text-only use. Full feature documentation lives in the upstream repository.

## License

MIT — see [LICENSE](LICENSE).
