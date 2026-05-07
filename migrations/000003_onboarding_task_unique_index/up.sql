DELETE FROM onboarding_tasks a
USING onboarding_tasks b
WHERE a.id > b.id
  AND a.onboarding_id = b.onboarding_id
  AND a.task_key = b.task_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_task_key
ON onboarding_tasks(onboarding_id, task_key);
