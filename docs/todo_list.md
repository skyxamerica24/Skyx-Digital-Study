# Skyx Academy — Project To-Do List

**Status:** Archived checklist from November 21, 2026. The checkboxes reflect that review and can be revisited independently.

The entries below reflect the old project baseline. Both checked and unchecked entries should be assessed afresh if relevant to a later request.

---

## Phase 0 — Product & Engineering Foundation
- [x] Finalize brand identity (`Skyx Academy`), Dual-Atmosphere Scholarly SaaS visual system, and HTML/OpenGraph metadata
- [x] Configure multilingual typography (`Plus Jakarta Sans`, `Source Serif 4`, `Hind Siliguri`, `JetBrains Mono`)
- [x] Create initial environment and README documentation
- [x] Consolidate `/docs/` cleanly into 3 canonical files (`implementation_plan.md`, `project_context.md`, `todo_list.md`)
- [x] Set up CI pipeline baseline (`.github/workflows/ci.yml` for TypeScript check, ESLint, and Next.js build)

## Phase 1 — Infrastructure, Database, Auth & Academic Catalog
- [x] Set up Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS v4 shell
- [x] Implement Firebase Google Authentication with protected Owner/Admin bootstrap and strict default-deny `firestore.rules`
- [x] Expand Firestore to 19 collections (`firebase-blueprint.json`) including `subjects`, `syllabi`, `importJobs`, `auditLogs`, and `flashcards`
- [x] Implement Zod schema validation across all 6 `/api/ai/*` routes (`lib/api-schemas.ts`) and `/api/health` readiness endpoint
- [x] Implement Academic Catalog CRUD (`curriculums`, `subjects`, `syllabi`) with live Firestore persistence
- [x] Build complete 15-menu Admin Console and 12-menu Learner Workspace responsive shells
- [x] Seed starter bilingual demonstration library (Biology, Physics, Chemistry, Medical/BCS, IELTS)
- [ ] Integrate Google Cloud Storage / S3-compatible Object Storage with signed URLs for PDFs, figures, audio, and 3D assets
- [ ] Add server-side Firebase Admin token verification middleware, distributed rate limiting, Redis + BullMQ background queue, and OpenTelemetry/Sentry observability

## Phase 2 — Book Import, OCR, Tree Editor & Publishing
- [x] Build Admin Book creation & catalog listing CRUD
- [x] Build AI Book Auto-Splitter (`/api/ai/book-split`) accepting pasted text or `.txt`/`.md` uploads
- [x] Build Admin Book Processing Queue (`importJobs`) and Split-Pane Markdown Book Editor with live preview and audit logging
- [ ] Build binary multi-format upload (native/scanned PDF, DOCX, EPUB, images) with MIME/size/checksum/malware checks and licensing provenance records
- [ ] Integrate native PDF extraction & Bangla/English OCR pipeline (PyMuPDF/pdfplumber/Tesseract or Document AI) with layout/figure/math extraction and OCR confidence tracking
- [ ] Implement arbitrary-depth `content_nodes` (`Subtopic → Point`) and typed `content_blocks` with immutable `block_uid` and source-page mapping
- [ ] Upgrade Book Editor to side-by-side Original PDF + ProseMirror/Tiptap drag-and-drop block editor with KaTeX/MathJax math editor, version diffing, and rollback

## Phase 3 — Professional Reader, Search & Study Vault
- [x] Build Book Reader workspace with collapsible searchable `Chapter → Section → Topic` tree, book switcher, and progress bar
- [x] Build Reading Comfort Studio (Paper White / Warm Sepia / Midnight Charcoal themes, serif/sans, font size, line height, width)
- [x] Build dynamic Study Tab bar (`Reading`, `Summary`, `Ultra Short`, `Key Points`, `Memorize`, `3D Diagram`, `Q&A`, `Exam` + custom Admin tabs)
- [x] Build floating text-selection toolbar (Highlights, Underline, Note, Key Points, Ask AI) + Bookmark & Mark Completed
- [x] Build Personal Study Vault with filtering, search, reading history, and voice-dictated quick notes
- [x] Build Global Search modal (`⌘K` / `Ctrl+K`) across Books, Topics, and Questions
- [x] Build Learner My Library and Account & Preferences (profile, language, reduced-motion, reading defaults, JSON data export)
- [ ] Support `Subtopic → Point` depth, source-page citations, KaTeX/MathJax math rendering, focus mode, and keyboard shortcuts
- [ ] Upgrade annotations with character offsets, surrounding text context, source-version tracking, and orphan reconciliation
- [ ] Implement server-side Full-Text & semantic search (`tsvector`/GIN or OpenSearch, normalized Bangla Unicode, synonyms, typo tolerance, entitlement filtering)

## Phase 4 — Gemini AI Studio, Model Registry & Content Quality
- [x] Build Admin AI Content Studio to generate, edit, preview, and publish default and custom study tabs (`/api/ai/study-content`)
- [x] Build Unified Tabbed Settings Hub (`Account & Preferences`, `Users & Access`, `API Status & AI Models`) with Custom Gemini Model Registry (`customAiModels`), per-task primary/fallback routing, Live Voice persona config, and server-side `/api/ai/status` verification
- [ ] Audit/verify production Gemini model IDs and implement automatic key rotation, health checks, failover, and retry/backoff
- [ ] Implement immutable prompt versioning, source-version linking, batch generation queues, and editorial review queues
- [ ] Add automated evidence/coverage verification checks and server-side per-plan AI quotas, rate limits, and cost/error reporting

## Phase 5 — Question Bank, Exam Engine & Personal Revision
- [x] Build Admin Question Bank with manual MCQ creation and duplicate-resistant AI Bulk Question Generator (`/api/ai/questions`)
- [x] Build Learner Exam Center builder (scope, count, duration, negative marking, unseen-question prioritization) and live timed runner
- [x] Build Exam History & Review Analytics (score trend charts, accuracy breakdown, expandable answer explanations)
- [x] Build Revision & Practice suite: SM-2 Spaced Repetition Flashcards (`flashcards`), Weak-Topic queue, and Pomodoro Focus Timer
- [ ] Migrate Exam Engine to server-authoritative execution (hide answer keys before submit, server-synced timer, autosave answers, deterministic server grading, immutable question snapshots)
- [ ] Expand question types (multi-answer, true/false, short-response, numeric, IELTS tasks), editorial approval, and CSV/Excel bulk import
- [ ] Add full BCS/Medical Mock Exam simulation and anonymized peer comparison analytics

## Phase 6 — Three.js 3D Lab & Diagram Admin Tools
- [x] Build interactive Three.js 3D Visual Lab with 4 procedural PBR models (`Human Heart`, `Eukaryotic Cell`, `Atomic Structure`, `Molecular Geometry`) with orbit/zoom, Exploded View, part inspection, layer isolation, bilingual labels, and Ask AI
- [x] Build Admin 3D Diagram Manager to preview starter models and link models to book topics
- [ ] Add DNA Helix scene and persistent 3D asset/scene/hotspot schema
- [ ] Build full Admin Diagram Authoring Workflow (upload 2D/SVG/`.glb`/`.gltf`, hotspot/layer/exploded editor, versioned publishing)
- [ ] Add static 2D fallback, lazy loading, geometry compression, mobile GPU budgets, and reduced-motion accessibility

## Phase 7 — Contextual Gemini Chat/Voice/Screen Tutor & Hybrid Search
- [x] Build Global Floating Mini Bubble + Compact Gemini-Style Chat Popup (`/api/ai/chat`) available across all Learner & Admin pages with live Page Context Reader, custom model picker, Voice Dictation, and Search Grounding citations
- [x] Build Real-Time Gemini Live Conversation over WebSocket (`server.ts` `/api/live-ws`) with 16kHz/24kHz PCM audio, Live Screen Share (`<= 1 FPS` JPEG video streaming + preview), dynamic Settings-configured Live model & voice persona, automatic page-context sync, mute/end, and live captions
- [x] Build AI Read-Aloud and 2-Speaker Study Podcast (`/api/ai/tts`) and Voice Note Dictation (`/api/ai/transcribe`)
- [ ] Implement RAG retrieval pipeline (`search_chunks`, `content_embeddings` via `pgvector`) with explicit context scopes (`Current Point`, `Chapter`, `Whole Book`, `External`) and entitlement filtering
- [ ] Add persistent conversation history with retention controls, authenticated Voice WebSocket Gateway, voice-minute quotas, and reconnect recovery
- [ ] Expand search to hybrid lexical + semantic ranking with durable reindex jobs and latency benchmarks

## Phase 8 — Subscription, Billing, Reporting & Operations
- [x] Build Membership & Plans UI (Free / Pro / Elite comparison, Admin pricing/quota editor)
- [x] Build Admin Membership & Billing, Analytics & Reports, and Operations & Logs centers (live `/api/health`, immutable `auditLogs`, Search coverage)
- [ ] Integrate Bangladesh gateways (bKash, Nagad, Rocket via SSLCommerz/Shurjopay) and International gateways (Stripe/PayPal) with hosted checkout
- [ ] Implement signed payment webhooks, idempotency, subscription lifecycle (trials, renewals, cancellations, refunds), and invoicing
- [ ] Enforce subscription & license entitlements server-side across all APIs and signed media delivery
- [ ] Add DLQ retry workers, scheduled backup verification drills, storage alerts, and dynamic feature flags

## Phase 9 — Production Hardening & Controlled Launch
- [ ] Build automated test suite: Vitest unit tests, API/DB integration tests, Playwright E2E tests, contract tests, and k6 load tests
- [ ] Complete WCAG 2.2 AA accessibility audit, keyboard/screen-reader testing, and cross-device Bangla rendering QA
- [ ] Conduct full security review (RBAC/entitlements, prompt injection defense, file/malware validation, credential encryption, webhook verification)
- [ ] Execute backup/PITR restore drills, finalize alerting runbooks, and run feature-flagged launch

## Phases 10–14 — Post-Launch Expansion Roadmap
- [ ] **Phase 10 (Social & Engagement):** Study Groups, topic-linked Peer Q&A Forum, Gamification (leaderboards, badges, streaks), Class Mode, and Push/Email notifications
- [ ] **Phase 11 (Advanced AI & Adaptive):** Step-by-step STEM solver, interactive Concept Maps, Adaptive Learning Paths, Vision photo doubt solver, IELTS essay grading, and Admin AI A/B testing
- [ ] **Phase 12 (Mobile & PWA):** PWA Manifest/Service Worker, DRM-compliant offline reading with background sync, and mobile gesture/battery optimizations
- [ ] **Phase 13 (Publisher & DRM):** Dynamic watermarking, copy/print safeguards, automated license expiry enforcement, and Publisher Self-Service Portal
- [ ] **Phase 14 (Scale & Infrastructure):** Docker/Kubernetes containerization, Terraform/Pulumi IaC, zero-downtime migration strategy, Admin bulk operations, engagement heatmaps, and RTL/internationalization
