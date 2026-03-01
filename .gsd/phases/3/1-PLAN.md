---
phase: 3
plan: 1
---

# Plan 3.1: Environment-Based API Configuration & Next.js Proxy

## Objective
Replace all hardcoded `http://localhost:8000` references with an environment variable and configure Next.js rewrites to proxy `/api/*` requests to the backend. This eliminates CORS issues and makes the app deployment-ready.

## Context
Currently 9 occurrences of `http://localhost:8000` exist across 5 files:
- `src/lib/api.js` (line 1) — the API_URL constant
- `src/components/StudentDashboard.jsx` (lines 63, 71) — evidence image URLs
- `src/components/SessionEvidenceGallery.jsx` (lines 75, 119, 169, 172) — static file URLs
- `src/components/LiveCorrectionPanel.jsx` (line 66) — unknown face image URLs
- `src/components/DisputeList.jsx` (line 144) — evidence image URLs

## Tasks

<task type="auto">
  <name>Create .env.local and Environment Config</name>
  <files>
    frontend-next/.env.local (NEW),
    frontend-next/src/lib/api.js (MODIFY)
  </files>
  <action>
    - Create `frontend-next/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
    - Add `frontend-next/.env.example` with the same variable but placeholder value, for documentation
    - Update `src/lib/api.js` line 1: replace `const API_URL = 'http://localhost:8000'` with `const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
    - Add a new exported constant for static asset base URL: `export const STATIC_URL = \`\${API_URL}/static\``
  </action>
  <verify>grep -r "localhost:8000" frontend-next/src/lib/api.js — should only appear as fallback</verify>
  <done>API_URL is configurable via environment variable.</done>
</task>

<task type="auto">
  <name>Replace All Hardcoded Backend URLs</name>
  <files>
    frontend-next/src/components/StudentDashboard.jsx (MODIFY),
    frontend-next/src/components/SessionEvidenceGallery.jsx (MODIFY),
    frontend-next/src/components/LiveCorrectionPanel.jsx (MODIFY),
    frontend-next/src/components/DisputeList.jsx (MODIFY)
  </files>
  <action>
    - In each file, import `STATIC_URL` from `../lib/api` (or a new config module)
    - Replace all `http://localhost:8000/static/${...}` template literals with `${STATIC_URL}/${...}`
    - There are exactly 8 occurrences across 4 files
  </action>
  <verify>grep -r "localhost:8000" frontend-next/src/ — should return 0 results (except .env files)</verify>
  <done>No hardcoded backend URLs remain in source code.</done>
</task>

<task type="auto">
  <name>Configure Next.js Image Domains and Rewrites</name>
  <files>frontend-next/next.config.mjs (MODIFY)</files>
  <action>
    - Add `images.remotePatterns` config to whitelist the backend hostname for `next/image` (if we use it later)
    - Add `async rewrites()` that proxies `/api/:path*` to the backend URL — this is optional since we still use direct fetch, but sets up the infrastructure for future improvements
    - Ensure `.env.local` is in `.gitignore` (add if missing)
  </action>
  <verify>npm run build passes with the updated config</verify>
  <done>Next.js config properly handles backend connectivity.</done>
</task>

## Success Criteria
- [ ] Zero hardcoded `localhost:8000` in any `.jsx` or `.js` source file
- [ ] `NEXT_PUBLIC_API_URL` env var drives all API calls
- [ ] `next.config.mjs` has image domain whitelist
- [ ] Build passes
