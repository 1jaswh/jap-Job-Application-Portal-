package repositories

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// AIParsedDataRepository handles database operations for ai_parsed_data.
type AIParsedDataRepository struct {
	db *gorm.DB
}

func NewAIParsedDataRepository(db *gorm.DB) *AIParsedDataRepository {
	return &AIParsedDataRepository{db: db}
}

// Save stores or updates parsed CV data for a given document/application.
func (r *AIParsedDataRepository) Save(data *AIParsedData) error {
	return r.db.Save(data).Error
}

// GetByDocumentID retrieves parsed data by document ID.
func (r *AIParsedDataRepository) GetByDocumentID(docID uint) (*AIParsedData, error) {
	var data AIParsedData
	err := r.db.Where("document_id = ?", docID).First(&data).Error
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// GetByApplicationID retrieves parsed data by application ID.
func (r *AIParsedDataRepository) GetByApplicationID(appID uint) (*AIParsedData, error) {
	var data AIParsedData
	err := r.db.Where("application_id = ?", appID).First(&data).Error
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// Scan implements the sql.Scanner interface for JSONB fields stored as driver.Value.
func (a *AIParsedData) Scan(value interface{}) error {
	if value == nil {
		*a = AIParsedData{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		*a = AIParsedData{CreatedAt: v, UpdatedAt: v}
		return nil
	}
	return fmt.Errorf("unsupported type for AIParsedData: %T", value)
}

func (a AIParsedData) Value() (driver.Value, error) {
	return nil, fmt.Errorf("AIParsedData is not a database value type")
}

// MarshalJSON serialises ParsedJSON for API responses.
func (a AIParsedData) MarshalJSON() ([]byte, error) {
	type Alias AIParsedData
	return json.Marshal(&struct {
		Alias
		ParsedJSON map[string]any `json:"parsed_json"`
	}{
		Alias:      Alias(a),
		ParsedJSON: a.ParsedJSON,
	})
}
