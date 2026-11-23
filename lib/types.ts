export type UserRole = "admin" | "learner";
export type BookLanguage = "en" | "bn" | "bilingual";
export type AccessTier = "free" | "pro" | "elite";
export type AnnotationType = "highlight" | "underline" | "note" | "keypoint" | "bookmark";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type Model3DKey = "human_heart" | "eukaryotic_cell" | "atomic_structure" | "molecular_geometry" | "";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  planId: string;
  studyStreakDays: number;
  dailyAiCalls: number;
  weeklyGoalMinutes: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Curriculum {
  id: string;
  slug: string;
  name: string;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface Subject {
  id: string;
  curriculumId: string;
  code: string;
  name: string;
  language: BookLanguage;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface Syllabus {
  id: string;
  curriculumId: string;
  subjectId: string;
  title: string;
  examTarget: string;
  academicYear: string;
  chaptersSummary: string;
  isPublished: boolean;
  createdAt?: unknown;
}

export type ImportJobStatus =
  | "queued"
  | "extracting"
  | "ocr_running"
  | "ai_splitting"
  | "admin_review"
  | "published"
  | "failed";

export interface ImportJob {
  id: string;
  bookId: string;
  bookTitle: string;
  sourceFileName: string;
  sourceType: "text" | "markdown" | "pdf" | "docx" | "epub";
  status: ImportJobStatus;
  progressPercent: number;
  topicsDetected: number;
  ocrConfidence?: number;
  notes?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  createdAt?: unknown;
}

export interface Flashcard {
  id: string;
  userId: string;
  bookId: string;
  topicId: string;
  bookTitle: string;
  topicTitle: string;
  front: string;
  back: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt?: number;
  createdAt?: unknown;
}

export interface Book {
  id: string;
  curriculumId: string;
  title: string;
  subtitle?: string;
  author: string;
  subject: string;
  language: BookLanguage;
  accessTier: AccessTier;
  coverColor: string;
  description: string;
  totalTopics: number;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BookTopic {
  builderPath?: string;
  builderParentId?: string;
  id: string;
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle: string;
  topicTitle: string;
  orderIndex: number;
  contentMarkdown: string;
  readingMinutes: number;
  model3dKey?: Model3DKey;
  searchTokens?: string;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyTabType {
  id: string;
  key: string;
  label: string;
  promptTemplate: string;
  orderIndex: number;
  isSystem: boolean;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface TopicStudyTab {
  id: string;
  bookId: string;
  topicId: string;
  tabKey: string;
  contentMarkdown: string;
  generatedByModel: string;
  isPublished: boolean;
  updatedAt?: unknown;
}

export interface Question {
  id: string;
  bookId: string;
  topicId: string;
  chapterTitle: string;
  stem: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  difficulty: DifficultyLevel;
  isPublished: boolean;
  createdAt?: unknown;
}

export interface LearnerAnnotation {
  id: string;
  userId: string;
  bookId: string;
  topicId: string;
  bookTitle: string;
  topicTitle: string;
  type: AnnotationType;
  color: string;
  quote: string;
  noteText: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  topicId: string;
  bookTitle: string;
  topicTitle: string;
  percentComplete: number;
  timeSpentSeconds: number;
  isCompleted: boolean;
  updatedAt?: unknown;
}

export interface ExamAttempt {
  id: string;
  userId: string;
  bookId: string;
  examTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracyPercent: number;
  durationSeconds: number;
  status: "completed";
  questionIds: string[];
  createdAt?: unknown;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  currency: string;
  allowedTiers: AccessTier[];
  dailyAiLimit: number;
  has3dLab: boolean;
  hasVoiceTutor: boolean;
  orderIndex: number;
  isPublished: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: "active" | "expired" | "cancelled";
  createdAt?: unknown;
}

export type AiModelCategory = "text" | "live" | "tts" | "transcribe";

export interface CustomAiModel {
  id: string;
  modelId: string;
  displayName: string;
  category: AiModelCategory;
  tier: "free" | "standard" | "custom";
  voiceName?: string;
  notes?: string;
  isEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SecretSlotOption {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface AiModelConfig {
  id: string;
  taskName: string;
  primaryModel: string;
  fallbackModel: string;
  priority: number;
  isEnabled: boolean;
  usageCount: number;
  voiceName?: string;
  secretSlot?: string;
  updatedAt?: unknown;
}

export type SettingsTabKey = "preferences" | "users" | "models" | "api";

export interface LivePageContext {
  panel: ActivePanel;
  route: string;
  pageTitle: string;
  bookTitle?: string;
  chapterTitle?: string;
  topicTitle?: string;
  visibleText?: string;
}

export type ReaderFontKey =
  | "editorial"
  | "modern"
  | "textbook"
  | "geometric"
  | "classic"
  | "journal"
  | "serif"
  | "sans";

export interface ReadingComfortSettings {
  theme: "paper" | "sepia" | "midnight";
  fontFamily: ReaderFontKey;
  fontSize: number;
  lineHeight: number;
  measureWidth: "compact" | "optimal" | "wide";
  reducedMotion?: boolean;
  preferredLanguage?: BookLanguage;
}

export type ActivePanel = "learner" | "admin";

export type LearnerRoute =
  | "dashboard"
  | "library"
  | "my-library"
  | "reader"
  | "lab3d"
  | "exams"
  | "exam-history"
  | "vault"
  | "revision"
  | "membership"
  | "book-manager"
  | "account";

export type AdminRoute =
  | "overview"
  | "academic"
  | "books"
  | "processing"
  | "editor"
  | "ai-studio"
  | "questions"
  | "lab-manager"
  | "search-ops"
  | "ai-models"
  | "learners"
  | "billing"
  | "analytics"
  | "operations"
  | "book-manager"
  | "settings";
