# Sembilan Router

> A **text-focused** personal fork of [9Router](https://github.com/decolua/9router) — a local, OpenAI-compatible AI routing gateway.

[![npm version](https://img.shields.io/npm/v/@rcdevgames/sembilan-router.svg)](https://www.npmjs.com/package/@rcdevgames/sembilan-router)
[![License](https://img.shields.io/npm/l/@rcdevgames/sembilan-router.svg)](https://github.com/rcdevgames/sembilan-router/blob/deploy/LICENSE)

`@rcdevgames/sembilan-router` runs locally and exposes one OpenAI-compatible endpoint (`/v1/*`) that routes your **chat / text** requests across upstream providers — with model **combos** (fallback chains), multi-account rotation, automatic OAuth/token refresh, RTK token compression, and usage tracking.

> ⚠️ **Not the upstream project.** This is a personal fork trimmed for **text-only** use.
> If you need the full feature set (image, audio, video, embeddings, web tools, cloud sync, …), use the original: [decolua/9router](https://github.com/decolua/9router).

---

## Why this fork exists

The upstream gateway is excellent but exposes **everything** — every model from every connected provider pours into `/v1/models`, and all media endpoints (image/video/audio/embedding/web) are live. For a text-only workflow that's noise and attack surface.

This fork narrows the surface:

| Area | Upstream 9Router | This fork |
|---|---|---|
| Media endpoints (`/v1/images`, `/videos`, `/audio`, `/embeddings`, `/search`, `/web`) | Live | **Hidden + blocked (404)** |
| `/v1/models` list | Combos **+ all provider models** | Combos **+ whitelisted models only** |
| Dashboard menus | Full (incl. Media Providers) | Trimmed (text-focused) |
| npm identity | `9router` (decolua) | `@rcdevgames/sembilan-router` |

Everything that matters for text routing is unchanged and inherited from upstream.

---

## Quick start

```bash
npm install -g @rcdevgames/sembilan-router
9router
```

- Dashboard: `http://localhost:20128/dashboard`
- API: `http://localhost:20128/v1`

Then point any OpenAI / Anthropic-compatible client at it:

```
Endpoint: http://localhost:20128/v1
API Key:  <copy from the dashboard>
Model:    <a combo name, or a whitelisted model id>
```

### Setting up models

1. **Connect providers** — Dashboard → **Providers** → add your accounts/keys.
2. **Create combos** — Dashboard → **Combos** → group models under one name with a fallback strategy.
3. **Whitelist individual models** *(optional)* — Dashboard → **Model Whitelist** → pick specific provider models you also want exposed.

After this, `GET /v1/models` returns **combos + whitelisted models** and nothing else.

---

## What's still here (inherited from upstream)

- 🎯 **Combos & fallback** — fallback / round-robin / fusion strategies per combo.
- 👥 **Multi-account** — rotate between multiple accounts per provider.
- 🔁 **Auto token refresh** — OAuth providers stay alive.
- ✂️ **RTK token saver** — compress `tool_result` to cut 20–40% tokens.
- 🔄 **Format translation** — OpenAI ↔ Anthropic ↔ others, pivoted through OpenAI format.
- 📊 **Usage & quota tracking** — per-request logging and stats.
- 🔌 **Broad provider support** — 40+ upstream providers (OpenAI, Anthropic, Google, OpenRouter, …).

> ℹ️ Full, detailed feature documentation (provider lists, video guides, pricing tables, …) lives in the **[upstream repository](https://github.com/decolua/9router)**. This README intentionally stays short and fork-specific rather than duplicating it.

---

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

## Development

This repo has two artifacts:

- **Dashboard + gateway** (root `package.json`) — the Next.js server that does the routing.
- **CLI launcher** (`cli/`, published as `@rcdevgames/sembilan-router`) — installs/starts the server and manages the tray.

```bash
npm install
npm run dev                      # dashboard + gateway (dev)
npm run build && npm start       # production
```

### Releasing

Releases are cut **only on the `deploy` branch** by pushing a `v*` tag whose suffix matches `cli/package.json`'s `version`. A GitHub Action then builds and publishes to npm automatically.

```bash
git checkout deploy
# bump version in cli/package.json, commit
git tag v<version>
git push origin v<version>
```

### Syncing with upstream

`master` tracks upstream; `deploy` carries this fork's changes on top.

```bash
git checkout master && git pull upstream master && git push origin master
git checkout deploy && git rebase master
```

---

## Attribution

This project is a fork of **[9Router](https://github.com/decolua/9router)** by [decolua](https://github.com/decolua), which itself builds on ideas from [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI). Credit for the routing/translation engine and provider integrations belongs to them; this fork only narrows the surface area for personal text-only use.

## License

MIT — see [LICENSE](LICENSE).
