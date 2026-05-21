package controllers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/jap/internal/ai"
	"github.com/yourusername/jap/internal/repositories"
	"go.uber.org/zap"
)

// AIController handles AI-related HTTP endpoints.
type AIController struct {
	aiService        *ai.AIService
	aiParsedDataRepo *repositories.AIParsedDataRepository
	documentRepo     *repositories.DocumentRepository
	applicationRepo  *repositories.ApplicationRepository
	logger           *zap.Logger
}

// NewAIController creates a new AIController.
func NewAIController(
	aiService *ai.AIService,
	aiParsedDataRepo *repositories.AIParsedDataRepository,
	documentRepo *repositories.DocumentRepository,
	applicationRepo *repositories.ApplicationRepository,
	logger *zap.Logger,
) *AIController {
	return &AIController{
		aiService:        aiService,
		aiParsedDataRepo: aiParsedDataRepo,
		documentRepo:     documentRepo,
		applicationRepo:  applicationRepo,
		logger:           logger,
	}
}

// ParseCVRequest is the request body for the CV parse endpoint.
type ParseCVRequest struct {
	DocumentID uint `json:"document_id" binding:"required"`
}

// ParseCVResponse is the response body for the CV parse endpoint.
type ParseCVResponse struct {
	ID              uint           `json:"id"`
	DocumentID      uint           `json:"document_id"`
	ApplicationID   *uint          `json:"application_id,omitempty"`
	ParsedJSON      map[string]any  `json:"parsed_json"`
	Skills          []string       `json:"skills"`
	ExperienceYears *int           `json:"experience_years,omitempty"`
	EducationLevel  string         `json:"education_level"`
	ConfidenceScore *float64       `json:"confidence_score,omitempty"`
	CreatedAt       string         `json:"created_at"`
}

// ParseCV handles POST /api/v1/ai/parse-cv
// It fetches the document record, reads the file content, sends it to OpenAI,
// and persists the structured result in ai_parsed_data.
func (ctrl *AIController) ParseCV(c *gin.Context) {
	var req ParseCVRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch the document record from the database
	doc, err := ctrl.documentRepo.GetByID(int(req.DocumentID))
	if err != nil {
		ctrl.logger.Error("document not found", zap.Uint("document_id", req.DocumentID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
		return
	}

	// Read the file content from disk.
	// NOTE: For Phase 1 we read the file as plain text.
	// PDF/DOCX binary extraction will be added in a later phase.
	fileContent, err := os.ReadFile(doc.FilePath)
	if err != nil {
		ctrl.logger.Error("failed to read CV file", zap.String("path", doc.FilePath), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read CV file"})
		return
	}

	// Parse the CV via OpenAI
	parsed, err := ctrl.aiService.ParseCV(c.Request.Context(), string(fileContent))
	if err != nil {
		ctrl.logger.Error("CV parsing failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "CV parsing failed: " + err.Error()})
		return
	}

	// Build education level string from the first education entry
	eduLevel := ""
	if len(parsed.Education) > 0 {
		eduLevel = parsed.Education[0].Degree
	}

	// Serialise the full parsed struct as JSON for storage
	parsedJSONBytes, _ := json.Marshal(parsed)

	// Determine application_id from the document
	var appID *uint
	if doc.ApplicationID != 0 {
		id := doc.ApplicationID
		appID = &id
	}

	// Persist to database
	record := &repositories.AIParsedData{
		DocumentID:      &doc.ID,
		ApplicationID:   appID,
		ParsedJSON:      map[string]any{"data": string(parsedJSONBytes)},
		Skills:          parsed.Skills,
		ExperienceYears: &parsed.ExperienceYears,
		EducationLevel:  eduLevel,
		ExtractedText:   parsed.ExtractedText,
		ConfidenceScore: &parsed.ConfidenceScore,
	}
	if err := ctrl.aiParsedDataRepo.Save(record); err != nil {
		ctrl.logger.Error("failed to save parsed data", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save parsed data"})
		return
	}

	ctrl.logger.Info("CV parsed successfully",
		zap.Uint("document_id", doc.ID),
		zap.Float64("confidence", parsed.ConfidenceScore))

	// Return the actual parsed data (not the storage format) in the response
	responseParsedJSON := map[string]any{
		"full_name": parsed.FullName,
		"email":     parsed.Email,
		"phone":     parsed.Phone,
		"skills":    parsed.Skills,
		"experience_years": parsed.ExperienceYears,
		"education": parsed.Education,
		"work_experience": parsed.WorkExperience,
		"confidence_score": parsed.ConfidenceScore,
		"extracted_text": parsed.ExtractedText,
	}

	c.JSON(http.StatusOK, ParseCVResponse{
		ID:              record.ID,
		DocumentID:      doc.ID,
		ApplicationID:   appID,
		ParsedJSON:      responseParsedJSON,
		Skills:          parsed.Skills,
		ExperienceYears: &parsed.ExperienceYears,
		EducationLevel:  eduLevel,
		ConfidenceScore: &parsed.ConfidenceScore,
		CreatedAt:       record.CreatedAt.Format(time.RFC3339),
	})
}

// GetParsedCV handles GET /api/v1/ai/parsed/:documentId
func (ctrl *AIController) GetParsedCV(c *gin.Context) {
	docID, err := strconv.ParseUint(c.Param("documentId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
		return
	}

	data, err := ctrl.aiParsedDataRepo.GetByDocumentID(uint(docID))
	if err != nil {
		ctrl.logger.Warn("parsed data not found", zap.Uint64("document_id", docID), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "parsed data not found"})
		return
	}

	c.JSON(http.StatusOK, data)
}
