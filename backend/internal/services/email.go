package services

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"github.com/yourusername/jap/internal/config"
)

type StatusEmailData struct {
	ApplicantName string
	JobTitle      string
	Department    string
	Status        string
}

type EmailMessage struct {
	To      string
	Subject string
	Body    string
}

type SendResult struct {
	DeliveryStatus string
	ErrorMessage   string
}

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) RenderStatusEmail(data StatusEmailData) EmailMessage {
	statusLabel := statusDisplay(data.Status)
	subject := fmt.Sprintf("Application update: %s", data.JobTitle)

	body := fmt.Sprintf("Hello %s,\n\nYour application for %s in the %s department has been updated to: %s.\n\n",
		data.ApplicantName, data.JobTitle, data.Department, statusLabel)

	switch data.Status {
	case "shortlisted":
		body += "Congratulations. You have been shortlisted, and our HR team will contact you with the next steps.\n\n"
	case "hired":
		body += "Congratulations. You have been marked as hired. Our HR team will contact you with onboarding details.\n\n"
	case "rejected":
		body += "Thank you for your interest and the time you invested in applying. We wish you success in your job search.\n\n"
	}

	body += "Regards,\nJob Application Portal"
	return EmailMessage{Subject: subject, Body: body}
}

func statusDisplay(status string) string {
	if status == "" {
		return ""
	}
	return strings.ToUpper(status[:1]) + strings.ReplaceAll(status[1:], "_", " ")
}

func (s *EmailService) Send(message EmailMessage) SendResult {
	if !s.smtpReady() {
		log.Printf("SMTP disabled or incomplete; logging email to=%s subject=%q\n%s", message.To, message.Subject, message.Body)
		return SendResult{DeliveryStatus: "logged"}
	}

	fromName := s.cfg.SMTPFromName
	if fromName == "" {
		fromName = "Job Application Portal"
	}

	headers := map[string]string{
		"From":         fmt.Sprintf("%s <%s>", fromName, s.cfg.SMTPFrom),
		"To":           message.To,
		"Subject":      message.Subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/plain; charset=\"utf-8\"",
	}

	var raw strings.Builder
	for key, value := range headers {
		raw.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
	}
	raw.WriteString("\r\n")
	raw.WriteString(message.Body)

	addr := s.cfg.SMTPHost + ":" + s.cfg.SMTPPort
	auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	if err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{message.To}, []byte(raw.String())); err != nil {
		log.Printf("failed to send status email to=%s: %v", message.To, err)
		return SendResult{DeliveryStatus: "failed", ErrorMessage: err.Error()}
	}

	return SendResult{DeliveryStatus: "sent"}
}

func (s *EmailService) smtpReady() bool {
	if s == nil || s.cfg == nil {
		return false
	}
	if strings.ToLower(s.cfg.SMTPEnabled) != "true" {
		return false
	}
	return s.cfg.SMTPHost != "" &&
		s.cfg.SMTPPort != "" &&
		s.cfg.SMTPUsername != "" &&
		s.cfg.SMTPPassword != "" &&
		s.cfg.SMTPFrom != ""
}
