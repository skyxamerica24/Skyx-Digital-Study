"use client";

import { loadStudyTabs, persistStudyTabType, persistTopicStudyTab } from "@/lib/actions/study-tab-actions";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  SEED_AUDIT_LOGS,
  SEED_BOOKS,
  SEED_CURRICULUMS,
  SEED_CUSTOM_AI_MODELS,
  SEED_FLASHCARDS,
  SEED_IMPORT_JOBS,
  SEED_QUESTIONS,
  SEED_STUDY_TAB_TYPES,
  SEED_SUBJECTS,
  SEED_SUBSCRIPTION_PLANS,
  SEED_SYLLABI,
  SEED_TOPIC_STUDY_TABS,
  SEED_TOPICS,
} from "@/lib/seed-data";
import type {
  ActivePanel,
  AdminRoute,
  AiModelConfig,
  AuditLog,
  Book,
  BookTopic,
  Curriculum,
  CustomAiModel,
  ExamAttempt,
  Flashcard,
  ImportJob,
  LearnerAnnotation,
  LearnerRoute,
  Model3DKey,
  Question,
  ReadingComfortSettings,
  ReadingProgress,
  SecretSlotOption,
  StudyTabType,
  Subject,
  SubscriptionPlan,
  SubscriptionRecord,
  Syllabus,
  TopicStudyTab,
  UserProfile,
  UserRole,
} from "@/lib/types";

// Server Actions imports
import { loginAction, registerAction } from "@/lib/auth/server-actions";
import { getCurrentUser } from "@/lib/db/user";
import { GENERAL_AI_TOOLS } from "@/lib/ai-tool-config";
import { getSessionToken, setSessionToken, removeSessionToken } from "@/lib/auth/session-storage";
import {
  getCurriculums,
  createCurriculumAction,
  updateCurriculumAction,
  deleteCurriculumAction,
  getSubjects,
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  getSyllabi,
  createSyllabusAction,
  updateSyllabusAction,
  deleteSyllabusAction,
} from "@/lib/actions/curriculum-actions";
import {
  getAllBooks,
  createBookAction,
  updateBookAction,
  deleteBookAction,
  getBook,
  persistBookTopics,
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
} from "@/lib/actions/book-actions";
import {
  getAllQuestions,
  persistQuestions,
  deleteQuestionAction,
} from "@/lib/actions/question-actions";
import {
  getFlashcards,
  createFlashcardAction,
  updateFlashcardAction,
  deleteFlashcardAction,
  reviewFlashcardAction,
} from "@/lib/actions/flashcard-actions";
import {
  getAnnotations,
  createAnnotationAction,
  deleteAnnotationAction,
  getReadingProgress as getReadingProgressAction,
  updateReadingProgressAction,
} from "@/lib/actions/annotation-actions";
import {
  getExamAttempts,
  createExamAttempt,
} from "@/lib/actions/exam-actions";
import {
  getSubscriptionPlans,
  getAllSubscriptionPlans,
  updateSubscriptionPlanAction,
  getSubscriptionRecords,
  createSubscriptionRecord,
} from "@/lib/actions/subscription-actions";
import {
  getAiModelConfigs,
  updateAiModelConfigAction,
  getCustomAiModels,
  createCustomAiModelAction,
  updateCustomAiModelAction,
  deleteCustomAiModelAction,
} from "@/lib/actions/ai-config-actions";
import {
  getUsers,
  updateUserAction,
  updateUserProfile as updateUserProfileAction,
} from "@/lib/actions/user-actions";
import {
  createAuditLog,
  getAuditLogs,
} from "@/lib/actions/audit-actions";
import {
  getImportJobs,
  createImportJobAction,
  updateImportJobAction,
} from "@/lib/actions/import-job-actions";

// Helper: sanitize IDs
function sanitizeId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleaned || `id-${Date.now()}`).slice(0, 100);
}

// Helper: convert Prisma User to UserProfile
function toUserProfile(user: any): UserProfile {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.displayName || "Skyx Scholar",
    photoURL: user.photoURL || undefined,
    role: user.role || "learner",
    planId: user.planId || "plan-free",
    studyStreakDays: user.studyStreakDays || 0,
    dailyAiCalls: user.dailyAiCalls || 0,
    weeklyGoalMinutes: user.weeklyGoalMinutes || 300,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Helper: convert Prisma Book to Book
function toBook(book: any): Book {
  return {
    id: book.id,
    curriculumId: book.curriculumId || "",
    title: book.title,
    subtitle: book.subtitle || "",
    author: book.author || "",
    subject: book.subject || "",
    language: book.language || "en",
    accessTier: book.accessTier || "free",
    coverColor: book.coverColor || "",
    description: book.description || "",
    totalTopics: book.totalTopics || 0,
    isPublished: book.isPublished || false,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

// Helper: convert Prisma BookTopic to BookTopic
function toBookTopic(topic: any): BookTopic {
  return {
    id: topic.id,
    bookId: topic.bookId,
    chapterNumber: topic.chapterNumber || 0,
    chapterTitle: topic.chapterTitle || "",
    sectionTitle: topic.sectionTitle || "",
    builderPath: topic.builderPath ?? undefined,
    builderParentId: topic.builderParentId ?? undefined,
    topicTitle: topic.topicTitle,
    orderIndex: topic.orderIndex || 0,
    contentMarkdown: topic.contentMarkdown || "",
    readingMinutes: topic.readingMinutes || 0,
    model3dKey: topic.model3dKey || "",
    searchTokens: topic.searchTokens || "",
    isPublished: topic.isPublished || false,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}

// Helper: convert Prisma Question to Question
function toQuestion(q: any): Question {
  return {
    id: q.id,
    bookId: q.bookId || "",
    topicId: q.topicId || "",
    chapterTitle: q.chapterTitle || "",
    stem: q.stem,
    options: q.options || "",
    correctIndex: q.correctIndex || 0,
    explanation: q.explanation || "",
    difficulty: q.difficulty || "medium",
    isPublished: q.isPublished || false,
    createdAt: q.createdAt,
  };
}

// Helper: convert Prisma Curriculum to Curriculum
function toCurriculum(c: any): Curriculum {
  return {
    id: c.id,
    slug: c.slug || "",
    name: c.name,
    description: c.description || "",
    orderIndex: c.orderIndex || 0,
    isPublished: c.isPublished || false,
    createdAt: c.createdAt,
  };
}

// Helper: convert Prisma Subject to Subject
function toSubject(s: any): Subject {
  return {
    id: s.id,
    curriculumId: s.curriculumId || "",
    code: s.code || "",
    name: s.name,
    language: s.language || "en",
    description: s.description || "",
    orderIndex: s.orderIndex || 0,
    isPublished: s.isPublished || false,
    createdAt: s.createdAt,
  };
}

// Helper: convert Prisma Syllabus to Syllabus
function toSyllabus(s: any): Syllabus {
  return {
    id: s.id,
    curriculumId: s.curriculumId || "",
    subjectId: s.subjectId || "",
    title: s.title,
    examTarget: s.examTarget || "",
    academicYear: s.academicYear || "",
    chaptersSummary: s.chaptersSummary || "",
    isPublished: s.isPublished || false,
    createdAt: s.createdAt,
  };
}

// Helper: convert Prisma StudyTabType to StudyTabType
function toStudyTabType(t: any): StudyTabType {
  return {
    id: t.id,
    key: t.key || "",
    label: t.label || "",
    promptTemplate: t.promptTemplate || "",
    orderIndex: t.orderIndex || 0,
    isSystem: t.isSystem || false,
    isPublished: t.isPublished || false,
    createdAt: t.createdAt,
  };
}

// Helper: convert Prisma TopicStudyTab to TopicStudyTab
function toTopicStudyTab(t: any): TopicStudyTab {
  return {
    id: t.id,
    bookId: t.bookId || "",
    topicId: t.topicId || "",
    tabKey: t.tabKey || "",
    contentMarkdown: t.contentMarkdown || "",
    generatedByModel: t.generatedByModel || "",
    isPublished: t.isPublished || false,
    updatedAt: t.updatedAt,
  };
}

// Helper: convert Prisma Flashcard to Flashcard
function toFlashcard(f: any): Flashcard {
  return {
    id: f.id,
    userId: f.userId || "",
    bookId: f.bookId || "",
    topicId: f.topicId || "",
    bookTitle: f.bookTitle || "",
    topicTitle: f.topicTitle || "",
    front: f.front,
    back: f.back,
    intervalDays: f.intervalDays || 1,
    easeFactor: f.easeFactor || 2.5,
    repetitions: f.repetitions || 0,
    nextReviewAt: f.nextReviewAt || Date.now(),
    lastReviewedAt: f.lastReviewedAt,
    createdAt: f.createdAt,
  };
}

// Helper: convert Prisma AuditLog to AuditLog
function toAuditLog(a: any): AuditLog {
  return {
    id: a.id,
    actorUid: a.actorUid || "",
    actorEmail: a.actorEmail || "",
    action: a.action,
    resourceType: a.resourceType || "",
    resourceId: a.resourceId || "",
    summary: a.summary || "",
    createdAt: a.createdAt,
  };
}

// Helper: convert Prisma ImportJob to ImportJob
function toImportJob(j: any): ImportJob {
  return {
    id: j.id,
    bookId: j.bookId || "",
    bookTitle: j.bookTitle || "",
    sourceFileName: j.sourceFileName || "",
    sourceType: j.sourceType || "text",
    status: j.status || "queued",
    progressPercent: j.progressPercent || 0,
    topicsDetected: j.topicsDetected || 0,
    ocrConfidence: j.ocrConfidence,
    notes: j.notes || "",
    createdBy: j.createdBy || "",
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

// Helper: convert Prisma AiModelConfig to AiModelConfig
// Helper: convert Prisma CustomAiModel to CustomAiModel
function toCustomAiModel(m: any): CustomAiModel {
  return {
    id: m.id,
    modelId: m.modelId,
    displayName: m.displayName,
    category: m.category || "",
    tier: m.tier || "",
    voiceName: m.voiceName || undefined,
    notes: m.notes || undefined,
    isEnabled: m.isEnabled || false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

// Helper: convert Prisma SubscriptionPlan to SubscriptionPlan
function toSubscriptionPlan(p: any): SubscriptionPlan {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline || "",
    priceMonthly: p.priceMonthly || 0,
    currency: p.currency || "USD",
    allowedTiers: p.allowedTiers || "",
    dailyAiLimit: p.dailyAiLimit || 0,
    has3dLab: p.has3dLab || false,
    hasVoiceTutor: p.hasVoiceTutor || false,
    orderIndex: p.orderIndex || 0,
    isPublished: p.isPublished || false,
  };
}

interface ToastMessage {
  id: string;
  text: string;
  tone: "info" | "success" | "error";
}

// User type for compatibility with existing components
interface UserCompat {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  displayName: string | null;
}

interface AppContextValue {
  // Auth & Role
  user: UserCompat | null;
  authLoading: boolean;
  userProfile: UserProfile;
  isAdmin: boolean;
  isCloudSynced: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (displayName: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Navigation
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  learnerRoute: LearnerRoute;
  setLearnerRoute: (route: LearnerRoute) => void;
  adminRoute: AdminRoute;
  setAdminRoute: (route: AdminRoute) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  // Active reading selection
  activeBookId: string;
  activeTopicId: string;
  activeReaderTab: string;
  setActiveReaderTab: (tabKey: string) => void;
  refreshBookAccess: () => Promise<void>;
  applyPublishedBook: (book: Parameters<typeof toBook>[0], topics: Parameters<typeof toBookTopic>[0][]) => void;
  openBookReader: (bookId: string, topicId?: string, tabKey?: string) => Promise<boolean>;
  activeLabModel: Exclude<Model3DKey, "">;
  setActiveLabModel: (key: Exclude<Model3DKey, "">) => void;
  open3dLab: (modelKey?: Exclude<Model3DKey, "">) => void;

  // Data collections
  curriculums: Curriculum[];
  subjects: Subject[];
  syllabi: Syllabus[];
  books: Book[];
  topics: BookTopic[];
  studyTabTypes: StudyTabType[];
  topicStudyTabs: TopicStudyTab[];
  questions: Question[];
  annotations: LearnerAnnotation[];
  readingProgress: ReadingProgress[];
  examAttempts: ExamAttempt[];
  flashcards: Flashcard[];
  subscriptionPlans: SubscriptionPlan[];
  subscriptions: SubscriptionRecord[];
  aiModelConfigs: AiModelConfig[];
  customAiModels: CustomAiModel[];
  availableSecretSlots: SecretSlotOption[];
  refreshSecretSlots: () => Promise<void>;
  importJobs: ImportJob[];
  auditLogs: AuditLog[];
  allUsers: UserProfile[];

  // Reading Comfort
  comfort: ReadingComfortSettings;
  updateComfort: (patch: Partial<ReadingComfortSettings>) => void;

  // Global Modals
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isTutorOpen: boolean;
  tutorInitialMode: "voice" | "chat";
  tutorPrefillPrompt: string;
  openAiTutor: (options?: { mode?: "voice" | "chat"; prefill?: string }) => void;
  closeAiTutor: () => void;

  // Toasts
  toasts: ToastMessage[];
  notify: (text: string, tone?: "info" | "success" | "error") => void;

  // Learner Actions
  addAnnotation: (input: Omit<LearnerAnnotation, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<void>;
  updateTopicProgress: (book: Book, topic: BookTopic, percentComplete: number, isCompleted: boolean) => Promise<void>;
  saveExamAttempt: (attempt: Omit<ExamAttempt, "id" | "userId" | "status" | "createdAt">, attemptId: string) => Promise<boolean>;
  selectSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  addFlashcard: (
    input: Omit<Flashcard, "id" | "userId" | "intervalDays" | "easeFactor" | "repetitions" | "nextReviewAt" | "createdAt">
  ) => Promise<void>;
  reviewFlashcard: (id: string, quality: 1 | 3 | 4 | 5) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  updateUserProfile: (patch: Partial<Pick<UserProfile, "displayName" | "weeklyGoalMinutes">>) => Promise<void>;

  // Admin Actions
  recordAuditLog: (action: string, resourceType: string, resourceId: string, summary: string) => Promise<void>;
  saveCurriculum: (curr: Omit<Curriculum, "createdAt">) => Promise<void>;
  deleteCurriculum: (id: string) => Promise<void>;
  saveSubject: (subj: Omit<Subject, "createdAt">) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  saveSyllabus: (syl: Omit<Syllabus, "createdAt">) => Promise<void>;
  deleteSyllabus: (id: string) => Promise<void>;
  saveImportJob: (job: Omit<ImportJob, "createdAt" | "updatedAt">) => Promise<void>;
  saveBook: (book: Omit<Book, "createdAt" | "updatedAt">) => Promise<boolean>;
  deleteBook: (bookId: string) => Promise<void>;
  saveTopicsBatch: (bookId: string, newTopics: Omit<BookTopic, "createdAt" | "updatedAt">[]) => Promise<boolean>;
  saveSingleTopic: (topic: Omit<BookTopic, "createdAt" | "updatedAt">) => Promise<void>;
  deleteTopic: (topicId: string) => Promise<void>;
  saveStudyTabType: (tab: Omit<StudyTabType, "createdAt">) => Promise<boolean>;
  saveTopicStudyTab: (tab: Omit<TopicStudyTab, "updatedAt">) => Promise<void>;
  saveQuestionsBatch: (qs: Omit<Question, "createdAt">[]) => Promise<boolean>;
  deleteQuestion: (questionId: string) => Promise<void>;
  updateAiModelConfig: (cfg: Omit<AiModelConfig, "updatedAt">) => Promise<boolean>;
  saveCustomAiModel: (model: Omit<CustomAiModel, "createdAt" | "updatedAt">) => Promise<void>;
  deleteCustomAiModel: (id: string) => Promise<void>;
  updateUserAccess: (targetUid: string, patch: { role?: UserRole; planId?: string }) => Promise<void>;
  updateSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  getModelForTask: (taskId: string) => string;
  getSecretSlotForTask: (taskId: string) => string;
  getLiveModelConfig: () => {
    primaryModel: string;
    fallbackModel: string;
    voiceName: string;
    secretSlot: string;
  };
}

const DEFAULT_PROFILE: UserProfile = {
  uid: "guest-preview",
  email: "guest@skyxacademy.edu",
  displayName: "Skyx Scholar",
  role: "learner",
  planId: "plan-free",
  studyStreakDays: 1,
  dailyAiCalls: 0,
  weeklyGoalMinutes: 300,
};

const DEFAULT_COMFORT: ReadingComfortSettings = {
  theme: "paper",
  fontFamily: "editorial",
  fontSize: 17,
  lineHeight: 1.84,
  measureWidth: "optimal",
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserCompat | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [activePanel, setActivePanel] = useState<ActivePanel>("learner");
  const [learnerRoute, setLearnerRoute] = useState<LearnerRoute>("dashboard");
  const [adminRoute, setAdminRoute] = useState<AdminRoute>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [activeBookId, setActiveBookId] = useState<string>(SEED_BOOKS[0].id);
  const [activeTopicId, setActiveTopicId] = useState<string>(SEED_TOPICS[0].id);
  const [activeReaderTab, setActiveReaderTab] = useState<string>("reading");
  const [activeLabModel, setActiveLabModel] = useState<Exclude<Model3DKey, "">>("human_heart");

  const [curriculums, setCurriculums] = useState<Curriculum[]>(SEED_CURRICULUMS);
  const [subjects, setSubjects] = useState<Subject[]>(SEED_SUBJECTS);
  const [syllabi, setSyllabi] = useState<Syllabus[]>(SEED_SYLLABI);
  const [books, setBooks] = useState<Book[]>(SEED_BOOKS);
  const [topics, setTopics] = useState<BookTopic[]>(SEED_TOPICS);
  const [studyTabTypes, setStudyTabTypes] = useState<StudyTabType[]>(SEED_STUDY_TAB_TYPES);
  const [topicStudyTabs, setTopicStudyTabs] = useState<TopicStudyTab[]>(SEED_TOPIC_STUDY_TABS);
  const [questions, setQuestions] = useState<Question[]>(SEED_QUESTIONS);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(SEED_FLASHCARDS);
  const [importJobs, setImportJobs] = useState<ImportJob[]>(SEED_IMPORT_JOBS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);
  const [annotations, setAnnotations] = useState<LearnerAnnotation[]>([
    {
      id: "demo-ann-1",
      userId: "guest-preview",
      bookId: "book-bio-physiology",
      topicId: "topic-bio-heart",
      bookTitle: "Human Physiology & Cell Biology",
      topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
      type: "highlight",
      color: "amber",
      quote: "The 'Lub' (S1) heart sound occurs when the AV valves snap shut at the onset of ventricular systole.",
      noteText: "High-yield Medical Admission MCQ trap — remember AV = Lub, Semilunar = Dub!",
    },
    {
      id: "demo-ann-2",
      userId: "guest-preview",
      bookId: "book-bio-physiology",
      topicId: "topic-bio-heart",
      bookTitle: "Human Physiology & Cell Biology",
      topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
      type: "keypoint",
      color: "indigo",
      quote: "SA Node fires 70–75 impulses/min",
      noteText: "Myogenic natural pacemaker situated in upper wall of Right Atrium.",
    },
  ]);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([
    {
      id: "demo-prog-1",
      userId: "guest-preview",
      bookId: "book-bio-physiology",
      topicId: "topic-bio-heart",
      bookTitle: "Human Physiology & Cell Biology",
      topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
      percentComplete: 75,
      timeSpentSeconds: 740,
      isCompleted: false,
    },
    {
      id: "demo-prog-2",
      userId: "guest-preview",
      bookId: "book-physics-modern",
      topicId: "topic-phys-bohr",
      bookTitle: "Modern Physics & Quantum Foundations",
      topicTitle: "Bohr's Postulates, Energy Quantization & Hydrogen Spectrum (বোর পরমাণু মডেল)",
      percentComplete: 100,
      timeSpentSeconds: 920,
      isCompleted: true,
    },
  ]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([
    {
      id: "demo-attempt-1",
      userId: "guest-preview",
      bookId: "book-bio-physiology",
      examTitle: "Human Circulatory System — Rapid Mock",
      totalQuestions: 5,
      correctCount: 4,
      wrongCount: 1,
      skippedCount: 0,
      accuracyPercent: 80,
      durationSeconds: 185,
      status: "completed",
      questionIds: ["q-bio-1", "q-bio-2", "q-bio-3", "q-bio-4", "q-bio-5"],
    },
  ]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(SEED_SUBSCRIPTION_PLANS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [aiModelConfigs, setAiModelConfigs] = useState<AiModelConfig[]>(GENERAL_AI_TOOLS);
  const [customAiModels, setCustomAiModels] = useState<CustomAiModel[]>(SEED_CUSTOM_AI_MODELS);
  const [availableSecretSlots, setAvailableSecretSlots] = useState<SecretSlotOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([DEFAULT_PROFILE]);

  const [comfort, setComfort] = useState<ReadingComfortSettings>(DEFAULT_COMFORT);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorInitialMode, setTutorInitialMode] = useState<"voice" | "chat">("chat");
  const [tutorPrefillPrompt, setTutorPrefillPrompt] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const syncWsRef = useRef<WebSocket | null>(null);
  const broadcastChanRef = useRef<BroadcastChannel | null>(null);
  const deletedModelIdsRef = useRef<Set<string>>(new Set());

  const notify = useCallback((text: string, tone: "info" | "success" | "error" = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut for instant search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load data from Server Actions on mount
  const loadDataFromServer = async (userId?: string, isAdminUser?: boolean) => {
    const token = getSessionToken();
    try {
      // Load all shared data
      const [
        curriculumsData,
        subjectsData,
        syllabiData,
        booksData,
        questionsData,
        subscriptionPlansData,
        aiModelConfigsData,
        customAiModelsData,
        studyData,
      ] = await Promise.all([
        getCurriculums().catch(() => []),
        getSubjects().catch(() => []),
        getSyllabi().catch(() => []),
        getAllBooks(token).catch(() => []),
        getAllQuestions(token).catch(() => []),
        getAllSubscriptionPlans().catch(() => []),
        getAiModelConfigs().catch(() => null),
        getCustomAiModels().catch(() => []),
        loadStudyTabs(token).catch(() => null),
      ]);
      // Load topics for each book
      const topicsData = booksData.flatMap(book => book.topics);

      if (token !== getSessionToken()) return;
      setCurriculums(curriculumsData.map(toCurriculum));
      setSubjects(subjectsData.map(toSubject));
      setSyllabi(syllabiData.map(toSyllabus));
      setBooks(booksData.map(toBook));
      setTopics(topicsData.map(toBookTopic).sort((a, b) => a.orderIndex - b.orderIndex));
      setQuestions(questionsData.map(toQuestion));
      if (studyData) {
        const keys = new Set(studyData.types.map(tab => tab.key));
        setStudyTabTypes([...SEED_STUDY_TAB_TYPES.filter(tab => !keys.has(tab.key)), ...studyData.types.map(toStudyTabType)]);
        const ids = new Set(topicsData.map(topic => topic.id));
        setTopicStudyTabs(studyData.tabs.map(toTopicStudyTab).filter(tab => ids.has(tab.topicId)));
      }
      setSubscriptionPlans(subscriptionPlansData.map(toSubscriptionPlan));
      if (aiModelConfigsData) setAiModelConfigs(aiModelConfigsData);
      setCustomAiModels(customAiModelsData.map(toCustomAiModel));

      // Load user-specific data
      if (userId) {
        const [
          annotationsData,
          progressData,
          examData,
          flashcardsData,
          subscriptionsData,
        ] = await Promise.all([
          getAnnotations(token).catch(() => []),
          getReadingProgressAction(token).catch(() => []),
          getExamAttempts(token).catch(() => []),
          getFlashcards(userId).catch(() => []),
          getSubscriptionRecords(userId).catch(() => []),
        ]);

        if (token !== getSessionToken()) return;
        setAnnotations(annotationsData.map(a => ({ ...a, bookId: a.bookId || '', topicId: a.topicId || '', bookTitle: a.bookTitle || '', topicTitle: a.topicTitle || '', color: a.color || '', quote: a.quote || '', noteText: a.noteText || '', type: a.type as any }) as LearnerAnnotation));
        setReadingProgress(progressData.map(p => ({ ...p, bookId: p.bookId || '', topicId: p.topicId || '', bookTitle: p.bookTitle || '', topicTitle: p.topicTitle || '' }) as ReadingProgress));
        setExamAttempts(examData.map(e => {
          const qids = typeof e.questionIds === 'string' ? (e.questionIds ? JSON.parse(e.questionIds) : []) : ((e.questionIds as unknown as string[]) || []);
          return { ...e, bookId: e.bookId || '', examTitle: e.examTitle || '', questionIds: qids, status: e.status as 'completed' } as ExamAttempt;
        }));
        setFlashcards(flashcardsData.map(toFlashcard));
        setSubscriptions(subscriptionsData.map(s => ({ ...s, planId: s.planId || '', planName: s.planName || '', status: s.status as 'active' | 'expired' | 'cancelled' }) as SubscriptionRecord));
      }

      // Load admin-only data
      if (isAdminUser) {
        const [
          usersData,
          auditLogsData,
          importJobsData,
        ] = await Promise.all([
          getUsers().catch(() => []),
          getAuditLogs({ limit: 100 }).catch(() => []),
          getImportJobs().catch(() => []),
        ]);

        setAllUsers(usersData.map(toUserProfile));
        setAuditLogs(auditLogsData.map(toAuditLog));
        setImportJobs(importJobsData.map(toImportJob));
      }

      setIsCloudSynced(true);
    } catch (err) {
      console.error("Data load error:", err);
      // Fall back to seed data (already set as initial state)
      setIsCloudSynced(false);
    }
  };

  // Push a live change over WebSocket (/api/sync-ws) and same-browser BroadcastChannel
  const pushRealtimeSync = (
    entity: "customAiModels" | "aiModelConfigs",
    action: "upsert" | "delete",
    payload: unknown
  ) => {
    const ws = syncWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "broadcast", entity, action, payload }));
      } catch {
        // ignore transient send error
      }
    }
    if (broadcastChanRef.current) {
      try {
        broadcastChanRef.current.postMessage({ type: "sync", entity, action, payload });
      } catch {
        // ignore
      }
    }
  };

  const refreshSecretSlots = async () => {
    const ws = syncWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "refresh_secrets" }));
      } catch {
        // fallback to HTTP below
      }
    }
    try {
      const res = await fetch("/api/ai/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { secretSlots?: SecretSlotOption[] };
      if (Array.isArray(data.secretSlots)) {
        setAvailableSecretSlots(data.secretSlots);
      }
    } catch {
      // keep existing slots
    }
  };

  // Real-time WebSocket (/api/sync-ws) + BroadcastChannel instant sync across all open tabs & clients
  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    let reconnectTimer: number | null = null;
    let attempt = 0;

    const applyIncomingSync = (msg: {
      type?: string;
      slots?: SecretSlotOption[];
      entity?: string;
      action?: string;
      payload?: unknown;
    }) => {
      if (msg.type === "secrets" && Array.isArray(msg.slots)) {
        setAvailableSecretSlots(msg.slots);
        return;
      }
      if (msg.type === "sync" && msg.entity === "aiModelConfigs") {
        void getAiModelConfigs().then(configs => {
          if (active) setAiModelConfigs(configs);
        }).catch(() => {});
        return;
      }
      if (msg.type === "sync" && msg.entity === "customAiModels" && msg.payload) {
        if (msg.action === "delete") {
          const removedId =
            typeof msg.payload === "string"
              ? msg.payload
              : (msg.payload as { id?: string }).id || "";
          if (removedId) {
            deletedModelIdsRef.current.add(removedId);
            setCustomAiModels((prev) => prev.filter((m) => m.id !== removedId));
          }
        } else {
          const incomingModel = msg.payload as CustomAiModel;
          deletedModelIdsRef.current.delete(incomingModel.id);
          setCustomAiModels((prev) => [
            incomingModel,
            ...prev.filter((m) => m.id !== incomingModel.id),
          ]);
        }
      }
    };

    // Initial HTTP hydrate for secret slots
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { secretSlots?: SecretSlotOption[] } | null) => {
        if (active && Array.isArray(data?.secretSlots)) {
          setAvailableSecretSlots(data.secretSlots);
        }
      })
      .catch(() => {});

    // Same-browser cross-tab instant sync via BroadcastChannel
    if ("BroadcastChannel" in window) {
      const chan = new BroadcastChannel("skyx-realtime-sync");
      broadcastChanRef.current = chan;
      chan.onmessage = (ev) => {
        if (ev.data && typeof ev.data === "object") {
          applyIncomingSync(ev.data);
        }
      };
    }

    const connectSyncWs = () => {
      if (!active) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/sync-ws`);
      syncWsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.data));
          applyIncomingSync(parsed);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (syncWsRef.current === ws) {
          syncWsRef.current = null;
        }
        if (!active) return;
        attempt = Math.min(attempt + 1, 6);
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
        reconnectTimer = window.setTimeout(connectSyncWs, delayMs);
      };

      ws.onerror = () => {
        // onclose handles reconnect cleanly
      };
    };

    connectSyncWs();

    return () => {
      active = false;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (syncWsRef.current) {
        try {
          syncWsRef.current.close();
        } catch {
          // ignore
        }
        syncWsRef.current = null;
      }
      if (broadcastChanRef.current) {
        try {
          broadcastChanRef.current.close();
        } catch {
          // ignore
        }
        broadcastChanRef.current = null;
      }
    };
  }, []);

  // Authenticate user from session token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        setAuthLoading(false);
        // Load shared data for guest users
        await loadDataFromServer();
        return;
      }

      const decoded = await getCurrentUser(token);
      if (!decoded) {
        removeSessionToken();
        setAuthLoading(false);
        await loadDataFromServer();
        return;
      }

      const compatUser: UserCompat = {
        uid: decoded.userId,
        email: decoded.email,
        emailVerified: true,
        photoURL: null,
        displayName: null,
      };

      setUser(compatUser);
      const profile: UserProfile = {
        uid: decoded.userId,
        email: decoded.email,
        displayName: decoded.email.split("@")[0],
        role: decoded.role as "admin" | "learner",
        planId: "plan-free",
        studyStreakDays: 0,
        dailyAiCalls: 0,
        weeklyGoalMinutes: 300,
      };
      setUserProfile(profile);

      const isAdminUser = decoded.role === "admin";
      if (isAdminUser) {
        setActivePanel("admin");
      }

      await loadDataFromServer(decoded.userId, isAdminUser);
      setAuthLoading(false);
    };

    initAuth().catch(() => {
      setAuthLoading(false);
    });
  }, []);

  const isAdmin = useMemo(() => {
    return userProfile.role === "admin";
  }, [userProfile.role]);

  const signInWithEmailPassword = async (email: string, password: string) => {
    const result = await loginAction({ email, password });
    if (result.error) {
      throw new Error(result.error);
    }
    if (result.success && result.token) {
      setSessionToken(result.token);
      const compatUser: UserCompat = {
        uid: result.user.id,
        email: result.user.email,
        emailVerified: true,
        photoURL: null,
        displayName: result.user.displayName,
      };
      setUser(compatUser);
      const profile: UserProfile = {
        uid: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || "Skyx Scholar",
        role: result.user.role as "admin" | "learner",
        planId: "plan-free",
        studyStreakDays: 0,
        dailyAiCalls: 0,
        weeklyGoalMinutes: 300,
      };
      setUserProfile(profile);
      if (result.user.role === "admin") {
        setActivePanel("admin");
      }
      await loadDataFromServer(result.user.id, result.user.role === "admin");
      notify("Signed in to Skyx Academy.", "success");
    }
  };

  const registerWithEmailPassword = async (displayName: string, email: string, password: string) => {
    const result = await registerAction({ displayName, email, password });
    if (result.error) {
      notify(result.error, "error");
      return;
    }
    if (result.success && result.token) {
      setSessionToken(result.token);
      const compatUser: UserCompat = {
        uid: result.user.id,
        email: result.user.email,
        emailVerified: true,
        photoURL: null,
        displayName: result.user.displayName || displayName,
      };
      setUser(compatUser);
      const profile: UserProfile = {
        uid: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName || displayName,
        role: result.user.role as "admin" | "learner",
        planId: "plan-free",
        studyStreakDays: 0,
        dailyAiCalls: 0,
        weeklyGoalMinutes: 300,
      };
      setUserProfile(profile);
      await loadDataFromServer(result.user.id, result.user.role === "admin");
      notify("Account created! Welcome to Skyx Academy.", "success");
    }
  };

  const sendPasswordReset = async (email: string) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Password recovery is unavailable.");
  };

  const signOut = async () => {
    removeSessionToken();
    setUser(null);
    setBooks([]);
    setTopics([]);
    setAnnotations([]);
    setReadingProgress([]);
    setExamAttempts([]);
    setFlashcards([]);
    setSubscriptions([]);
    setQuestions([]);
    setTopicStudyTabs([]);
    setIsTutorOpen(false);
    setUserProfile(DEFAULT_PROFILE);
    setIsCloudSynced(false);
    setActivePanel("learner");
    setLearnerRoute("dashboard");
    setAdminRoute("overview");
    notify("Signed out successfully.", "info");
  };

  const refreshBookAccess = async () => {
    const token = getSessionToken();
    const [catalog, availableQuestions, studyData] = await Promise.all([getAllBooks(token), getAllQuestions(token), loadStudyTabs(token)]);
    if (token !== getSessionToken()) return;
    setBooks(catalog.map(toBook));
    setTopics(catalog.flatMap(book => book.topics.map(toBookTopic)));
    setQuestions(availableQuestions.map(toQuestion));
    setTopicStudyTabs(studyData.tabs.map(toTopicStudyTab));
  };

  const openBookReader = async (bookId: string, topicId?: string, tabKey: string = "reading") => {
    const token = getSessionToken();
    let matchingTopics = topics.filter(topic => topic.bookId === bookId);
    if (token) {
      try {
        const book = await getBook(bookId, token);
        if (token !== getSessionToken()) return false;
        if (!book) {
          await refreshBookAccess();
          notify("This book is unavailable in your library.", "error");
          return false;
        }
        matchingTopics = book.topics.map(toBookTopic);
        setBooks(items => items.some(item => item.id === bookId)
          ? items.map(item => item.id === bookId ? toBook(book) : item) : [...items, toBook(book)]);
        setTopics(items => [...items.filter(item => item.bookId !== bookId), ...matchingTopics]);
      } catch {
        notify("Could not open the book.", "error");
        return false;
      }
    }
    const ordered = [...matchingTopics].sort((a, b) => a.orderIndex - b.orderIndex);
    setActiveBookId(bookId);
    setActiveTopicId(ordered.find(topic => topic.id === topicId)?.id ?? ordered[0]?.id ?? "");
    setActiveReaderTab(tabKey);
    setActivePanel("learner");
    setLearnerRoute("reader");
    return true;
  };

  const open3dLab = (modelKey?: Exclude<Model3DKey, "">) => {
    if (modelKey) setActiveLabModel(modelKey);
    setActivePanel("learner");
    setLearnerRoute("lab3d");
  };

  const openAiTutor = (options?: { mode?: "voice" | "chat"; prefill?: string }) => {
    if (options?.mode) setTutorInitialMode(options.mode);
    if (options?.prefill) setTutorPrefillPrompt(options.prefill);
    setIsTutorOpen(true);
  };

  const closeAiTutor = () => {
    setIsTutorOpen(false);
    setTutorPrefillPrompt("");
  };

  const updateComfort = (patch: Partial<ReadingComfortSettings>) => {
    setComfort((prev) => ({ ...prev, ...patch }));
  };

  // --- LEARNER ACTIONS ---

  const addAnnotation = async (
    input: Omit<LearnerAnnotation, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    const uid = user?.uid || DEFAULT_PROFILE.uid;
    if (!user) {
      const id = sanitizeId(`ann-${Date.now()}`);
      const record: LearnerAnnotation = {
        ...input,
        id,
        userId: uid,
        quote: input.quote.slice(0, 1900),
        noteText: input.noteText.slice(0, 3900),
        bookTitle: input.bookTitle.slice(0, 190),
        topicTitle: input.topicTitle.slice(0, 230),
      };
      setAnnotations((prev) => [record, ...prev]);
      notify(`Saved ${input.type} to your Study Vault.`, "success");
      return true;
    }
    try {
      const result = await createAnnotationAction(getSessionToken(), {
        bookId: input.bookId,
        topicId: input.topicId,
        bookTitle: input.bookTitle.slice(0, 190),
        topicTitle: input.topicTitle.slice(0, 230),
        type: input.type,
        color: input.color,
        quote: input.quote.slice(0, 1900),
        noteText: input.noteText.slice(0, 3900),
      });
      if ('error' in result) throw new Error(result.error);
      const ann = result.annotation as unknown as LearnerAnnotation;
      setAnnotations((prev) => [{ ...ann, bookId: ann.bookId || '', topicId: ann.topicId || '', bookTitle: ann.bookTitle || '', topicTitle: ann.topicTitle || '', color: ann.color || '', quote: ann.quote || '', noteText: ann.noteText || '' }, ...prev]);
    } catch (err) {
      console.error("Failed to add annotation:", err);
      notify("Could not save to your Study Vault.", "error");
      return false;
    }
    notify(`Saved ${input.type} to your Study Vault.`, "success");
    return true;
  };

  const deleteAnnotation = async (id: string) => {
    if (user) {
      try {
        await deleteAnnotationAction(getSessionToken(), id);
      } catch (err) {
        console.error("Failed to delete annotation:", err);
        notify("Could not remove the item from your Study Vault.", "error");
        return;
      }
    }
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    notify("Removed item from Study Vault.", "info");
  };

  const updateTopicProgress = async (
    book: Book,
    topic: BookTopic,
    percentComplete: number,
    isCompleted: boolean
  ) => {
    const uid = user?.uid || DEFAULT_PROFILE.uid;
    const existing = readingProgress.find((p) => p.topicId === topic.id);
    const nextProgress: ReadingProgress = {
      id: sanitizeId(`${uid.slice(0, 20)}-${topic.id}`),
      userId: uid,
      bookId: book.id,
      topicId: topic.id,
      bookTitle: book.title.slice(0, 190),
      topicTitle: topic.topicTitle.slice(0, 230),
      percentComplete: Math.min(100, Math.max(0, Math.round(percentComplete))),
      timeSpentSeconds: (existing?.timeSpentSeconds || 0) + 60,
      isCompleted,
    };

    if (user) {
      try {
        await updateReadingProgressAction(getSessionToken(), {
          bookId: book.id,
          topicId: topic.id,
          bookTitle: nextProgress.bookTitle,
          topicTitle: nextProgress.topicTitle,
          percentComplete: nextProgress.percentComplete,
          timeSpentSeconds: nextProgress.timeSpentSeconds,
          isCompleted: nextProgress.isCompleted,
        });
      } catch (err) {
        console.error("Failed to update progress:", err);
        notify("Could not save reading progress.", "error");
        return;
      }
    }
    setReadingProgress((prev) => {
      const rest = prev.filter((p) => p.topicId !== topic.id);
      return [nextProgress, ...rest];
    });
  };

  const saveExamAttempt = async (
    attempt: Omit<ExamAttempt, "id" | "userId" | "status" | "createdAt">,
    attemptId: string
  ) => {
    try {
      const saved = await createExamAttempt(getSessionToken(), {
        ...attempt, attemptId, examTitle: attempt.examTitle.slice(0, 190),
      });
      const record: ExamAttempt = {
        ...attempt, id: saved.id, userId: saved.userId, status: "completed",
        createdAt: saved.createdAt, examTitle: saved.examTitle ?? attempt.examTitle,
      };
      setExamAttempts(prev => [record, ...prev.filter(entry => entry.id !== record.id)]);
      return true;
    } catch {
      notify("Could not save the exam result. Try again.", "error");
      return false;
    }
  };

  const selectSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const uid = user?.uid || DEFAULT_PROFILE.uid;
    if (user) {
      try {
        await createSubscriptionRecord({
          userId: uid,
          planId: plan.id,
          planName: plan.name,
          amount: plan.priceMonthly,
          currency: plan.currency,
          status: "active",
        });
        await updateUserAction(uid, { planId: plan.id }, getSessionToken());
      } catch (err) {
        console.error("Failed to select subscription:", err);
      }
    }
    setUserProfile((prev) => ({ ...prev, planId: plan.id }));
    const record: SubscriptionRecord = {
      id: sanitizeId(`sub-${Date.now()}`),
      userId: uid,
      planId: plan.id,
      planName: plan.name,
      amount: plan.priceMonthly,
      currency: plan.currency,
      status: "active",
    };
    setSubscriptions((prev) => [record, ...prev]);
    notify(`Activated ${plan.name} membership.`, "success");
  };

  const addFlashcard = async (
    input: Omit<Flashcard, "id" | "userId" | "intervalDays" | "easeFactor" | "repetitions" | "nextReviewAt" | "createdAt">
  ) => {
    const uid = user?.uid || DEFAULT_PROFILE.uid;
    if (!user) {
      const id = sanitizeId(`fc-${Date.now()}`);
      const record: Flashcard = {
        ...input,
        id,
        userId: uid,
        front: input.front.slice(0, 800),
        back: input.back.slice(0, 1600),
        bookTitle: input.bookTitle.slice(0, 190),
        topicTitle: input.topicTitle.slice(0, 230),
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewAt: Date.now(),
      };
      setFlashcards((prev) => [record, ...prev]);
      notify("Flashcard added to Spaced Repetition deck.", "success");
      return;
    }
    try {
      const result = await createFlashcardAction({
        userId: uid,
        bookId: input.bookId,
        topicId: input.topicId,
        bookTitle: input.bookTitle.slice(0, 190),
        topicTitle: input.topicTitle.slice(0, 230),
        front: input.front.slice(0, 800),
        back: input.back.slice(0, 1600),
      });
      if (result && !('error' in result) && result.flashcard) {
        setFlashcards((prev) => [toFlashcard(result.flashcard), ...prev]);
      }
    } catch (err) {
      console.error("Failed to add flashcard:", err);
    }
    notify("Flashcard added to Spaced Repetition deck.", "success");
  };

  const reviewFlashcard = async (id: string, quality: 1 | 3 | 4 | 5) => {
    const existing = flashcards.find((f) => f.id === id);
    if (!existing) return;

    let repetitions = existing.repetitions;
    let intervalDays = existing.intervalDays;
    let easeFactor = existing.easeFactor;

    if (quality < 3) {
      repetitions = 0;
      intervalDays = 1;
    } else {
      if (repetitions === 0) intervalDays = 1;
      else if (repetitions === 1) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * easeFactor);
      repetitions += 1;
    }
    easeFactor = Math.max(1.3, Number((easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2)));
    const now = Date.now();
    const updated: Flashcard = {
      ...existing,
      repetitions,
      intervalDays,
      easeFactor,
      lastReviewedAt: now,
      nextReviewAt: now + intervalDays * 86_400_000,
    };

    if (user) {
      try {
        await reviewFlashcardAction(id, quality);
      } catch (err) {
        console.error("Failed to review flashcard:", err);
      }
    }
    setFlashcards((prev) => prev.map((f) => (f.id === id ? updated : f)));
    notify(`Scheduled next review in ${intervalDays} day${intervalDays > 1 ? "s" : ""}.`, "info");
  };

  const deleteFlashcard = async (id: string) => {
    if (user) {
      try {
        await deleteFlashcardAction(id);
      } catch (err) {
        console.error("Failed to delete flashcard:", err);
      }
    }
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
    notify("Flashcard deleted.", "info");
  };

  const updateUserProfile = async (patch: Partial<Pick<UserProfile, "displayName" | "weeklyGoalMinutes">>) => {
    const cleanPatch: Partial<Pick<UserProfile, "displayName" | "weeklyGoalMinutes">> = {};
    if (patch.displayName !== undefined) cleanPatch.displayName = patch.displayName.trim().slice(0, 120) || "Skyx Scholar";
    if (patch.weeklyGoalMinutes !== undefined) {
      cleanPatch.weeklyGoalMinutes = Math.min(2400, Math.max(30, Number(patch.weeklyGoalMinutes) || 300));
    }
    setUserProfile((prev) => ({ ...prev, ...cleanPatch }));
    if (user) {
      try {
        await updateUserProfileAction(user.uid, cleanPatch, getSessionToken());
      } catch (err) {
        console.error("Failed to update profile:", err);
      }
    }
    notify("Account preferences saved.", "success");
  };

  // --- ADMIN ACTIONS ---

  const recordAuditLog = async (action: string, resourceType: string, resourceId: string, summary: string) => {
    if (user && isAdmin) {
      try {
        await createAuditLog({
          actorUid: user.uid,
          actorEmail: user.email || "",
          action: action.slice(0, 64),
          resourceType: resourceType.slice(0, 48),
          resourceId: resourceId.slice(0, 120),
          summary: summary.slice(0, 400),
        });
      } catch (err) {
        console.error("Audit log write failed:", err);
      }
    }
  };

  const saveCurriculum = async (curr: Omit<Curriculum, "createdAt">) => {
    const id = sanitizeId(curr.id || `curr-${Date.now()}`);
    const normalized: Curriculum = {
      ...curr,
      id,
      slug: sanitizeId(curr.slug || curr.name.toLowerCase()),
      name: curr.name.slice(0, 120),
      description: curr.description.slice(0, 400),
    };
    if (user && isAdmin) {
      try {
        const existing = curriculums.find((c) => c.id === id);
        if (existing) {
          await updateCurriculumAction(id, normalized);
        } else {
          await createCurriculumAction(normalized);
        }
      } catch (err) {
        console.error("Failed to save curriculum:", err);
      }
    }
    setCurriculums((prev) => [...prev.filter((c) => c.id !== id), normalized].sort((a, b) => a.orderIndex - b.orderIndex));
    await recordAuditLog("CURRICULUM_SAVED", "curriculum", id, `Saved curriculum "${normalized.name}".`);
    notify(`Curriculum "${normalized.name}" saved.`, "success");
  };

  const deleteCurriculum = async (id: string) => {
    if (user && isAdmin) {
      try {
        await deleteCurriculumAction(id);
      } catch (err) {
        console.error("Failed to delete curriculum:", err);
      }
    }
    setCurriculums((prev) => prev.filter((c) => c.id !== id));
    await recordAuditLog("CURRICULUM_DELETED", "curriculum", id, `Deleted curriculum ${id}.`);
    notify("Curriculum deleted.", "info");
  };

  const saveSubject = async (subj: Omit<Subject, "createdAt">) => {
    const id = sanitizeId(subj.id || `subj-${Date.now()}`);
    const normalized: Subject = {
      ...subj,
      id,
      code: subj.code.slice(0, 32),
      name: subj.name.slice(0, 140),
      description: subj.description.slice(0, 500),
    };
    if (user && isAdmin) {
      try {
        const existing = subjects.find((s) => s.id === id);
        if (existing) {
          await updateSubjectAction(id, normalized);
        } else {
          await createSubjectAction(normalized);
        }
      } catch (err) {
        console.error("Failed to save subject:", err);
      }
    }
    setSubjects((prev) => [...prev.filter((s) => s.id !== id), normalized].sort((a, b) => a.orderIndex - b.orderIndex));
    await recordAuditLog("SUBJECT_SAVED", "subject", id, `Saved subject "${normalized.name}".`);
    notify(`Subject "${normalized.name}" saved.`, "success");
  };

  const deleteSubject = async (id: string) => {
    if (user && isAdmin) {
      try {
        await deleteSubjectAction(id);
      } catch (err) {
        console.error("Failed to delete subject:", err);
      }
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    await recordAuditLog("SUBJECT_DELETED", "subject", id, `Deleted subject ${id}.`);
    notify("Subject deleted.", "info");
  };

  const saveSyllabus = async (syl: Omit<Syllabus, "createdAt">) => {
    const id = sanitizeId(syl.id || `syl-${Date.now()}`);
    const normalized: Syllabus = {
      ...syl,
      id,
      title: syl.title.slice(0, 160),
      examTarget: syl.examTarget.slice(0, 120),
      academicYear: syl.academicYear.slice(0, 32),
      chaptersSummary: syl.chaptersSummary.slice(0, 1000),
    };
    if (user && isAdmin) {
      try {
        const existing = syllabi.find((s) => s.id === id);
        if (existing) {
          await updateSyllabusAction(id, normalized);
        } else {
          await createSyllabusAction(normalized);
        }
      } catch (err) {
        console.error("Failed to save syllabus:", err);
      }
    }
    setSyllabi((prev) => [normalized, ...prev.filter((s) => s.id !== id)]);
    await recordAuditLog("SYLLABUS_SAVED", "syllabus", id, `Saved syllabus "${normalized.title}".`);
    notify(`Syllabus "${normalized.title}" saved.`, "success");
  };

  const deleteSyllabus = async (id: string) => {
    if (user && isAdmin) {
      try {
        await deleteSyllabusAction(id);
      } catch (err) {
        console.error("Failed to delete syllabus:", err);
      }
    }
    setSyllabi((prev) => prev.filter((s) => s.id !== id));
    await recordAuditLog("SYLLABUS_DELETED", "syllabus", id, `Deleted syllabus ${id}.`);
    notify("Syllabus deleted.", "info");
  };

  const saveImportJob = async (job: Omit<ImportJob, "createdAt" | "updatedAt">) => {
    const id = sanitizeId(job.id || `job-${Date.now()}`);
    const normalized: ImportJob = {
      ...job,
      id,
      bookTitle: job.bookTitle.slice(0, 195),
      sourceFileName: job.sourceFileName.slice(0, 200),
      notes: (job.notes || "").slice(0, 600),
      progressPercent: Math.min(100, Math.max(0, Math.round(job.progressPercent))),
    };
    if (user && isAdmin) {
      try {
        const existing = importJobs.find((j) => j.id === id);
        if (existing) {
          await updateImportJobAction(id, {
            status: normalized.status,
            progressPercent: normalized.progressPercent,
            topicsDetected: normalized.topicsDetected,
            ocrConfidence: normalized.ocrConfidence,
            notes: normalized.notes,
          });
        } else {
          await createImportJobAction({
            bookId: normalized.bookId,
            bookTitle: normalized.bookTitle,
            sourceFileName: normalized.sourceFileName,
            sourceType: normalized.sourceType,
            createdBy: user.uid,
          });
        }
      } catch (err) {
        console.error("Failed to save import job:", err);
      }
    }
    setImportJobs((prev) => [normalized, ...prev.filter((j) => j.id !== id)]);
    await recordAuditLog(
      "IMPORT_JOB_UPDATED",
      "importJob",
      id,
      `Ingestion job "${normalized.sourceFileName}" moved to ${normalized.status} (${normalized.progressPercent}%).`
    );
    notify(`Import job updated (${normalized.status}).`, "success");
  };

  const saveBook = async (book: Omit<Book, "createdAt" | "updatedAt">) => {
    const id = sanitizeId(book.id || `book-${Date.now()}`);
    const normalized: Book = {
      ...book,
      id,
      title: book.title.slice(0, 195),
      subtitle: (book.subtitle || "").slice(0, 235),
      author: book.author.slice(0, 135),
      description: book.description.slice(0, 1150),
    };

    if (user && isAdmin) {
      try {
        const existing = books.find((b) => b.id === id);
        if (existing) {
          await updateBookAction(getSessionToken(), id, normalized);
        } else {
          const saved = await createBookAction(getSessionToken(), normalized);
          if (saved.error) throw new Error(saved.error);
        }
      } catch (err) {
        console.error("Failed to save book:", err);
        notify("Could not save the book.", "error");
        return false;
      }
    }
    setBooks((prev) => {
      const others = prev.filter((b) => b.id !== id);
      return [normalized, ...others];
    });
    await recordAuditLog("BOOK_SAVED", "book", id, `Saved book "${normalized.title}" (${normalized.accessTier}).`);
    notify(`Book "${normalized.title}" saved.`, "success");
    return true;
  };

  const deleteBook = async (bookId: string) => {
    if (user && isAdmin) {
      try {
        await deleteBookAction(getSessionToken(), bookId);
      } catch (err) {
        console.error("Failed to delete book:", err);
        notify("Could not delete the book.", "error");
        return;
      }
    }
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    notify("Book deleted.", "info");
  };

  const saveTopicsBatch = async (
    bookId: string,
    newTopics: Omit<BookTopic, "createdAt" | "updatedAt">[]
  ) => {
    const normalized = newTopics.map((t, i) => ({
      ...t,
      id: sanitizeId(t.id || `topic-${bookId}-${Date.now()}-${i}`),
      bookId,
      chapterTitle: t.chapterTitle.slice(0, 195),
      sectionTitle: t.sectionTitle.slice(0, 195),
      topicTitle: t.topicTitle.slice(0, 235),
      contentMarkdown: t.contentMarkdown.slice(0, 58000),
      searchTokens: `${t.chapterTitle} ${t.sectionTitle} ${t.topicTitle}`.toLowerCase().slice(0, 1900),
    }));

    try {
      const { book, topics: saved } = await persistBookTopics(getSessionToken(), bookId, normalized);
      const ids = new Set(saved.map(topic => topic.id));
      setBooks(items => items.map(item => item.id === bookId ? toBook(book) : item));
      setTopics(items => [...items.filter(item => !ids.has(item.id)), ...saved.map(toBookTopic)]);
      notify(`Saved ${saved.length} structured topics to the library.`, "success");
      return true;
    } catch {
      notify("Could not save topics. Your draft is still available.", "error");
      return false;
    }
  };

  const saveSingleTopic = async (topic: Omit<BookTopic, "createdAt" | "updatedAt">) => {
    const id = sanitizeId(topic.id || `topic-${Date.now()}`);
    const normalized: BookTopic = {
      ...topic,
      id,
      chapterTitle: topic.chapterTitle.slice(0, 195),
      sectionTitle: topic.sectionTitle.slice(0, 195),
      topicTitle: topic.topicTitle.slice(0, 235),
      contentMarkdown: topic.contentMarkdown.slice(0, 58000),
      searchTokens: `${topic.chapterTitle} ${topic.sectionTitle} ${topic.topicTitle}`.toLowerCase().slice(0, 1900),
    };

    if (user && isAdmin) {
      try {
        const existing = topics.find((t) => t.id === id);
        if (existing) {
          await updateTopicAction(getSessionToken(), id, normalized);
        } else {
          const saved = await createTopicAction(getSessionToken(), normalized);
          if (saved.error) throw new Error(saved.error);
        }
      } catch (err) {
        console.error("Failed to save topic:", err);
        notify("Could not save the topic.", "error");
        return;
      }
    }
    setTopics((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = normalized;
        return copy;
      }
      return [...prev, normalized];
    });
    notify(`Topic "${normalized.topicTitle}" saved.`, "success");
  };

  const deleteTopic = async (topicId: string) => {
    if (user && isAdmin) {
      try {
        await deleteTopicAction(getSessionToken(), topicId);
      } catch (err) {
        console.error("Failed to delete topic:", err);
        notify("Could not delete the topic.", "error");
        return;
      }
    }
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    notify("Topic removed.", "info");
  };

  const saveStudyTabType = async (tab: Omit<StudyTabType, "createdAt">) => {
    const id = sanitizeId(tab.id || `tab-${tab.key}`);
    const normalized: StudyTabType = {
      ...tab,
      id,
      key: sanitizeId(tab.key).replace(/-/g, "_"),
      label: tab.label.slice(0, 46),
      promptTemplate: tab.promptTemplate.slice(0, 1950),
    };
    try {
      const saved = toStudyTabType(await persistStudyTabType(getSessionToken(), normalized));
      setStudyTabTypes(prev => [...prev.filter(tab => tab.key !== saved.key), saved]);
      notify(`Study tab "${saved.label}" saved.`, "success");
      return true;
    } catch {
      notify("Could not save the study tab.", "error");
      return false;
    }
  };

  const saveTopicStudyTab = async (tab: Omit<TopicStudyTab, "updatedAt">) => {
    const id = sanitizeId(tab.id || `tst-${tab.topicId}-${tab.tabKey}`);
    const normalized: TopicStudyTab = {
      ...tab,
      id,
      contentMarkdown: tab.contentMarkdown.slice(0, 39000),
    };
    try {
      const saved = toTopicStudyTab(await persistTopicStudyTab(getSessionToken(), normalized));
      setTopicStudyTabs(prev => [...prev.filter(tab => tab.id !== saved.id), saved]);
      notify("Study tab content published to learners.", "success");
    } catch {
      notify("Could not publish the study tab.", "error");
    }
  };

  const saveQuestionsBatch = async (qs: Omit<Question, "createdAt">[]) => {
    const normalized = qs.map((q, i) => ({
      ...q,
      id: sanitizeId(q.id || `q-${Date.now()}-${i}`),
      stem: q.stem.slice(0, 1950),
      explanation: q.explanation.slice(0, 2950),
      chapterTitle: q.chapterTitle.slice(0, 195),
    }));

    try {
      if (!isAdmin) {
        // Learner-generated practice questions are session-scoped.
        setQuestions(prev => [...normalized, ...prev]);
        notify("Practice questions added for this session.", "success");
        return true;
      }
      const saved = await persistQuestions(getSessionToken(), normalized.map(q => ({ ...q, options: JSON.stringify(q.options) })));
      const ids = new Set(saved.map(question => question.id));
      setQuestions(prev => [...saved.map(toQuestion), ...prev.filter(question => !ids.has(question.id))]);
      notify(`Saved ${saved.length} questions to the Question Bank.`, "success");
      return true;
    } catch {
      notify("Could not save questions. Your draft is still available.", "error");
      return false;
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (user && isAdmin) {
      try {
        await deleteQuestionAction(getSessionToken(), questionId);
      } catch (err) {
        console.error("Failed to delete question:", err);
        notify("Could not delete the question.", "error");
        return;
      }
    }
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    notify("Question deleted.", "info");
  };

  const updateAiModelConfig = async (cfg: Omit<AiModelConfig, "updatedAt">) => {
    if (!user || !isAdmin) {
      notify("Administrator access is required.", "error");
      return false;
    }
    const cleanSecretSlot =
      cfg.secretSlot && /^[A-Z0-9_]{1,64}$/.test(cfg.secretSlot.trim())
        ? cfg.secretSlot.trim()
        : undefined;
    const normalized: AiModelConfig = {
      id: sanitizeId(cfg.id).slice(0, 60),
      taskName: cfg.taskName.trim().slice(0, 98),
      primaryModel: cfg.primaryModel.trim().slice(0, 78),
      fallbackModel: cfg.fallbackModel.trim().slice(0, 78),
      priority: Math.max(0, Math.min(100, Math.round(cfg.priority))),
      isEnabled: Boolean(cfg.isEnabled),
      usageCount: Math.max(0, Math.round(cfg.usageCount || 0)),
      ...(cfg.voiceName ? { voiceName: cfg.voiceName.trim().slice(0, 38) } : {}),
      ...(cleanSecretSlot ? { secretSlot: cleanSecretSlot } : {}),
    };

    try {
      await updateAiModelConfigAction(normalized.id, {
        primaryModel: normalized.primaryModel,
        fallbackModel: normalized.fallbackModel,
        priority: normalized.priority,
        isEnabled: normalized.isEnabled,
        voiceName: normalized.voiceName || null,
        secretSlot: normalized.secretSlot || null,
      }, getSessionToken());
    } catch {
      notify("Could not save the AI tool settings. Check your model selection and try again.", "error");
      return false;
    }
    setAiModelConfigs((prev) => prev.map(tool => tool.id === normalized.id ? normalized : tool));
    pushRealtimeSync("aiModelConfigs", "upsert", null);
    notify(`Saved settings for ${normalized.taskName}.`, "success");
    return true;
  };

  const saveCustomAiModel = async (model: Omit<CustomAiModel, "createdAt" | "updatedAt">) => {
    const cleanModelId = model.modelId.trim().slice(0, 78);
    const id = sanitizeId(model.id || `mdl-${cleanModelId}`).slice(0, 60);
    const normalized: CustomAiModel = {
      id,
      modelId: cleanModelId,
      displayName: (model.displayName.trim() || cleanModelId).slice(0, 98),
      category: model.category,
      tier: model.tier,
      ...(model.voiceName ? { voiceName: model.voiceName.trim().slice(0, 38) } : {}),
      ...(model.notes ? { notes: model.notes.trim().slice(0, 390) } : {}),
      isEnabled: Boolean(model.isEnabled),
    };

    deletedModelIdsRef.current.delete(id);
    setCustomAiModels((prev) => [normalized, ...prev.filter((m) => m.id !== id)]);
    pushRealtimeSync("customAiModels", "upsert", normalized);

    if (user && isAdmin) {
      try {
        const existing = customAiModels.find((m) => m.id === id);
        if (existing) {
          await updateCustomAiModelAction(id, normalized);
        } else {
          await createCustomAiModelAction(normalized);
        }
      } catch (err) {
        console.error("Failed to save customAiModel:", err);
        notify("Added locally, but cloud sync failed.", "error");
        return;
      }
    }
    await recordAuditLog(
      "CUSTOM_AI_MODEL_SAVED",
      "customAiModel",
      id,
      `Saved Gemini model "${normalized.modelId}" (${normalized.category}).`
    );
    notify(`Model "${normalized.displayName}" is now live in all dropdowns.`, "success");
  };

  const deleteCustomAiModel = async (id: string) => {
    deletedModelIdsRef.current.add(id);
    setCustomAiModels((prev) => prev.filter((m) => m.id !== id));
    pushRealtimeSync("customAiModels", "delete", { id });

    if (user && isAdmin) {
      try {
        await deleteCustomAiModelAction(id);
      } catch (err) {
        console.error("Failed to delete customAiModel:", err);
        notify("Removed locally, but cloud delete failed.", "error");
        return;
      }
    }
    await recordAuditLog("CUSTOM_AI_MODEL_DELETED", "customAiModel", id, `Removed custom model ${id}.`);
    notify("Model removed everywhere.", "info");
  };

  const updateUserAccess = async (
    targetUid: string,
    patch: { role?: UserRole; planId?: string }
  ) => {
    if (!isAdmin) {
      notify("Only administrators can modify user roles or plans.", "error");
      return;
    }
    if (targetUid === user?.uid && patch.role && patch.role !== "admin") {
      notify("You cannot remove your own Administrator access.", "error");
      return;
    }
    const target = allUsers.find((u) => u.uid === targetUid);
    if (!target) return;

    const nextRole = patch.role ?? target.role;
    const nextPlanId = patch.planId ?? target.planId;

    if (user && isAdmin) {
      try {
        await updateUserAction(targetUid, { role: nextRole, planId: nextPlanId }, getSessionToken());
      } catch (err) {
        console.error("Failed to update user access:", err);
        notify("Failed to update user access.", "error");
        return;
      }
    }
    setAllUsers((prev) =>
      prev.map((u) => (u.uid === targetUid ? { ...u, role: nextRole, planId: nextPlanId } : u))
    );

    await recordAuditLog(
      "USER_ACCESS_UPDATED",
      "user",
      targetUid,
      `Updated ${target.email} -> role: ${nextRole}, plan: ${nextPlanId}.`
    );
    notify(`Updated access for ${target.displayName} (${nextRole}).`, "success");
  };

  const updateSubscriptionPlan = async (plan: SubscriptionPlan) => {
    if (user && isAdmin) {
      try {
        const allowedTiersStr = Array.isArray(plan.allowedTiers) ? JSON.stringify(plan.allowedTiers) : plan.allowedTiers;
        await updateSubscriptionPlanAction(plan.id, {
          name: plan.name,
          tagline: plan.tagline,
          priceMonthly: plan.priceMonthly,
          currency: plan.currency,
          allowedTiers: allowedTiersStr,
          dailyAiLimit: plan.dailyAiLimit,
          has3dLab: plan.has3dLab,
          hasVoiceTutor: plan.hasVoiceTutor,
          orderIndex: plan.orderIndex,
          isPublished: plan.isPublished,
        });
      } catch (err) {
        console.error("Failed to update subscription plan:", err);
      }
    }
    setSubscriptionPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
    notify(`Updated "${plan.name}" plan.`, "success");
  };

  const resolveTaskId = (taskId: string): string => {
    const aliasMap: Record<string, string> = {
      "task-summary": "cfg-summary",
      "task-ultra-short": "cfg-ultrashort",
      "task-questions": "cfg-questions",
      "task-book-split": "cfg-splitter",
      "task-tts": "cfg-tts",
      "task-transcribe": "cfg-transcribe",
      "task-tutor-chat": "cfg-tutor-chat",
      "task-voice-live": "cfg-voice-live",
      "task-grounding": "cfg-grounding",
    };
    return aliasMap[taskId] || taskId;
  };

  const getModelForTask = (taskId: string): string => {
    const canonicalId = resolveTaskId(taskId);
    const cfg = aiModelConfigs.find((c) => c.id === canonicalId);
    if (!cfg || !cfg.isEnabled) {
      if (canonicalId === "cfg-voice-live") return "gemini-3.8-live";
      if (canonicalId === "cfg-ultrashort") return "gemini-3.1-flash-lite";
      if (canonicalId === "cfg-tts") return "gemini-3.8-flash-lite-tts";
      if (canonicalId === "cfg-transcribe") return "gemini-3.5-transcribe";
      return "gemini-4-hydrogen";
    }
    return cfg.primaryModel;
  };

  const getSecretSlotForTask = (taskId: string): string => {
    const canonicalId = resolveTaskId(taskId);
    const cfg = aiModelConfigs.find((c) => c.id === canonicalId);
    if (cfg?.secretSlot && availableSecretSlots.some((s) => s.id === cfg.secretSlot)) {
      return cfg.secretSlot;
    }
    return availableSecretSlots[0]?.id || "GEMINI_API_KEY";
  };

  const getLiveModelConfig = () => {
    const cfg = aiModelConfigs.find((c) => c.id === "cfg-voice-live");
    return {
      primaryModel: cfg?.isEnabled && cfg.primaryModel ? cfg.primaryModel : "gemini-3.8-live",
      fallbackModel: cfg?.fallbackModel || "gemini-3.8-live-extended-thinking",
      voiceName: cfg?.voiceName || "Zephyr",
      secretSlot: getSecretSlotForTask("cfg-voice-live"),
    };
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        userProfile,
        isAdmin,
        isCloudSynced,
        signInWithEmailPassword,
        registerWithEmailPassword,
        sendPasswordReset,
        signOut,
        activePanel,
        setActivePanel,
        learnerRoute,
        setLearnerRoute,
        adminRoute,
        setAdminRoute,
        sidebarCollapsed,
        setSidebarCollapsed,
        activeBookId,
        activeTopicId,
        activeReaderTab,
        setActiveReaderTab,
        refreshBookAccess,
        applyPublishedBook: (book, nextTopics) => {
          setBooks(items => [toBook(book), ...items.filter(item => item.id !== book.id)]);
          setTopics(items => [...items.filter(item => item.bookId !== book.id), ...nextTopics.map(toBookTopic)]);
        },
        openBookReader,
        activeLabModel,
        setActiveLabModel,
        open3dLab,
        curriculums,
        subjects,
        syllabi,
        books,
        topics,
        studyTabTypes,
        topicStudyTabs,
        questions,
        annotations,
        readingProgress,
        examAttempts,
        flashcards,
        subscriptionPlans,
        subscriptions,
        aiModelConfigs,
        customAiModels,
        availableSecretSlots,
        refreshSecretSlots,
        importJobs,
        auditLogs,
        allUsers,
        comfort,
        updateComfort,
        isSearchOpen,
        setIsSearchOpen,
        isTutorOpen,
        tutorInitialMode,
        tutorPrefillPrompt,
        openAiTutor,
        closeAiTutor,
        toasts,
        notify,
        addAnnotation,
        deleteAnnotation,
        updateTopicProgress,
        saveExamAttempt,
        selectSubscriptionPlan,
        addFlashcard,
        reviewFlashcard,
        deleteFlashcard,
        updateUserProfile,
        recordAuditLog,
        saveCurriculum,
        deleteCurriculum,
        saveSubject,
        deleteSubject,
        saveSyllabus,
        deleteSyllabus,
        saveImportJob,
        saveBook,
        deleteBook,
        saveTopicsBatch,
        saveSingleTopic,
        deleteTopic,
        saveStudyTabType,
        saveTopicStudyTab,
        saveQuestionsBatch,
        deleteQuestion,
        updateAiModelConfig,
        saveCustomAiModel,
        deleteCustomAiModel,
        updateUserAccess,
        updateSubscriptionPlan,
        getModelForTask,
        getSecretSlotForTask,
        getLiveModelConfig,
      }}
    >
      {children}
      {/* Clean floating toast notifications */}
      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border transition-all ${
              t.tone === "success"
                ? "bg-emerald-950 text-emerald-50 border-emerald-800"
                : t.tone === "error"
                  ? "bg-rose-950 text-rose-50 border-rose-800"
                  : "bg-slate-900 text-slate-50 border-slate-700"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
