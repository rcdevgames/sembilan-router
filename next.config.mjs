import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));
// CLI bundling needs workspace root so tracing includes hoisted node_modules (slim ~50MB).
// Docker / default uses projectRoot so server.js lands at /app/server.js (not nested).
const tracingRoot = process.env.NEXT_TRACING_ROOT_MODE === "workspace"
  ? join(projectRoot, "..")
  : projectRoot;
const proxyClientMaxBodySize = process.env.NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE || "128mb";

// Media (non-text) endpoints to block — text-only build.
// beforeFiles rewrites send matching paths to /api/_disabled (404 JSON), before
// any media route handler runs. Empty MEDIA_DISABLED_KINDS to restore them.
const MEDIA_DISABLED_KINDS = ["images", "videos", "audio", "embeddings", "search", "web"];
// Block media dashboard pages too
const DASHBOARD_MEDIA_PAGES = ["media-providers"];
const mediaDisabledRewrites = MEDIA_DISABLED_KINDS.flatMap((k) => [
  { source: `/v1/${k}/:path*`, destination: "/api/_disabled" },
  { source: `/api/v1/${k}/:path*`, destination: "/api/_disabled" }
]);
const dashboardMediaRewrites = DASHBOARD_MEDIA_PAGES.flatMap((p) => [
  { source: `/${p}/:path*`, destination: "/api/_disabled" },
  { source: `/dashboard/${p}/:path*`, destination: "/api/_disabled" }
]);
const allRewrites = [...mediaDisabledRewrites, ...dashboardMediaRewrites];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sql.js", "node:sqlite", "bun:sqlite"],
  turbopack: {
    root: tracingRoot
  },
  outputFileTracingRoot: tracingRoot,
  outputFileTracingExcludes: {
    "*": ["./gitbook/**/*"]
  },
  images: {
    unoptimized: true
  },
  env: {},
  experimental: {
    // #1529/#1572: LLM clients can send long context or base64 image payloads through /v1 rewrites.
    proxyClientMaxBodySize,
    // Cache fetch responses across HMR refreshes for faster dev reloads.
    serverComponentsHmrCache: true,
    // Tree-shake heavy barrel imports to cut compile + bundle size
    optimizePackageImports: ["@xyflow/react", "@dnd-kit/core", "@dnd-kit/sortable", "material-symbols", "marked"],
  },
  webpack: (config, { isServer }) => {
    // Ignore fs/path modules in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Exclude non-source dirs from watcher to reduce inotify load
    config.watchOptions = {
      ...config.watchOptions,
      aggregateTimeout: 300,
      ignored: /[\\/](node_modules|\.git|logs|\.next|\.next-cli-build|gitbook|cli|open-sse\.old|tests|docs)[\\/]/,
    };
    return config;
  },
  async rewrites() {
    return {
      beforeFiles: allRewrites,
      afterFiles: [
        {
          source: "/v1/v1/:path*",
          destination: "/api/v1/:path*"
        },
        {
          source: "/v1/v1",
          destination: "/api/v1"
        },
        {
          source: "/codex/:path*",
          destination: "/api/v1/responses"
        },
        {
          source: "/responses",
          destination: "/api/v1/responses"
        },
        {
          source: "/v1beta/:path*",
          destination: "/api/v1beta/:path*"
        },
        {
          source: "/v1beta",
          destination: "/api/v1beta"
        },
        {
          source: "/v1/:path*",
          destination: "/api/v1/:path*"
        },
        {
          source: "/v1",
          destination: "/api/v1"
        }
      ],
      fallback: []
    };
  }
};

export default nextConfig;
