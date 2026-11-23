# Skyx Digital Study — বর্তমান প্রজেক্ট কনটেক্সট

## বর্তমান সারাংশ

Book Manager-এ মূল ফাইল ও সম্পাদিত সংস্করণ একই তালিকায় পাওয়া যায়। Extract Studio-তে বাংলা OCR ও পৃষ্ঠার বিন্যাস শনাক্তকরণ আছে। গ্লোবাল সার্চ লোড হওয়া বই, টপিকের লেখা ও প্রশ্ন থেকে ফল দেয়। ফাইল ম্যানেজারের নিজস্ব ইনডেক্স বর্তমান অ্যাকাউন্টের ফাইলের নাম ও সংস্করণের ধরন খোঁজে। কোনো ব্যক্তিগত PDF-এর পৃষ্ঠাগুলো এই গ্লোবাল ইনডেক্সে যুক্ত হয় না।

[বিষয় ধরে কোড খুঁজুন](SEARCH_INDEX.md) · [চলমান পরিকল্পনা](PLAN.md)

নিচের তারিখযুক্ত পর্যবেক্ষণগুলো সংশ্লিষ্ট উন্নয়ন ধাপের রেকর্ড।

২৪ নভেম্বর ২০২৬ · [উন্নয়ন পরিকল্পনা](PLAN.md) · [আগের স্থাপত্য ও ফিচার নোট](../docs/project_context.md)

## পণ্য ও কোডের অবস্থান

Skyx Academy বাংলা ও ইংরেজি বইভিত্তিক শিক্ষার অ্যাপ। অ্যাডমিন বই ও প্রশ্ন প্রকাশ করেন। শিক্ষার্থী রিডার, নোট, ফ্ল্যাশকার্ড, পরীক্ষা, 3D চিত্র ও AI টিউটর ব্যবহার করার ইন্টারফেস পান।

| অংশ | প্রাসঙ্গিক সোর্স |
| --- | --- |
| Next.js ও React অ্যাপ, কাস্টম HTTP ও WebSocket সার্ভার | app/, server.ts |
| PostgreSQL, Prisma schema, অ্যাকাউন্ট ও সেশন | prisma/schema.prisma, lib/db.ts, lib/auth/ |
| বই প্রকাশ, এক্সট্রাকশন, রিডার ও পৃষ্ঠা নির্বাচন | components/book-manager/, components/reader/, lib/book-engine/ |
| পরীক্ষা, শিক্ষার্থীর ড্যাশবোর্ড ও চিত্র | components/learner/, components/lab/ |
| ফ্লোটিং টিউটর, আলাপের ইতিহাস ও PDF ভয়েস নিয়ন্ত্রণ | components/ai/FloatingAiTutor.tsx, lib/actions/ai-history-actions.ts, lib/reader-live/socket.ts |

## পূর্ববর্তী রান থেকে যাচাইকৃত ফল

- আলাদা টেস্ট পরিবেশে Prisma Client জেনারেট করে একই server.ts চালানো হয়েছে। পরিবেশে tsx CLI-এর IPC pipe চালুতে বাধা থাকায় পরীক্ষায় node --import tsx server.ts ব্যবহার করা হয়।
- হোমপেজ ও GET /api/health উভয়েই HTTP 200 দিয়েছে। হেলথ রেসপন্সে geminiGatewayConfigured ছিল false।
- অস্থায়ী PostgreSQL-এ schema প্রয়োগের পর সার্ভার ফাংশন দিয়ে learner রেজিস্ট্রেশন ও লগইন সফল হয়েছে। ব্রাউজারে পূর্ণ সেশন পুনরুদ্ধার যাচাই বাকি।
- POST /api/auth/reset-password পরীক্ষায় HTTP 503 ও “Password recovery is currently unavailable.” পাওয়া গেছে।
- রিডারের পৃষ্ঠা নির্বাচনের ফাংশনে ১২–১৫ দিলে ১২, ১৩, ১৪, ১৫ পাওয়া গেছে। ৪০ পৃষ্ঠায় ৯৯৯ দিলে ফল ৪০।

## কোডে দেখা বিষয় ও পরীক্ষার সীমা

লগইনের টোকেন ব্রাউজারের localStorage-এ রাখা হয়। AI হিস্ট্রির সার্ভার অ্যাকশন skyx-session কুকি পড়ে। স্বাভাবিক লগইনের পর আলাপ সংরক্ষণ ও পুনরুদ্ধারের ব্রাউজার পরীক্ষা অগ্রাধিকার পাবে।

PDF Reader Assistant-এ go_to_page ফাংশন আছে। ফ্লোটিং টিউটরের সাধারণ ভয়েস পথে ড্যাশবোর্ড বা চিত্র খোলার সমতুল্য কমান্ড শনাক্ত হয়নি। Gemini API key দিয়ে বাস্তব চ্যাট, মাইক্রোফোন, টুল কল ও কোটার আচরণ যাচাই বাকি। বুক প্রকাশ থেকে শিক্ষার্থীর ফলাফল পুনরায় দেখা পর্যন্ত পূর্ণ ব্রাউজার পরীক্ষাও বাকি।

এই আপডেটে ডকুমেন্টেশন তৈরি হয়েছে। পরীক্ষার ফল পূর্ববর্তী রান থেকে নেওয়া। পরবর্তী যাচাইয়ের ক্রম PLAN.md-তে দেওয়া আছে।

## পরিকল্পনা সংশোধনের ভিত্তি · ২৪ নভেম্বর ২০২৬

এক্সট্র্যাক্ট করা প্রজেক্ট থেকে আগের ওয়ার্কস্পেস রানে হোমপেজ, হেলথ চেক ও টেস্ট লগইন API তিনটিই HTTP 200 দিয়েছে। স্থায়ী ব্যবহারযোগ্য URL এখনও যাচাইকৃত নয়।

সোর্স পর্যালোচনায় components/context/AppContext.tsx-এর বই সেভের পথে ডেটাবেস অ্যাকশন ব্যর্থ হলে ত্রুটি লগ করে পরবর্তী UI আপডেট ও সাফল্য বার্তার দিকে এগোনোর পথ পাওয়া গেছে। একই ফাইলে saveStudyTabType ও saveTopicStudyTab স্থানীয় React state বদলায়। এই ফাংশনগুলোতে ডেটাবেস লেখার ধাপ পাওয়া যায়নি। এগুলো কোড পর্যবেক্ষণ। সংশ্লিষ্ট ব্যর্থতার ব্রাউজার পরীক্ষা পরিকল্পনায় রাখা হয়েছে।

## PDF ইমপোর্ট সংরক্ষণ · ২৪ নভেম্বর ২০২৬

Book Manager → Extract Studio → Choose Document দিয়ে PDF দিলে vps_local মোডে মূল ফাইল SKYX_VPS_STORAGE_DIR/originals-এর নিচে SHA-256 অনুযায়ী রাখা হয়। ফাইলের নাম, মালিক, আপেক্ষিক পথ, অধ্যায় ও সারাংশ PdfImport টেবিলে যায়। PdfImportPage-এ পৃষ্ঠা নম্বর, মূল টেক্সট, পরিষ্কার টেক্সট ও পৃষ্ঠার অন্যান্য তথ্য থাকে। একই ব্যবহারকারীর একই PDF পুনরায় আপলোডে প্রথম ইমপোর্ট ফিরে আসে। Open saved PDF imports থেকে মূল extraction আবার খোলা যায়।

স্কিমা প্রস্তুত করতে প্রজেক্টের ডেভেলপমেন্ট ডেটাবেসে npm run db:setup এবং Prisma Client তৈরি করতে npx prisma generate --config prisma/prisma.config.ts ব্যবহার করা হয়। মূল ফাইলের ডিরেক্টরি ও PostgreSQL একসঙ্গে ব্যাকআপ করতে হবে। ফাইল লেখার পর ডেটাবেস অপারেশন ব্যর্থ হলে একটি অসংযুক্ত ফাইল ডিস্কে থাকতে পারে। পুনরায় আপলোড একই পথ ব্যবহার করে এবং পৃষ্ঠার সারিগুলো এক ট্রানজ্যাকশনে লেখা হয়। Portable মোডে আগের ফাইল এক্সপোর্টের পথ চালু থাকে।

ডেভেলপমেন্ট যাচাই: পৃথক PostgreSQL ডেটাবেসে দুই পৃষ্ঠার PDF একযোগে দুবার HTTP দিয়ে আপলোড করা হয়েছে। নিজের তালিকায় একটি ইমপোর্ট পাওয়া গেছে। পুনরায় খোলার API উভয় পৃষ্ঠার সঠিক নম্বর ও লেখা দিয়েছে। ডিস্কের PDF আপলোডের সঙ্গে বাইট ধরে মিলেছে। সেশন ছাড়া আপলোডে 401 এবং অন্য ব্যবহারকারীর ইমপোর্ট খুলতে 404 এসেছে। TypeScript পরীক্ষা পাস করেছে। ব্রাউজারে বোতাম ক্লিকের পরীক্ষা বাকি।

## বাংলা PDF, ফন্ট ও বিন্যাস

Extract Studio পৃষ্ঠার স্থানাঙ্ক থেকে লেখা সাজায়। সন্দেহজনক গ্লিফ, টেক্সটবিহীন পৃষ্ঠা বা অল্প লেখাসহ ছবির পৃষ্ঠায় বাংলা ও ইংরেজি OCR ব্যবহার করে। ব্যবহারকারী সব পৃষ্ঠায় OCR-ও বেছে নিতে পারেন। পৃষ্ঠার layout তথ্যের সঙ্গে শনাক্তকরণের উৎস, সারি ও ঘর সংরক্ষিত হয়। সম্পাদক টেবিলের ঘর খুলে দেখতে পারেন। বাংলা প্রদর্শনের জন্য চার পরিবারের ফন্ট অ্যাপেই রাখা হয়েছে।

ডেভেলপমেন্ট যাচাই: বিকৃত অক্ষর-ম্যাপসহ ডিজিটাল বাংলা টেবিল এবং তার স্ক্যান কপিতে OCR দিয়ে ৩×৩ ঘর পুনরুদ্ধার হয়েছে। স্ক্যানের সব ঘরের লেখা HTTP ইমপোর্ট ও PostgreSQL থেকে আবার খুলে মিলেছে। দুই কলামের নমুনায় বাম কলাম শেষ করে ডান কলাম পড়া এবং ভাঙা PDF টেক্সট অংশ থেকে বাংলা যুক্তাক্ষর জোড়া দেওয়া যাচাই হয়েছে। জটিল বা মার্জ করা টেবিলের পৃথক মান যাচাই বাকি। সার্ভারের OCR নির্ভরতা README-তে দেওয়া আছে।

## Book Manager-এর একক ফাইল তালিকা

Smart Reader ও Extract Studio একই ফাইল তালিকা ব্যবহার করে। দুটির সাধারণ আপলোড ও তালিকার ব্যাচ আপলোড একই সংরক্ষণ পথ অনুসরণ করে। PDF, EPUB, DOCX, Markdown, TXT, CSV এবং .skyxbook.json সমর্থিত। তালিকায় নাম দিয়ে খোঁজা, মূল PDF পড়া, এক্সট্রাক্ট করা প্রজেক্ট সম্পাদনা এবং সম্পাদিত কপি পুনরায় পড়া যায়। একাধিক ফাইল আমদানির সময় একসঙ্গে সব বই রিডারে খোলা হয় না।

VPS মোডে মূল ফাইলের হ্যাশ দিয়ে ডিস্কে ফাইল চিহ্নিত হয়। আগের PdfImport রেকর্ডও তালিকায় আসে। সম্পাদিত প্রজেক্ট আলাদা BookEdition রেকর্ডে gzip করে রাখা হয়। একই প্রজেক্টের অভিন্ন স্ন্যাপশট পুনরায় সেভ করলে একই রেকর্ড ফেরে। নতুন সংস্করণে প্রজেক্টের লেখা ও বিন্যাস থাকে, মূল PDF বাইনারি থাকে না। Portable মোডে IndexedDB-তে বর্তমান ব্রাউজার ও অ্যাকাউন্টের তালিকা থাকে। ব্রাউজারের সাইট ডেটা মুছলে সেই স্থানীয় কপি মুছে যায়।

ডেভেলপমেন্ট পরীক্ষা: PDF ও বাংলা TXT আপলোড, একই PDF দুই অ্যাকাউন্টে এক ডিস্ক কপি, মূল ফাইলের বাইট মেলানো, সম্পাদিত সংস্করণ পুনরায় খোলা, একই সংস্করণ দুবার সেভ এবং অ্যাকাউন্ট অনুযায়ী পড়ার অনুমতি যাচাই হয়েছে।

## Manual book authoring

Admin → Books → Build Manually creates revisioned drafts with nested sections and Markdown. Save Draft establishes the first revision, and later edits to an existing draft autosave after a short pause. Publish writes visible sections to the catalog in a single PostgreSQL transaction. Published sections use stable topic IDs, and the Reader and Global Search use the same IDs to open the exact section. Existing topics retain their IDs. A hidden parent also hides its descendants. Drafts are available to administrators.

PostgreSQL verification covered a four-level Bangla outline, draft reload, Bengali breadcrumb lookup, publication isolation, stale revisions, hidden sections and cycle rejection. TypeScript verification passed. Browser verification remains open.

## Book Library marketplace

The Digital Products panel under Admin Books manages free claims, one-time prices, plan inclusion and manual payment review. Book licenses store free and purchased access by learner. Approved subscription orders record access expiration. The listing, order, and license records are separate from the original book and personal study records. Order references are unique, and repeated approvals and claims are safe to retry. See the README for payment setup.

## Publication and account verification

Extract Studio publishes catalog books and topics atomically. Use Create Builder Draft in Extract Studio or the AI Splitter preview to continue editing in Build Manually. Reopening a published title uses the catalog, and new imported products are unlisted until configured by an administrator. Study tabs persist in PostgreSQL and follow published topic access. A learner's timed exam submission is stored once under that account and can be retried from the results screen. Floating AI history sends the dashboard session token with its requests.

Local verification used a temporary PostgreSQL database, an administrator, and two learners. It covered rejected cross-book topic IDs and rollback, repeated publication, hidden topics, imported outline order and content, study-tab access, repeated exam submissions, and PDF page range validation. A development server verified HTTP chat history isolation and readiness status with PostgreSQL running and stopped. The dashboard click flow and Android behavior remain to be verified.
## Manual Book Builder · ২৪ নভেম্বর ২০২৬

Admin-এ নতুন **Book Builder** (রুট `book-builder`) যোগ হয়েছে। `BookNode` self-relation গাছে Book > Chapter > Topic > Subtopic > Point — গভীরতা সীমাহীন; প্রতিটি node-এ নিজের লেখা ও সন্তান দুটোই থাকতে পারে। Builder-এ গাছে `+` দিয়ে যোগ, inline সম্পাদনা, drag করে অন্য node-এর ভেতরে নেওয়া, উপরে-নিচে ক্রম, duplicate (subtree সহ), hide/delete, outline paste থেকে গাছ, পুরনো flat `BookTopic` থেকে একমুখী migration, এবং Markdown editor-এ autosave (সার্ভার নিশ্চিত করলে তবেই Saved; ব্যর্থ হলে draft থাকে)। **Sync & Publish** গাছকে `sourceNodeId`-চিহ্নিত `BookTopic` সারিতে রূপান্তর করে — বিদ্যমান Reader, সার্চ ও Study Tab অপরিবর্তিত পথেই হাতে-বানানো বই পড়ায়। এজেন্টের জন্য ডাটা ফাংশন প্রস্তুত: `getBookToc`, `findBooksByAuthor`, `searchBookNodes` (breadcrumb সহ), `getBookNodeStats` — Advance Assistant-এর সঙ্গে যুক্ত করা বাকি (প্ল্যান §৯)।

যাচাই (অস্থায়ী PostgreSQL, একই `server.ts`): schema `db push`-এ sync; server action দিয়ে বই ও ৪ স্তরের গাছ তৈরি, outline import, cycle-move প্রত্যাখ্যান, লেখক/শব্দ খোঁজা, sync-এ ৭টি Reader topic ও পুনঃsync-এ একই সংখ্যা (idempotent), node delete-এ subtree cascade — মোট ১৯টি assertion পাস। `npm run build` পাস (এর আগে main-এর নিজস্ব build ভাঙা ছিল: `ai-history-actions.ts`-এর sync export `getUserFromRequestCookie` এখন `lib/auth/request-user.ts`-এ, ৫টি API রুট সেখান থেকে import করে)। Homepage HTTP 200 ও `/api/health` ok। সীমা: Builder-এর ব্রাউজার-ক্লিক পরীক্ষা ও AI Splitter/Extract Studio থেকে সরাসরি tree import বাকি (Custom_Book_Builder_Plan-এর B3-এর অংশ)।


## Advance Assistant Tool Call সম্প্রসারণ পরিকল্পনা · ২৪ নভেম্বর ২০২৬

`Knowledge/Advance_assistant_tool_calls_plan.md` যোগ হয়েছে: বর্তমান অ্যাপের অডিট (Live function call এখন মাত্র একটি, `go_to_page`) থেকে আগের প্ল্যানের ২৭টির বাইরে আরও ৩৮টি নতুন tool call-এর প্রস্তাব — খোঁজা, Reader annotation, পরীক্ষা/ইতিহাস বিশ্লেষণ, revision, study plan ও personal memory, শিক্ষকের builder tool, multimodal ছবি। প্রতিটি tool-এর পাশে ভিত্তি (বিদ্যমান কোড/API) ও অনুমতি স্তর (Read / Write / Confirm) লেখা; ধাপ T0–T4 আগের প্ল্যানের Phase 0–5-এর সঙ্গে মিলিয়ে সাজানো। পরবর্তী আপডেটে T0 প্যাকেজ বাস্তবায়িত হয়েছে।


## Advance Assistant implementation update

The root tutor resumes the browser and Gemini connections with the same conversation when the resumption handle remains valid. Smart Document Reader can share the selected PDF with that tutor. The published Reader and PDF Read Aloud use device speech synthesis. PDF highlighting depends on an aligned, selectable text layer.

Assistant Results stores personal notes, examples, editable diagrams and reference cards in PostgreSQL. Study Content handles background notes using an accessible topic excerpt. Reader spotlight, enlarged text, concept steps and a whiteboard use the existing Live command channel. This release adds the seven T0 tools, including catalog search with the Bengali-aware search index, exam history, streak and due card checks. Existing private documents stay outside catalog search.

Verification uses temporary PostgreSQL with simulated Gemini Live and text models. The tool contract includes cross-account resume rejection, locked catalog denial, background notes, diagram validation, revision history and account isolation. Real-provider Live Audio, PDF viewport, WebGL and Android verification remain open. See [implementation status](ADVANCE_ASSISTANT_IMPLEMENTATION.md) for the remaining phases.
