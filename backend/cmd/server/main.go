package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/yourusername/jap/internal/config"
	"github.com/yourusername/jap/internal/middleware"
	"github.com/yourusername/jap/internal/repositories"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Connect to database
	db, err := repositories.ConnectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate tables
	if err := db.AutoMigrate(
		&repositories.Job{},
		&repositories.JobRequirement{},
		&repositories.Applicant{},
		&repositories.Application{},
		&repositories.ApplicationResponse{},
		&repositories.Document{},
		&repositories.VerificationLog{},
		&repositories.ApplicationStatusLog{},
		&repositories.EmailNotification{},
		&repositories.Onboarding{},
		&repositories.OnboardingTask{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize repositories
	jobRepo := repositories.NewJobRepository(db)
	applicantRepo := repositories.NewApplicantRepository(db)
	applicationRepo := repositories.NewApplicationRepository(db)
	documentRepo := repositories.NewDocumentRepository(db)
	verificationRepo := repositories.NewVerificationRepository(db)
	onboardingRepo := repositories.NewOnboardingRepository(db)
	reportRepo := repositories.NewReportRepository(db)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Middleware
	router.Use(cors.Default())
	router.Use(requestid.New())
	router.Use(middleware.LoggerMiddleware(logger))
	router.Use(middleware.RecoveryMiddleware(logger))

	// Auto-close expired jobs on every request
	router.Use(repositories.DeadlineEnforcementMiddleware(db))

	// Serve uploaded files statically
	router.Static("/uploads", config.AppConfig.UploadPath)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Job routes
		v1.GET("/jobs", jobRepo.GetAllJobs())
		v1.GET("/jobs/:id", jobRepo.GetJobByID())
		v1.POST("/jobs", jobRepo.CreateJob())
		v1.PUT("/jobs/:id", jobRepo.UpdateJob())
		v1.PATCH("/jobs/:id/status", jobRepo.UpdateJobStatus())
		v1.DELETE("/jobs/:id", jobRepo.DeleteJob())

		// Job requirements
		v1.POST("/jobs/:id/requirements", jobRepo.AddRequirement())
		v1.GET("/jobs/:id/requirements", jobRepo.GetRequirements())
		v1.PUT("/jobs/:id/requirements/:reqId", jobRepo.UpdateRequirement())
		v1.DELETE("/jobs/:id/requirements/:reqId", jobRepo.DeleteRequirement())

		// Applicant routes
		v1.POST("/applicants", applicantRepo.CreateApplicant())

		// Application routes
		v1.POST("/applications", applicationRepo.SubmitApplication())
		v1.GET("/applications", applicationRepo.GetAllApplications())
		v1.GET("/applications/:id", applicationRepo.GetApplicationByID())
		v1.PATCH("/applications/:id/status", applicationRepo.UpdateStatus())

		// Document routes
		v1.POST("/documents/upload", documentRepo.UploadDocument())
		v1.GET("/documents/:id", documentRepo.GetDocument())
		v1.DELETE("/documents/:id", documentRepo.DeleteDocument())

		// Verification routes
		v1.POST("/verification/:docId/verify", verificationRepo.VerifyDocument())
		v1.POST("/verification/:docId/reject", verificationRepo.RejectDocument())
		v1.GET("/verification/logs", verificationRepo.GetAuditLogs())

		// Onboarding routes
		v1.GET("/onboarding", onboardingRepo.GetAll())
		v1.GET("/onboarding/:id", onboardingRepo.GetByID())
		v1.PATCH("/onboarding/:id", onboardingRepo.Update())
		v1.PATCH("/onboarding/:id/tasks/:taskId", onboardingRepo.UpdateTask())

		// Reporting routes
		v1.GET("/reports/summary", reportRepo.Summary())
		v1.GET("/reports/applications-per-job", reportRepo.ApplicationsPerJob())
		v1.GET("/reports/rejection-rates", reportRepo.RejectionRates())
		v1.GET("/reports/time-to-hire", reportRepo.TimeToHire())
	}

	// Start server
	port := config.GetEnv("PORT", "8080")
	logger.Info("Starting server", zap.String("port", port))
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}