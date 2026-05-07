CREATE TABLE IF NOT EXISTS application_status_logs (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_status_logs_application_id ON application_status_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_logs_new_status ON application_status_logs(new_status);
CREATE INDEX IF NOT EXISTS idx_application_status_logs_created_at ON application_status_logs(created_at);

CREATE TABLE IF NOT EXISTS email_notifications (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    delivery_status VARCHAR(20) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_application_id ON email_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_delivery_status ON email_notifications(delivery_status);

CREATE TABLE IF NOT EXISTS onboardings (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    applicant_id BIGINT NOT NULL REFERENCES applicants(id),
    job_id BIGINT NOT NULL REFERENCES jobs(id),
    department VARCHAR(100) NOT NULL,
    start_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboardings_applicant_id ON onboardings(applicant_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_job_id ON onboardings(job_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_status ON onboardings(status);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id BIGSERIAL PRIMARY KEY,
    onboarding_id BIGINT NOT NULL REFERENCES onboardings(id) ON DELETE CASCADE,
    task_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_onboarding_id ON onboarding_tasks(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_completed ON onboarding_tasks(completed);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_task_key ON onboarding_tasks(onboarding_id, task_key);
