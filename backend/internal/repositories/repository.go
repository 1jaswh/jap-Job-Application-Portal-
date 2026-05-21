package repositories

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/jap/internal/config"
	"github.com/yourusername/jap/internal/services"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	return &ApplicationRepository{
		BaseRepository: &BaseRepository{DB: db},
		emailService:   services.NewEmailService(config.AppConfig),
	}
}

type ApplicationRepository struct {
	*BaseRepository
	emailService *services.EmailService
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
			Preload("Responses").Preload("Documents").Preload("Onboarding.Tasks").
			First(&application, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Application not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		if application.Status == "hired" && application.Onboarding == nil {
			if err := createDefaultOnboarding(r.DB, application); err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			r.DB.Preload("Job").Preload("Applicant").
				Preload("Responses").Preload("Documents").Preload("Onboarding.Tasks").
				First(&application, application.ID)
		}
		c.JSON(200, application)
	}
}

func (r *ApplicationRepository) UpdateStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var application Application
		if err := r.DB.Preload("Job").Preload("Applicant").First(&application, id).Error; err != nil {
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

		oldStatus := application.Status
		if oldStatus == req.Status {
			if req.Status == "hired" {
				if err := createDefaultOnboarding(r.DB, application); err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				r.DB.Preload("Job").Preload("Applicant").Preload("Onboarding.Tasks").First(&application, application.ID)
			}
			c.JSON(200, application)
			return
		}

		tx := r.DB.Begin()
		if tx.Error != nil {
			c.JSON(500, gin.H{"error": tx.Error.Error()})
			return
		}

		application.Status = req.Status
		if err := tx.Save(&application).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		statusLog := ApplicationStatusLog{
			ApplicationID: application.ID,
			OldStatus:     oldStatus,
			NewStatus:     req.Status,
			ChangedBy:     c.GetString("admin_user"),
			CreatedAt:     time.Now(),
		}
		if err := tx.Create(&statusLog).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if req.Status == "hired" {
			if err := createDefaultOnboarding(tx, application); err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		if shouldNotifyStatus(req.Status) {
			r.recordStatusEmail(application, req.Status)
		}

		r.DB.Preload("Job").Preload("Applicant").Preload("Onboarding.Tasks").First(&application, application.ID)
		c.JSON(200, application)
	}
}

func shouldNotifyStatus(status string) bool {
	return status == "shortlisted" || status == "hired" || status == "rejected"
}

func (r *ApplicationRepository) recordStatusEmail(application Application, status string) {
	if r.emailService == nil {
		r.emailService = services.NewEmailService(config.AppConfig)
	}

	message := r.emailService.RenderStatusEmail(services.StatusEmailData{
		ApplicantName: application.Applicant.FullName,
		JobTitle:      application.Job.Title,
		Department:    application.Job.Department,
		Status:        status,
	})
	message.To = application.Applicant.Email
	result := r.emailService.Send(message)

	var sentAt *time.Time
	if result.DeliveryStatus == "sent" || result.DeliveryStatus == "logged" {
		now := time.Now()
		sentAt = &now
	}

	notification := EmailNotification{
		ApplicationID:  application.ID,
		Recipient:      application.Applicant.Email,
		Status:         status,
		Subject:        message.Subject,
		Body:           message.Body,
		DeliveryStatus: result.DeliveryStatus,
		ErrorMessage:   result.ErrorMessage,
		SentAt:         sentAt,
	}
	if err := r.DB.Create(&notification).Error; err != nil {
		fmt.Println("Failed to record email notification:", err)
	}
}

func createDefaultOnboarding(tx *gorm.DB, application Application) error {
	onboarding := Onboarding{
		ApplicationID: application.ID,
		ApplicantID:   application.ApplicantID,
		JobID:         application.JobID,
		Department:    application.Job.Department,
		Status:        "pending",
	}
	if err := tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "application_id"}},
		DoNothing: true,
	}).Create(&onboarding).Error; err != nil {
		return err
	}

	if err := tx.Where("application_id = ?", application.ID).First(&onboarding).Error; err != nil {
		return err
	}

	tasks := []OnboardingTask{
		{OnboardingID: onboarding.ID, TaskKey: "collect_additional_documents", Title: "Collect additional documents"},
		{OnboardingID: onboarding.ID, TaskKey: "assign_department", Title: "Assign department"},
		{OnboardingID: onboarding.ID, TaskKey: "set_start_date", Title: "Set start date"},
	}
	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "onboarding_id"}, {Name: "task_key"}},
		DoNothing: true,
	}).Create(&tasks).Error
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

// GetByID fetches a single document record by its primary key.
func (r *DocumentRepository) GetByID(id int) (*Document, error) {
	var doc Document
	err := r.DB.First(&doc, id).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
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

// NewOnboardingRepository creates onboarding repository.
func NewOnboardingRepository(db *gorm.DB) *OnboardingRepository {
	return &OnboardingRepository{BaseRepository: &BaseRepository{DB: db}}
}

type OnboardingRepository struct {
	*BaseRepository
}

func (r *OnboardingRepository) GetAll() gin.HandlerFunc {
	return func(c *gin.Context) {
		var records []Onboarding
		query := r.DB.Preload("Tasks").Preload("Applicant").Preload("Job").Preload("Application")

		if applicationID := c.Query("application_id"); applicationID != "" {
			query = query.Where("application_id = ?", applicationID)
		}

		if err := query.Order("created_at DESC").Find(&records).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, records)
	}
}

func (r *OnboardingRepository) GetByID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var record Onboarding
		if err := r.DB.Preload("Tasks").Preload("Applicant").Preload("Job").Preload("Application").First(&record, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Onboarding record not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, record)
	}
}

func (r *OnboardingRepository) Update() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var record Onboarding
		if err := r.DB.First(&record, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Onboarding record not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Department string `json:"department"`
			StartDate  string `json:"start_date"`
			Status     string `json:"status" binding:"omitempty,oneof=pending in_progress completed"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if req.Department != "" {
			record.Department = req.Department
		}
		if req.Status != "" {
			record.Status = req.Status
		}
		if req.StartDate != "" {
			startDate, err := parseDate(req.StartDate)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
				return
			}
			record.StartDate = &startDate
		}

		if err := r.DB.Save(&record).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		r.DB.Preload("Tasks").Preload("Applicant").Preload("Job").Preload("Application").First(&record, record.ID)
		c.JSON(200, record)
	}
}

func (r *OnboardingRepository) UpdateTask() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		taskID := c.Param("taskId")

		var task OnboardingTask
		if err := r.DB.First(&task, "id = ? AND onboarding_id = ?", taskID, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(404, gin.H{"error": "Onboarding task not found"})
				return
			}
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		var req struct {
			Completed bool `json:"completed"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		task.Completed = req.Completed
		if req.Completed {
			now := time.Now()
			task.CompletedAt = &now
		} else {
			task.CompletedAt = nil
		}

		if err := r.DB.Save(&task).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		updateOnboardingCompletion(r.DB, task.OnboardingID)
		c.JSON(200, task)
	}
}

// NewReportRepository creates report repository.
func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{BaseRepository: &BaseRepository{DB: db}}
}

type ReportRepository struct {
	*BaseRepository
}

func (r *ReportRepository) Summary() gin.HandlerFunc {
	return func(c *gin.Context) {
		var totalApplications, shortlisted, hired, rejected int64
		r.DB.Model(&Application{}).Count(&totalApplications)
		r.DB.Model(&Application{}).Where("status = ?", "shortlisted").Count(&shortlisted)
		r.DB.Model(&Application{}).Where("status = ?", "hired").Count(&hired)
		r.DB.Model(&Application{}).Where("status = ?", "rejected").Count(&rejected)

		rejectionRate := 0.0
		if totalApplications > 0 {
			rejectionRate = float64(rejected) / float64(totalApplications) * 100
		}

		c.JSON(200, gin.H{
			"total_applications": totalApplications,
			"shortlisted":        shortlisted,
			"hired":              hired,
			"rejected":           rejected,
			"rejection_rate":     round2(rejectionRate),
		})
	}
}

func (r *ReportRepository) ApplicationsPerJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		var rows []struct {
			JobID        uint   `json:"job_id"`
			JobTitle     string `json:"job_title"`
			Department   string `json:"department"`
			Applications int64  `json:"applications"`
		}

		if err := r.DB.Table("jobs").
			Select("jobs.id AS job_id, jobs.title AS job_title, jobs.department AS department, COUNT(applications.id) AS applications").
			Joins("LEFT JOIN applications ON applications.job_id = jobs.id").
			Group("jobs.id, jobs.title, jobs.department").
			Order("applications DESC, jobs.title ASC").
			Scan(&rows).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, rows)
	}
}

func (r *ReportRepository) RejectionRates() gin.HandlerFunc {
	return func(c *gin.Context) {
		var totalApplications, totalRejected int64
		r.DB.Model(&Application{}).Count(&totalApplications)
		r.DB.Model(&Application{}).Where("status = ?", "rejected").Count(&totalRejected)

		var byJob []struct {
			JobID         uint    `json:"job_id"`
			JobTitle      string  `json:"job_title"`
			Applications  int64   `json:"applications"`
			Rejected      int64   `json:"rejected"`
			RejectionRate float64 `json:"rejection_rate"`
		}

		if err := r.DB.Table("jobs").
			Select(`jobs.id AS job_id,
				jobs.title AS job_title,
				COUNT(applications.id) AS applications,
				COUNT(CASE WHEN applications.status = 'rejected' THEN 1 END) AS rejected,
				CASE WHEN COUNT(applications.id) = 0 THEN 0 ELSE COUNT(CASE WHEN applications.status = 'rejected' THEN 1 END) * 100.0 / COUNT(applications.id) END AS rejection_rate`).
			Joins("LEFT JOIN applications ON applications.job_id = jobs.id").
			Group("jobs.id, jobs.title").
			Order("rejection_rate DESC, jobs.title ASC").
			Scan(&byJob).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		overall := 0.0
		if totalApplications > 0 {
			overall = float64(totalRejected) / float64(totalApplications) * 100
		}

		for i := range byJob {
			byJob[i].RejectionRate = round2(byJob[i].RejectionRate)
		}

		c.JSON(200, gin.H{
			"overall_rejection_rate": round2(overall),
			"total_applications":     totalApplications,
			"total_rejected":         totalRejected,
			"by_job":                 byJob,
		})
	}
}

func (r *ReportRepository) TimeToHire() gin.HandlerFunc {
	return func(c *gin.Context) {
		var rows []struct {
			ApplicationID uint      `json:"application_id"`
			JobID         uint      `json:"job_id"`
			JobTitle      string    `json:"job_title"`
			ApplicantName string    `json:"applicant_name"`
			SubmittedAt   time.Time `json:"submitted_at"`
			HiredAt       time.Time `json:"hired_at"`
			DaysToHire    float64   `json:"days_to_hire"`
		}

		if err := r.DB.Table("application_status_logs").
			Select(`applications.id AS application_id,
				jobs.id AS job_id,
				jobs.title AS job_title,
				applicants.full_name AS applicant_name,
				applications.submitted_at AS submitted_at,
				MIN(application_status_logs.created_at) AS hired_at,
				EXTRACT(EPOCH FROM (MIN(application_status_logs.created_at) - applications.submitted_at)) / 86400 AS days_to_hire`).
			Joins("JOIN applications ON applications.id = application_status_logs.application_id").
			Joins("JOIN jobs ON jobs.id = applications.job_id").
			Joins("JOIN applicants ON applicants.id = applications.applicant_id").
			Where("application_status_logs.new_status = ?", "hired").
			Group("applications.id, jobs.id, jobs.title, applicants.full_name, applications.submitted_at").
			Order("hired_at DESC").
			Scan(&rows).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		average := 0.0
		for i := range rows {
			rows[i].DaysToHire = round2(rows[i].DaysToHire)
			average += rows[i].DaysToHire
		}
		if len(rows) > 0 {
			average = average / float64(len(rows))
		}

		c.JSON(200, gin.H{
			"average_days_to_hire": round2(average),
			"hires":                rows,
		})
	}
}

// Helper functions
func mustParseUint(s string) uint {
	val, _ := strconv.ParseUint(s, 10, 32)
	return uint(val)
}

func parseDate(value string) (time.Time, error) {
	if parsed, err := time.Parse("2006-01-02", value); err == nil {
		return parsed, nil
	}
	return time.Parse("2006-01-02T15:04", value)
}

func updateOnboardingCompletion(db *gorm.DB, onboardingID uint) {
	var total, completed int64
	db.Model(&OnboardingTask{}).Where("onboarding_id = ?", onboardingID).Count(&total)
	db.Model(&OnboardingTask{}).Where("onboarding_id = ? AND completed = ?", onboardingID, true).Count(&completed)

	status := "pending"
	if completed > 0 {
		status = "in_progress"
	}
	if total > 0 && completed == total {
		status = "completed"
	}
	db.Model(&Onboarding{}).Where("id = ?", onboardingID).Update("status", status)
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func generateUUID() string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		time.Now().UnixNano()&0xFFFFFFFF,
		time.Now().UnixNano()>>32&0xFFFF,
		time.Now().UnixNano()>>48&0xFFFF,
		time.Now().UnixNano()>>64&0xFFFF,
		time.Now().UnixNano()>>80&0xFFFFFFFFFFFF)
}
