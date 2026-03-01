---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Initialize Next.js Project & Migrate Core Infrastructure

## Objective
Create a new Next.js application (App Router) inside `frontend-next/`, set up Tailwind CSS v3 with the existing design system, and migrate the foundational files: the API client (`api.js`), the root layout, and the auth protection logic. This plan sets the foundation so that subsequent plans can migrate individual pages.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- frontend/src/api.js — The entire API client (30+ functions, 431 lines)
- frontend/src/index.css — Glassmorphism design system
- frontend/tailwind.config.js — Custom color palette & shadows
- frontend/src/components/Layout.jsx — Shared header/footer shell
- frontend/src/components/ProtectedRoute.jsx — JWT auth guard
- frontend/src/App.jsx — Route definitions (6 routes, 3 roles)

## Tasks

<task type="auto">
  <name>Scaffold Next.js App with Tailwind</name>
  <files>frontend-next/ (new directory)</files>
  <action>
    - Run `npx -y create-next-app@latest ./frontend-next --js --tailwind --eslint --app --src-dir --no-import-alias --use-npm` to scaffold a Next.js project with App Router and Tailwind.
    - After scaffolding, overwrite `frontend-next/tailwind.config.js` with the exact content from the existing `frontend/tailwind.config.js`, but update `content` paths for Next.js (`"./src/**/*.{js,ts,jsx,tsx}"`).
    - Overwrite `frontend-next/src/app/globals.css` with the content from `frontend/src/index.css`.
    - Install `jwt-decode` dependency: `npm install jwt-decode`.
    - WHAT TO AVOID AND WHY: Do NOT use Tailwind v4 (it has a different config format). Stick with v3 to match the existing design system tokens. The `create-next-app` command should be run with `--no-import-alias` to keep paths simple.
  </action>
  <verify>cd frontend-next && npm run build (should complete without errors)</verify>
  <done>Next.js project builds successfully with Tailwind configured and the existing design system applied.</done>
</task>

<task type="auto">
  <name>Migrate API Client, Layout, and Auth Guard</name>
  <files>frontend-next/src/lib/api.js, frontend-next/src/components/Layout.jsx, frontend-next/src/middleware.js</files>
  <action>
    - Copy `frontend/src/api.js` to `frontend-next/src/lib/api.js`. This file is framework-agnostic (pure fetch calls, no React hooks), so it migrates 1:1 without changes.
    - Convert `frontend/src/components/Layout.jsx` to `frontend-next/src/app/layout.js`. In Next.js App Router, the root layout is a server component. Move the `Layout` component into a client component `frontend-next/src/components/AppShell.jsx` (with `"use client"` directive) and import it into the root layout.
    - Convert `ProtectedRoute.jsx` into a Next.js middleware at `frontend-next/src/middleware.js` that checks JWT token cookies/headers for protected routes, or keep it as a client-side wrapper component at `frontend-next/src/components/ProtectedRoute.jsx` (with `"use client"`), which is simpler and matches the existing pattern.
    - Create `frontend-next/src/app/page.js` that redirects to `/login`.
    - WHAT TO AVOID AND WHY: Do NOT try to make Layout/ProtectedRoute server components — they use `localStorage`, `useNavigate`, and other client-only APIs. Mark them `"use client"`.
  </action>
  <verify>cd frontend-next && npm run build (should complete without errors)</verify>
  <done>API client, root layout with AppShell, and ProtectedRoute are in place. Build passes.</done>
</task>

## Success Criteria
- [ ] `frontend-next/` is a valid Next.js app that builds cleanly.
- [ ] Tailwind design system (colors, glassmorphism, fonts) matches the old app.
- [ ] API client is available at `src/lib/api.js`.
- [ ] Root layout renders the AppShell (header, footer, ambient bg).
