---
phase: 4
plan: 2
---

# Plan 4.2: Repository File Cleanup

## Objective
Purge orphan files from the repository root and organize the project structure. These files were generated during development/debugging and should not live in version control.

## Context
The following orphan files exist at the repo root:
- `backend_logs.txt` (50KB) — old debug output
- `debug_logs.txt` (45KB) — old debug output
- `debug_logs_2.txt` (74KB) — old debug output
- `debug_logs_3.txt` (54KB) — old debug output
- `debug_logs_4.txt` (61KB) — old debug output
- `logs.txt` (12KB) — old debug output
- `ps.txt` (71B) — old `ps` command output
- `prompt.json` (6KB) — development prompt file
- `prompt_v2.json` (8KB) — development prompt file
- `model_capabilities.yaml` (3KB) — development file
- `progress.md` (2KB) — superseded by .gsd/STATE.md
- `GSD-STYLE.md` (7KB) — methodology doc (can remain or move to .gsd/)
- `PROJECT_RULES.md` (7KB) — methodology doc (can remain or move to .gsd/)
- `SCALABILITY_AND_HARDWARE.md` (5KB) — docs file (move to docs/)

Additionally:
- `frontend/Dockerfile` — old Vite Dockerfile (superseded by `frontend-next/Dockerfile`)
- `adapters/` — GSD adapter files (keep or move to .gsd/)

## Tasks

<task type="auto">
  <name>Delete Debug and Orphan Files</name>
  <files>Multiple root-level files (DELETE)</files>
  <action>
    - Delete all debug log files: `backend_logs.txt`, `debug_logs*.txt`, `logs.txt`, `ps.txt`
    - Delete development prompt files: `prompt.json`, `prompt_v2.json`, `model_capabilities.yaml`
    - Delete `progress.md` (superseded by .gsd/STATE.md)
    - Move `SCALABILITY_AND_HARDWARE.md` to `docs/`
    - Add `*.txt` log pattern to `.gitignore` if not already covered
  </action>
  <verify>ls *.txt at repo root should return nothing</verify>
  <done>Repo root is clean — only README.md, docker-compose.yml, .gitignore, and methodology docs remain.</done>
</task>

<task type="auto">
  <name>Deprecate Old Frontend Directory</name>
  <files>frontend/ directory</files>
  <action>
    - Add a `frontend/DEPRECATED.md` noting this is the legacy Vite frontend, superseded by `frontend-next/`
    - OR: delete the `frontend/` directory entirely if the user confirms they no longer need it
    - The old `frontend/Dockerfile` is no longer needed regardless
  </action>
  <verify>Project still builds and runs correctly</verify>
  <done>Old frontend is properly marked as deprecated or removed.</done>
</task>

## Success Criteria
- [ ] No orphan debug/log files at repo root
- [ ] Old frontend is deprecated or removed
- [ ] Repository structure is clean and professional
