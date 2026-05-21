package ai

import (
	"context"
)

// AIService is the central AI service that holds the configuration.
type AIService struct {
	Model string
	Ctx   context.Context
}

// NewAIService creates and returns a new AIService instance using the application config.
func NewAIService() *AIService {
	return &AIService{
		Model: "mock",
		Ctx:   context.Background(),
	}
}
