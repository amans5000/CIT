import { ApiResponse, UserRole } from '@cit9/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown> | null,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match && match[3] ? decodeURIComponent(match[3]) : null;
}

export function setCsrfToken(token: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cit_csrf_token', token);
    } catch {
      // ignore storage errors
    }
  }
}

export function getCsrfToken(): string | null {
  const cookieVal = getCookie('cit_csrf');
  if (cookieVal) return cookieVal;
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('cit_csrf_token');
    } catch {
      return null;
    }
  }
  return null;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes HttpOnly session cookies
  });

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    json = {
      success: response.ok,
      error: {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown server response',
      },
    };
  }

  if (!response.ok || !json.success) {
    const error = json.error || {
      code: 'HTTP_ERROR',
      message: response.statusText || 'Request failed',
    };
    throw new ApiClientError(error.code, error.message, error.details, response.status);
  }

  return json;
}

// -----------------------------------------------------------------------------
// Authentication API
// -----------------------------------------------------------------------------

export async function mockLoginApi(email: string, role: UserRole = UserRole.PARTICIPANT) {
  const res = await apiFetch<{
    userId: string;
    email: string;
    role: UserRole;
    csrfToken: string;
    expiresAt: string;
  }>('/auth/mock-login', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  if (res.data?.csrfToken) {
    setCsrfToken(res.data.csrfToken);
  }
  return res.data;
}

export async function getSessionApi() {
  const res = await apiFetch<{
    user: { id: string; email: string; role: UserRole };
  }>('/auth/session');
  return res.data?.user || null;
}

export async function logoutApi() {
  await apiFetch('/auth/logout', { method: 'POST' });
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('cit_csrf_token');
    } catch {
      // ignore
    }
  }
}

// -----------------------------------------------------------------------------
// Profile & User API
// -----------------------------------------------------------------------------

export interface UserMeResponse {
  id: string;
  email: string;
  role: UserRole;
  profile?: {
    fullName: string;
    displayName: string;
    mobile: string;
    instituteName: string;
    department?: string | null;
    yearOfStudy: string;
    isCompleted: boolean;
  } | null;
}

export async function getMeApi(): Promise<UserMeResponse | null> {
  const res = await apiFetch<UserMeResponse>('/users/me');
  return res.data || null;
}

export async function updateProfileApi(data: {
  fullName: string;
  displayName: string;
  mobile: string;
  instituteName: string;
  department?: string;
  yearOfStudy: string;
}) {
  const res = await apiFetch('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

// -----------------------------------------------------------------------------
// Assessments & Slots API
// -----------------------------------------------------------------------------

export interface SlotInfo {
  id: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
  capacity: number;
  isAvailable?: boolean;
}

export interface RoundInfo {
  id: string;
  roundType: 'PRELIMINARY' | 'FINAL';
  roundNumber: number;
  positiveScore: number;
  negativeScore: number;
  durationMinutes: number;
  graceSeconds: number;
  slots: SlotInfo[];
}

export interface ActiveAssessmentInfo {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  rounds: RoundInfo[];
}

export async function getActiveAssessmentApi(): Promise<ActiveAssessmentInfo | null> {
  const res = await apiFetch<ActiveAssessmentInfo>('/assessments/active');
  return res.data || null;
}

// -----------------------------------------------------------------------------
// Attempts & Question Delivery
// -----------------------------------------------------------------------------

export interface AttemptInfo {
  id: string;
  userId: string;
  roundId: string;
  slotId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'DISQUALIFIED';
  currentQuestion: number;
  score: number;
  isQualified: boolean;
  startedAt?: string | null;
  submittedAt?: string | null;
  slot?: SlotInfo;
}

export async function selectSlotApi(slotId: string) {
  const res = await apiFetch<AttemptInfo>('/attempts/select-slot', {
    method: 'POST',
    body: JSON.stringify({ slotId }),
  });
  return res.data;
}

export async function startAttemptApi(roundId: string) {
  const res = await apiFetch<AttemptInfo>('/attempts/start', {
    method: 'POST',
    body: JSON.stringify({ roundId }),
  });
  return res.data;
}

export async function getCurrentAttemptApi(): Promise<AttemptInfo | null> {
  const res = await apiFetch<AttemptInfo | null>('/attempts/current');
  return res.data || null;
}

export interface QuestionData {
  id: string;
  orderIndex: number;
  promptText: string;
  imageUrl?: string | null;
  options: {
    id: string;
    optionIndex: number;
    optionText: string;
  }[];
  totalQuestions: number;
  selectedOptionId?: string | null;
}

export async function getQuestionApi(roundId: string, orderIndex: number): Promise<QuestionData> {
  const res = await apiFetch<QuestionData>(`/attempts/round/${roundId}/question/${orderIndex}`);
  return res.data!;
}

export async function submitAnswerApi(dto: {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  timeTakenMs?: number;
}) {
  const res = await apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function finishAttemptApi(attemptId: string) {
  const res = await apiFetch<AttemptInfo>(`/attempts/${attemptId}/finish`, {
    method: 'POST',
  });
  return res.data;
}

// -----------------------------------------------------------------------------
// Leaderboard & Qualification
// -----------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  instituteName: string;
  score?: number | null;
  submittedAt?: string | null;
}

export async function getSlotLeaderboardApi(slotId: string, page = 1, limit = 50) {
  const res = await apiFetch<{
    items: LeaderboardEntry[];
    total: number;
    page: number;
    limit: number;
    isMasked: boolean;
  }>(`/leaderboard/slots/${slotId}?page=${page}&limit=${limit}`);
  return res.data;
}

export async function getFinalsLeaderboardApi(page = 1, limit = 50) {
  const res = await apiFetch<{
    items: LeaderboardEntry[];
    total: number;
    page: number;
    limit: number;
  }>(`/leaderboard/finals?page=${page}&limit=${limit}`);
  return res.data;
}

export async function checkMyQualificationApi() {
  const res = await apiFetch<{
    isQualified: boolean;
    hasAttempt: boolean;
    status?: string;
    score?: number;
  }>('/qualification/me');
  return res.data;
}

// -----------------------------------------------------------------------------
// Admin APIs
// -----------------------------------------------------------------------------

export async function getAdminUsersApi(page = 1, limit = 20) {
  const res = await apiFetch<{
    items: any[];
    total: number;
  }>(`/admin/users?page=${page}&limit=${limit}`);
  return res.data;
}

export async function updateUserRoleApi(userId: string, role: UserRole) {
  const res = await apiFetch(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return res.data;
}

export async function getAuditLogsApi(page = 1, limit = 50) {
  const res = await apiFetch<{
    items: any[];
    total: number;
  }>(`/admin/audit-logs?page=${page}&limit=${limit}`);
  return res.data;
}

export async function evaluateCutoffApi(dto: {
  roundId: string;
  cutoffScore?: number;
  topN?: number;
}) {
  const res = await apiFetch('/qualification/evaluate', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function getAdminQuestionsApi(roundId: string) {
  const res = await apiFetch<any[]>(`/questions/round/${roundId}`);
  return res.data;
}

export async function createQuestionApi(dto: {
  roundId: string;
  orderIndex: number;
  promptText: string;
  options: { optionIndex: number; optionText: string; isCorrect: boolean }[];
}) {
  const res = await apiFetch('/questions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}
