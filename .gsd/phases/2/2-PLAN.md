---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: Migrate Pages and Components

## Objective
Migrate all 6 pages (Login, Register, Dashboard, StudentDashboard, AdminDashboard) and their child components from the Vite React app into Next.js App Router pages. Each route becomes a directory under `src/app/` with a `page.js` file.

## Context
- .gsd/SPEC.md
- frontend-next/src/lib/api.js — Migrated API client
- frontend-next/src/components/AppShell.jsx — Migrated layout
- frontend/src/components/ — All 17 original components

## Tasks

<task type="auto">
  <name>Migrate Auth Pages (Login, Register)</name>
  <files>frontend-next/src/app/login/page.jsx, frontend-next/src/app/register/page.jsx</files>
  <action>
    - Create `frontend-next/src/app/login/page.jsx` — copy `Login.jsx` content, add `"use client"` directive, replace `react-router-dom` navigation with `next/navigation` (`useRouter`), replace `Link` from react-router with `next/link`.
    - Create `frontend-next/src/app/register/page.jsx` — same pattern for `Register.jsx`.
    - Update all `import { ... } from '../api'` to `import { ... } from '@/lib/api'` (or relative path).
    - WHAT TO AVOID AND WHY: Do NOT remove the `"use client"` directive — these pages use `useState`, `useEffect`, and `localStorage` which are client-only. Keep `next/link` for internal navigation instead of `react-router-dom`'s `Link`.
  </action>
  <verify>cd frontend-next && npm run build</verify>
  <done>Login and Register pages render correctly in the Next.js app.</done>
</task>

<task type="auto">
  <name>Migrate Dashboard Pages and Child Components</name>
  <files>
    frontend-next/src/app/dashboard/page.jsx,
    frontend-next/src/app/student/page.jsx,
    frontend-next/src/app/admin/page.jsx,
    frontend-next/src/components/ (all child components)
  </files>
  <action>
    - Move all child components from `frontend/src/components/` to `frontend-next/src/components/`, adding `"use client"` to any that use React hooks or browser APIs.
    - Components to migrate: `Dashboard.jsx`, `StudentDashboard.jsx`, `AdminDashboard.jsx`, `AttendanceTable.jsx`, `AbsenteeList.jsx`, `ClassManager.jsx`, `DatabaseViewer.jsx`, `DisputeList.jsx`, `LiveCorrectionPanel.jsx`, `RecognitionPanel.jsx`, `SessionEvidenceGallery.jsx`, `SessionHistory.jsx`, `UserMapper.jsx`.
    - Create route pages:
      - `frontend-next/src/app/dashboard/page.jsx` wrapping `<ProtectedRoute allowedRoles={['teacher','admin']}><Dashboard /></ProtectedRoute>`
      - `frontend-next/src/app/student/page.jsx` wrapping `<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>`
      - `frontend-next/src/app/admin/page.jsx` wrapping `<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>`
    - Replace ALL `react-router-dom` imports (`useNavigate` → `useRouter` from `next/navigation`, `Link` → `next/link`).
    - Replace ALL `import { ... } from '../api'` with appropriate relative or alias paths.
    - WHAT TO AVOID AND WHY: Do not attempt Server Components for these — they heavily use client-side state, fetch calls via the API client, and browser APIs (localStorage, canvas for live recognition).
  </action>
  <verify>cd frontend-next && npm run build</verify>
  <done>All pages and components pass build. The full app is navigable.</done>
</task>

## Success Criteria
- [ ] All 6 routes are accessible in the Next.js app.
- [ ] All 17 components are migrated and build cleanly.
- [ ] No remaining `react-router-dom` imports.
- [ ] Application flow matches the old Vite app (login → dashboard → features).
