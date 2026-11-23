# Skyx Digital Study — Advance Assistant: Tool Call সম্প্রসারণ পরিকল্পনা

২৪ নভেম্বর ২০২৬ · [Advance Assistant মূল প্ল্যান](Advance_assistant_feature.md) · [Book Builder প্ল্যান](Custom_Book_Builder_Plan.md) · [প্রজেক্ট কনটেক্সট](PROJECT_CONTEXT.md)

বর্তমান বাস্তবায়ন ও পরীক্ষার ফল [Implementation status](ADVANCE_ASSISTANT_IMPLEMENTATION.md)-এ আছে। এই নথির অডিট অংশে পরিকল্পনা তৈরির সময়ের অবস্থা রাখা হয়েছে।

## লক্ষ্য — ব্যবহারকারীর ভাষায়

আগের প্ল্যানে এজেন্টের মূল function গুলো সাজানো হয়েছে (navigation, হাইলাইট, show layer, bubble, নোট, কাস্টম বইয়ের query, 3D compiler)। এই পরিপূরক প্ল্যানের প্রশ্ন: **অ্যাপে যা যা ইতিমধ্যে আছে, তার আর কী কী এজেন্টের হাতে tool call আকারে তুলে দেওয়া যায়** — যাতে শিক্ষার্থী (ও শিক্ষক) প্রায় সব কাজ মেনু না ঘেঁটে শুধু বলে করাতে পারেন।

নিয়ম একটাই: প্রতিটি প্রস্তাবিত tool-এর পাশে লেখা আছে এর ভিত্তি কোডে **আসলেই আছে কি না**, আর না থাকলে ঠিক কতটুকু নতুন কাজ লাগবে। অনুমানের উপর কোনো tool প্রতিশ্রুতি দেওয়া হয়নি।

---

## ১ · বর্তমান অবস্থা — অডিটে যা পাওয়া গেল

| বিষয় | বাস্তব অবস্থা | এজেন্টের হাতে আছে? |
| --- | --- | --- |
| Live function call | পুরো অ্যাপে **একটিই**: `go_to_page` (শুধু Reader Live-এ) | আংশিক |
| আগের প্ল্যানের registry | ১৫টি মূল function + বই-query ৭টি (§৯) + 3D/ছবি ৫টি (§১০) = **২৭টি পরিকল্পিত**, এখনো বাস্তবায়ন বাকি | না — Phase অনুযায়ী আসবে |
| Global Search | বাংলা+ইংরেজি search index ও modal তৈরি (`lib/search-index.ts`) | না — শুধু হাতে টাইপ করে |
| Reader annotation | highlight, note, bookmark আগে থেকেই আছে | না |
| Exam Center | MCQ পরীক্ষা, টাইমার, ফলাফল তৈরি | না |
| Exam History | পুরনো পরীক্ষার ফল ও ভুলের রেকর্ড DB-তে আছে | না |
| Revision Practice | flashcard-ভিত্তিক revision view তৈরি | না |
| Dashboard ডাটা | study streak, weekly goal (মিনিট), অগ্রগতি প্রোফাইলে আছে | না (`get_my_progress` শুধু পড়ার অগ্রগতি) |
| AI API পথ | `questions` (প্রশ্ন তৈরি), `study-content` (key points), `book-split`, `tts`, `transcribe`, `chat` — সব চালু | আংশিক (নোট/quiz আগের প্ল্যানে) |
| Book Builder ডাটা | `getBookToc`, `searchBookNodes` ইত্যাদি server action তৈরি ও পরীক্ষিত (আজই বানানো) | ডাটা তৈরি, Live-এ যুক্ত নয় |
| Admin প্যানেল | books, book-builder, questions, learners, billing, analytics, operations — ১৭টি route | না |
| Membership | learner-এর membership view ও admin billing আছে | না |

**সিদ্ধান্ত:** অ্যাপের প্রায় ৭০% ক্ষমতা এখনো এজেন্টের নাগালের বাইরে। এই প্ল্যানে আরও **৩৮টি নতুন tool call** প্রস্তাব করা হলো — মোট registry দাঁড়াবে প্রায় **৬৫টি**।

---

## ২ · Tool Call-এর নকশা নিয়ম (সব নতুন tool-এর জন্য)

1. **তিন স্তরের অনুমতি:**
   - **Read (স্বয়ংক্রিয়):** শুধু তথ্য আনে — খোঁজা, তালিকা, হিসাব। অনুমতি লাগে না।
   - **Write–reversible (স্বয়ংক্রিয় + undo):** bookmark, note, goal বদল — হয়ে যাবে, কিন্তু ফলে “হয়ে গেছে, ফিরিয়ে নিতে বললেই হবে” শোনানো বাধ্যতামূলক।
   - **Confirm (ভয়েসে নিশ্চিতকরণ):** মুছে ফেলা, পরীক্ষা submit, publish/sync, অন্যের ডাটা — এজেন্ট আগে বলবে “নিশ্চিত তো?”, “হ্যাঁ” শুনলেই করবে। মডেল নিজে থেকে কখনো নয়।
2. **গতির শ্রেণি:** Client tool < ৩০০ms (সঙ্গে সঙ্গে), Server read < ২s, Generation = background-এ গিয়ে bubble-এ ফল (আগের প্ল্যানের প্যাটার্ন)। ধীর tool চালু হলে companion “Working” অবস্থা দেখাবে — নীরবতা নয়।
3. **Chain নিয়ম:** Read tool পরপর chain করা যাবে (খুঁজে → খুলে → পড়া)। একই জিনিসে পরপর দুটি Write নয়। সর্বোচ্চ chain গভীরতা ৩; এর বেশি হলে এজেন্ট মাঝখানে ব্যবহারকারীকে জানাবে।
4. **ফলের আকার:** প্রতিটি tool structured result ফেরত দেবে + এক লাইনের বলার মতো সারাংশ। Error হবে actionable কোডে — যেমন `NOT_FOUND` হলে সঙ্গে কাছাকাছি মিলের পরামর্শ (“‘কোষ বিভাজন’ পাইনি, ‘কোষের গঠন’ আছে — ওটা খুলব?”)।
5. **একটাই registry:** সব tool-এর zod schema এক জায়গায় (`lib/assistant/tools/`), client/server দুই পাশেই একই সংজ্ঞা; প্রতিটি tool-এ role অনুমতি (learner/teacher/admin) ও কোন মডেল ডাকতে পারবে (Flash Live / Extended Thinking) লেখা থাকবে।
6. **Audit:** প্রতিটি tool call বিদ্যমান ToolRun লগিংয়ের (`createToolRunDirect`) ধাঁচে রেকর্ড হবে — কোন tool, কার জন্য, সফল না ব্যর্থ। সমস্যা হলে পরে খুঁজে পাওয়া যাবে কোন ধাপে আটকেছিল।

---

## ৩ · নতুন Tool Call তালিকা

### ক · খোঁজা ও আবিষ্কার — ভিত্তি: বিদ্যমান search index

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `global_search` | “সালোকসংশ্লেষণ কোথায় কোথায় আছে?” | search index তৈরি | Live-এ যুক্ত করা | Read |
| `search_within_book` | “এই বইয়ে ‘DNA’ কোথায় আছে?” | একই index, book filter | ছোট | Read |
| `list_library` | “আমার জীববিজ্ঞানের বইগুলো দেখাও” | Library view-এর query | ছোট | Read |
| `find_related_topics` | “এটার সঙ্গে মিলিয়ে আর কী পড়ব?” | একই subject/model3dKey সংযোগ | মাঝারি (মিলের নিয়ম ঠিক করা) | Read |
| `search_my_annotations` | “আমি যেখানে নোট লিখেছিলাম, সেটা বের করো” | annotation DB | ছোট | Read |

### খ · Reader-এর ভেতরের কাজ — ভিত্তি: annotation ও reader settings

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `find_in_page` | “এই পৃষ্ঠায় ‘মাইটোকন্ড্রিয়া’ শব্দটা দেখাও” | DOM text | ছোট; spotlight-এর সঙ্গে যুক্ত | Read |
| `add_bookmark` | “এই জায়গাটা bookmark করে রাখো” | bookmark তৈরি | ছোট | Write |
| `jump_to_bookmark` | “শেষ bookmark-এ নিয়ে যাও” | bookmark তালিকা | ছোট | Read |
| `annotate_selection` | “এই লাইনটায় নোট লেখো: ‘পরীক্ষায় আসে’” | note তৈরি | ছোট | Write |
| `set_speech_voice` | “মেয়ের কণ্ঠে পড়ো / আস্তে পড়ো” | TTS + reader-settings API | ছোট | Write |
| `dictionary_lookup` | “এই শব্দটার মানে কী?” | **নতুন:** প্রসঙ্গসহ অর্থ মডেল বানাবে; ঘন ঘন শব্দের জন্য ছোট cache | মাঝারি | Read |
| `translate_selection` | “এই অংশটা বাংলায় বলো” | মডেল অনুবাদ | ছোট | Read |
| `save_vocabulary_word` | “শব্দটা আমার vocabulary-তে রাখো” | **নতুন ছোট তালিকা** Study Vault-এ | মাঝারি | Write |

### গ · পরীক্ষা ও প্রশ্ন — ভিত্তি: Exam Center, History, questions API

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `start_exam` | “কোষ অধ্যায় থেকে ১০টা MCQ পরীক্ষা নাও” | Exam Center তৈরি | exam config প্যারামিটার পাঠানো | Write |
| `submit_exam` | “জমা দিয়ে দাও” | exam submit | — | **Confirm** |
| `get_exam_history` | “গত পরীক্ষায় কত পেয়েছিলাম?” | History DB | ছোট | Read |
| `get_weak_topics` | “আমি কোন কোন টপিকে দুর্বল?” | History বিশ্লেষণ (ভুলের হার) | মাঝারি | Read |
| `make_correction_notes` | “আমার ভুলগুলো দিয়ে নোট বানাও” | ভুলের রেকর্ড + notes পাইপলাইন | মাঝারি | Write |
| `grade_spoken_answer` | শিক্ষার্থী মুখে উত্তর দিলে যাচাই | আগের প্ল্যানের quiz-এর বিস্তার — লিখিত উত্তরের rubrics যাচাই | মাঝারি | Read |

### ঘ · Revision ও স্মৃতি — ভিত্তি: Revision Practice

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `get_due_revisions` | “আজ কতগুলো revision বাকি?” | Revision view-এর due হিসাব | ছোট | Read |
| `start_revision_session` | “Revision শুরু করো” | Revision view খোলা + card আনা | ছোট | Write |
| `grade_flashcard` | “এটা জানি / এটা জানি না” | card grade সংরক্ষণ | ছোট | Write |
| `make_flashcards` | “এই টপিকের flashcard বানাও” | questions/study-content পাইপলাইন | মাঝারি — card আকারে সেভ | Write |

### ঙ · অগ্রগতি, লক্ষ্য ও পরিকল্পনা — ভিত্তি: Dashboard ডাটা

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `get_study_streak` | “আমার streak কত দিন?” | প্রোফাইল ডাটা | ছোট | Read |
| `set_weekly_goal` | “সপ্তাহে ৩০০ মিনিট লক্ষ্য রাখো” | weekly goal ফিল্ড | ছোট | Write |
| `make_study_plan` | “১৫ তারিখে পরীক্ষা — পড়ার পরিকল্পনা বানাও” | **নতুন:** plan artifact + revision schedule-এ এন্ট্রি | মাঝারি | Write |
| `get_todays_plan` | “আজ কী কী পড়ার কথা?” | উপরের plan | ছোট | Read |
| `start_focus_timer` | “২৫ মিনিটের টাইমার দাও, পড়ব” | **নতুন ছোট ফিচার:** companion-এ টাইমার; শেষ হলে হালকা শব্দ + streak-এ মিনিট যোগ | মাঝারি | Write |
| `remember_personal_fact` | “মনে রেখো, আমার পরীক্ষা ১৫ তারিখে” | **নতুন ছোট মডেল:** `UserMemory` (শুধু ব্যবহারকারীর বলা তথ্য) | মাঝারি | Write |
| `recall_personal_facts` | “আমার পরীক্ষা কবে বলেছিলাম?” | উপরের মডেল | ছোট | Read |

### চ · লাইব্রেরি ও নিজের বই — ভিত্তি: My Library, Book Manager

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `add_to_my_library` | “বইটা আমার লাইব্রেরিতে রাখো” | My Library action | ছোট | Write |
| `continue_reading` | “শেষ যেখান থেকে পড়ছিলাম, খোলো” | reading position সংরক্ষিত | ছোট | Read |
| `get_unfinished_books` | “কোন বইগুলো অর্ধেক পড়া?” | progress ডাটা | ছোট | Read |
| `get_import_status` | “আমার আপলোড করা বইটা তৈরি?” | Book Manager processing অবস্থা | ছোট | Read |
| `ocr_current_page` | “এই স্ক্যান পৃষ্ঠাটা পড়ে শোনাও” | book-engine OCR তৈরি | OCR ফলকে পড়ার পাইপলাইনে যুক্ত করা | Read |

### ছ · আরও কনটেন্ট তৈরি — ভিত্তি: study-content ও TTS পাইপলাইন

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `make_summary` | “সংক্ষেপে সারাংশ দাও / বিস্তারিত সারাংশ দাও” | study-content | দৈর্ঘ্য প্যারামিটার | Write |
| `make_mindmap` | “এটার mind map বানিয়ে দেখাও” | Show Layer-এ SVG map — whiteboard থেকে আলাদা, গঠনমূলক | মাঝারি | Write |
| `make_comparison_table` | “দুটোর পার্থক্য টেবিল করে দাও” | আগের compare view-এর পূর্ণ রূপ, bubble-এ সেভ হয় | ছোট | Write |
| `make_timeline` | “ঘটনাগুলো সময়ক্রমে সাজাও” | bubble artifact নতুন ধরন | মাঝারি | Write |
| `convert_notes_to_audio` | “নোটটা অডিও করে দাও, শুনব” | TTS API তৈরি | artifact-এ audio সংযোগ | Write |
| `set_teaching_level` | “আমাকে ক্লাস ৮-এর মতো করে বোঝাও” | prompt-এ স্তর প্যারামিটার + প্রোফাইলে সেভ | ছোট | Write |

### জ · শিক্ষক/Admin tool — ভিত্তি: Book Builder (আজ বাস্তবায়িত) — শুধু admin ভূমিকায়

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `builder_add_node` | “নতুন অধ্যায় যোগ করো: ‘কোষ বিভাজন’” | `createBookNodeAction` তৈরি ও পরীক্ষিত | Live-এ যুক্ত করা | Write |
| `builder_set_content` | বলা লেখাটা node-এর content হিসেবে বসানো | `updateBookNodeAction` | dictation পরিষ্কার করা | Write |
| `builder_sync_publish` | “বইটা Reader-এ প্রকাশ করো” | `syncBookNodesToTopicsAction` | — | **Confirm** |
| `get_learner_overview` | “এই সপ্তাহে কতজন পড়েছে?” | admin analytics ডাটা | ছোট | Read (admin) |
| `report_content_issue` | “এই পৃষ্ঠায় ভুল আছে, রিপোর্ট করো” | admin operations-এ এন্ট্রি | মাঝারি | Write |

### ঝ · পর্দা ও ছবি (multimodal) — ভিত্তি: Reader Live frame ও transcribe

| Tool | ভয়েস উদাহরণ | ভিত্তি | নতুন কাজ | স্তর |
| --- | --- | --- | --- | --- |
| `describe_screen` | “স্ক্রিনে এখন কী দেখছি, বলো” | Reader Live frame পাঠানো তৈরি | সাধারণ টিউটরেও frame চালু | Read |
| `explain_uploaded_image` | হাতে লেখা প্রশ্নের ছবি তুলে “এটা বুঝিয়ে দাও” | chat-এ ছবি + মডেল vision | আপলোড প্রবাহ টিউটরে যুক্ত | Read |
| `solve_from_photo` | অঙ্কের ছবি → ধাপে ধাপে সমাধান bubble-এ | উপরের পাইপলাইন + artifact | মাঝারি | Write |

---

## ৪ · যা ইচ্ছা করেই রাখা হয়নি (সৎ সীমা)

- **Payment/billing বদল:** membership কেনা বা বাতিল এজেন্ট করবে না — শুধু `get_membership_status` জাতীয় Read দেওয়া যায়, টাকার লেনদেন সবসময় ব্যবহারকারীর নিজের হাতে পেজে।
- **অন্য শিক্ষার্থীর ডাটা:** learner কখনো অন্যের progress/history দেখতে পারবে না; admin overview হবে সমষ্টিগত (aggregate), ব্যক্তির গোপন ডাটা নয়।
- **সরাসরি ডাটাবেস/কোড চালানো:** এজেন্ট কখনো raw query বা কোড execute করবে না — শুধু এই registry-র যাচাইকৃত tool।
- **ইন্টারনেটে অবাধ ব্রাউজিং:** ছবি খোঁজা আগের প্ল্যানের §১০ পথেই (সার্ভার tool, উৎস/লাইসেন্সসহ); Live মডেল নিজে নেটে যাবে না।

---

## ৫ · ধাপে ধাপে বাস্তবায়ন (আগের প্ল্যানের Phase-এর সঙ্গে মিলিয়ে)

| ধাপ | প্যাকেজ | Tool গুলো | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- | --- |
| **T0 · Read প্যাকেজ** (Phase 0-এর সঙ্গে) | খোঁজা ও তথ্য | `global_search`, `search_within_book`, `list_library`, `get_exam_history`, `get_study_streak`, `get_due_revisions`, `continue_reading` | “সালোকসংশ্লেষণ কোথায় আছে?” বললে সঠিক বই/পৃষ্ঠার তালিকা আসে ও যেকোনোটা খুলে দেওয়া যায়। ভুল নাম বললে কাছাকাছি পরামর্শ আসে, ভুল উত্তর নয়। |
| **T1 · Reader প্যাকেজ** (Phase 1–2) | পড়ার ভেতরের কাজ | `find_in_page`, `add_bookmark`, `jump_to_bookmark`, `annotate_selection`, `set_speech_voice`, `translate_selection`, `dictionary_lookup` | পড়ার মাঝে bookmark/note হয় ও পরে খুঁজে পাওয়া যায়। শব্দের অর্থ প্রসঙ্গ অনুযায়ী আসে। |
| **T2 · পরীক্ষা ও Revision** (Phase 3) | মূল্যায়ন চক্র | `start_exam`, `submit_exam` (confirm), `get_weak_topics`, `make_correction_notes`, `make_flashcards`, `start_revision_session`, `grade_flashcard` | ভয়েসে পরীক্ষা শুরু ও জমা হয়; ফল থেকে দুর্বল টপিকের তালিকা ও সংশোধনী নোট তৈরি হয়; পরদিন revision-এ সেই card গুলো আসে। |
| **T3 · পরিকল্পনা ও স্মৃতি** (Phase 3–4) | ব্যক্তিগতকরণ | `make_study_plan`, `get_todays_plan`, `set_weekly_goal`, `start_focus_timer`, `remember_personal_fact`, `recall_personal_facts`, `save_vocabulary_word` | পরীক্ষার তারিখ বললে পরিকল্পনা তৈরি হয় ও প্রতিদিনের তালিকা মেলে। “মনে রেখো” বলা তথ্য পরের session-এও ফিরে আসে। |
| **T4 · শিক্ষক ও multimodal** (Phase 4–5) | admin + ছবি | `builder_add_node`, `builder_set_content`, `builder_sync_publish` (confirm), `get_learner_overview`, `describe_screen`, `explain_uploaded_image`, `solve_from_photo`, `ocr_current_page`, `make_mindmap`, `make_timeline`, `convert_notes_to_audio` | শিক্ষক ভয়েসে অধ্যায় যোগ করে প্রকাশ করতে পারেন; learner সেই tool দেখতেই পায় না। হাতে লেখা প্রশ্নের ছবি থেকে ধাপে ধাপে সমাধান bubble-এ আসে। |

প্রতিটি ধাপের শেষে: tool-ভিত্তিক contract test (Book Builder-এর মতো — আসল DB-তে action চালিয়ে যাচাই) + বাংলা ও ইংরেজি — দুই ভাষার ভয়েস বাক্যের eval সেট। ফল PROJECT_CONTEXT-এ লিখতে হবে।

---

## ৬ · সিদ্ধান্ত বাকি (ব্যবহারকারীর)

1. Focus timer কি companion-এর সঙ্গে বানাব, নাকি আলাদা ছোট widget হলেই চলবে?
2. `UserMemory`-তে এজেন্ট নিজে থেকে কিছু মনে রাখতে পারবে (যেমন “সে ক্লাস ৯-এ পড়ে”), নাকি শুধু ব্যবহারকারী বললেই?
3. শিক্ষকের builder tool গুলো কি প্রথম দিকেই (T2-তে) আনা হবে, নাকি T4-তেই থাকবে?
4. Dictionary-র জন্য বাইরের অভিধান API (key লাগতে পারে) ব্যবহার করা যাবে, নাকি মডেল-ভিত্তিক অর্থই যথেষ্ট?

এই উত্তরগুলো ছাড়াই T0 শুরু করা যায়।
