---
phase: 5
plan: 1
---

# Plan 5.1: Backend CLI Management Tool & Admin Bootstrapping

## Objective
Create a CLI management script (`backend/src/cli.py`) that can be run via `docker exec` to manage accounts — reset passwords, create admin users, list users, and promote/demote roles. Also seed a default admin on first startup.

## Context
- No CLI tools exist today. Password resets require raw SQL.
- `SECRET_KEY` is hardcoded in `auth_service.py` — should be an env var.
- `database.py` already defaults to Postgres (Docker-first).
- The CLI must work inside the Docker container via `docker exec robocop_backend python -m src.cli ...`

## Tasks

### Task 1: Create CLI Management Script
#### [NEW] `backend/src/cli.py`

Create a CLI tool using Python's `argparse` with the following subcommands:

```
python -m src.cli reset-password <username> <new_password>
python -m src.cli create-admin <username> <password> [--full-name "Admin User"]
python -m src.cli list-users [--role admin|teacher|student]
python -m src.cli set-role <username> <role>
```

Each command connects to the database via `database.py` engine and performs the operation directly.

**Docker usage:**
```bash
docker exec -it robocop_backend python -m src.cli reset-password admin robocop
docker exec -it robocop_backend python -m src.cli create-admin admin robocop
docker exec -it robocop_backend python -m src.cli list-users
```

### Task 2: Auto-Seed Default Admin on Startup
#### [MODIFY] `backend/src/main.py`

Add a step to the lifespan function that checks if any admin user exists. If not, create one with:
- Username: `admin`
- Password: from `ADMIN_DEFAULT_PASSWORD` env var (default: `robocop`)
- Role: `admin`

Log a clear message: `"Default admin created: admin / <password>"`

### Task 3: Move SECRET_KEY to Environment Variable
#### [MODIFY] `backend/src/auth_service.py`

Replace hardcoded `SECRET_KEY = "robocop_secret_key_change_me"` with:
```python
SECRET_KEY = os.getenv("SECRET_KEY", "robocop_secret_key_change_me")
```

#### [MODIFY] `docker-compose.yml`
Add `SECRET_KEY` and `ADMIN_DEFAULT_PASSWORD` to the backend service environment.

## Verification Plan

### Automated
```bash
# Build and start the stack
docker-compose up --build -d

# Verify admin was auto-seeded
docker exec robocop_backend python -m src.cli list-users --role admin

# Test password reset
docker exec robocop_backend python -m src.cli reset-password admin newpass123

# Test create-admin
docker exec robocop_backend python -m src.cli create-admin superuser pass123 --full-name "Super User"

# Test set-role
docker exec robocop_backend python -m src.cli set-role superuser teacher

# Verify login works with new password via curl
curl -X POST http://localhost:8000/token -d "username=admin&password=newpass123"
```

### Manual
1. Run `docker-compose up --build`
2. Check logs for "Default admin created" message on first boot
3. Log in at `http://localhost:3000/login` with `admin / robocop`
4. Verify admin dashboard loads
5. Reset password via CLI, log in again with new password

## Success Criteria
- [ ] `cli.py` supports `reset-password`, `create-admin`, `list-users`, `set-role`
- [ ] Default admin auto-seeds on first startup
- [ ] `SECRET_KEY` reads from env var
- [ ] All commands work via `docker exec`
