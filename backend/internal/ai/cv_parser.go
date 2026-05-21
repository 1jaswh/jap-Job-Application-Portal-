package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// ParsedCV holds the structured data extracted from a CV by the AI.
type ParsedCV struct {
	FullName        string   `json:"full_name"`
	Email           string   `json:"email"`
	Phone           string   `json:"phone"`
	Skills          []string `json:"skills"`
	ExperienceYears int      `json:"experience_years"`
	Education       []struct {
		Institution string `json:"institution"`
		Degree      string `json:"degree"`
		Year        int    `json:"year"`
	} `json:"education"`
	WorkExperience []struct {
		Company   string `json:"company"`
		Role      string `json:"role"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	} `json:"work_experience"`
	ConfidenceScore float64 `json:"confidence_score"`
	ExtractedText   string  `json:"extracted_text"`
}

// cvParsePrompt is the system prompt used to instruct the LLM on how to parse a CV.
const cvParsePrompt = `You are an expert CV/resume parser. Extract structured information from the CV text provided below and return ONLY a valid JSON object with the following fields:
- full_name: the candidate's full name
- email: the candidate's email address
- phone: the candidate's phone number
- skills: an array of skill strings mentioned in the CV
- work_experience: an array of objects with fields company, role, start_date, end_date
- education: an array of objects with fields institution, degree, year
- experience_years: total years of professional experience as an integer
- confidence_score: a number between 0 and 1 indicating how confident you are in the extraction

Return ONLY the JSON object, no additional text.`

// ParseCV sends the raw CV text to the AI service and returns a ParsedCV struct.
// This is a mock implementation that returns sample data for testing.
func (s *AIService) ParseCV(ctx context.Context, cvText string) (*ParsedCV, error) {
	if strings.TrimSpace(cvText) == "" {
		return nil, fmt.Errorf("cv text is empty")
	}

	// Mock implementation - returns sample parsed data
	// In production, this would call the actual AI API (Gemini/OpenAI)
	mockResponse := map[string]interface{}{
		"full_name":         "John Doe",
		"email":             "john.doe@example.com",
		"phone":             "+1234567890",
		"skills":            []string{"Go", "Python", "SQL", "React", "Docker"},
		"experience_years":  5,
		"education": []map[string]interface{}{
			{
				"institution": "University of Technology",
				"degree":      "Bachelor of Science in Computer Science",
				"year":        2018,
			},
		},
		"work_experience": []map[string]interface{}{
			{
				"company":    "Tech Corp",
				"role":       "Senior Software Engineer",
				"start_date": "2020-01",
				"end_date":   "2024-01",
			},
			{
				"company":    "Startup Inc",
				"role":       "Software Developer",
				"start_date": "2018-06",
				"end_date":   "2019-12",
			},
		},
		"confidence_score": 0.95,
	}

	// Convert to JSON and back to ParsedCV
	jsonData, err := json.Marshal(mockResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal mock response: %w", err)
	}

	var parsed ParsedCV
	if err := json.Unmarshal(jsonData, &parsed); err != nil {
		return nil, fmt.Errorf("failed to unmarshal mock response: %w", err)
	}

	parsed.ExtractedText = cvText
	return &parsed, nil
}
