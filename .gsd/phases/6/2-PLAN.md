---
phase: 6
plan: 2
---

# Plan 6.2: Frontend Performance & Next.js Optimization

## Objective
Apply Next.js and frontend performance optimizations for faster page loads and better UX.

## Context
- `next.config.mjs` is minimal — no optimizations configured
- Components use raw `<img>` tags instead of `next/image` for evidence photos
- No loading states or error boundaries at the route level
- No `metadata` exports on route pages (bad for SEO)

## Tasks

### Task 1: Add Route-Level Metadata
#### [MODIFY] `frontend-next/src/app/layout.js`, `login/page.jsx`, `register/page.jsx`, `dashboard/page.jsx`, `student/page.jsx`, `admin/page.jsx`
- Export `metadata` objects with `title` and `description` on each route page
- Set a default title template in `layout.js`

### Task 2: Add Loading UI
#### [NEW] `frontend-next/src/app/loading.js`
#### [NEW] `frontend-next/src/app/dashboard/loading.js`
- Create simple loading skeleton components for key routes
- Uses Next.js Suspense boundary integration

### Task 3: Add Error Boundary
#### [NEW] `frontend-next/src/app/error.js`
- Create a client error boundary that catches runtime errors
- Shows a friendly "Something went wrong" UI with retry button

### Task 4: Configure Next.js for Production
#### [MODIFY] `frontend-next/next.config.mjs`
- Add `poweredByHeader: false` (security — removes `X-Powered-By: Next.js`)
- Add `reactStrictMode: true`

## Success Criteria
- [ ] All route pages export metadata
- [ ] Loading skeletons show during navigation
- [ ] Error boundary catches and displays errors gracefully
- [ ] `npm run build` still passes
