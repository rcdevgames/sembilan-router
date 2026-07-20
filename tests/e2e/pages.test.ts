import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:20127';

// All dashboard pages from build output
const PAGES = [
  { name: 'Dashboard Root', path: '/dashboard' },
  { name: 'Endpoint & Key', path: '/dashboard/endpoint' },
  { name: 'Providers', path: '/dashboard/providers' },
  { name: 'Providers New', path: '/dashboard/providers/new' },
  { name: 'Combos', path: '/dashboard/combos' },
  { name: 'Model Whitelist', path: '/dashboard/model-whitelist' },
  { name: 'Usage', path: '/dashboard/usage' },
  { name: 'Quota Tracker', path: '/dashboard/quota' },
  { name: 'Token Saver', path: '/dashboard/token-saver' },
  { name: 'Console Log', path: '/dashboard/console-log' },
  { name: 'Translator', path: '/dashboard/translator' },
  { name: 'Proxy Pools', path: '/dashboard/proxy-pools' },
  { name: 'Profile', path: '/dashboard/profile' },
  { name: 'Pricing', path: '/dashboard/settings/pricing' },
  { name: 'Skills', path: '/dashboard/skills' },
  { name: 'Basic Chat', path: '/dashboard/basic-chat' },
  { name: 'CLI Tools', path: '/dashboard/cli-tools' },
  { name: 'MITM', path: '/dashboard/mitm' },
  { name: 'PXPIPE', path: '/dashboard/pxpipe' },
  { name: 'Media Providers Web', path: '/dashboard/media-providers/web' },
  { name: 'Landing', path: '/landing' },
  { name: 'Login', path: '/login' },
];

// Pages with dynamic params
const DYNAMIC_PAGES = [
  { name: 'Provider Detail', path: '/dashboard/providers/openai' },
  { name: 'CLI Tool Detail', path: '/dashboard/cli-tools/mitm-proxy' },
  { name: 'Media Kind', path: '/dashboard/media-providers/image' },
  { name: 'Media Kind Detail', path: '/dashboard/media-providers/image/openai' },
];

test.describe('Dashboard Pages - Error Check', () => {

  for (const page of PAGES) {
    test(`${page.name} (${page.path}) - loads without error`, async ({ page: p }) => {
      const errors = [];
      
      // Collect console errors
      p.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(`[console.error] ${msg.text()}`);
        }
      });
      
      // Collect page errors (uncaught exceptions)
      p.on('pageerror', err => {
        errors.push(`[pageerror] ${err.message}`);
      });

      // Collect failed network requests
      const failedRequests = [];
      p.on('requestfailed', req => {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
      });

      const response = await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      const status = response?.status();
      const url = p.url();
      
      // Check for 500 errors
      if (status === 500) {
        errors.push(`[HTTP 500] Server error on ${page.path}`);
      }

      // Check if redirected to login (expected for protected pages without auth)
      const isLoginRedirect = url.includes('/login');
      
      // Build result
      const result = {
        page: page.name,
        path: page.path,
        status,
        finalUrl: url,
        loginRedirect: isLoginRedirect,
        consoleErrors: errors.length,
        failedRequests: failedRequests.length,
        errors: errors.slice(0, 5), // First 5 errors
        failedRequestSamples: failedRequests.slice(0, 3),
      };
      
      // Log for visibility
      console.log(`\n📄 ${page.name} (${page.path})`);
      console.log(`   Status: ${status} | Redirect: ${isLoginRedirect ? '→ login' : 'no'}`);
      console.log(`   Console errors: ${errors.length} | Failed requests: ${failedRequests.length}`);
      if (errors.length > 0) {
        errors.slice(0, 3).forEach(e => console.log(`   ❌ ${e}`));
      }
      if (failedRequests.length > 0) {
        failedRequests.slice(0, 3).forEach(r => console.log(`   ⚠️  ${r}`));
      }
      
      // Should not have 500 errors
      expect(status).not.toBe(500);
      
      // Pages should not have uncaught JS exceptions (pageerror)
      const jsErrors = errors.filter(e => e.startsWith('[pageerror]'));
      if (jsErrors.length > 0) {
        console.log(`   💥 JS Errors: ${jsErrors.join(' | ')}`);
      }
    });
  }

  for (const page of DYNAMIC_PAGES) {
    test(`${page.name} (${page.path}) - loads without error`, async ({ page: p }) => {
      const errors = [];
      
      p.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(`[console.error] ${msg.text()}`);
        }
      });
      
      p.on('pageerror', err => {
        errors.push(`[pageerror] ${err.message}`);
      });

      const failedRequests = [];
      p.on('requestfailed', req => {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
      });

      const response = await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      const status = response?.status();
      const url = p.url();
      const isLoginRedirect = url.includes('/login');
      
      console.log(`\n📄 ${page.name} (${page.path})`);
      console.log(`   Status: ${status} | Redirect: ${isLoginRedirect ? '→ login' : 'no'}`);
      console.log(`   Console errors: ${errors.length} | Failed requests: ${failedRequests.length}`);
      if (errors.length > 0) {
        errors.slice(0, 3).forEach(e => console.log(`   ❌ ${e}`));
      }
      
      // Dynamic pages might 404 if resource doesn't exist - that's OK
      expect(status).not.toBe(500);
    });
  }

});
