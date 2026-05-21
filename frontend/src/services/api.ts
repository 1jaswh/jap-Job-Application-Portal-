const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export interface Job {
  id: number;
  title: string;
  department: string;
  description: string;
  location: string;
  deadline: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  requirements?: JobRequirement[];
}

export interface JobRequirement {
  id: number;
  job_id: number;
  field_name: string;
  field_type: 'text' | 'number' | 'dropdown' | 'file';
  label: string;
  required: boolean;
  options?: string[];
  order: number;
}

export interface Applicant {
  id: number;
  full_name: string;
  email: string;
  phone: string;
}

export interface Application {
  id: number;
  job_id: number;
  applicant_id: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'hired' | 'rejected';
  submitted_at: string;
  ip_address?: string;
  job?: Job;
  applicant?: Applicant;
  responses?: ApplicationResponse[];
  documents?: Document[];
  onboarding?: Onboarding;
}

export interface ApplicationResponse {
  id: number;
  application_id: number;
  field_name: string;
  field_value?: string;
  file_id?: number;
}

export interface Document {
  id: number;
  application_id: number;
  doc_type: 'cv' | 'national_id' | 'transcript';
  file_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  status: 'pending' | 'verified' | 'rejected';
  uploaded_at: string;
  verification_logs?: VerificationLog[];
}

export interface VerificationLog {
  id: number;
  document_id: number;
  old_status: string | null;
  new_status: string;
  verified_by: string;
  notes: string | null;
  created_at: string;
}

export interface EmailNotification {
  id: number;
  application_id: number;
  recipient: string;
  status: string;
  subject: string;
  body: string;
  delivery_status: 'sent' | 'logged' | 'failed';
  error_message?: string;
  sent_at?: string;
}

export interface OnboardingTask {
  id: number;
  onboarding_id: number;
  task_key: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

export interface Onboarding {
  id: number;
  application_id: number;
  applicant_id: number;
  job_id: number;
  department: string;
  start_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  application?: Application;
  applicant?: Applicant;
  job?: Job;
  tasks?: OnboardingTask[];
}

export interface ReportSummary {
  total_applications: number;
  shortlisted: number;
  hired: number;
  rejected: number;
  rejection_rate: number;
}

export interface ApplicationsPerJobReport {
  job_id: number;
  job_title: string;
  department: string;
  applications: number;
}

export interface RejectionRateByJob {
  job_id: number;
  job_title: string;
  applications: number;
  rejected: number;
  rejection_rate: number;
}

export interface RejectionRatesReport {
  overall_rejection_rate: number;
  total_applications: number;
  total_rejected: number;
  by_job: RejectionRateByJob[];
}

export interface TimeToHireItem {
  application_id: number;
  job_id: number;
  job_title: string;
  applicant_name: string;
  submitted_at: string;
  hired_at: string;
  days_to_hire: number;
}

export interface TimeToHireReport {
  average_days_to_hire: number;
  hires: TimeToHireItem[];
}

export interface AIParsedCVResponse {
  id: number;
  document_id: number;
  application_id?: number;
  parsed_json: Record<string, any>;
  skills: string[];
  experience_years?: number;
  education_level: string;
  confidence_score?: number;
  created_at: string;
}

export interface SubmitApplicationRequest {
  applicant: {
    full_name: string;
    email: string;
    phone: string;
  };
  job_id: number;
  responses: Array<{
    field_name: string;
    field_value: string;
    file_id?: number;
  }>;
  documents: Array<{
    id: number;
  }>;
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Jobs API
export const jobsAPI = {
  getAll: (status?: string) => fetchAPI<Job[]>(`/jobs?status=${status || ''}`),
  getById: (id: number) => fetchAPI<Job>(`/jobs/${id}`),
  create: (data: Partial<Job>) => fetchAPI<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<Job>) => fetchAPI<Job>(`/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateStatus: (id: number, status: string) => fetchAPI<Job>(`/jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  delete: (id: number) => fetchAPI<{ message: string }>(`/jobs/${id}`, {
    method: 'DELETE',
  }),
  addRequirement: (jobId: number, data: Partial<JobRequirement>) => fetchAPI<JobRequirement>(`/jobs/${jobId}/requirements`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Applicants API
export const applicantsAPI = {
  create: (data: Partial<Applicant>) => fetchAPI<Applicant>('/applicants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Applications API
export const applicationsAPI = {
  submit: (data: SubmitApplicationRequest) => fetchAPI<{ message: string; reference: string; application: Application }>('/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAll: (filters?: { job_id?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.job_id) params.append('job_id', filters.job_id.toString());
    if (filters?.status) params.append('status', filters.status);
    return fetchAPI<Application[]>(`/applications?${params.toString()}`);
  },
  getById: (id: number) => fetchAPI<Application>(`/applications/${id}`),
  updateStatus: (id: number, status: string) => fetchAPI<Application>(`/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};

// Documents API
export const documentsAPI = {
  upload: (formData: FormData) => {
    return fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      return res.json();
    });
  },
  getById: (id: number) => fetchAPI<Document>(`/documents/${id}`),
  delete: (id: number) => fetchAPI<{ message: string }>(`/documents/${id}`, {
    method: 'DELETE',
  }),
};

// Verification API
export const verificationAPI = {
  verify: (docId: number, notes?: string) => fetchAPI<Document>(`/verification/${docId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),
  reject: (docId: number, notes: string) => fetchAPI<Document>(`/verification/${docId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),
  getLogs: () => fetchAPI<VerificationLog[]>('/verification/logs'),
};

// Onboarding API
export const onboardingAPI = {
  getAll: (filters?: { application_id?: number }) => {
    const params = new URLSearchParams();
    if (filters?.application_id) params.append('application_id', filters.application_id.toString());
    const query = params.toString();
    return fetchAPI<Onboarding[]>(`/onboarding${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchAPI<Onboarding>(`/onboarding/${id}`),
  update: (id: number, data: Partial<Pick<Onboarding, 'department' | 'start_date' | 'status'>>) => fetchAPI<Onboarding>(`/onboarding/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  updateTask: (id: number, taskId: number, completed: boolean) => fetchAPI<OnboardingTask>(`/onboarding/${id}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  }),
};

// Reports API
export const reportsAPI = {
  summary: () => fetchAPI<ReportSummary>('/reports/summary'),
  applicationsPerJob: () => fetchAPI<ApplicationsPerJobReport[]>('/reports/applications-per-job'),
  rejectionRates: () => fetchAPI<RejectionRatesReport>('/reports/rejection-rates'),
  timeToHire: () => fetchAPI<TimeToHireReport>('/reports/time-to-hire'),
};

// AI API
export const aiAPI = {
  parseCV: (documentId: number) => 
    fetchAPI<AIParsedCVResponse>(`/ai/parse-cv`, {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    }),
  getParsedCV: (documentId: number) => 
    fetchAPI<AIParsedCVResponse>(`/ai/parsed/${documentId}`),
};
