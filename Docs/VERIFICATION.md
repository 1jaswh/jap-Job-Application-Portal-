# JAP - Verification & Testing Guide

## System Status

✅ **Backend**: Running on `http://localhost:8080`
✅ **Frontend**: Built successfully in `frontend/dist/`
✅ **Database**: PostgreSQL connected with all tables migrated
✅ **API Format**: Fixed - returns arrays directly (not wrapped objects)

---

## Quick Verification Steps

### 1. Start Backend (if not running)

```bash
cd backend
./bin/server
# OR
go run cmd/server/main.go
```

Expected output:
```
Config loaded: DBHost=localhost DBPort=5432 DBUser=postgres DBName=jap_db
[GIN] Listening and serving HTTP on :8080
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# Get all jobs (should return empty array initially)
curl http://localhost:8080/api/v1/jobs
# Expected: []

# Create a job
curl -X POST http://localhost:8080/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "department": "Engineering",
    "description": "We are looking for a skilled Go/React developer",
    "location": "Kampala",
    "deadline": "2025-12-31",
    "status": "open"
  }'

# Get jobs (should now return array with the job)
curl http://localhost:8080/api/v1/jobs
# Expected: [{"id":1,"title":"Senior Software Engineer",...}]
```

### 3. Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

**Expected behavior:**
- Homepage loads with "Open Positions" section
- If no jobs, shows "No open positions available"
- After creating a job via API/admin, it displays here

### 4. Test Admin Dashboard

Navigate to `http://localhost:5173/admin`

**Expected:**
- Dashboard loads with stats (all zeros initially)
- Navigation to Jobs Management and Applications works
- No console errors

### 5. Test Full Application Flow

**Step A: Create a Job**
```bash
curl -X POST http://localhost:8080/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HR Manager",
    "department": "Human Resources",
    "description": "Seeking experienced HR professional",
    "location": "Kampala",
    "deadline": "2025-06-30",
    "status": "open"
  }'
```

**Step B: Add Requirements** (optional - uses default if not added)
```bash
# The system has default requirements: Full Name, Phone, National ID, CV, ID, Transcripts
# You can add custom ones:
curl -X POST http://localhost:8080/api/v1/jobs/1/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "years_experience",
    "field_type": "number",
    "label": "Years of Experience",
    "required": true,
    "order": 1
  }'
```

**Step C: View Job on Homepage**
- Refresh `http://localhost:5173`
- Job should appear in "Open Positions"

**Step D: Apply for Job**
- Click "View Details" → "Apply Now"
- Fill form (default fields appear)
- Upload sample files (PDF/JPG)
- Submit
- Should redirect to confirmation page with reference number

**Step E: View Application in Admin**
- Go to `http://localhost:5173/admin/applications`
- Should see the application
- Click "View Details"
- Verify documents, change status
- All actions should work without errors

---

## Common Issues & Fixes

### Issue: `jobs.map is not a function`
**Cause**: Backend returning `{jobs: [...]}` instead of `[...]`
**Fix**: Applied - backend now returns raw arrays

### Issue: Database connection error
**Fix**:
1. Ensure PostgreSQL is running: `pg_ctl -D /usr/local/var/postgres start`
2. Create database: `createdb jap_db`
3. Check `.env` credentials match your PostgreSQL setup

### Issue: CORS errors
**Fix**: Backend has CORS enabled for all origins (development). For production, configure allowed origins in `main.go`.

### Issue: File upload fails
**Check**:
- Upload directory exists: `backend/uploads/`
- Permissions: `chmod 755 backend/uploads`
- File size < 5MB
- File type is PDF/JPG/PNG

---

## API Response Formats

### Jobs (GET /api/v1/jobs)
```json
[
  {
    "id": 1,
    "title": "Software Engineer",
    "department": "Engineering",
    "description": "...",
    "location": "Kampala",
    "deadline": "2025-12-31T00:00:00Z",
    "status": "open",
    "created_at": "2025-05-04T...",
    "updated_at": "2025-05-04T...",
    "requirements": [
      {
        "id": 1,
        "job_id": 1,
        "field_name": "full_name",
        "field_type": "text",
        "label": "Full Name",
        "required": true,
        "order": 1
      }
    ]
  }
]
```

### Applications (GET /api/v1/applications)
```json
[
  {
    "id": 1,
    "job_id": 1,
    "applicant_id": 1,
    "status": "applied",
    "submitted_at": "2025-05-04T...",
    "ip_address": "127.0.0.1",
    "job": { ... },
    "applicant": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+256..."
    },
    "responses": [
      {
        "id": 1,
        "application_id": 1,
        "field_name": "Full Name",
        "field_value": "John Doe"
      }
    ],
    "documents": [
      {
        "id": 1,
        "doc_type": "cv",
        "file_name": "john_cv.pdf",
        "stored_name": "a1b2c3...",
        "file_path": "/uploads/...",
        "file_size": 245000,
        "mime_type": "application/pdf",
        "file_hash": "sha256...",
        "status": "pending",
        "uploaded_at": "2025-05-04T..."
      }
    ]
  }
]
```

---

## Production Build

The frontend production build is ready in `frontend/dist/`:

```bash
# Serve the build
cd frontend
npx serve dist -p 3000

# Or copy dist/ to any static file host (Vercel, Netlify, S3+CloudFront)
```

**Important**: Set `VITE_API_URL` environment variable in production to point to your backend API.

---

## Next Steps (Phases 5-7)

### Phase 5: Security Hardening
- [ ] Implement JWT authentication for admin routes
- [ ] Add rate limiting (already partially in place)
- [ ] Enable HTTPS (TLS certificates)
- [ ] Validate file uploads more strictly
- [ ] Encrypt sensitive fields (NIN) in database
- [ ] Set proper CORS origins

### Phase 6: Testing & QA
- [ ] Write unit tests for repositories
- [ ] Write integration tests for API
- [ ] E2E tests for critical flows (application submission)
- [ ] Load testing with multiple concurrent applications
- [ ] Security audit (SQL injection, XSS, file upload bypass)

### Phase 7: Deployment & Documentation
- [ ] Dockerize backend + frontend
- [ ] Create docker-compose.yml for one-click deploy
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Write deployment guide for VPS
- [ ] Add monitoring (Prometheus/Grafana or simple health checks)
- [ ] Create user manual for HR staff

---

## Current Project Structure

```
jap/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── config/config.go        # Config loader
│   │   ├── middleware/             # Logging, recovery, CORS
│   │   ├── models/                 # GORM models (in repositories)
│   │   ├── repositories/
│   │   │   ├── models.go           # All DB models
│   │   │   └── repository.go       # All handlers + CRUD
│   │   └── services/               # (Future) Business logic
│   ├── migrations/                 # SQL migrations
│   ├── uploads/                    # File storage (created at runtime)
│   ├── .env                        # Database config
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── services/api.ts         # API client
│   │   ├── pages/
│   │   │   ├── applicant/          # HomePage, JobDetail, Apply
│   │   │   └── admin/              # Dashboard, Jobs, Applications
│   │   └── components/layout/      # AdminLayout
│   ├── .env                        # VITE_API_URL
│   ├── dist/                       # Production build
│   └── package.json
├── Docs/
│   ├── PROJECT_SUMMARY.md
│   └── QUICKSTART.md
├── README.md
└── docker-compose.yml
```

---

## Support

For issues:
1. Check backend logs (running in terminal)
2. Check browser console for frontend errors
3. Verify database is running: `ps aux | grep postgres`
4. Test API directly with curl to isolate frontend/backend issues
