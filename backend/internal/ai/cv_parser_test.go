package ai

import (
	"context"
	"testing"
)

func TestParseCV(t *testing.T) {
	service := NewAIService()

	// Test empty CV text
	_, err := service.ParseCV(context.Background(), "")
	if err == nil {
		t.Error("Expected error for empty CV text")
	}

	// Test non-empty CV text
	cvText := `
	John Doe
	john.doe@example.com
	+1234567890
	Skills: Go, Python, SQL, React, Docker
	Education:
		University of Technology, Bachelor of Science in Computer Science, 2018
	Work Experience:
		Tech Corp, Senior Software Engineer, 2020-01 to 2024-01
		Startup Inc, Software Developer, 2018-06 to 2019-12
	`
	parsed, err := service.ParseCV(context.Background(), cvText)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Check that we got the mock data
	if parsed.FullName != "John Doe" {
		t.Errorf("Expected full_name 'John Doe', got '%s'", parsed.FullName)
	}
	if parsed.Email != "john.doe@example.com" {
		t.Errorf("Expected email 'john.doe@example.com', got '%s'", parsed.Email)
	}
	if parsed.Phone != "+1234567890" {
		t.Errorf("Expected phone '+1234567890', got '%s'", parsed.Phone)
	}
	if parsed.ExperienceYears != 5 {
		t.Errorf("Expected experience_years 5, got %d", parsed.ExperienceYears)
	}
	if parsed.ConfidenceScore != 0.95 {
		t.Errorf("Expected confidence_score 0.95, got %f", parsed.ConfidenceScore)
	}
	// Check that the extracted text is set
	if parsed.ExtractedText != cvText {
		t.Error("ExtractedText should match input cvText")
	}
	// Check skills (order may vary, but we can check for presence)
	expectedSkills := map[string]bool{
		"Go": true, "Python": true, "SQL": true, "React": true, "Docker": true,
	}
	for _, skill := range parsed.Skills {
		if !expectedSkills[skill] {
			t.Errorf("Unexpected skill: %s", skill)
		}
		delete(expectedSkills, skill)
	}
	if len(expectedSkills) != 0 {
		t.Errorf("Missing skills: %v", expectedSkills)
	}
	// Check education
	if len(parsed.Education) != 1 {
		t.Errorf("Expected 1 education entry, got %d", len(parsed.Education))
	} else {
		if parsed.Education[0].Institution != "University of Technology" {
			t.Errorf("Expected institution 'University of Technology', got '%s'", parsed.Education[0].Institution)
		}
		if parsed.Education[0].Degree != "Bachelor of Science in Computer Science" {
			t.Errorf("Expected degree 'Bachelor of Science in Computer Science', got '%s'", parsed.Education[0].Degree)
		}
		if parsed.Education[0].Year != 2018 {
			t.Errorf("Expected year 2018, got %d", parsed.Education[0].Year)
		}
	}
	// Check work experience
	if len(parsed.WorkExperience) != 2 {
		t.Errorf("Expected 2 work experience entries, got %d", len(parsed.WorkExperience))
	} else {
		// First job
		if parsed.WorkExperience[0].Company != "Tech Corp" {
			t.Errorf("Expected company 'Tech Corp', got '%s'", parsed.WorkExperience[0].Company)
		}
		if parsed.WorkExperience[0].Role != "Senior Software Engineer" {
			t.Errorf("Expected role 'Senior Software Engineer', got '%s'", parsed.WorkExperience[0].Role)
		}
		if parsed.WorkExperience[0].StartDate != "2020-01" {
			t.Errorf("Expected start_date '2020-01', got '%s'", parsed.WorkExperience[0].StartDate)
		}
		if parsed.WorkExperience[0].EndDate != "2024-01" {
			t.Errorf("Expected end_date '2024-01', got '%s'", parsed.WorkExperience[0].EndDate)
		}
		// Second job
		if parsed.WorkExperience[1].Company != "Startup Inc" {
			t.Errorf("Expected company 'Startup Inc', got '%s'", parsed.WorkExperience[1].Company)
		}
		if parsed.WorkExperience[1].Role != "Software Developer" {
			t.Errorf("Expected role 'Software Developer', got '%s'", parsed.WorkExperience[1].Role)
		}
		if parsed.WorkExperience[1].StartDate != "2018-06" {
			t.Errorf("Expected start_date '2018-06', got '%s'", parsed.WorkExperience[1].StartDate)
		}
		if parsed.WorkExperience[1].EndDate != "2019-12" {
			t.Errorf("Expected end_date '2019-12', got '%s'", parsed.WorkExperience[1].EndDate)
		}
	}
}