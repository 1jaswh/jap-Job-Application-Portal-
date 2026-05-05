package repositories

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"bytes"
	//"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	//"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/yourusername/jap/internal/config"
)

// Base repository with common CRUD operations
type BaseRepository struct {
	DB *gorm.DB
}

func (r *BaseRepository) Create(record interface{}) error {
	return r.DB.Create(record).Error
}

func (r *BaseRepository) Update(record interface{}) error {
	return r.DB.Save(record).Error
}

func (r *BaseRepository) Delete(record interface{}) error {
	return r.DB.Delete(record).Error
}

func (r *BaseRepository) First(dest interface{}, conditions ...interface{}) error {
	return r.DB.First(dest, conditions...).Error
}

func (r *BaseRepository) Find(dest interface{}, conditions ...interface{}) error {
	return r.DB.Find(dest, conditions...).Error
}

// ConnectDB establishes connection to PostgreSQL
func ConnectDB() (*gorm.DB, error) {
	cfg := config.AppConfig
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName, cfg.DBSSL)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Set connection pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	return db, nil
}

// NewJobRepository creates a new job repository
func NewJobRepository(db *gorm.DB) *JobRepository {
	return &JobRepository{BaseRepository: &BaseRepository{DB: db}}
}

type JobRepository struct {
	*BaseRepository
}

func (r *JobRepository) GetAllJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		var jobs []Job
		// Filter by status if provided
		status := c.Query("status")
		query := r.DB.Preload("Requirements")

		if status != "" {
			query = query.Where("status = ?", status)
		}

		if err := query.Find(&jobs).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, jobs)
	}
}

func (r *JobRepository) GetJobByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var job Job
		if err := r.DB.Preload("Requirements").First(&job, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Job not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, job)
	}
}

func (r *JobRepository) CreateJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Title       string `json:"title" binding:"required"`
			Department  string `json:"department" binding:"required"`
			Description string `json:"description" binding:"required"`
			Location    string `json:"location"`
			Deadline    string `json:"deadline" binding:"required"`
			Status      string `json:"status"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Parse deadline - accept datetime-local format (no seconds) or full ISO
		deadline, err := time.Parse("2006-01-02T15:04", req.Deadline)
		if err != nil {
			deadline, err = time.Parse("2006-01-02T15:04:05", req.Deadline)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid deadline format. Use YYYY-MM-DDTHH:MM"})
				return
			}
		}

		job := Job{
			Title:       req.Title,
			Department:  req.Department,
			Description: req.Description,
			Location:    req.Location,
			Deadline:    LocalTime{deadline},
			Status:      req.Status,
		}

		if err := r.DB.Create(&job).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(201, job)
	}
}

func (r *JobRepository) UpdateJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var job Job
		if err := r.DB.First(&job, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Job not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Title       string `json:"title"`
			Department  string `json:"department"`
			Description string `json:"description"`
			Location    string `json:"location"`
			Deadline    string `json:"deadline"`
			Status      string `json:"status"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Update fields if provided
		if req.Title != "" {
			job.Title = req.Title
		}
		if req.Department != "" {
			job.Department = req.Department
		}
		if req.Description != "" {
			job.Description = req.Description
		}
		if req.Location != "" {
			job.Location = req.Location
		}
		if req.Deadline != "" {
			deadline, err := time.Parse("2006-01-02T15:04", req.Deadline)
			if err != nil {
				deadline, err = time.Parse("2006-01-02T15:04:05", req.Deadline)
				if err != nil {
					c.JSON(400, gin.H{"error": "Invalid deadline format. Use YYYY-MM-DDTHH:MM"})
					return
				}
			}
			job.Deadline = LocalTime{deadline}
		}
		if req.Status != "" {
			job.Status = req.Status
		}

		if err := r.DB.Save(&job).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, job)
	}
}

func (r *JobRepository) UpdateJobStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var job Job
		if err := r.DB.First(&job, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Job not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Status string `json:"status" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		job.Status = req.Status
		if err := r.DB.Save(&job).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, job)
	}
}

func (r *JobRepository) DeleteJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var job Job
		if err := r.DB.First(&job, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Job not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if err := r.DB.Delete(&job).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"message": "Job deleted successfully"})
	}
}

// Requirement methods
func (r *JobRepository) AddRequirement() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID := c.Param("id")
		var req JobRequirement
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		req.JobID = mustParseUint(jobID)

		if err := r.DB.Create(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(201, req)
	}
}

func (r *JobRepository) GetRequirements() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID := c.Param("id")
		var requirements []JobRequirement
		if err := r.DB.Where("job_id = ?", jobID).Order("order ASC").Find(&requirements).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"requirements": requirements})
	}
}

func (r *JobRepository) UpdateRequirement() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID := c.Param("id")
		reqID := c.Param("reqId")

		var existing JobRequirement
		if err := r.DB.First(&existing, "id = ? AND job_id = ?", reqID, jobID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Requirement not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var updates JobRequirement
		if err := c.ShouldBindJSON(&updates); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		existing.FieldName = updates.FieldName
		existing.FieldType = updates.FieldType
		existing.Label = updates.Label
		existing.Required = updates.Required
		existing.Options = updates.Options
		existing.Order = updates.Order

		if err := r.DB.Save(&existing).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, existing)
	}
}

func (r *JobRepository) DeleteRequirement() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID := c.Param("id")
		reqID := c.Param("reqId")

		var req JobRequirement
		if err := r.DB.First(&req, "id = ? AND job_id = ?", reqID, jobID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Requirement not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if err := r.DB.Delete(&req).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"message": "Requirement deleted"})
	}
}

// NewApplicantRepository creates applicant repository
func NewApplicantRepository(db *gorm.DB) *ApplicantRepository {
	return &ApplicantRepository{BaseRepository: &BaseRepository{DB: db}}
}

type ApplicantRepository struct {
	*BaseRepository
}

func (r *ApplicantRepository) CreateApplicant() gin.HandlerFunc {
	return func(c *gin.Context) {
		var applicant Applicant
		if err := c.ShouldBindJSON(&applicant); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Check for duplicate email
		var count int64
		r.DB.Model(&Applicant{}).Where("email = ?", applicant.Email).Count(&count)
		if count > 0 {
			c.JSON(409, gin.H{"error": "Email already registered"})
			return
		}

		if err := r.DB.Create(&applicant).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(201, applicant)
	}
}

// NewApplicationRepository creates application repository
func NewApplicationRepository(db *gorm.DB) *ApplicationRepository {
	return &ApplicationRepository{BaseRepository: &BaseRepository{DB: db}}
}

type ApplicationRepository struct {
	*BaseRepository
}

func (r *ApplicationRepository) SubmitApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		//no DB model types that cause JSON unmarshalling conflicts
		var req struct {
			Applicant struct {
				FullName string `json:"full_name" binding:"required"`
				Email    string `json:"email" binding:"required"`
				Phone    string `json:"phone" binding:"required"`
			} `json:"applicant" binding:"required"`
			JobID     uint `json:"job_id" binding:"required"`
			Responses []struct {
				FieldName  string `json:"field_name"`
				FieldValue string `json:"field_value"`
				FileID     *uint  `json:"file_id,omitempty"`
			} `json:"responses"`
			Documents []struct {
				ID uint `json:"id"`
			} `json:"documents"`
		}
//Debug lines
		body, _ := io.ReadAll(c.Request.Body)
		fmt.Println("RAW BODY:", string(body))
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Check if job exists and is open
		var job Job
		if err := r.DB.First(&job, req.JobID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Job not found"})
			return
		}
		if job.Status != "open" {
			c.JSON(400, gin.H{"error": "Job is not accepting applications"})
			return
		}

		// Check for duplicate application (same email + job)
		var existingApp Application
		if err := r.DB.Joins("JOIN applicants ON applicants.id = applications.applicant_id").
			Where("applicants.email = ? AND applications.job_id = ?", req.Applicant.Email, req.JobID).
			First(&existingApp).Error; err == nil {
			c.JSON(409, gin.H{"error": "You have already applied for this job"})
			return
		}

		// Start transaction
		tx := r.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Create or find applicant
		var applicant Applicant
		if err := tx.Where("email = ?", req.Applicant.Email).First(&applicant).Error; err != nil {
			applicant = Applicant{
				FullName: req.Applicant.FullName,
				Email:    req.Applicant.Email,
				Phone:    req.Applicant.Phone,
			}
			if err := tx.Create(&applicant).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
		}

		// Create application
		application := Application{
			JobID:       req.JobID,
			ApplicantID: applicant.ID,
			Status:      "applied",
			SubmittedAt: time.Now(),
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
		}
		if err := tx.Create(&application).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// Save responses
		for _, resp := range req.Responses {
			appResp := ApplicationResponse{
				ApplicationID: application.ID,
				FieldName:     resp.FieldName,
				FieldValue:    resp.FieldValue,
			}
			if resp.FileID != nil {
				appResp.FileID = resp.FileID
			}
			if err := tx.Create(&appResp).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
		}

		// Link documents to application (for pre-uploaded docs)
		for _, docUpload := range req.Documents {
			if err := tx.Model(&Document{}).Where("id = ?", docUpload.ID).
				Update("application_id", application.ID).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		// Generate reference number
		reference := fmt.Sprintf("JAP-%d-%d", application.ID, time.Now().Unix())
		c.JSON(201, gin.H{
			"message":     "Application submitted successfully",
			"reference":   reference,
			"application": application,
		})
	}
}

func (r *ApplicationRepository) GetAllApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		var applications []Application
		query := r.DB.Preload("Job").Preload("Applicant").Preload("Documents")

		// Filter by job
		if jobID := c.Query("job_id"); jobID != "" {
			query = query.Where("job_id = ?", jobID)
		}

		// Filter by status
		if status := c.Query("status"); status != "" {
			query = query.Where("status = ?", status)
		}

		// Pagination
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		offset := (page - 1) * limit

		var total int64
		r.DB.Model(&Application{}).Count(&total)

		if err := query.Offset(offset).Limit(limit).Order("submitted_at DESC").Find(&applications).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, applications)
	}
}

func (r *ApplicationRepository) GetApplicationByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var application Application
		if err := r.DB.Preload("Job").Preload("Applicant").
			Preload("Responses").Preload("Documents").
			First(&application, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Application not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, application)
	}
}

func (r *ApplicationRepository) UpdateStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var application Application
		if err := r.DB.First(&application, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Application not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Status string `json:"status" binding:"required,oneof=applied shortlisted interview hired rejected"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		application.Status = req.Status
		if err := r.DB.Save(&application).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, application)
	}
}

// NewDocumentRepository creates document repository
func NewDocumentRepository(db *gorm.DB) *DocumentRepository {
	return &DocumentRepository{BaseRepository: &BaseRepository{DB: db}}
}

type DocumentRepository struct {
	*BaseRepository
}

type DocumentUpload struct {
	ID       uint      `json:"id,omitempty"`
	File     io.Reader `json:"-"`
	FileName string    `json:"file_name"`
	FileSize int64     `json:"file_size"`
	MimeType string    `json:"mime_type"`
	DocType  string    `json:"doc_type" binding:"required,oneof=cv national_id transcript"`
}

func (r *DocumentRepository) UploadDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get form data
		docType := c.PostForm("doc_type")
		applicationID := c.PostForm("application_id")

		// Validate doc_type
		if docType == "" {
			c.JSON(400, gin.H{"error": "doc_type is required"})
			return
		}

		// Validate application_id
		appID, err := strconv.ParseUint(applicationID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "valid application_id is required"})
			return
		}

		// Check if application exists
		var application Application
		if err := r.DB.First(&application, appID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Application not found"})
			return
		}

		// Get uploaded file
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "File is required"})
			return
		}
		defer file.Close()

		// Validate file size (5MB)
		maxSize := int64(5 * 1024 * 1024)
		if header.Size > maxSize {
			c.JSON(400, gin.H{"error": "File too large. Max 5MB"})
			return
		}

		// Validate MIME type
		allowedTypes := map[string]bool{
			"application/pdf": true,
			"image/jpeg":      true,
			"image/png":       true,
		}
		buffer := make([]byte, 512)
		file.Read(buffer)
		file.Seek(0, 0)

		mimeType := http.DetectContentType(buffer)
		if !allowedTypes[mimeType] {
			c.JSON(400, gin.H{"error": "Invalid file type. Only PDF, JPG, PNG allowed"})
			return
		}

		// Generate SHA-256 hash
		hash := sha256.New()
		if _, err := io.Copy(hash, file); err != nil {
			c.JSON(500, gin.H{"error": "Failed to process file"})
			return
		}
		fileHash := hex.EncodeToString(hash.Sum(nil))
		file.Seek(0, 0)

		// Check for duplicate file hash
		var existingDoc Document
		if err := r.DB.Where("file_hash = ?", fileHash).First(&existingDoc).Error; err == nil {
			c.JSON(409, gin.H{"error": "Duplicate file detected. This file has already been uploaded."})
			return
		}

		// Generate unique filename
		storedName := fmt.Sprintf("%s_%d%s", generateUUID(), time.Now().Unix(), filepath.Ext(header.Filename))
		uploadPath := config.AppConfig.UploadPath
		filePath := filepath.Join(uploadPath, storedName)

		// Save file
		if err := c.SaveUploadedFile(header, filePath); err != nil {
			c.JSON(500, gin.H{"error": "Failed to save file"})
			return
		}

		// Create document record
		document := Document{
			ApplicationID: uint(appID),
			DocType:       docType,
			FileName:      header.Filename,
			StoredName:    storedName,
			FilePath:      filePath,
			FileSize:      header.Size,
			MimeType:      mimeType,
			FileHash:      fileHash,
			Status:        "pending",
			UploadedAt:    time.Now(),
		}

		if err := r.DB.Create(&document).Error; err != nil {
			os.Remove(filePath)
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(201, document)
	}
}

func (r *DocumentRepository) GetDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var document Document
		if err := r.DB.First(&document, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Document not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, document)
	}
}

func (r *DocumentRepository) DeleteDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var document Document
		if err := r.DB.First(&document, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Document not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if err := os.Remove(document.FilePath); err != nil {
			fmt.Println("Failed to delete file:", err)
		}

		if err := r.DB.Delete(&document).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"message": "Document deleted"})
	}
}

// NewVerificationRepository creates verification repository
func NewVerificationRepository(db *gorm.DB) *VerificationRepository {
	return &VerificationRepository{BaseRepository: &BaseRepository{DB: db}}
}

type VerificationRepository struct {
	*BaseRepository
}

func (r *VerificationRepository) VerifyDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		docID := c.Param("docId")
		var document Document
		if err := r.DB.First(&document, docID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Document not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		oldStatus := document.Status
		document.Status = "verified"

		if err := r.DB.Save(&document).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		adminUser := c.GetString("admin_user")
		log := VerificationLog{
			DocumentID: document.ID,
			OldStatus:  oldStatus,
			NewStatus:  "verified",
			VerifiedBy: adminUser,
			Notes:      "Document verified",
			CreatedAt:  time.Now(),
		}
		r.DB.Create(&log)

		c.JSON(200, document)
	}
}

func (r *VerificationRepository) RejectDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		docID := c.Param("docId")
		var document Document
		if err := r.DB.First(&document, docID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Document not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Notes string `json:"notes"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		oldStatus := document.Status
		document.Status = "rejected"

		if err := r.DB.Save(&document).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		adminUser := c.GetString("admin_user")
		log := VerificationLog{
			DocumentID: document.ID,
			OldStatus:  oldStatus,
			NewStatus:  "rejected",
			VerifiedBy: adminUser,
			Notes:      req.Notes,
			CreatedAt:  time.Now(),
		}
		r.DB.Create(&log)

		c.JSON(200, document)
	}
}

func (r *VerificationRepository) GetAuditLogs() gin.HandlerFunc {
	return func(c *gin.Context) {
		var logs []VerificationLog
		if err := r.DB.Preload("Document").Order("created_at DESC").Find(&logs).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"logs": logs})
	}
}

// Helper functions
func mustParseUint(s string) uint {
	val, _ := strconv.ParseUint(s, 10, 32)
	return uint(val)
}

func generateUUID() string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		time.Now().UnixNano()&0xFFFFFFFF,
		time.Now().UnixNano()>>32&0xFFFF,
		time.Now().UnixNano()>>48&0xFFFF,
		time.Now().UnixNano()>>64&0xFFFF,
		time.Now().UnixNano()>>80&0xFFFFFFFFFFFF)
}