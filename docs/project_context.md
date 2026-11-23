# Skyx Academy Project Context

বর্তমান রান, যাচাই ও কাজের অগ্রাধিকারের জন্য [হালনাগাদ প্রজেক্ট কনটেক্সট](../Knowledge/PROJECT_CONTEXT.md) দেখুন।

**Status:** Optional historical snapshot from November 23, 2026. See README for current status.

## 1. Product and users

Skyx Academy is a bilingual English and Bangla learning platform built around structured textbooks. The learner workspace combines a digital reader, study notes and annotations, a Three.js visual lab, timed MCQ exams, flashcards, and AI tutoring. The admin workspace provides catalog and book management, content editing, question generation, AI settings, user management, subscription controls, and operations views.

| User | Main workflows |
| --- | --- |
| Learner | Browse curricula and books, read by chapter and topic, use the Paper, Sepia, or Midnight theme, highlight or bookmark text, review study tabs, sit timed exams, practice with spaced-repetition flashcards, and ask the AI tutor questions. |
| Administrator or content editor | Maintain curricula, subjects, and syllabi, import and review books, edit Markdown topics, generate questions, configure AI tools, and review accounts, plans, and audit logs. |
| Book Manager user | Open a supported document, read or search it with the document viewer, export or publish a book project, and optionally start the PDF Voice Assistant. |

## 2. Architecture and data boundaries

- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, and Three.js. The dashboard, learner reader, floating tutor, and Book Manager are separate entry points.
- **Application server:** `server.ts` hosts Next.js and the WebSocket paths for the floating tutor, PDF Reader Assistant, and client synchronization. `PORT` controls the listening port and defaults to 3000. `SKYX_BIND_HOST` can restrict the address for local runs.
- **Database:** PostgreSQL is the active application database. Prisma and the PostgreSQL adapter provide database access through `lib/db.ts`. `prisma/schema.prisma` defines the deployed model. Firebase files and the legacy import script remain in the source tree. An empty installation can start directly on PostgreSQL.
- **Sign-in:** An operator creates the first administrator using `npm run admin:create`. All accounts use the same Sign In screen. Passwords use bcrypt, and the server signs sessions with `JWT_SECRET`. The database user role determines access during session restoration. Public registration creates learner accounts. Verified password recovery has yet to be implemented.
- **Book assets:** Learner catalog records and topic Markdown use PostgreSQL. The Book Manager file workflows use portable export or VPS disk storage through the storage adapter. File-based projects and the relational catalog currently have separate persistence paths.

### Book-first architecture decision

The catalog connects curricula, subjects, and syllabi to books. Each book contains ordered topics with chapter and section metadata. Study content, assessment, annotations, and tutoring use book and topic context where available. The separate document viewer supports an open PDF and its current visible page. Broader document indexing and cross-book retrieval are design work tracked in the [knowledge engine plan](../.knowledge/smart-knowledge-engine-db-plan.md).

## 3. PostgreSQL schema and persistence

| Domain | Prisma models | Current behavior |
| --- | --- | --- |
| Identity and governance | `User`, `Admin`, `AuditLog`, `SystemBootstrap`, `SessionToken` | Sign-in reads `User` and verifies the stored hash. Multiple admin flows write audit entries. The active sign-in flow uses signed JWTs. The presence of `SessionToken` and `SystemBootstrap` in the schema does not establish that they control login. |
| Catalog and book content | `Curriculum`, `Subject`, `Syllabus`, `Book`, `BookTopic`, `ImportJob` | Prisma actions and application loading paths exist. Book topics store ordered chapter, section, and topic information, Markdown, and optional 3D references. The Admin Splitter processes raw text. Book Manager has a separate upload and extraction flow for supported document formats. |
| Study tabs and assessment | `StudyTabType`, `TopicStudyTab`, `Question`, `ExamAttempt` | Question and exam persistence paths exist. Tab definition and topic-tab editing still rely on seed data and application state. |
| Learner data | `LearnerAnnotation`, `ReadingProgress`, `Flashcard` | PostgreSQL-backed actions exist. Several actions still require a consistent server-side ownership check. Reading Comfort and parts of the restored profile still rely on local application state or defaults. |
| Plans and subscriptions | `SubscriptionPlan`, `SubscriptionRecord` | Plan and subscription records have load and write paths. Full entitlement enforcement across requests remains to be verified. |
| AI settings | `CustomAiModel`, `AiModelConfig`, `AiCredential` | The custom model catalog and General Tools settings have PostgreSQL paths. Shared Gemini requests still use environment keys. Book Reader uses its separate settings file. |

## 4. API and WebSocket entry points

| Entry point | Current responsibility |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/register` | Account authentication and learner registration. The normal browser flow uses the related authentication server actions. |
| `POST /api/auth/reset-password` | Returns unavailable while verified password recovery is absent. |
| `GET /api/health`, `GET /api/ai/status` | Report service metadata and current environment-based Gemini availability. They do not constitute end-to-end database or model readiness checks. |
| `POST /api/ai/chat` | Floating Chat, Explain, Quiz, Viva, and optional Google Search Grounding. |
| `POST /api/ai/study-content` | Generate Markdown for standard or custom study tabs, including Ultra Short. |
| `POST /api/ai/questions`, `POST /api/ai/book-split` | Generate MCQs and split source text into chapters, sections, and topics. |
| `POST /api/ai/tts`, `POST /api/ai/transcribe` | Read-aloud and two-speaker podcast audio, plus voice-note transcription. |
| `POST /api/ai/test-model` | General model test. Non-text checks currently use metadata. |
| `GET/POST /api/ai/reader-settings` | Administrator-only Reader settings, key management, and a real Live handshake test. |
| `WS /api/live-ws` | Floating Live tutor for microphone audio and optional screen context. |
| `WS /api/reader-live-ws` | PDF Reader Assistant for signed-in users. The reader sends the visible PDF area and the server mediates the page-navigation tool. |
| `WS /api/sync-ws` | Client synchronization. General Tools uses a notification followed by a database refresh. Other existing synchronization flows still need review. |
| `/api/book-engine/extract`, `/api/book-engine/storage` | Document extraction and configurable book-project storage. These are separate from Gemini model routing. |

## 5. AI tool inventory and configuration

### General Tools

The General Tools screen lists nine built-in workflows even when `AiModelConfig` is empty. It shows **Setup required** until a model is configured. New settings use stable `cfg-*` task identifiers, and readers can still match legacy saved task names. The first save creates the row. Later saves update it. An administrator session is required, and each successful settings write and audit entry share a transaction.

| Tool ID | Workflow |
| --- | --- |
| `cfg-tutor-chat` | Floating AI Chat and page context |
| `cfg-voice-live` | Floating Live Voice and Screen |
| `cfg-summary` | Summary, Key Points, and Study Tabs |
| `cfg-ultrashort` | Quick Hints and Ultra Short |
| `cfg-questions` | Question Bank and Exam Generation |
| `cfg-splitter` | Book Auto-Splitter |
| `cfg-tts` | Read-Aloud and Study Podcast |
| `cfg-transcribe` | Voice Transcription |
| `cfg-grounding` | Web Grounding |

Dropdowns show compatible catalog and preset options. A listed model ID is a selectable candidate. Provider access and actual task capability still need testing. General Gemini HTTP routes and Floating Live currently take model or slot hints from the browser and use environment-based credentials. Some paths retain hard-coded fallbacks. General Tools' saved on/off setting does not yet enforce route-level availability across those paths.

### Advanced Tools and Book Reader Assistant

The Book Reader Assistant has its own model and credential selection, separate from Floating Live. Its saved `reader.json` selection takes precedence over `SKYX_READER_LIVE_MODEL` and `SKYX_READER_KEY_SLOT`. A saved selection can refer to an environment credential or an encrypted file-managed key. The Reader settings panel shows the source. Adding a managed key requires `SKYX_READER_MASTER_KEY` on the host.

During a session, the assistant receives microphone audio and the visible PDF area. It can ask the app to open a specific page and use the new visible frame after navigation. The Reader supports Extended Thinking configuration and activity status. The server opens the model selected for each session.

### Pending AI integration

The shared PostgreSQL credential catalog, a default-key selector for all tools, authoritative server-side routing, and the migration of the Reader's settings from file storage are still planned. Their intended behavior, existing routes, and verification steps are in the [AI Tools and PostgreSQL integration plan](../.knowledge/ai-tools-postgresql-integration-plan.md).

## 6. Security, operations, and content rights

- Keep `DATABASE_URL`, `JWT_SECRET`, Gemini keys, and encryption keys on the server. Client-facing settings can show source and masked metadata.
- Validate API inputs with the applicable Zod schemas. Enforce authorization and resource ownership on the server for protected endpoints and database actions. The General Tools settings write and Reader administration enforce admin access. Remaining data actions and WebSocket flows need the same review.
- Use licensed, openly licensed, or original content. Review publishing and unpublishing rights, how audit events are recorded, and which learner data export features are enabled before release.
- For an empty local database, set `DATABASE_URL` and `JWT_SECRET`, run `npm run db:setup`, create an admin through `npm run admin:create -- your-email@example.com`, then run `npm run dev`. The CLI prompts for an application password.
- Before a VPS release, review and apply versioned Prisma migrations, back up PostgreSQL and required book assets, preserve the Reader configuration and encryption key, and test restoration and both Live WebSocket paths. A successful health response indicates that the app is serving requests. Verify database and model functionality with dedicated checks.

## 7. Acceptance status and remaining work

| Area | Current status |
| --- | --- |
| PostgreSQL setup and initial admin | Local setup and administrator sign-in were confirmed during previous project testing. |
| General Tools listing and persistence | Tool inventory, stable identifiers, and administrator-only first save and update are implemented. See the verification note below for the checks performed during this change. |
| Book Manager PDF Voice Assistant | Live connection and spoken page navigation were previously confirmed. The assistant still uses its separate configuration store. |
| Other AI tools | Entry points are present. Complete shared credential and authoritative routing integration, then run actual model tests for each workflow. |
| Learning, content, and operations | The reader, 3D lab, exams, revision, catalog management, import jobs, and operations views exist. Verify persistence, permissions, and publication flows across production entry points before treating the complete feature set as accepted. |
| Study Tabs, profile hydration, and access enforcement | Connect Study Tab persistence fully, load saved profile fields consistently, and test owner and administrator permissions across data actions. |

**Verification for this change.** TypeScript passed. A PostgreSQL transaction test confirmed nine General Tools entries, first save, subsequent update, rejection without an admin session, and corresponding audit entries. The test transaction was rolled back. General Tools model calls and browser interaction were outside that check.
