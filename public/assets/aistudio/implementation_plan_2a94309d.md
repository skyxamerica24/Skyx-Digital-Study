# Skyx Academy — Master Implementation Plan

**Product:** Book-First, AI-Powered Digital Learning and Interactive Book Platform  
**Primary technology stack:** Next.js · React · TypeScript · PostgreSQL · Drizzle ORM · Gemini AI · Three.js  
**Initial interfaces:** Admin Panel and Learner Panel; no separate Instructor Panel in the initial release  
**Content languages:** Bangla and English, with configurable internationalization  
**Document purpose:** Unified product specification, technical architecture, delivery roadmap, and acceptance standard  
**Status:** Master implementation blueprint · November 2026

> **Product mandate:** Skyx Academy is not a conventional course-centric learning management system. Its core is a large, structured digital book library. Each licensed book becomes an interactive learning resource through comfortable reading, AI-generated study variants, personal annotations, diagrams, examination tools, search, and contextual voice tutoring. This document defines the target system; it does not imply that the features have already been implemented.

---

## 1. Vision, Scope, and Product Principles

### 1.1 Vision

Build a professional, accessible, secure, and extensible digital learning ecosystem for general academic subjects, Biology, Physics, Chemistry, medical admission preparation, BCS and other competitive or employment examinations, IELTS, and future educational curricula. A book is converted from source material—often PDF—into an editable, searchable, structured and interactive learning experience.

Learners navigate **Book → Chapter → Section → Topic → Subtopic → Point**, read the authoritative material, and access **Summary, Ultra Short, Key Points, Memorization Tricks, Q&A, Flashcards, 3D Diagram, and Exam** modes. Administrators control the content library and AI-generated learning layers; learners manage their own private notes and progress. A Gemini-powered voice/chat tutor can use the current point, whole book, and authorized external information while engaging learners in interactive questioning.

### 1.2 Non-negotiable principles

1. **Book-first, not course-first.** Books, curricula, syllabuses, and structured topics are the primary organizing units.
2. **Original content is preserved.** AI-derived content never silently overwrites the approved original source.
3. **Admin-published and learner-private content are distinct.** Private highlights and notes must never leak across accounts.
4. **Extensibility is built into the data model.** New curricula, study tabs, topic depths, question types, providers, and diagrams can be added without extensive redesign.
5. **Human verification is essential.** Medical/scientific information, answer keys, OCR errors, and educational AI output require review before formal publication.
6. **Rights and source provenance matter.** Content must be owned, licensed, public-domain, or otherwise authorized; source-page references remain traceable.
7. **Security and access enforcement live on the server.** UI visibility is not a substitute for permission checks.
8. **Scale is measured, not assumed.** Billion-scale search is an architectural ambition with explicit performance testing and infrastructure investment, not an automatic guarantee.

### 1.3 Initial scope and roles

- **Owner:** protected initial platform owner and sensitive system administrator.
- **Admin:** manages academic catalog, books, content, exams, diagrams, members, AI, and operational workflows according to assigned permissions.
- **Learner:** independently reads, studies, annotates, asks questions, practices, and subscribes.
- **Instructor Panel:** excluded from the initial release; permissions and domain design should allow it to be added later.

### 1.4 Initial curriculum coverage

Regular academic/HSC studies, Biology, Physics, Chemistry, medical admission, BCS/jobs and other competitive exams, and IELTS. Custom curricula and targets are first-class objects, not hardcoded categories.

---

## 2. Product Design and User Experience

### 2.1 Visual identity

Use a restrained **Dual-Atmosphere Scholarly SaaS** direction: an executive dashboard with a deep midnight-navy sidebar (`#0B1120` to `#131B2E`), soft light workspace (`#F6F8FC`), and indigo/violet action accents (`#6366F1`, `#6D28D9`); a highly readable book reader with **Paper White** (`#FFFFFF`), **Warm Sepia** (`#FAF6EE`), and **Midnight Charcoal** (`#121620`) themes. Treat the user's separately supplied design screenshots/prototype as the preferred visual reference when available; do not assert an exact match without inspecting them.

Suggested typography: **Plus Jakarta Sans** for UI, **Source Serif 4** for long-form English content, **Hind Siliguri** or **Noto Serif Bengali** for Bangla content, and **JetBrains Mono** for numeric dashboards and timers. Reader font size, line height, spacing, text-column width, color scheme, and focus mode must be user-adjustable.

### 2.2 Book reader layout

- **Left sidebar:** collapsible and searchable hierarchy covering chapter, section, topic, subtopic, and point; expand/collapse state, progress, and book switching.
- **Header:** breadcrumbs, book/section title, dynamic study tab bar, reading preferences, read-aloud, and AI tutor entry.
- **Main reader:** clean structured content blocks; text, math, images, tables, captions, diagrams, callouts, and linked source-page information.
- **Selection toolbar:** highlight (multiple colors), underline, note, bookmark, save to personal key points, and Ask AI.
- **Reader utilities:** mark complete, resume last location, search within the book, keyboard shortcuts, mobile-responsive navigation, and permitted print/export behavior.
- **Accessible behavior:** keyboard interaction, contrast, screen-reader semantics, reduced-motion mode, proper focus management, captions/transcripts, and Bangla typography verification.

### 2.3 Shared UX conventions

Provide real loading, empty, permission-denied, failed-job, retry, and confirmation states. Avoid decorative animations that distract readers. Design for desktop, tablet, and mobile, and use accessible forms and modal dialogs throughout.

---

## 3. Admin Panel — Full Menu Structure

| Menu | Submenus and responsibilities |
|---|---|
| **Overview** | KPI dashboard, recent activity, total books/topics, active learners, exam activity, imports, AI usage/cost, revenue, quick actions |
| **Academic Structure** | Curriculums/Tracks, Subjects, Syllabi, Syllabus Versions, Exam Targets, Curriculum/Book Mapping, Prerequisites |
| **Digital Library** | All Books, Add/Import, Editions, Collections, Assets, Source/Rights, Drafts, Published, Archived |
| **Book Processing** | Import Jobs, OCR/Layout Review, AI Structure Detection, Page Mapping, Extraction Errors, Reprocessing |
| **Book Editor** | Content Tree, Chapters/Sections/Topics/Points, Rich Text/Math Editor, Split/Merge, Block Editor, Versions/Publishing |
| **AI Content Studio** | Study Tab Generator, Custom Tab Types, Prompt Templates, Bulk Generation, Review Queue, Source Verification, Versions |
| **Question Bank & Exams** | Question Library, AI Question Generator, Duplicate/Answer Review, Exam Templates, Mock Tests, Attempts, Analytics |
| **3D & Interactive Diagrams** | Model Library, Asset Import, Diagram Workflow, Hotspots, Part/Layer Editor, Topic Linking, Publish/Preview |
| **Search & Knowledge** | Index Health, Search Documents/Chunks, Synonyms, Embeddings, Search Relevance, Reindex Jobs, Query Metrics |
| **Gemini AI Management** | API Credential Vault, Model Registry, Task Routing, Priority/Rotation/Fallback, Quotas, Costs, Voice Settings |
| **Learners & Access** | Learner Directory, Roles/Permissions, Activity, Plan Access, Reports, Support Actions |
| **Membership & Billing** | Plans/Packages, Entitlements, Subscriptions, Payments, Transactions, Invoices, Refunds, Webhooks |
| **Analytics & Reports** | Reading, Exams, Weak Topics, AI Use, Question Quality, Revenue, Retention, Search Behavior |
| **Operations** | Queues/Jobs, Failures, Audit Logs, Alerts, Backups, Storage, Notifications, System Health |
| **Settings** | General Branding, Localization, Reader Defaults, Security, Search, Media/Storage, SEO, Integrations, Feature Flags |

Owner-only actions include viewing credential status, changing sensitive routing/billing settings, managing privileged users, and destructive data operations. Record auditable events for critical actions. Never grant Admin status automatically to the first public signup.

---

## 4. Learner Panel — Full Menu Structure

| Menu | Submenus and responsibilities |
|---|---|
| **Home / Study Dashboard** | Continue Reading, Personalized Focus, Current Books, Weekly Progress, Study Streak, Weak-Topic Queue |
| **Explore Digital Library** | Curriculum/Subject Filters, Global Search, Book Detail, Free/Premium Status, Collections |
| **My Library** | Saved Books, Reading History, Favorites, Completed and In-Progress Books |
| **Reading Workspace** | Navigation Tree, Study Tabs, Source Content, Personal Annotations, Reading Preferences, AI Tutor |
| **3D Visual Lab** | Biology/Physics/Chemistry Models, Rotate/Zoom, Exploded View, Interactive Parts, AI Explanations |
| **Exam Center** | Custom Exam Builder, Timed Practice, Mock Exams, Question Palette, Flag/Submit |
| **Exam History & Review** | Results, Correct/Incorrect/Skipped, Answer Explanations, Weak Areas, Saved Questions |
| **My Study Vault** | Highlights, Underlines, Notes, Personal Key Points, Bookmarks, Saved Q&A |
| **Revision & Practice** | Flashcards, Spaced Repetition, Weak Topics, Focus Timer, Learning Schedule |
| **AI Tutor** | Floating Text/Voice Assistant, Explain Simply, Ask Questions, Quiz Me, Viva Mode |
| **Membership & Billing** | Plan, Usage Allowance, Upgrade, Payment History, Invoices |
| **Account & Preferences** | Profile, Language, Reader Preferences, Privacy, Notifications, Accessibility |

Learners see Admin-published learning content together with their own private study items but these remain separate source-of-truth records. All library, search, media, AI, and exam access must be entitlement-aware.

---

## 5. Academic Catalog, Curricula, and Syllabuses

Represent curricula, subjects, syllabus versions, exam targets, and books with **many-to-many relationships**. One authorized book/topic can support several curricula without unnecessary content duplication. Retain topic importance, syllabus weights, examination tags, learning objectives, prerequisites, and edition history. Book metadata includes title, author, publisher, ISBN where applicable, language, edition, source, legal usage rights, access tier, images, publication status, and timestamps.

**Navigation hierarchy:** `Curriculum → Subject → Syllabus → Book → Chapter → Section → Topic → Subtopic → Point`. This is the user's navigation model, not a requirement to duplicate every relationship in one linear database table.

---

## 6. Complete PDF-to-Digital Book Ingestion Pipeline

### 6.1 Inputs and provenance

Support native/digital PDF first, followed by scanned PDF, DOCX, EPUB, HTML/Markdown, text, images, and manual content entry. Validate extension and MIME, size, checksum, upload limits, ownership/rights, and malware risk. Retain a source and permission record. Never indiscriminately scrape or republish unauthorized copyrighted material.

### 6.2 State machine

`uploaded → validated → text_extraction → ocr_if_needed → layout_analysis → asset_extraction → ai_structure_proposal → admin_review → normalized → indexed → published`, with `failed`, `cancelled`, `reprocessing`, and `archived` states.

### 6.3 Detailed steps

1. **Source upload:** store immutable original file in Google Cloud Storage/S3-compatible Object Storage, with checksum, uploader, edition, rights, and source metadata in PostgreSQL.
2. **Text extraction:** use native PDF extraction when possible; OCR scanned pages with tested Bangla/English support. Candidate tools: **PyMuPDF**, **pdfplumber**, **Tesseract**, or a proven Document AI service.
3. **Layout detection:** identify reading order, multi-column text, headings, page numbers, tables, figures, captions, footnotes, equations, lists, and callouts.
4. **Math and media extraction:** preserve formulas as vetted LaTeX/MathML or original image fallbacks; store figures and captions as linked assets.
5. **AI structural segmentation:** use Gemini structured output to propose Chapters, Sections, Topics, Subtopics, and Points with source spans and confidence scores. Chunk large books rather than exceeding context limits.
6. **Admin review:** side-by-side original PDF and editable content tree; correction of OCR, headings, formulas, split/merge, drag/reorder, and page mappings.
7. **Block normalization:** store sanitized typed content blocks rather than only raw PDF or a single HTML blob; maintain stable IDs for annotation anchors.
8. **Quality checks:** flag missing pages, truncated text, broken figures, duplicated sections, incomplete formulas, and low-confidence OCR.
9. **Publish and index:** commit a reviewed content version, queue lexical and semantic indexing, and serve only published approved material to learners.
10. **Reprocess and rollback:** rerun selected pages, preserve prior versions and original assets, review annotation anchor reconciliation, and restore previous approved content if necessary.

### 6.4 Queue, processing, and operational requirements

Use **Redis + BullMQ** or a managed equivalent for OCR, extraction, large AI jobs, embedding, and indexing. Provide per-stage progress, idempotency, checkpointing, controlled concurrency, retries/backoff, cancellation, dead-letter queues, failure details, token/cost visibility, and operator recovery. Do not claim a processing completion time without measured evidence.

---

## 7. Structured Content Model, Editing, and Versions

- Implement arbitrary-depth nodes through `content_nodes(id, book_id, parent_id, type, sort_order, path, status, published_version_id, ...)`.
- Store rich blocks in `content_blocks` with types such as paragraph, heading, list, table, equation, image, diagram, callout, media, interactive model, and question reference.
- Associate blocks and nodes with original PDF page/span, edition, source, and immutable `block_uid` identifiers.
- Use `content_versions`, approval metadata, and atomic publication. Edited drafts cannot silently replace published content.
- Support split, merge, drag/drop, reparent, copy/duplicate where authorized, preview, compare versions, and rollback.
- For learner annotations, record text quotation, offsets, surrounding text and source version; safely reattach or mark as orphaned when the original content changes.
- Implement `study_tab_types` and `topic_study_tabs` for configurable study tabs per content node and language.

---

## 8. AI Content Studio and Study Modes

### 8.1 Default modes

**Reading**, **Summary**, **Ultra Short**, **Key Points**, **Memorization Tricks**, **Q&A**, **Flashcards/Spaced Repetition**, **3D Diagram**, and **Exam**. Admin-created custom tabs may include Formula Sheets, Clinical Correlations, IELTS Vocabulary, Examples, Common Mistakes, or future learning formats.

### 8.2 Content generation workflow

`select topic/point → choose task/tab and language → retrieve approved source content → choose configurable prompt/model → generate validated structured output → verify evidence/coverage → save draft → human edit/review → approve/publish → update indexes`.

- Keep prompt templates, prompt versions, source content versions, model IDs, generated timestamps, and reviewer decisions.
- Allow AI-generated, fully manual, and hybrid content creation.
- Regenerate selected sections without destroying the previously published version.
- Check for omitted facts, source contradictions, numerical distortion, incorrect medical/scientific explanations, and unsupported claims.
- Use source-linked citations where feasible, and require human approval for consequential educational material.
- Provide batch generation, task queue management, spending limits, and consistent content output schemas.
- Support multilingual output while retaining the source meaning and maintaining academic accuracy.

---

## 9. Question Bank and Examination Engine

### 9.1 Question creation

Start with **single-answer MCQs**, supporting later multi-answer, true/false, short-response, numeric, and IELTS-related tasks. Questions store topic/book/subject mappings, difficulty, marks, negative-marking rules, answer key, distractors, explanation, references, language, author/AI provenance, review status, and immutable version history.

Workflow: `AI/manual authoring → structural validation → duplicate/similarity detection → source/answer checking → editorial approval → question bank publication`. Never introduce unreviewed questions into high-stakes test banks without an explicit policy.

### 9.2 Exam session

- Configure book/chapter/topic scope, **20/50/100/custom** questions, difficulty, time, negative marks, randomization, and practice/mock mode.
- Randomize from eligible approved questions; favor unseen items, but do not promise infinite uniqueness when the pool is limited.
- Persist an immutable question version and random selection with each attempt.
- Use server-authoritative time, countdown synchronization, answer autosave, question palette, flag-for-review, submit, and auto-submit.
- Calculate deterministic scores server-side and display instant result, correct/incorrect/skipped breakdown, explanations, and source links.
- Maintain exam history, previous attempts, topic mastery, weak-areas analysis, and revision suggestions.
- Prevent answer-key exposure before submission, enforce permissions, and handle network interruptions safely.

### 9.3 Administration and analytics

Provide question quality reviews, duplicate reports, difficulty analytics, question performance, exam template management, result statistics, and dispute/correction workflows without rewriting historical learner results.

---

## 10. Three.js 3D Learning Lab and Diagram Authoring

### 10.1 Learner experience

Build interactive science scenes with **Three.js**, **React Three Fiber (`@react-three/fiber`)**, and **Drei (`@react-three/drei`)**. Support orbit/rotation, zoom, object selection, layered labels, interactive hotspots, exploded views, hidden/isolated parts, camera reset, source-topic linking, and AI explanations of a selected part.

Starter demonstrations: **Human Heart**, **Eukaryotic Cell**, **Atomic Structure**, **H₂O/CH₄ Molecular Geometry**, and optionally **DNA Helix**. Ensure scientific accuracy and clear Bangla/English labeling. Provide static 2D fallback, lazy loading, geometry compression, mobile performance limits, and reduced-motion behavior.

### 10.2 Admin authoring workflow

1. Upload or register 2D image, SVG, `.glb`/`.gltf`, model textures, or an existing Three.js scene.
2. Clean or segment the image; propose labels and part boundaries with AI if helpful.
3. Let Admin map parts, layers, hotspots, descriptions, animations, exploded-view positions, and links to book topics.
4. Preview on desktop/mobile, verify model accuracy, and publish a versioned scene.
5. Reuse published diagrams across multiple books or curricula through content-to-diagram mappings.

**Important limitation:** a normal 2D diagram is not automatically a scientifically accurate 3D model. AI may assist with interpretation and asset preparation, but true 3D reconstruction can require additional modeling, expert review, and authored 3D assets. Do not promise universal automatic 2D-to-3D conversion.

---

## 11. Gemini AI Tutor, RAG, and Voice Interaction

### 11.1 Context and retrieval

The floating tutor must support **current point**, **current chapter**, **whole book**, and **authorized external knowledge** scopes. Use a retrieval-augmented generation (RAG) pipeline with content chunks, source metadata, entitlement filters, citations, and stable source versions. Do not reveal unlicensed, unpublished, or paid content to unauthorized users.

### 11.2 Interaction modes

- **Explain Simply:** explain the selected sentence, page, topic, or concept.
- **Ask a Question:** learner asks; AI answers with contextual material and relevant sources.
- **Quiz Me / Socratic Tutor:** AI asks the learner questions, evaluates their replies, indicates what is correct/incorrect, and explains.
- **Exam Viva:** spoken or written question-and-answer practice with feedback.
- **Voice Chat:** real-time bidirectional conversation where a supported Gemini Live API and deployment architecture permit it.
- **Read-Aloud / TTS:** narration of authorized material; optional two-speaker study-podcast mode.
- **Voice Note Dictation:** microphone input converted into text notes or chat messages.

Maintain per-session context, conversation history with retention controls, source references, reconnect/error handling, cancellation, microphone permission management, audio consent, and a text-chat fallback.

### 11.3 Architecture

Use the official **`@google/genai`** SDK and available Gemini APIs as validated at implementation time. Consider a **dedicated authenticated WebSocket Voice Gateway** for long-lived bidirectional audio. A custom `server.ts` based on Express is an option, not an automatic Next.js requirement. Server processes credentials and enforces plan quotas/voice-minute limits. External web-grounded answers should be distinguished from answers based on internal books.

---

## 12. Gemini API Key Vault and AI Model Orchestration

### 12.1 Credentials

Admin must be able to add, label, enable/disable, rotate, prioritize, and revoke **multiple Gemini API Keys**. Secret values must never be sent back in plaintext after submission or exposed to the browser. Encrypt recoverable API credentials with managed KMS/Secret Manager or envelope encryption and restrict decryption to the backend. Passwords, unlike API credentials, require strong one-way password hashing.

### 12.2 Model registry and routing

- Configurable provider, real model ID, verified capability, pricing category, availability status, and regional restrictions.
- Task routes for OCR/structure extraction, summaries, quick definitions, key points, question generation, deep STEM explanations, voice, TTS, transcription, embeddings, and search grounding.
- Per-task primary/fallback model assignments and per-key priority, health check, rotation strategy, quota, and retry/backoff.
- Per-plan AI usage limits, tokens, voice minutes, requests, rate limits, and budget thresholds.
- Prompt policy/version management, response schema validation, audit logs, model usage/cost reporting, and privacy protections.

**Model availability policy:** The final exact model IDs must be checked against official Gemini documentation and access available to the deployed project. Do **not** hardcode unverified names from an earlier draft such as `gemini-4-hydrogen`, `gemini-4-neon`, or `gemini-4-carbon` as though they are confirmed public model IDs. Previously discussed voice/TTS/embedding names are examples to verify, not guaranteed endpoint names.

### 12.3 AI safety and cost management

Treat uploaded books, learner annotations, and retrieved web text as untrusted inputs. Protect against prompt injection and output schema violations. Store minimal necessary data, avoid publishing unsupported medical claims, reuse deterministic generations where safe, and report task-level AI spending and error rates.

---

## 13. Multilingual Search and Billion-Scale Growth Strategy

### 13.1 Search experience

Implement global `Ctrl+K`/`⌘K`, book-local search, suggestions, filtering, typo tolerance, relevant excerpts, topic deep links, and navigation to original pages where permitted. Searchable units include curricula, subjects, book titles, chapter titles, topics, subpoints, approved content, and optionally question-bank items with appropriate answer-key restrictions.

### 13.2 Incremental search architecture

1. **Baseline:** PostgreSQL Full-Text Search (`tsvector`/GIN), `pg_trgm`, normalized Bangla Unicode text, metadata indexes, and curated synonyms.
2. **Hybrid retrieval:** chunked source data plus embeddings through **pgvector** or a compatible vector service; combine lexical and semantic ranking and optional reranking.
3. **High scale:** benchmark and, when warranted, move to **OpenSearch**, **Elasticsearch**, or another suitable dedicated search service with shards, replicas, indexing pipelines, and cache layers.
4. **Billion-scale planning:** design index partitions, ingestion throughput, update events, hardware/cost budgets, query profiling, and concurrency/load testing. Do not claim universal instant search without evidence.

### 13.3 Index consistency and permissions

Publishing or revising books must emit durable indexing jobs. Handle retries, stale index detection, deletes, and reindexing. Enforce visibility, publication status, licenses, subscription entitlements, and privacy **during retrieval and result hydration**. Track p50/p95 query latency, index freshness, zero-result rate, and relevance quality.

---

## 14. Learner Study Vault and Personalization

- Admin-produced `topic_study_tabs` are published shared material; learner highlights/notes/personal key points/bookmarks belong to private user-owned records.
- Provide highlights with multiple colors, underlines, annotations, text quotes, organized notebooks, saved questions, reading history, and resume state.
- Track reading sessions, completion, mastered/weak topics, revision schedule, previous attempts, and progress trends.
- Offer SRS flashcards, weak-topic review, daily streaks, and a distraction-free Pomodoro/focus timer.
- Learners may manage preferences and request export/deletion of personal information subject to relevant policy.
- Support cross-device persistence and conflict-safe updates. Offline reading, if added later, must respect copyright and entitlements.

---

## 15. Plans, Membership, Subscription, and Billing

Support Free, Premium, subject-specific and curriculum-specific packages, including configurable durations, access tiers, trials, and optional promotional plans. An entitlement matrix controls book content, 3D scenes, Exam Center access, premium tabs, AI requests, Live Voice minutes, and downloads/exports.

Integrate payment providers through an abstraction layer suited to applicable markets. Prefer hosted checkout and never store raw card credentials. Implement verified webhooks, idempotency, subscription lifecycle, renewal/cancellation, refunds, invoices/receipts, failed-payment handling, reconciliation, and audit trail. Enforce paid permissions **on the backend and signed media delivery**, not only by hiding buttons.

---

## 16. PostgreSQL Database Schema and Drizzle ORM

### 16.1 Core entities

| Domain | Required tables / entities |
|---|---|
| Identity and access | `users`, `roles`, `permissions`, `user_roles`, `auth_identities`, `sessions`, `audit_logs` |
| Academic catalog | `curriculums`, `subjects`, `curriculum_subjects`, `syllabi`, `syllabus_versions`, `exam_targets`, `syllabus_nodes`, `book_syllabus_mappings`, `topic_prerequisites` |
| Library and rights | `books`, `book_editions`, `book_sources`, `book_licenses`, `book_assets`, `book_collections` |
| Book ingestion | `book_imports`, `import_pages`, `import_events`, `content_nodes`, `content_blocks`, `content_versions`, `content_reviews`, `topic_relations` |
| Learning content | `study_tab_types`, `topic_study_tabs`, `tab_content_versions`, `ai_prompt_templates`, `ai_generation_jobs`, `ai_review_queue` |
| Learner data | `learner_annotations`, `learner_key_points`, `reading_progress`, `learning_sessions`, `learner_preferences`, `flashcards`, `review_schedules`, `learner_mastery` |
| Question and exams | `questions`, `question_options`, `question_versions`, `question_sources`, `exam_templates`, `exam_sessions`, `exam_session_questions`, `exam_answers`, `exam_results` |
| Diagram and media | `diagram_assets`, `diagram_scenes`, `diagram_parts`, `diagram_hotspots`, `diagram_content_links`, `media_assets` |
| Gemini AI operations | `ai_providers`, `ai_models`, `ai_api_credentials`, `ai_model_routes`, `ai_usage_logs`, `ai_conversations`, `ai_messages`, `ai_context_citations` |
| Search | `search_documents`, `search_chunks`, `content_embeddings`, `search_index_jobs`, `search_query_logs` |
| Billing/access | `subscription_plans`, `feature_entitlements`, `user_subscriptions`, `payments`, `payment_transactions`, `invoices`, `subscription_events`, `payment_providers` |
| Operations | `system_jobs`, `job_failures`, `notifications`, `feature_flags`, `system_settings`, `webhook_events` |

### 16.2 Relationship sketch

```text
curriculums --< curriculum_subjects >-- subjects --< syllabi
       |                                       |
       +--< book_syllabus_mappings >-- books --< book_editions
                                             |
                                     content_nodes (recursive tree)
                                             |
                      +----------------------+-------------------+
                      |                      |                   |
                content_blocks       topic_study_tabs       questions
                      |                      |                   |
                content_versions      tab_content_versions  exam_session_questions
                                                                 |
                                                            exam_answers

users --< learner_annotations / learner_key_points / reading_progress
users --< flashcards / exam_sessions / learner_mastery
users --< user_subscriptions >-- subscription_plans --< feature_entitlements
ai_api_credentials --< ai_usage_logs; ai_model_routes --> ai_models
book_imports --< import_pages / import_events
content_nodes --< search_chunks / diagram_content_links
```

### 16.3 Data engineering rules

Use stable UUID/ULID identifiers, proper foreign keys, unique constraints, explicit cascading rules, composite indexes, and validated Drizzle migrations. Normalize relationships, using JSONB only where flexible block payloads are appropriate. Keep approved content versions immutable. Ensure idempotency for imports, billing, job processing, and AI generation. Keep time-series logs partitionable, add audited soft-delete/archive policies, use connection pooling, and validate migrations against realistic datasets.

Do not store raw PDF bytes, large audio assets, or 3D geometry inside ordinary relational columns. Store those assets in secured object storage, retaining references, checksums, metadata, and signed-access policies in PostgreSQL. Consider PostgreSQL Row Level Security as defense in depth where appropriate.

---

## 17. Technical Architecture and Library Selection

### 17.1 Component boundaries

```text
[Next.js App Router + React + TypeScript]
   |-- Admin Panel: catalog, imports, editors, AI Studio, exams, billing, operations
   |-- Learner Panel: library, book reader, study vault, exam, 3D lab, voice/chat
   |
   +-- BFF / API / Server Actions where appropriate
         |-- Authentication + RBAC + subscription entitlements
         |-- Catalog, content, annotations, exams, billing, admin APIs
         |-- AI orchestrator + search facade + audit + events
         |
         +-- PostgreSQL + Drizzle ORM
         +-- Redis cache / background queue
         +-- Object Storage + CDN
         +-- PostgreSQL / hybrid / dedicated search index
         +-- OCR + content + AI + indexing workers
         +-- Verified Gemini APIs

[Separate authenticated Voice WebSocket Gateway if required]
```

### 17.2 Preferred technologies and candidates

| Layer | Technologies/libraries | Role |
|---|---|---|
| Web platform | **Next.js**, **React**, **TypeScript** | App Router, server/client composition, APIs |
| UI/styling | **Tailwind CSS**, **shadcn/ui**, **Radix UI**, **Lucide** | Reusable accessible design system |
| Database | **PostgreSQL**, **Drizzle ORM**, `pg` | Durable relational data and typed queries |
| Validation | **Zod** | Input and AI structured-output validation |
| Authentication | **Firebase Authentication + Firebase Admin SDK** or equivalent verified auth provider | Identity and sessions |
| Upload/storage | **Google Cloud Storage** or **S3-compatible storage**, signed URLs, `react-dropzone` | PDFs, illustrations, 3D assets |
| PDF preview and extraction | **PDF.js / react-pdf**, **PyMuPDF**, **pdfplumber**, **Tesseract** or cloud Document AI | Processing and preview |
| Content editing | **Tiptap / ProseMirror**, robust HTML sanitizer | Structured rich-text editing |
| Scientific math | **KaTeX / MathJax** | Equations and symbols |
| 3D models | **Three.js**, **@react-three/fiber**, **@react-three/drei**, glTF tools | Interactive scientific visualization |
| AI | **@google/genai**, verified Gemini API endpoints | Content, dialogue, voice, embeddings |
| Search | PostgreSQL FTS, `pg_trgm`, **pgvector**, **OpenSearch/Elasticsearch** as needed | Multilingual/hybrid retrieval |
| Background work | **Redis + BullMQ** or managed alternatives | OCR, bulk AI, indexing |
| Forms/state | **React Hook Form**, **TanStack Query**, **Zustand** where useful | Form and application state |
| Sorting/tree editing | **@dnd-kit** | Chapter hierarchy editing |
| Analytics UI | **Recharts** or equivalent | Dashboards and progress reports |
| Testing | **Vitest**, **Testing Library**, **Playwright**, **k6** | Unit, UI, E2E, load |
| Monitoring | **OpenTelemetry**, **Sentry**, structured logs | Visibility and reliability |

**Versioning:** Use the currently supported Next.js release when implementation begins; do not freeze the project to an outdated version without reason. Pin actual package versions in lockfiles and test upgrades. A custom Express server is optional and should be justified by deployment/voice requirements.

---

## 18. API Surface, Validation, and Contracts

Illustrative endpoints (not a final forced REST design):

```text
/api/admin/curriculums
/api/admin/books
/api/admin/books/:bookId/import
/api/admin/import-jobs/:jobId
/api/admin/content-nodes/:nodeId
/api/admin/study-tabs/generate
/api/admin/reviews
/api/admin/questions
/api/admin/diagram-scenes
/api/admin/ai/credentials
/api/admin/ai/routes
/api/admin/billing/plans
/api/library
/api/books/:bookId/tree
/api/content/:nodeId
/api/content/:nodeId/tabs
/api/my/annotations
/api/my/progress
/api/search
/api/exams
/api/exams/:examId/answers
/api/exams/:examId/submit
/api/ai/chat
/api/ai/voice/session
/api/me/subscription
```

Document validated request/response schemas with **Zod** and OpenAPI where practical. Check authentication, roles, content publication, rights, and entitlements on every relevant endpoint. Apply server-side rate limiting, safe pagination, bounded query/AI inputs, CSRF/session protection, CORS rules where relevant, file and HTML sanitization, and idempotency keys for critical writes.

---

## 19. Security, Privacy, Rights, and Operational Reliability

- **Authentication:** verified login providers, secured Owner bootstrap, role-specific page/API protection, account/session controls.
- **Secrets:** encrypted API credentials, KMS/Secret Manager, controlled rotation, no client exposure, audit logs and redaction.
- **Content rights:** publisher/source/license records, attribution, permitted use, expiry, takedown procedure, publication approval, territorial restrictions where applicable.
- **AI safety:** untrusted document/prompt handling, prompt injection resistance, source grounding, moderation, human educational review.
- **Payments:** hosted checkout where feasible, verified signed webhooks, idempotency, no raw payment card storage.
- **Privacy:** appropriate retention, deletion/export processes, minimized PII, transcript/microphone consent and access policy.
- **Reliability:** PostgreSQL automated backups/PITR where available, tested restore exercises, object versioning, runbooks, disaster recovery objectives, audit events.
- **Performance:** CDN, caching with correct invalidation, streaming/lazy rendering, indexed queries, connection pooling, async workers, 3D performance budgets.
- **Observability:** structured logs, trace IDs, p50/p95 latency, queue depth, AI costs, job failure rate, indexing freshness, voice quality and reconnection errors.
- **Accessibility:** WCAG 2.2 AA target, keyboard testing, screen-reader tests, captions, reduced motion, and real Bangla reading tests.

Do not promise a universal `≤200ms` response on every operation. Define and benchmark realistic targets separately for reading navigation, search, exam writes, import processing, and voice latency.

---

## 20. Reports and Learning Analytics

**Admin reports:** book/import counts and OCR confidence, processing failures, content review coverage, active learners, reading engagement, question quality, search relevance, AI token/voice usage and costs, package uptake, payment errors, revenue, and retention.

**Learner reports:** in-progress books, reading time, completed topics, weak/strong concepts, exam scores and explanation review, flashcard recall, recommended revision sessions, and learning trends. Avoid intrusive or punitive tracking; keep optional telemetry configurable and appropriately aggregated.

---

## 21. Starter Demonstration Content

Use original, public-domain, or otherwise licensed sample materials:

1. **Biology:** Human Heart and Eukaryotic Cell, with reviewed 3D anatomy, labels, topics, explanations, and questions.
2. **Physics/Chemistry:** Atomic Structure, molecular geometry of H₂O/CH₄, formulas and related diagrams/questions.
3. **Medical Admission / BCS / Jobs:** high-yield study notes, syllabus mapping, mnemonics, model questions.
4. **IELTS Academic:** reading practice, Writing Task 1/2 structures, vocabulary, and configurable AI feedback.

Keep demonstration fixtures separate from production content. Do not automatically copy unlicensed textbooks or proprietary exam passages into seed data.

---

## 22. End-to-End Acceptance Scenarios

1. Verified Owner is securely provisioned; a normal signup cannot become Admin.
2. Admin creates a curriculum, subject, syllabus, and reusable book mapping.
3. Admin uploads an authorized Bangla PDF and sees OCR, layout detection, chapter/topic proposals, source-page mapping, and correction/approval tools.
4. Published book opens in the reader with correct chapter navigation and comfortable text and math rendering.
5. Learner highlights text and saves a note; it persists across refresh and remains private.
6. Admin generates, edits, verifies, and publishes Summary, Ultra Short, Key Points, Mnemonics, Q&A, and a custom tab.
7. Learner opens an interactive heart/cell scene, rotates/explodes it, selects parts, and views correct labels and linked explanations.
8. Learner takes a timed 20-question exam, answers autosave, and receives an accurate instant result and detailed source-linked feedback.
9. Bangla/English searches return relevant authorized topics without leaking premium/private/unpublished content.
10. Gemini Tutor answers about the current point with appropriate source context, then asks the learner a question and evaluates the response.
11. Admin configures two encrypted Gemini API Keys, verifies task routing and fallback, and reviews usage/cost without exposing keys.
12. Subscription updates change server-enforced access to books and AI services; duplicate payment webhooks cannot double-grant entitlements.
13. Background jobs recover from retries/restarts without duplicated published records.
14. A new book edition can be published without altering historical exam results; changed annotations are reconciled or flagged.
15. Automated security, accessibility, data restoration, API, and measured performance tests pass before launch.

---

## 23. Quality Gates and Testing Strategy

- **Architecture:** reviewed data flows, threat model, content ownership, licensing and cost projections.
- **Database:** migration correctness, ER diagram, seed fixtures, query indexes, backup/restore and realistic load benchmarks.
- **Ingestion:** Bengali OCR samples, table/equation checks, page coverage, error recovery and admin review.
- **AI:** structured output, grounding quality, model availability, prompt versioning, cost limits, content approval.
- **Exam:** deterministic scoring, timer race testing, autosave, immutable attempts, access control.
- **Security:** RBAC, entitlements, API secret protection, malware/file checks, payment webhook verification.
- **UX:** desktop/mobile states, reader comfort, actual Bangla rendering, accessibility, recoverable failures.
- **Reliability:** job idempotency, index update consistency, voice reconnect, monitored SLOs, disaster recovery.

Automate unit tests, integration tests, Playwright E2E, contract tests, relevant visual regression, dependency/security scans, and load tests with k6. Run lint, TypeScript checks, builds, tests, and migration checks in CI.

---

## 24. Development Roadmap: Phase 0–9

### Phase 0 — Product and Engineering Foundation

Finalize confirmed branding, actual reference screens, legal content-source policy, initial learning datasets, user roles, architectural decisions, cost assumptions, ERD, API boundaries, source content schema and quality benchmarks. Create repository conventions, `README.md`, `.env.example`, CI/CD baseline, ADRs, and an achievable staging environment.

**Exit criteria:** reviewed architecture, schema v1, secure development setup, identified content rights, and a reproducible demo workflow.

### Phase 1 — Next.js Infrastructure, PostgreSQL, Auth and Catalog

Configure Next.js/React/TypeScript, Tailwind CSS and reusable components, PostgreSQL/Drizzle migrations, verified authentication, protected Owner bootstrap, RBAC, academic catalog, basic Admin/Learner shells, object storage, audit logs, and worker/monitoring foundations.

**Exit criteria:** secure role-based navigation, persistent catalog, repeatable migrations, tested deployment and basic system observability.

### Phase 2 — Book Import, OCR, Tree Editor and Publishing

Build PDF uploading, extraction/OCR, figure/math handling, Gemini-assisted segmentation, source-page mapping, processing queue, editorial tree/block editor, versions, validation, and publishing.

**Exit criteria:** a real authorized Bengali/English book can be imported, corrected, structured, and published reliably.

### Phase 3 — Professional Reader, Basic Search and Study Vault

Build the nested book reader, tab framework, responsive themes, annotation toolbar, bookmark/notes/key points, reading history, progress, PostgreSQL Full-Text Search, suggestions, and access filters.

**Exit criteria:** learner can discover, read, annotate, save, and resume books across sessions.

### Phase 4 — Gemini AI Studio, Multi-Key Vault and Content Quality

Add encrypted Admin-managed keys, model registry and task routing, quotas, prompt versioning, generation workers, Summary/Ultra Short/Key Points/Mnemonics/Q&A/custom tabs, evidence checks, review and publishing.

**Exit criteria:** multiple secure API Keys work with appropriate routing/fallback; AI study variants are reviewed, versioned, and delivered correctly.

### Phase 5 — Question Bank, Exam Engine and Personal Revision

Implement manual/AI question management, duplicate checks, verified answer keys, approved question selection, 20/50/100/custom exams, timers/autosave, scoring, explanation review, history, weak areas, and SRS.

**Exit criteria:** timed exams produce deterministic results and preserve full historical evidence and learner progress.

### Phase 6 — Three.js 3D Lab and Diagram Admin Tools

Create verified Heart/Cell/Atom/Molecule scenes with orbit controls, exploded views and labeled parts. Add reusable asset library, admin import/mapping/hotspot tools, source links, mobile fallback and quality checks.

**Exit criteria:** admins can publish a linked diagram; learners can inspect its labeled parts and relate them to book topics.

### Phase 7 — Contextual Gemini Chat/Voice Tutor and Hybrid Search

Implement authorized source retrieval (RAG), floating tutor, book/current-topic context scopes, citations, Quiz Me/Viva logic, speech input/output, TTS and fallback. Expand search to hybrid semantic retrieval and dedicated search when justified.

**Exit criteria:** grounded tutoring and voice interactions work across real books; entitlement-safe search quality and performance meet measured targets.

### Phase 8 — Subscription, Billing, Reporting and Operations

Build configurable packages/entitlements, payment integration, signed webhook handling, invoices, subscription states, usage billing controls, admin analytics, notifications, backup exercises and operational dashboards.

**Exit criteria:** payment and authorization workflows are secure, auditable, idempotent, and verified end-to-end.

### Phase 9 — Production Hardening and Controlled Launch

Run complete accessibility, security, performance, OCR regression, AI quality, question bank, load, recovery and operational tests. Complete documentation, monitoring alerts, runbooks, feature-flagged launch, and post-launch feedback procedures.

**Exit criteria:** all agreed end-to-end scenarios pass, release risks are documented, and production readiness is explicitly approved.

---

## 25. Definition of Done

A module is **not complete** when only its UI exists. It is complete only when its usable UI, authorized server workflow, PostgreSQL persistence, validations, error/empty/loading states, automated tests, audit and monitoring requirements, configuration, and documentation are in place. Use genuine or appropriately labeled seed content. Do not misrepresent placeholders, simulated payments, static 3D demos, or hardcoded questions as integrated production features.

---

## 26. Social Learning and Collaboration

### 26.1 Study Groups
Learners can create or join study groups centered on specific books, subjects, or exam targets. Groups support shared discussion threads, group study schedules, and collective progress tracking. Group members can share public highlights and notes (opt-in), fostering peer learning while keeping private annotations secure.

### 26.2 Peer Q&A Forum
A topic-level question-and-answer community allows learners to post doubts, share insights, and help each other. Questions are linked to specific content nodes, enabling contextual discussions. Admins and verified experts can pin authoritative answers. Voting, bookmarks, and best-answer selection surface the most helpful content.

### 26.3 Teacher-Student Mode (Future)
Even without a full instructor panel, the system supports a teacher-student relationship where a teacher can assign books, chapters, or exams to a class and view aggregated class progress. Teachers receive dashboards showing class-wide weak areas, completion rates, and exam performance summaries.

### 26.4 Gamification and Motivation
- **Leaderboards:** weekly or monthly rankings based on study streaks, exam scores, or reading progress, configurable by class or globally.
- **Achievement Badges:** milestones such as first book completed, 100-flashcard streak, perfect exam score, or consistent weekly study.
- **Study Streaks:** track consecutive days of active study with visual indicators and recovery grace periods.

### 26.5 Data Model Extensions
| Domain | Required tables / entities |
|---|---|
| Social learning | `study_groups`, `study_group_members`, `group_discussions`, `discussion_posts`, `post_votes`, `shared_annotations` |
| Q&A Forum | `forum_questions`, `forum_answers`, `answer_votes`, `best_answers`, `question_bookmarks` |
| Gamification | `achievements`, `user_achievements`, `leaderboards`, `leaderboard_entries`, `study_streaks` |
| Teacher-Student | `classes`, `class_members`, `assignments`, `assignment_progress`, `class_analytics` |

---

## 27. Content Licensing, DRM, and Publisher Ecosystem

### 27.1 Digital Rights Management (DRM)
For premium and licensed content, implement layered protection:
- **Screenshot protection:** detect screenshot attempts on supported browsers and display watermarks with the learner's identity.
- **Dynamic watermarking:** overlay learner-specific identifiers (username, session ID) on rendered content to deter unauthorized sharing.
- **Copy-paste restrictions:** disable text selection and copy for DRM-protected content while preserving accessibility for authorized use.
- **Print/export control:** restrict or watermark permitted print/export behavior based on entitlement and publisher policy.

### 27.2 Licensing Expiry Automation
When a book's license expires, the system automatically restricts access through the entitlement matrix. Learners with active subscriptions lose access to expired-license books even if their subscription is valid. Admin receives alerts before expiry for renewal decisions.

### 27.3 Publisher Portal
A self-service portal allows publishers to:
- Upload and manage their own books and content.
- View analytics on their content's engagement and usage.
- Set licensing terms, territorial restrictions, and expiry dates.
- Review and approve AI-generated study variants for their books.
- Receive revenue reports and payment settlements.

### 27.4 Data Model Extensions
| Domain | Required tables / entities |
|---|---|
| Publisher portal | `publishers`, `publisher_accounts`, `publisher_contracts`, `publisher_revenue` |
| DRM and licensing | `drm_policies`, `license_agreements`, `license_expiry_events`, `watermark_configs` |

---

## 28. Advanced AI Features

### 28.1 AI-Generated Practice Problems with Step-by-Step Solutions
For Physics, Chemistry, and Mathematics topics, AI generates practice problems with detailed, step-by-step solutions. Each step explains the reasoning, formulas used, and intermediate calculations. Admin reviews and approves solutions before publication to ensure scientific accuracy.

### 28.2 Concept Mapping and Mind Maps
AI generates visual concept relationship diagrams for chapters or topics. These mind maps show how concepts connect, depend on each other, and build upon prior knowledge. Learners can explore the map interactively, clicking nodes to navigate to the corresponding content.

### 28.3 Adaptive Learning Paths
AI analyzes the learner's weak areas, exam performance, reading history, and annotation patterns to recommend a personalized study plan. The system suggests which topics to review, which practice problems to attempt, and which flashcards to revisit, dynamically adjusting as the learner progresses.

### 28.4 AI-Powered Doubt Resolution from Screenshots
Learners can photograph a textbook problem or handwritten question. The system uses AI vision capabilities to interpret the image, solve the problem, and provide a step-by-step explanation. This bridges the gap between physical study materials and the digital learning platform.

### 28.5 Automated Essay and Short-Answer Grading
For IELTS writing practice and descriptive exam preparation, AI evaluates learner-submitted essays or short answers. The system provides structured feedback on grammar, vocabulary, structure, coherence, and task achievement, with suggested improvements and model answers for comparison.

### 28.6 AI-Assisted Admin Tools
- **AI suggests corrections** during book review, auto-detecting OCR errors, inconsistent formatting, or potential factual issues.
- **Auto-detect duplicate questions** across the question bank using semantic similarity.
- **AI-generated chapter summaries** for admin quick review during content ingestion.
- **Smart content tagging** — AI suggests relevant topics, difficulty levels, and curriculum mappings for new content.

---

## 29. Exam System Enhancements

### 29.1 Full Mock Exam Simulation
Replicate real exam conditions for BCS, medical admission, and other competitive exams with exact timing, section structure, marking scheme, and navigation constraints. Simulate the actual exam interface, including section switching rules, time limits per section, and submission behavior.

### 29.2 Exam Analytics Dashboard
- **Peer comparison:** compare performance with anonymized peer averages for the same exam or topic.
- **Improvement tracking:** visualize score trends over time, showing progress or regression.
- **Topic-level breakdown:** identify which topics contribute most to score gains or losses.
- **Predicted score:** AI estimates likely exam performance based on recent practice results and topic mastery.

### 29.3 Question Discussion Threads
Learners can discuss why an answer is correct or incorrect, share alternative solution methods, and ask for clarification. Discussions are linked to specific questions, enabling community-driven learning. Admin can moderate and pin authoritative explanations.

### 29.4 Bulk Question Import
Import questions from existing question banks via CSV/Excel templates. Support bulk upload of MCQs, options, correct answers, explanations, and metadata. Validate imported data for duplicates, missing fields, and answer-key consistency before publishing.

### 29.5 Data Model Extensions
| Domain | Required tables / entities |
|---|---|
| Mock exams | `mock_exam_configs`, `mock_exam_sections`, `mock_exam_attempts` |
| Exam analytics | `exam_peer_benchmarks`, `exam_score_history`, `predicted_scores` |
| Question discussions | `question_discussions`, `discussion_comments`, `comment_votes` |

---

## 30. Mobile Strategy and Offline Access

### 30.1 Progressive Web App (PWA)
Implement PWA capabilities for installable apps on mobile and desktop devices:
- **Web App Manifest:** define app name, icons, display mode, and theme colors.
- **Service Worker:** cache critical assets, enable offline reading of previously loaded content, and handle background sync for annotations.
- **Add to Home Screen:** learners can install the app without app store distribution.

### 30.2 Offline Reading Mode
Learners with appropriate entitlements can download books for offline study. Downloaded content respects copyright and DRM policies, with time-limited access tokens and periodic re-authentication. Offline annotations sync when connectivity is restored.

### 30.3 Mobile-Native Apps (Long-Term)
Consider React Native or Flutter for full native mobile experience when the platform matures. Native apps enable deeper device integration, push notifications, and optimized performance for 3D models and voice interactions.

### 30.4 Mobile-Specific Considerations
- **Touch-optimized reader:** larger tap targets, swipe navigation, and gesture-based interactions.
- **Battery-efficient 3D:** reduced polygon counts and simplified shaders for mobile GPUs.
- **Data usage controls:** allow learners to limit automatic media loading and 3D asset downloads.
- **Responsive voice UI:** adapt voice tutor interface for smaller screens with collapsible controls.

---

## 31. Notification and Engagement System

### 31.1 Push Notifications
- **Study reminders:** configurable reminders for scheduled study sessions.
- **Exam deadlines:** alerts for upcoming mock exams or assigned tests.
- **Subscription renewals:** reminders before subscription expiry or failed payment retries.
- **New content:** notify learners when new books or chapters in their area of interest are published.

### 31.2 Email Digests
- **Weekly progress reports:** summarize reading time, topics completed, exam scores, and study streaks.
- **Recommended revision:** suggest topics due for review based on spaced repetition schedules.
- **Platform updates:** inform learners about new features, books, or curriculum additions.

### 31.3 In-App Notifications
- **Admin notifications:** new books ready for review, AI content generation complete, failed import jobs, payment webhooks received.
- **Learner notifications:** exam results available, flashcards due for review, study group activity, subscription status changes.

### 31.4 Notification Preferences
Learners control which notifications they receive, their frequency, and delivery channels. Admin configures system-wide notification templates, scheduling, and rate limits to avoid notification fatigue.

### 31.5 Data Model Extensions
| Domain | Required tables / entities |
|---|---|
| Notifications | `notification_templates`, `notification_queue`, `notification_logs`, `notification_preferences` |
| Engagement | `study_schedules`, `reminder_configs`, `email_digest_logs` |

---

## 32. Advanced Data and Analytics

### 32.1 Content Engagement Heatmaps
Visualize which topics, sections, and books are most and least studied across the learner population. Identify content that learners skip, revisit frequently, or abandon, helping admins improve content quality and structure.

### 32.2 Dwell Time Analysis
Track how long learners spend on each topic, indicating difficulty or engagement level. Correlate dwell time with exam performance to identify topics that need better explanations or additional study aids.

### 32.3 Drop-Off Analysis
Identify where learners abandon books, exams, or study sessions. Analyze patterns such as chapter-level drop-off, exam timeout frequency, or study tab abandonment to improve the learning experience.

### 32.4 A/B Testing for AI Content Quality
Compare different AI-generated summaries, key points, or explanations for learner satisfaction. Track which versions lead to better comprehension (measured by exam performance on related topics) and higher learner ratings.

### 32.5 Cohort Analysis
Group learners by curriculum, subscription plan, join date, or engagement level. Analyze retention, progression, and revenue metrics across cohorts to inform product and business decisions.

### 32.6 Data Model Extensions
| Domain | Required tables / entities |
|---|---|
| Analytics | `content_engagement_events`, `dwell_time_logs`, `drop_off_events`, `ab_test_configs`, `ab_test_results`, `cohort_definitions`, `cohort_metrics` |

---

## 33. Infrastructure, DevOps, and Deployment Strategy

### 33.1 Containerization
- **Docker Compose:** local development environment with PostgreSQL, Redis, Next.js, and worker services.
- **Production containers:** containerized Next.js app, workers, and voice gateway for consistent deployment.
- **Kubernetes (optional):** orchestration for production scaling, auto-recovery, and rolling updates when traffic warrants it.

### 33.2 Infrastructure as Code
Use **Terraform** or **Pulumi** for reproducible cloud infrastructure:
- PostgreSQL managed database with automated backups and PITR.
- Redis managed cache and queue service.
- Object storage buckets with lifecycle policies.
- CDN configuration for static assets and media.
- Load balancers, security groups, and network policies.

### 33.3 Deployment Platform
Target deployment platforms include **Vercel** (for Next.js frontend and serverless functions), **AWS** or **GCP** (for managed databases, storage, and workers), or self-managed servers. The voice WebSocket gateway may require a dedicated always-on service, influencing platform choice.

### 33.4 Staging Environment Strategy
Maintain a staging environment that mirrors production configuration:
- Separate database and storage instances.
- Mirrored AI credentials with separate quotas.
- Feature flags for gradual rollout.
- Automated data anonymization for testing with production-like data.

### 33.5 Database Migration Rollback Strategy
- **Forward-only migrations** with explicit rollback scripts for critical changes.
- **Backup before migration** in production, with tested restore procedures.
- **Staged rollout** of schema changes: add columns, backfill data, switch code, drop old columns.
- **Feature flags** to enable new code paths before and after migration.

### 33.6 CI/CD Pipeline
- **Automated builds** on every push, with linting, TypeScript checks, and unit tests.
- **Integration tests** against staging database.
- **E2E tests** with Playwright on deployed preview environments.
- **Security scans** for dependencies and container images.
- **Automated deployment** to staging on merge, manual approval for production.

---

## 34. Internationalization Beyond Bangla and English

### 34.1 Right-to-Left (RTL) Language Support
If the platform expands to Arabic, Urdu, Hebrew, or Persian, implement RTL layout support:
- Bidirectional text rendering for mixed LTR/RTL content.
- RTL-aware UI components, navigation, and reader layout.
- RTL-specific typography and font selection.

### 34.2 Currency and Payment Localization
Support multiple currencies and regional payment gateways:
- **Bangladesh:** bKash, Nagad, Rocket integration for local payments.
- **International:** Stripe, PayPal for global subscribers.
- **Currency conversion:** dynamic pricing based on learner's region with admin-controlled exchange rates.
- **Tax compliance:** handle VAT, GST, or other regional tax requirements.

### 34.3 Regional Content Variants
Support region-specific content variants, such as different curriculum editions for different countries. Learners see the appropriate variant based on their region, language preference, or explicit selection.

---

## 35. Admin Efficiency and Bulk Operations

### 35.1 Bulk Operations
- **Bulk publish:** publish multiple books, chapters, or study tabs in a single action.
- **Bulk delete/archive:** remove or archive multiple items with confirmation and audit logging.
- **Bulk reprocess:** re-run OCR, AI generation, or indexing on multiple books simultaneously.
- **Bulk question import:** import questions via CSV/Excel with validation and duplicate detection.

### 35.2 Import Templates
Pre-built templates for common book structures, question formats, and curriculum mappings. Admin selects a template, fills in the specifics, and generates the initial structure automatically.

### 35.3 AI-Assisted Admin Workflow
- **AI suggests corrections** during book review, highlighting potential OCR errors, inconsistent formatting, or factual issues.
- **Auto-detect duplicate questions** using semantic similarity analysis.
- **Smart content tagging** — AI suggests relevant topics, difficulty levels, and curriculum mappings.
- **Automated quality checks** — AI flags incomplete sections, missing figures, or broken cross-references.

---

## 36. Cost Estimation and Financial Planning

### 36.1 AI API Costs
- **Gemini API usage:** estimate costs based on expected token consumption for content generation, tutoring, voice interactions, and embeddings. Track per-task and per-user spending with budget thresholds.
- **Model routing impact:** cheaper models for simple tasks (summaries, definitions) and premium models for complex tasks (STEM explanations, voice) to optimize costs.
- **Cost per learner:** project AI costs per active learner to inform subscription pricing.

### 36.2 Infrastructure Costs
- **Hosting:** Next.js deployment (Vercel, AWS, GCP), database (managed PostgreSQL), Redis, object storage, CDN.
- **Search:** PostgreSQL FTS (low cost) vs. dedicated search service (Elasticsearch/OpenSearch) at scale.
- **Voice gateway:** dedicated WebSocket service for real-time voice interactions.
- **Backup and disaster recovery:** storage costs for backups and PITR.

### 36.3 Operational Costs
- **OCR and document processing:** per-page costs for scanned PDF processing.
- **3D asset hosting:** storage and bandwidth for glTF models and textures.
- **Monitoring and observability:** Sentry, OpenTelemetry, logging services.
- **Payment processing fees:** gateway transaction fees and currency conversion costs.

### 36.4 Cost Optimization Strategies
- **Caching:** cache deterministic AI generations to avoid redundant API calls.
- **Batch processing:** process content during off-peak hours to reduce compute costs.
- **Model selection:** use the smallest adequate model for each task.
- **Rate limiting:** enforce per-user AI usage limits to prevent cost spikes.
- **Content lifecycle:** archive or compress infrequently accessed content to reduce storage costs.

### 36.5 Revenue Projections
- **Subscription tiers:** model revenue from free, premium, and curriculum-specific plans.
- **Publisher partnerships:** revenue sharing with content publishers.
- **Institutional licenses:** bulk subscriptions for schools, colleges, or training centers.
- **Break-even analysis:** estimate user acquisition cost, retention rates, and time to profitability.

---

## 37. Deployment Platform and Payment Gateway Clarification

### 37.1 Target Deployment Platform
The platform will be deployed on a combination of services:
- **Frontend and API:** Vercel for Next.js hosting with edge functions, or AWS/GCP for full control.
- **Database:** Managed PostgreSQL (Supabase, Neon, AWS RDS, GCP Cloud SQL).
- **Cache and Queue:** Managed Redis (Upstash, AWS ElastiCache, GCP Memorystore).
- **Storage:** Google Cloud Storage or AWS S3 for PDFs, assets, and media.
- **Voice Gateway:** Dedicated always-on service (AWS ECS, GCP Cloud Run, or similar) for WebSocket connections.

### 37.2 Payment Gateway Integration
For the target market (Bangladesh and international):
- **Bangladesh:** bKash, Nagad, Rocket via local payment aggregators (e.g., SSLCommerz, Shurjopay).
- **International:** Stripe for card payments, PayPal for alternative checkout.
- **Abstraction layer:** payment provider interface to switch or add providers without code changes.
- **Webhook security:** signature verification, idempotency, and retry handling for all payment events.

### 37.3 Data Residency and Compliance
- **Data residency:** if serving Bangladeshi students, verify any local data residency requirements.
- **Privacy compliance:** follow applicable data protection regulations for user data handling.
- **Content licensing:** respect territorial restrictions and licensing agreements for educational content.

---

## 38. Bangla OCR and Language Processing Considerations

### 38.1 Bangla OCR Quality
Bangla OCR is notoriously difficult due to complex script structure, varied fonts, and limited training data. Strategy:
- **Evaluate multiple OCR engines:** Tesseract with Bangla language pack, Google Document AI, Azure Computer Vision, and specialized Bangla OCR services.
- **Fine-tuned models:** consider fine-tuning OCR models on educational document samples for better accuracy.
- **Human-in-the-loop:** always require admin review of OCR output, with side-by-side comparison tools.
- **Quality metrics:** track OCR confidence scores per page and flag low-confidence pages for manual correction.

### 38.2 Bangla Text Processing
- **Normalization:** handle variant Bangla characters and ligatures consistently.
- **Search:** use `pg_trgm` and normalized Bangla Unicode text for full-text search.
- **Typography:** verify rendering with Hind Siliguri and Noto Serif Bengali fonts across devices.
- **AI generation:** ensure Gemini produces grammatically correct and contextually appropriate Bangla output.

---

## 39. Updated Development Roadmap: Phase 10–14

### Phase 10 — Social Learning and Engagement

Implement study groups, peer Q&A forum, gamification (leaderboards, badges, streaks), and notification system (push, email, in-app). Add teacher-student mode for class assignments and progress tracking. Build notification preferences and engagement analytics.

**Exit criteria:** learners can collaborate, compete, and stay engaged through social features and timely notifications.

### Phase 11 — Advanced AI and Adaptive Learning

Add AI-generated practice problems with step-by-step solutions, concept maps, adaptive learning paths, screenshot-based doubt resolution, and automated essay grading. Implement AI-assisted admin tools for content review and quality checks. Set up A/B testing for AI content quality.

**Exit criteria:** AI features provide personalized, adaptive learning experiences and assist admins in content quality assurance.

### Phase 12 — Mobile, PWA, and Offline Access

Implement PWA capabilities (manifest, service worker, offline caching), offline reading mode with DRM compliance, and mobile-optimized UI. Add push notifications and background sync for annotations. Plan for future native mobile apps.

**Exit criteria:** learners can install the app, read offline, and have a polished mobile experience.

### Phase 13 — Publisher Portal and DRM

Build publisher self-service portal for content upload, analytics, and revenue reporting. Implement DRM features (watermarking, screenshot protection, copy-paste restrictions). Automate license expiry handling and publisher revenue settlement.

**Exit criteria:** publishers can manage their content independently, and premium content is protected against unauthorized distribution.

### Phase 14 — Infrastructure Hardening and Scale

Implement containerization (Docker Compose, production containers), infrastructure as code (Terraform/Pulumi), CI/CD pipeline enhancements, and staging environment strategy. Set up advanced analytics (heatmaps, dwell time, drop-off analysis, cohort analysis). Conduct load testing and cost optimization.

**Exit criteria:** infrastructure is reproducible, scalable, and cost-optimized; analytics provide actionable insights for product and business decisions.

---

## 40. Additional End-to-End Acceptance Scenarios

16. Learner creates a study group, invites peers, and shares a public highlight that appears in the group discussion.
17. Learner posts a question in the Q&A forum, receives answers from peers, and marks the best answer.
18. Learner earns an achievement badge for completing a book and sees it on their profile and the leaderboard.
19. Teacher assigns a book and exam to a class, then views the class progress dashboard showing weak areas.
20. Learner receives a push notification for an upcoming exam and a weekly email digest of their progress.
21. Admin uses bulk operations to publish multiple study tabs across several books simultaneously.
22. Learner downloads a book for offline reading, annotates it offline, and sees annotations sync when reconnected.
23. Publisher uploads a book via the self-service portal, sets licensing terms, and views engagement analytics.
24. AI generates a step-by-step solution for a Physics problem, admin reviews and approves it, and learners access it.
25. Adaptive learning path recommends topics for review based on the learner's weak areas and exam performance.
26. Learner photographs a textbook problem, AI interprets the image, and provides a solved explanation.
27. Automated essay grading evaluates an IELTS writing sample and provides structured feedback.
28. Admin reviews OCR quality metrics for a Bangla PDF and manually corrects low-confidence pages.
29. Payment via bKash/Nagad processes correctly, webhook is verified, and entitlement is granted.
30. System enforces DRM policies: watermark appears on content, screenshot attempt is detected, and copy-paste is restricted for protected content.

---

## 41. Updated Project Success Criteria

1. Admin can convert an authorized PDF into a reviewed, searchable, published **Structured Digital Book**.
2. Learners can navigate Chapter/Section/Topic/Subtopic/Point and access original, AI-derived, and personally annotated study layers.
3. Admin controls books, curricula, syllabuses, tabs, questions, diagrams, API Keys, model routing, subscribers, and operations.
4. Private highlights, notes, bookmarks, exam attempts, and reading progress remain correct and secure.
5. Three.js scenes and Gemini Chat/Voice Tutor relate to real book topics and provide genuinely interactive educational value.
6. Search is relevant, multilingual, access-safe, and fast under measured traffic and data sizes, with a credible plan for much larger scales.
7. The platform can grow in users, books, requests, curricula, media, and AI providers without compromising maintainability, security, rights, or quality.
8. Learners can collaborate through study groups, Q&A forums, and gamified features to enhance engagement and motivation.
9. Premium content is protected through DRM, licensing automation, and publisher self-service management.
10. AI features provide adaptive, personalized learning experiences including step-by-step solutions, concept maps, and essay grading.
11. Mobile users enjoy a polished PWA experience with offline reading and push notifications.
12. Infrastructure is containerized, reproducible via infrastructure as code, and cost-optimized for sustainable growth.
13. Bangla OCR and text processing deliver acceptable quality with human-in-the-loop review and continuous improvement.

---

## 42. Recommended Project Documentation and Repository Layout

```text
Skyx_Academy/
├── src/                               # Next.js application and modules
├── public/                            # Public-safe static assets only
├── docs/
│   ├── implementation_plan.md         # This implementation plan
│   ├── user_requirements.md           # Faithful owner requirements
│   ├── architecture/
│   │   ├── overview.md
│   │   └── adr/
│   ├── database/
│   │   ├── erd.md
│   │   └── migrations.md
│   ├── content/
│   │   ├── ingestion-pipeline.md
│   │   └── block-schema.md
│   ├── ai/
│   │   ├── model-routing.md
│   │   └── prompt-versioning.md
│   ├── security/
│   │   ├── threat-model.md
│   │   └── rights-and-licenses.md
│   ├── api/openapi.yaml
│   ├── testing/acceptance-matrix.md
│   └── operations/
│       ├── runbook.md
│       └── backup-restore.md
├── AGENTS.md                          # Agent instructions and plan paths
├── README.md
├── .env.example                       # Variable names only; no secrets
└── package.json
```

Keep the master plan, source requirements, architectural decisions, actual implementation state, and test evidence synchronized. Use `AGENTS.md` to tell coding agents to read both documents before modifying the system.

---

## 43. Official Technical References

Verify the following references during implementation:

- Next.js support policy: https://nextjs.org/support-policy
- Gemini API models: https://ai.google.dev/gemini-api/docs/models
- Gemini API documentation: https://ai.google.dev/gemini-api/docs
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Three.js documentation: https://threejs.org/docs/
- PostgreSQL documentation: https://www.postgresql.org/docs/

---

## 44. Final Product Statement

**Skyx Academy** will be a professionally engineered **Next.js + PostgreSQL + Gemini AI + Three.js** book-first learning ecosystem featuring:

- Comprehensive digital book processing with Bangla/English support and human-in-the-loop quality assurance.
- An excellent reading experience with themes, annotations, and study modes.
- Admin-governed AI study materials with review, versioning, and publishing workflows.
- Private learner tools including highlights, notes, flashcards, and spaced repetition.
- Contextual voice and chat tutoring grounded in authorized book content.
- Structured examinations with mock exam simulation and analytics.
- Expandable scientific 3D diagrams and interactive visualizations.
- Social learning through study groups, Q&A forums, and gamification.
- Controlled monetization with multi-gateway payment integration.
- Progressive Web App with offline reading capabilities.
- Publisher self-service portal and DRM-protected content.
- A secure, scalable, containerized delivery architecture with infrastructure as code.
- Cost-optimized AI usage and comprehensive analytics for continuous improvement.
