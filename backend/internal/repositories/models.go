package repositories

import (
	"database/sql/driver"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// Custom time type to handle datetime-local format (without seconds)
type LocalTime struct {
	time.Time
}

func (lt *LocalTime) UnmarshalJSON(b []byte) error {
	s := string(b)
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}

	formats := []string{
		"2006-01-02T15:04",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:00",
	}

	var parsed time.Time
	var err error
	for _, format := range formats {
		parsed, err = time.Parse(format, s)
		if err == nil {
			lt.Time = parsed
			return nil
		}
	}

	return err
}

func (lt *LocalTime) Scan(value interface{}) error {
	if value == nil {
		*lt = LocalTime{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		*lt = LocalTime{v}
		return nil
	}
	return fmt.Errorf("unsupported type for LocalTime: %T", value)
}

func (lt LocalTime) Value() (driver.Value, error) {
	if lt.Time.IsZero() {
		return nil, nil
	}
	return lt.Time, nil
}

func (lt LocalTime) MarshalJSON() ([]byte, error) {
	return []byte(`"` + lt.Time.Format("2006-01-02T15:04") + `"`), nil
}

// Job represents a job posting
type Job struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"size:255;not null"`
	Department  string         `json:"department" gorm:"size:100;not null"`
	Description string         `json:"description" gorm:"type:text;not null"`
	Location    string         `json:"location" gorm:"size:255;default:'Kampala'"`
	Deadline    LocalTime      `json:"deadline" gorm:"not null;type:timestamptz"`
	Status      string         `json:"status" gorm:"size:20;default:'open';index"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	Requirements []JobRequirement `json:"requirements,omitempty" gorm:"foreignKey:JobID;constraint:OnDelete:CASCADE;"`
	Applications []Application    `json:"-" gorm:"foreignKey:JobID;constraint:OnDelete:CASCADE;"`
}

// JobRequirement represents a dynamic form field for a job
type JobRequirement struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	JobID     uint      `json:"job_id" gorm:"not null;index"`
	Job       Job       `json:"-" gorm:"foreignKey:JobID;constraint:OnDelete:CASCADE;"`
	FieldName string    `json:"field_name" gorm:"size:100;not null"`
	FieldType string    `json:"field_type" gorm:"size:50;not null"`
	Label     string    `json:"label" gorm:"size:255;not null"`
	Required  bool      `json:"required" gorm:"default:false"`
	Options   string    `json:"options,omitempty" gorm:"type:json"`
	Order     int       `json:"order" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Applicant represents a person applying for a job
type Applicant struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	FullName  string         `json:"full_name" gorm:"size:255;not null;index"`
	Email     string         `json:"email" gorm:"size:255;not null;uniqueIndex"`
	Phone     string         `json:"phone" gorm:"size:50;not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Applications []Application `json:"-" gorm:"foreignKey:ApplicantID;constraint:OnDelete:CASCADE;"`
}

// Application represents a job application
type Application struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	JobID       uint      `json:"job_id" gorm:"not null;index"`
	ApplicantID uint      `json:"applicant_id" gorm:"not null;index"`
	Status      string    `json:"status" gorm:"size:20;default:'applied';index"`
	SubmittedAt time.Time `json:"submitted_at" gorm:"not null"`
	IPAddress   string    `json:"ip_address" gorm:"size:45"`
	UserAgent   string    `json:"user_agent" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Job       Job       `json:"job" gorm:"foreignKey:JobID"`
	Applicant Applicant `json:"applicant" gorm:"foreignKey:ApplicantID"`

	// ✅ Restored — needed for GET responses. POST binding uses inline structs so no conflict.
	Responses []ApplicationResponse `json:"responses,omitempty" gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE;"`
	Documents []Document            `json:"documents,omitempty" gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE;"`
}

// ApplicationResponse stores answers to dynamic form fields
type ApplicationResponse struct {
	ID            uint        `json:"id" gorm:"primaryKey"`
	ApplicationID uint        `json:"application_id" gorm:"not null;index"`
	Application   Application `json:"-" gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE;"`
	FieldName     string      `json:"field_name" gorm:"size:100;not null"`
	FieldValue    string      `json:"field_value" gorm:"type:text"`
	FileID        *uint       `json:"file_id,omitempty"`
	CreatedAt     time.Time   `json:"created_at"`
}

// Document represents an uploaded file
type Document struct {
	ID            uint        `json:"id" gorm:"primaryKey"`
	ApplicationID uint        `json:"application_id" gorm:"not null;index"`
	Application   Application `json:"-" gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE;"`
	DocType       string      `json:"doc_type" gorm:"size:50;not null"`
	FileName      string      `json:"file_name" gorm:"size:255;not null"`
	StoredName    string      `json:"stored_name" gorm:"size:255;not null;unique"`
	FilePath      string      `json:"file_path" gorm:"size:500;not null"`
	FileSize      int64       `json:"file_size" gorm:"not null"`
	MimeType      string      `json:"mime_type" gorm:"size:100;not null"`
	FileHash      string      `json:"file_hash" gorm:"size:64;not null;index"`
	Status        string      `json:"status" gorm:"size:20;default:'pending';index"`
	UploadedAt    time.Time   `json:"uploaded_at" gorm:"not null"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`

	VerificationLogs []VerificationLog `json:"verification_logs,omitempty" gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE;"`
}

// VerificationLog tracks document verification actions
type VerificationLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	DocumentID uint      `json:"document_id" gorm:"not null;index"`
	Document   Document  `json:"-" gorm:"foreignKey:DocumentID;constraint:OnDelete:CASCADE;"`
	OldStatus  string    `json:"old_status"`
	NewStatus  string    `json:"new_status" gorm:"not null"`
	VerifiedBy string    `json:"verified_by" gorm:"size:100;not null"`
	Notes      string    `json:"notes" gorm:"type:text"`
	CreatedAt  time.Time `json:"created_at" gorm:"not null"`
}