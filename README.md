# JAP - Job Application Portal

A full-stack employee job application portal built for organizations in Uganda. This system enables applicants to browse job openings, submit applications with required documents, and allows HR teams to manage and verify applicants through a structured recruitment pipeline.

## 🚀 Features

### For Applicants
- **Mobile-first design** - Optimized for low bandwidth environments
- **Job browsing** - View all open positions with details
- **Dynamic application forms** - Custom fields per job (text, number, file upload)
- **Secure document upload** - CV, National ID, Academic transcripts (PDF, JPG, PNG)
- **Application confirmation** - Unique reference number generation

### For HR/Admin
- **Dashboard overview** - Key metrics and quick actions
- **Job management** - Create, edit, archive job postings
- **Dynamic form builder** - Configure job-specific requirements
- **Application review** - Filter, search, and view applications
- **Document verification** - Approve/reject with audit trail
- **Duplicate detection** - Flag suspicious duplicate submissions

### Security & Compliance
- **File validation** - MIME type checking, size limits (2-5MB)
- **SHA-256 hashing** - Detect duplicate documents
- **IP tracking** - Monitor submission patterns
- **Audit logging** - Complete trail of all actions
- **Uganda-specific** - NIN and academic index validation support

## 🏗 Architecture

### Backend
- **Language**: Go 1.21
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL 15
- **ORM**: GORM
- **Migrations**: golang-migrate (SQL-based)
- **Authentication**: Simple shared credentials (Phase 1-4), JWT (Phase 5)

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Deployment
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (frontend)
- **Production**: VPS-ready with Docker

## 📁 Project Structure

```
jap/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go              # Application entry point
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go            # Configuration loader
│   │   ├── middleware/
│   │   │   ├── logger.go            # Request logging
│   │   │   └── recovery.go          # Panic recovery
│   │   ├── repositories/
│   │   │   ├── models.go            # GORM models
│   │   │   └── repository.go        # Database operations
│   │   └── services/                # Business logic (future)
│   ├── migrations/
│   │   └── 000001_init_schema/
│   │       ├── up.sql
│   │       └── down.sql
│   ├── .env.example
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx      # Applicant layout
│   │   │   │   ├── AdminLayout.tsx # Admin layout
│   │   │   │   └── Header.tsx
│   │   │   └── ui/                 # Reusable UI components
│   │   ├── pages/
│   │   │   ├── applicant/
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── JobDetailPage.tsx
│   │   │   │   ├── ApplyPage.tsx
│   │   │   │   └── ConfirmationPage.tsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.tsx
│   │   │       ├── JobsManagement.tsx
│   │   │       ├── ApplicationsList.tsx
│   │   │       └── ApplicationDetail.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- **Docker** & **Docker Compose** (recommended)
- OR: Go 1.21+, Node.js 20+, PostgreSQL 15

### Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jap
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - **Frontend (Applicant Portal)**: http://localhost
   - **Frontend (Admin Dashboard)**: http://localhost/admin
   - **Backend API**: http://localhost:8080
   - **API Health Check**: http://localhost:8080/health

4. **Stop services**
   ```bash
   docker-compose down
   ```

### Manual Setup (Local Development)

#### Backend

```bash
cd backend

# Install dependencies
go mod download

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (using psql or golang-migrate)
# The app will auto-migrate in development mode

# Start server
go run cmd/server/main.go
```

The backend will start on http://localhost:8080

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on http://localhost:3000 (or 5173 for Vite)

### Database Setup

If running manually (without Docker):

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE jap_db;
   ```

2. **Update `.env`** in backend directory with your DB credentials

3. **Run migrations** (optional - GORM auto-migrate runs in development)
   ```bash
   # Using golang-migrate (install separately)
   migrate -path migrations -database "postgres://user:pass@localhost/jap_db?sslmode=disable" up
   ```

## 🔐 Default Credentials

**Admin Dashboard** (Phase 1-4 simple auth):
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change these credentials in production!

## 📊 API Documentation

### Base URL
```
http://localhost:8080/api/v1
```

### Endpoints

#### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs` | List all jobs (with optional filters) |
| GET | `/jobs/:id` | Get job details including requirements |
| POST | `/jobs` | Create new job (admin) |
| PUT | `/jobs/:id` | Update job (admin) |
| PATCH | `/jobs/:id/status` | Update job status (admin) |
| DELETE | `/jobs/:id` | Delete job (admin) |
| POST | `/jobs/:id/requirements` | Add form requirement (admin) |
| GET | `/jobs/:id/requirements` | Get job requirements schema |
| PUT | `/jobs/:id/requirements/:reqId` | Update requirement (admin) |
| DELETE | `/jobs/:id/requirements/:reqId` | Delete requirement (admin) |

#### Applicants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/applicants` | Register/create applicant |

#### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/applications` | Submit application |
| GET | `/applications` | List all applications (admin, filterable) |
| GET | `/applications/:id` | Get application details |
| PATCH | `/applications/:id/status` | Update status (admin) |

#### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/upload` | Upload document (multipart) |
| GET | `/documents/:id` | Get document metadata |
| DELETE | `/documents/:id` | Delete document |

#### Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verification/:docId/verify` | Mark document verified |
| POST | `/verification/:docId/reject` | Reject document with notes |
| GET | `/verification/logs` | Get audit logs (admin) |

#### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Example: Submit Application

```bash
curl -X POST http://localhost:8080/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "applicant": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+256 777 123 456"
    },
    "job_id": 1,
    "responses": [
      {
        "field_name": "full_name",
        "field_value": "John Doe"
      }
    ]
  }'
```

## 🗄 Database Schema

### Core Tables
- **jobs** - Job postings
- **job_requirements** - Dynamic form fields per job
- **applicants** - Applicant profiles
- **applications** - Job applications with status tracking
- **application_responses** - Form field answers
- **documents** - Uploaded files with hash & verification status
- **verification_logs** - Audit trail for document verification
- **users** - Admin users (Phase 5)

### Relationships
```
Job (1) → (N) JobRequirement
Job (1) → (N) Application
Applicant (1) → (N) Application
Application (1) → (N) ApplicationResponse
Application (1) → (N) Document
Document (1) → (N) VerificationLog
```

## 🔒 Security Features

### Implemented (Phase 1-4)
- ✅ File type validation (PDF, JPG, PNG only)
- ✅ File size limits (2-5MB)
- ✅ SHA-256 file hashing for duplicate detection
- ✅ IP address & user agent tracking
- ✅ Input validation on all endpoints
- ✅ Protected admin routes (simple auth)

### Planned (Phase 5)
- 🔜 JWT-based authentication
- 🔜 Role-based access control (Admin/HR)
- 🔜 Rate limiting on application submission
- 🔜 Encrypted sensitive fields (NIN)
- 🔜 HTTPS enforcement
- 🔜 Security headers (HSTS, CSP)

## 📱 Frontend Pages

### Applicant Portal
- **/** - Home page with job listings
- **/jobs/:id** - Job details
- **/jobs/:id/apply** - Application form (dynamic)
- **/confirmation/:reference** - Success confirmation

### Admin Dashboard
- **/admin** - Dashboard with stats
- **/admin/jobs** - Job management (CRUD + form builder)
- **/admin/applications** - Applications list with filters
- **/admin/applications/:id** - Application detail + verification

## 🛠 Development Commands

### Backend
```bash
cd backend

# Download dependencies
go mod download

# Run server (development)
go run cmd/server/main.go

# Run tests (future)
go test ./...

# Build binary
go build -o bin/jap cmd/server/main.go
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild images
docker-compose build --no-cache
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Browse jobs as applicant
- [ ] Apply for a job with all required fields
- [ ] Upload CV, National ID, Transcripts
- [ ] Receive confirmation with reference number
- [ ] Login to admin dashboard
- [ ] View applications list
- [ ] Filter by job and status
- [ ] View application details
- [ ] Verify/reject documents
- [ ] Check audit logs

### API Testing with curl

```bash
# Health check
curl http://localhost:8080/health

# List jobs
curl http://localhost:8080/api/v1/jobs

# Get single job
curl http://localhost:8080/api/v1/jobs/1
```

## 📈 Future Enhancements

### Phase 5+ Features
- [ ] JWT authentication with refresh tokens
- [ ] Email notifications (SendGrid/Mailgun)
- [ ] SMS notifications (Africa's Talking)
- [ ] NIN verification via NIRA API
- [ ] UNEB academic transcript verification
- [ ] Applicant accounts & status tracking
- [ ] Interview scheduling
- [ ] AI-powered document validation
- [ ] Multi-tenant SaaS architecture
- [ ] Advanced analytics & reporting
- [ ] Mobile app (React Native)

## 🐛 Troubleshooting

### Common Issues

**1. Database connection refused**
```bash
# Ensure PostgreSQL is running
docker-compose up postgres
# Or start local PostgreSQL service
```

**2. Upload directory not found**
```bash
# Create uploads directory manually
mkdir -p backend/uploads
chmod 755 backend/uploads
```

**3. Port already in use**
```bash
# Check what's using port 8080/3000/80
lsof -i :8080
# Kill process or change ports in docker-compose.yml
```

**4. Frontend can't connect to backend**
- Check backend is running on port 8080
- Verify CORS settings in backend
- Check browser console for errors

## 📄 License

This project is created for organizational use. Modify as needed for your requirements.

## 🙏 Acknowledgments

- Built for Uganda-based organizations
- Mobile-first design for low-bandwidth areas
- Compliance with Data Protection and Privacy Act

---

**Status**: Phase 1-4 Complete ✅ | Phase 5 (Security) Pending 🔜
