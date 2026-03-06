---
phase: 6
plan: 3
---

# Plan 6.3: End-to-End Validation (Docker)

## Objective
Validate the complete application stack runs correctly via Docker and all major user flows work.

## Verification Plan

### Automated Checks
```bash
# 1. Build and start the full stack
docker-compose down -v
docker-compose up --build -d

# 2. Wait for backend health
sleep 10
curl -f http://localhost:8000/health || echo "BACKEND DOWN"

# 3. Verify admin was auto-seeded
docker exec robocop_backend python -m src.cli list-users --role admin

# 4. Test login endpoint
curl -s -X POST http://localhost:8000/token \
  -d "username=admin&password=robocop" | grep access_token

# 5. Test rate limiting (6th request should fail)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/token \
    -d "username=bad&password=bad"
  echo " (attempt $i)"
done

# 6. Verify frontend responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# 7. Test CLI commands
docker exec robocop_backend python -m src.cli reset-password admin newpass
docker exec robocop_backend python -m src.cli list-users
docker exec robocop_backend python -m src.cli set-role admin admin
```

### Manual Validation (by user)
1. Open `http://localhost:3000` — should see landing page
2. Navigate to `/login` — log in as `admin / robocop`
3. Verify teacher dashboard loads with session controls
4. Click "Admin Console" — verify admin dashboard loads
5. Check that evidence images load (static file serving)
6. Register a test student via `/register`
7. Log in as the student, verify student dashboard

## Success Criteria
- [ ] `docker-compose up --build` starts all 3 services cleanly
- [ ] Admin auto-seeds on fresh database
- [ ] Login + dashboard flows work end-to-end
- [ ] Rate limiting triggers on brute-force attempts
- [ ] Static files (evidence images) load correctly
