// ==============================================================================
// CIT 9.0 — Shared Domain Types and API Envelopes
// ==============================================================================

export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export enum RoundType {
  PRELIMINARY = 'PRELIMINARY',
  FINAL = 'FINAL',
}

export enum AttemptStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
  DISQUALIFIED = 'DISQUALIFIED',
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    serverTime: string;
    [key: string]: unknown;
  };
}

export interface UserSummaryDto {
  id: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  isProfileComplete: boolean;
}

export interface ParticipantProfileDto {
  fullName: string;
  displayName: string;
  mobile: string;
  instituteName: string;
  department?: string | null;
  yearOfStudy: string;
  isCompleted: boolean;
}

export interface AssessmentSlotDto {
  id: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
  capacity: number;
  isAvailable: boolean;
}

export interface AssessmentRoundDto {
  id: string;
  roundType: RoundType;
  roundNumber: number;
  positiveScore: number;
  negativeScore: number;
  durationMinutes: number;
  slots: AssessmentSlotDto[];
}

export interface QuestionOptionDto {
  id: string;
  optionIndex: number;
  optionText: string;
  // Non-negotiable security requirement: isCorrect is NEVER included here!
}

export interface QuestionClientDto {
  id: string;
  orderIndex: number;
  promptText: string;
  imageUrl?: string | null;
  options: QuestionOptionDto[];
  totalQuestions: number;
}

export interface SubmitAnswerRequestDto {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  timeTakenMs?: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  displayName: string;
  instituteName: string;
  score?: number | null; // Masked when contest is active
  submittedAt?: string | null;
}
