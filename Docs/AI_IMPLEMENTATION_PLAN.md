# AI Features Implementation Plan

## File Structure

```
backend/
├── internal/
│   ├── ai/
│   │   ├── ai.go                    # AI service initialization
│   │   ├── openai_client.go         # OpenAI API wrapper
│   │   ├── cv_parser.go             # CV parsing logic
│   │   ├── ranking.go               # Candidate ranking algorithm
│   │   ├── fraud_detection.go       # Fraud detection engine
│   │   ├── matching.go              # Candidate matching
│   │   └── interview_summary.go     # Interview summarization
│   ├── controllers/
│   │   └── ai_controller.go         # AI API handlers
│   └── services/
│       └── ai_service.go            # Business logic layer
├── migrations/
│   └── 000004_ai_features/
│       ├── up.sql
│       └── down.sql
```

## Backend Implementation

### 1. AI Service Layer (`internal/ai/ai.go`)

```go
package ai

import (
    "context"
    "github.com/sashabaranov/go-openai"
)

type AIService struct {
    client *openai.Client
    config AIConfig
}

type AIConfig struct {
    APIKey      string
    MaxTokens   int
    Temperature float64
}

func NewAIService(config AIConfig) *AIService {
    return &AIService{
        client: openai.NewClient(config.APIKey),
        config: config,
    }
}
```

### 2. CV Parser (`internal/ai/cv_parser.go`)

```go
package ai

import (
    "context"
    "encoding/json"
)

type ParsedCV struct {
    FullName         string   `json:"full_name"`
    Email            string   `json:"email"`
    Phone            string   `json:"phone"`
    Skills           []string `json:"skills"`
    ExperienceYears  int      `json:"experience_years"`
    Education        []Education `json:"education"`
    WorkExperience   []WorkExperience `json:"work_experience"`
    ConfidenceScore  float64  `json:"confidence_score"`
}

type Education struct {
    Institution string `json:"institution"`
    Degree      string `json:"degree"`
    Year        int    `json:"year"`
}

type WorkExperience struct {
    Company   string `json:"company"`
    Role      string `json:"role"`
    StartDate string `json:"start_date"`
    EndDate   string `json:"end_date"`
}

func (s *AIService) ParseCV(ctx context.Context, text string) (*ParsedCV, error) {
    prompt := `Extract the following from this CV and return as JSON:
- full_name
- email
- phone
- skills (array)
- work_experience: [{company, role, start_date, end_date}]
- education: [{institution, degree, year}]
- total_experience_years (number)

CV Text:
` + text

    resp, err := s.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
        Model: openai.GPT4Turbo,
        Messages: []openai.ChatCompletionMessage{
            {Role: openai.ChatMessageRoleUser, Content: prompt},
        },
        MaxTokens:   s.config.MaxTokens,
        Temperature: s.config.Temperature,
    })
    
    if err != nil {
        return nil, err
    }

    var parsed ParsedCV
    if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &parsed); err != nil {
        return nil, err
    }

    return &parsed, nil
}
```

### 3. Candidate Ranking (`internal/ai/ranking.go`)

```go
package ai

type CandidateScore struct {
    ApplicationID     uint    `json:"application_id"`
    JobID             uint    `json:"job_id"`
    OverallScore      float64 `json:"overall_score"`
    SkillsMatchScore  float64 `json:"skills_match_score"`
    ExperienceScore   float64 `json:"experience_score"`
    EducationScore    float64 `json:"education_score"`
    FraudRiskScore    float64 `json:"fraud_risk_score"`
    RankingPosition   int     `json:"ranking_position"`
    Explanation       string  `json:"explanation"`
}

func (s *AIService) RankCandidates(ctx context.Context, jobID uint, applications []Application) ([]CandidateScore, error) {
    scores := make([]CandidateScore, 0, len(applications))
    
    for i, app := range applications {
        score := s.calculateScore(app, jobID)
        score.RankingPosition = i + 1
        scores = append(scores, score)
    }
    
    return scores, nil
}

func (s *AIService) calculateScore(app Application, jobID uint) CandidateScore {
    // Implementation of scoring algorithm
    // Skills match: 40%
    // Experience: 30%
    // Education: 20%
    // Fraud risk: 10%
    
    return CandidateScore{
        ApplicationID: app.ID,
        JobID: jobID,
        OverallScore: 0, // calculated value
    }
}
```

### 4. Fraud Detection (`internal/ai/fraud_detection.go`)

```go
package ai

type FraudDetectionResult struct {
    ApplicationID uint     `json:"application_id"`
    RiskScore     float64  `json:"risk_score"`
    RiskFactors   []string `json:"risk_factors"`
    Flagged       bool     `json:"flagged"`
}

func (s *AIService) DetectFraud(ctx context.Context, application Application) (*FraudDetectionResult, error) {
    factors := []string{}
    riskScore := 0.0
    
    // Check for duplicate CVs
    if s.hasDuplicateCV(application) {
        factors = append(factors, "Similar CV detected")
        riskScore += 30
    }
    
    // Check IP patterns
    if s.hasSuspiciousIP(application) {
        factors = append(factors, "Unusual IP pattern")
        riskScore += 20
    }
    
    // Check submission timing
    if s.hasSuspiciousTiming(application) {
        factors = append(factors, "Suspicious submission timing")
        riskScore += 15
    }
    
    return &FraudDetectionResult{
        ApplicationID: application.ID,
        RiskScore:     riskScore,
        RiskFactors:   factors,
        Flagged:       riskScore > 50,
    }, nil
}
```

### 5. API Controller (`internal/controllers/ai_controller.go`)

```go
package controllers

import (
    "github.com/gin-gonic/gin"
    "github.com/yourusername/jap/internal/ai"
)

type AIController struct {
    aiService *ai.AIService
}

func NewAIController(aiService *ai.AIService) *AIController {
    return &AIController{aiService: aiService}
}

func (c *AIController) ParseCV(ctx *gin.Context) {
    var req struct {
        DocumentID uint `json:"document_id" binding:"required"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    // Get document text
    text, err := c.getDocumentText(req.DocumentID)
    if err != nil {
        ctx.JSON(500, gin.H{"error": "Failed to get document text"})
        return
    }
    
    parsed, err := c.aiService.ParseCV(ctx, text)
    if err != nil {
        ctx.JSON(500, gin.H{"error": "Failed to parse CV"})
        return
    }
    
    ctx.JSON(200, parsed)
}

func (c *AIController) RankCandidates(ctx *gin.Context) {
    jobID := ctx.Param("jobId")
    // Implementation
}

func (c *AIController) GenerateJobDescription(ctx *gin.Context) {
    var req struct {
        Title           string   `json:"title" binding:"required"`
        Department      string   `json:"department" binding:"required"`
        RequiredSkills  []string `json:"required_skills"`
        ExperienceLevel string   `json:"experience_level"`
    }
    
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    description, err := c.aiService.GenerateJobDescription(ctx, req)
    if err != nil {
        ctx.JSON(500, gin.H{"error": "Failed to generate description"})
        return
    }
    
    ctx.JSON(200, description)
}
```

## Frontend Implementation

### 1. API Service (`src/services/aiApi.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export interface AIParsedCV {
  full_name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: Array<{institution: string; degree: string; year: number}>;
  work_experience: Array<{company: string; role: string; start_date: string; end_date: string}>;
  confidence_score: number;
}

export interface CandidateScore {
  application_id: number;
  applicant_name: string;
  overall_score: number;
  skills_match: number;
  experience: number;
  ranking_position: number;
}

export const aiAPI = {
  parseCV: (documentId: number) => 
    fetchAPI<AIParsedCV>(`/ai/cv-parse`, {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    }),

  rankCandidates: (jobId: number) =>
    fetchAPI<RankingResponse>(`/ai/candidate-ranking/${jobId}`),

  generateJobDescription: (data: {
    title: string;
    department: string;
    required_skills: string[];
    experience_level: string;
  }) =>
    fetchAPI<JobDescription>(`/ai/job-description`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  detectFraud: (applicationId: number) =>
    fetchAPI<FraudDetectionResult>(`/ai/fraud-detection/${applicationId}`),

  getMatches: (jobId: number) =>
    fetchAPI<MatchResult[]>(`/ai/candidate-matches/${jobId}`),
};
```

### 2. React Components

#### `src/pages/admin/AICVParser.tsx`

```tsx
import { useState } from 'react';
import { aiAPI, AIParsedCV } from '../../services/aiApi';

export default function AICVParser({ documentId }: { documentId: number }) {
  const [parsed, setParsed] = useState<AIParsedCV | null>(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    setLoading(true);
    try {
      const result = await aiAPI.parseCV(documentId);
      setParsed(result);
    } catch (error) {
      console.error('Parse failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={handleParse}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Parsing...' : 'Parse CV with AI'}
      </button>
      
      {parsed && (
        <div className="mt-4">
          <h3>Parsed Data (Confidence: {parsed.confidence_score * 100}%)</h3>
          <p><strong>Name:</strong> {parsed.full_name}</p>
          <p><strong>Email:</strong> {parsed.email}</p>
          <p><strong>Skills:</strong> {parsed.skills.join(', ')}</p>
          <p><strong>Experience:</strong> {parsed.experience_years} years</p>
        </div>
      )}
    </div>
  );
}
```

#### `src/pages/admin/CandidateRanking.tsx`

```tsx
import { useEffect, useState } from 'react';
import { aiAPI, CandidateScore } from '../../services/aiApi';

export default function CandidateRanking({ jobId }: { jobId: number }) {
  const [rankings, setRankings] = useState<CandidateScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [jobId]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const data = await aiAPI.rankCandidates(jobId);
      setRankings(data.rankings);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading rankings...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Applicant</th>
            <th>Overall Score</th>
            <th>Skills Match</th>
            <th>Experience</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => (
            <tr key={r.application_id}>
              <td>{r.ranking_position}</td>
              <td>{r.applicant_name}</td>
              <td>
                <div className="flex items-center gap-2">
                  <progress 
                    className="progress progress-primary w-20" 
                    value={r.overall_score} 
                    max="100" 
                  />
                  <span>{r.overall_score}</span>
                </div>
              </td>
              <td>{r.skills_match}%</td>
              <td>{r.experience}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Database Migrations

### `migrations/000004_ai_features/up.sql`

```sql
-- AI Parsed Data
CREATE TABLE ai_parsed_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    application_id UUID REFERENCES applications(id),
    parsed_json JSONB,
    skills TEXT[],
    experience_years INTEGER,
    education_level TEXT,
    extracted_text TEXT,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidate Scores
CREATE TABLE candidate_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id),
    job_id UUID REFERENCES jobs(id),
    overall_score DECIMAL(5,2),
    skills_match_score DECIMAL(5,2),
    experience_score DECIMAL(5,2),
    education_score DECIMAL(5,2),
    fraud_risk_score DECIMAL(5,2),
    ranking_position INTEGER,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Interview Summaries
CREATE TABLE interview_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id),
    interview_type TEXT,
    transcript TEXT,
    summary TEXT,
    key_points JSONB,
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud Detection Logs
CREATE TABLE fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id),
    document_id UUID REFERENCES documents(id),
    risk_score DECIMAL(5,2),
    risk_factors JSONB,
    flagged BOOLEAN,
    reviewed BOOLEAN,
    reviewed_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Job Descriptions
CREATE TABLE job_descriptions_ai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    generated_description TEXT,
    prompt_used TEXT,
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidate Matches
CREATE TABLE candidate_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID REFERENCES applicants(id),
    job_id UUID REFERENCES jobs(id),
    match_score DECIMAL(5,2),
    matching_skills TEXT[],
    missing_skills TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_parsed_data_application ON ai_parsed_data(application_id);
CREATE INDEX idx_candidate_scores_job ON candidate_scores(job_id);
CREATE INDEX idx_fraud_detection_flagged ON fraud_detection_logs(flagged);
```

## Environment Configuration

### `.env.example` (additions)

```env
# AI Services
OPENAI_API_KEY=your-openai-api-key
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7

# Feature Flags
AI_CV_PARSING_ENABLED=true
AI_RANKING_ENABLED=true
AI_FRAUD_DETECTION_ENABLED=true
```

## Testing Strategy

### Unit Tests

```go
func TestParseCV(t *testing.T) {
    service := NewAIService(testConfig)
    
    tests := []struct {
        name     string
        input    string
        expected ParsedCV
    }{
        {
            name: "valid CV",
            input: "John Doe\nEmail: john@example.com\nSkills: Go, React",
            expected: ParsedCV{
                FullName: "John Doe",
                Email: "john@example.com",
                Skills: []string{"Go", "React"},
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := service.ParseCV(context.Background(), tt.input)
            assert.NoError(t, err)
            assert.Equal(t, tt.expected.FullName, result.FullName)
        })
    }
}
```

## Deployment Considerations

1. **Rate Limiting**: Implement per-user rate limits for AI endpoints
2. **Caching**: Cache parsed CVs for 30 days to reduce API calls
3. **Fallback**: Provide manual entry option if AI service is unavailable
4. **Monitoring**: Track token usage and costs
5. **Error Handling**: Graceful degradation when AI services fail