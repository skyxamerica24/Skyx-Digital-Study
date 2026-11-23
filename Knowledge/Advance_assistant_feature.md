# Skyx Digital Study — Advance Assistant Feature Plan

২৪ নভেম্বর ২০২৬ · [প্রজেক্ট কনটেক্সট](PROJECT_CONTEXT.md) · [মূল উন্নয়ন পরিকল্পনা](PLAN.md)

## লক্ষ্য — ব্যবহারকারীর ভাষায়

লাইভ এজেন্ট যেন শুধু কথা না বলে, পুরো স্ক্রিনজুড়ে একজন সঙ্গী শিক্ষকের মতো কাজ করে:

1. **থেমে যাবে না** — এজেন্ট চলা অবস্থায় অ্যাপের অন্য ট্যাবে/প্যানেলে গেলেও সে বন্ধ হবে না; স্ক্রিনের কোনো এক জায়গায় সে থাকবে, চাইলে ধীরে ঘুরে বেড়াবে।
2. **পড়ার সঙ্গে হাইলাইট** — Reading mode-এ যেকোনো PDF/বই পড়ার সময় যে অংশটুকু পড়া হচ্ছে, ঠিক সেই অংশটুকু হাইলাইট হবে।
3. **বলার সঙ্গে দেখানো** — উদাহরণ দেওয়ার সময় উদাহরণ স্ক্রিনে দেখা যাবে, ধারণা বোঝানোর সময় সেটা অ্যানিমেটেড আকারে ফুটে উঠবে।
4. **ফলাফল বাবল** — “এই পেইজের লেখাটা আমাকে লিখে দাও” বললে লেখাটা তৈরি হয়ে ওই স্ক্রিনেই ছোট বাবল হয়ে থাকবে; ক্লিক করলে expand হয়ে পুরো লেখা দেখা যাবে।
5. **পয়েন্ট-ভিত্তিক নোট** — সাধারণ লেখা থেকে এজেন্ট পয়েন্ট করে করে এমন নোট বানাবে, যাতে পড়তে অনেক সুবিধা হয়।

নিচের পরিকল্পনা বর্তমান কোড পর্যালোচনা করে সাজানো। প্রতিটি ফিচারের পাশে সম্ভাব্যতা ও সীমা সৎভাবে লেখা আছে।

---

## ১ · বর্তমান অবস্থা — কোডে যা পাওয়া গেল

| বিষয় | কোডে যা আছে | ফাইল |
| --- | --- | --- |
| সাধারণ Floating Tutor | `app/page.tsx`-এ রুট পর্যায়ে একবার mount হয়, তাই অ্যাপের ভেতরের প্যানেল বদলালে (Dashboard → Reader → Exams) এটি unmount হয় না | `app/page.tsx`, `components/ai/FloatingAiTutor.tsx` |
| PDF Reader Live | component unmount হলেই session বন্ধ (`useEffect` cleanup-এ `stop()`); অন্য view-তে গেলেই শেষ | `components/book-manager/ReaderLiveControl.tsx` |
| ব্রাউজার ট্যাব বদল | `visibilitychange`-এ `document.hidden` হলেই সঙ্গে সঙ্গে পুরো session `stop()` হয়ে যায় — **ব্যবহারকারীর অভিযোগের মূল কারণ এটাই** | `components/book-manager/ReaderLiveControl.tsx` (`onHidden`) |
| পৃষ্ঠার ছবি পাঠানো | `document.hidden` থাকলে frame পাঠানো এমনিতেই বন্ধ থাকে | `lib/reader-live/view.ts` |
| Function call | একটিই আছে: `go_to_page` (Extended Thinking মডেলে `NON_BLOCKING`)। সাধারণ টিউটরে ড্যাশবোর্ড/চিত্র খোলার মতো navigation tool নেই | `lib/reader-live/model.ts`, `lib/reader-live/socket.ts` |
| Session দীর্ঘ করা | `sessionResumption` বা `contextWindowCompression` কোডের কোথাও নেই | পুরো রেপো |
| পড়ার কনটেন্ট | প্রকাশিত Reader-এ লেখা DOM টেক্সট; selection, highlight, note, bookmark annotation আগে থেকেই আছে — read-along হাইলাইটের ভিত্তি তৈরি | `components/reader/BookReaderWorkspace.tsx` |
| কাঁচা PDF | PDF canvas-এ render হয়; extraction-এর layout-এ শুধু সারির লেখা থাকে, অক্ষরের/লাইনের স্থানাঙ্ক (coordinate) থাকে না — canvas-এর উপর হাইলাইট করতে আলাদা text layer লাগবে | `lib/book-engine/types.ts`, `components/book-manager/SmartDocumentReader.tsx` |
| আলাপ সংরক্ষণ | সাধারণ ভয়েস পথে transcript জোড়া সার্ভারে সেভ হয় — পুনরায় যুক্ত হওয়ার ভিত্তি হিসেবে ব্যবহারযোগ্য | `server.ts` |

---

## ২ · সম্ভাব্যতা — তিন স্তরে সৎ বিভাজন

| স্তর | পরিস্থিতি | যা সম্ভব |
| --- | --- | --- |
| **A · অ্যাপের ভেতরে** | Dashboard, Reader, Exam, 3D Lab — এক প্যানেল থেকে আরেকটায় যাওয়া | **পুরোপুরি সম্ভব।** Session-কে root provider-এ তুলে, কোনো view-র সঙ্গে তার জীবন বাঁধা থাকবে না। এই পরিকল্পনার Phase 0–1 এটাই ঠিক করে। |
| **B · ব্রাউজার ট্যাব বদল / minimize** | অন্য ব্রাউজার ট্যাবে যাওয়া, ব্রাউজার minimize করা | **আংশিক সম্ভব।** Gemini Live-এর connection প্রায় ১০ মিনিটে reset হয় এবং compression ছাড়া audio session ১৫ মিনিট (audio+video ২ মিনিট) পর্যন্ত চলে; `sessionResumption` handle দিয়ে context অক্ষত রেখে নতুন connection-এ resume করা যায়, আর `contextWindowCompression` (sliding window) দিলে session তাত্ত্বিকভাবে অনির্দিষ্টকাল চলতে পারে। ফিরে এলে auto-resume হবে, মাঝের transcript সার্ভারে থাকবে। তবে ট্যাব hidden থাকা অবস্থায় ব্রাউজার mic/frame থামিয়ে দিতে পারে — সেই সময়টায় এজেন্ট “শুনছে না”, ফিরে এলেই আবার লাইভ। Document Picture-in-Picture দিয়ে companion-টাকে অন্য ট্যাবের উপরেও ভাসমান রাখা যায় (Chromium-এ), আর Wake Lock দিয়ে স্ক্রিন ঘুমানো আটকানো যায়। |
| **C · ফোনে অন্য অ্যাপ / স্ক্রিন অফ** | Android-এ অন্য অ্যাপে যাওয়া বা স্ক্রিন বন্ধ | **ওয়েবের সীমা।** ব্রাউজার background-এ mic/WebSocket ধরে রাখতে পারে না। এই স্তর চাইলে পরের ধাপে PWA/TWA বা native wrapper লাগবে — এই পরিকল্পনায় প্রতিশ্রুতি দেওয়া হচ্ছে না, Phase 5-এ শুধু পরীক্ষা ও সিদ্ধান্ত রাখা আছে। |

---

## ৩ · ফিচার তালিকা — কী কী করা যাবে

### ৩.১ Persistent Roaming Companion — সবসময় পাশে থাকা সঙ্গী

- ছোট গোল avatar companion, স্ক্রিনের যেকোনো জায়গায় **drag** করে রাখা যাবে; প্রান্তে ছাড়লে নিজে থেকে dock হয়ে যাবে।
- **Roam mode (ঐচ্ছিক, default বন্ধ রাখা যায়):** idle থাকলে ধীরে ধীরে পাশের খালি জায়গায় সরে যায়, পড়ার জায়গা ঢাকে না; ব্যবহারকারী টাইপ/পড়া শুরু করলেই থেমে dock-এ ফিরে আসে।
- অবস্থা অনুযায়ী রূপ: Listening (মৃদু pulse), Thinking (ঘূর্ণন), Speaking (তরঙ্গ), Working on a tool (ছোট spinner + কাজের নাম, যেমন “নোট বানাচ্ছি…”)।
- **Pointer companion:** কিছু দেখানোর সময় companion নিজে সরে গিয়ে সংশ্লিষ্ট অংশের পাশে দাঁড়ায়, সঙ্গে তীর/আঙুল-নির্দেশ অ্যানিমেশন — “এই লাইনটা দেখো” সত্যিকারের নির্দেশ হয়ে ওঠে।
- মাইক, থামানো, বড় করা — সব নিয়ন্ত্রণ companion-এর গায়েই; পুরো প্যানেল খোলা বাধ্যতামূলক নয়।

### ৩.২ Read-Along Highlight — পড়ার সঙ্গে সঙ্গে হাইলাইট

- এজেন্ট পড়া শুরু করলে বর্তমান **বাক্য** হাইলাইট হবে, বাক্য শেষে হাইলাইট পরের বাক্যে সরে যাবে (karaoke-ধাঁচ); পৃষ্ঠা নিজে থেকে scroll হয়ে হাইলাইট দৃশ্যমান রাখবে।
- গতি নিয়ন্ত্রণ: ধীরে / স্বাভাবিক / দ্রুত; যেকোনো বাক্যে ক্লিক করলে সেখান থেকে পড়া শুরু।
- দুটি পথ:
  - **প্রকাশিত Reader (আগে):** লেখা DOM-এ আছে, বাক্যভিত্তিক `<span>` range ধরে হাইলাইট — নির্ভুল ও সস্তা।
  - **কাঁচা PDF (পরে, Phase 5):** pdfjs text layer overlay বসিয়ে একই হাইলাইট canvas-এর উপর; প্রয়োজনে extraction-এ লাইনভিত্তিক স্থানাঙ্ক সংরক্ষণ।
- সৎ সীমা: হাইলাইট হবে **বাক্যভিত্তিক**, শব্দে-শব্দে নয়। Live audio-র transcript ও পড়া অংশের লেখা মিলিয়ে বাক্য শনাক্ত করা হবে; মাঝে মাঝে এক বাক্য এদিক-ওদিক হলে ব্যবহারকারী ক্লিক করে ঠিক করে দিতে পারবেন।
- পড়া থামালে হাইলাইট সেখানেই থেকে যাবে — পরে “যেখান থেকে পড়ছিলাম” দিয়ে resume।

### ৩.৩ Show Layer — বলার সঙ্গে সঙ্গে দেখানো

এজেন্ট কথা বলার পাশাপাশি নিচের যেকোনোটি স্ক্রিনে ঘটাতে পারবে (সবই function call দিয়ে):

| দেখানো | উদাহরণ |
| --- | --- |
| **Example card** | ব্যাকরণ/বিজ্ঞানের উদাহরণ আলাদা রঙের কার্ডে পাশে ভেসে ওঠা, মূল লেখা থেকে আলাদা চিহ্নিত |
| **Concept animation** | ধাপে ধাপে অ্যানিমেশন — যেমন রক্ত সঞ্চালনের ধাপগুলো একে একে জ্বলে ওঠা; SVG/CSS ধাপ-অ্যানিমেশন, ভারী ভিডিও নয় |
| **Spotlight** | বাকি স্ক্রিন হালকা অন্ধকার করে শুধু সংশ্লিষ্ট figure/table/লাইন উজ্জ্বল রাখা |
| **Callout zoom** | টেবিল বা ছবির নির্দিষ্ট অংশ বড় করে পাশে দেখানো |
| **3D diagram** | “হৃৎপিণ্ডটা দেখাও” বললেই বিদ্যমান ThreeDiagramLab খুলে সংশ্লিষ্ট অংশ exploded/highlight করা |
| **Whiteboard sketch** | ফাঁকা overlay-তে হাতে-আঁকার মতো ধীরে ধীরে রেখা টেনে diagram/তীর/বৃত্ত আঁকা (SVG stroke animation) |
| **Compare view** | দুটি ধারণার পার্থক্য পাশাপাশি দুই কলামে ভেসে ওঠা |

### ৩.৪ Artifact Bubbles — ফলাফল ছোট বাবল হয়ে স্ক্রিনেই থাকা

- এজেন্ট যা-ই তৈরি করুক — লেখা, সারাংশ, অনুবাদ, নোট, quiz, flashcard — তা চ্যাট প্যানেলের ভেতরে হারিয়ে যাবে না; স্ক্রিনের **Bubble Dock**-এ ছোট chip/bubble হয়ে জমা হবে: শিরোনাম + ধরনের আইকন + এক লাইনের ঝলক।
- ক্লিক করলে bubble **expand** হয়ে পুরো কনটেন্ট দেখাবে; আবার ছোট করা, টেনে অন্য জায়গায় রাখা, pin করে রাখা, মুছে ফেলা — সবই যাবে।
- প্রতিটি bubble থেকে সরাসরি কাজ: **Copy, Save to Study Vault, Download, আবার বড় করে পড়া (focus mode)**।
- লম্বা কাজ (যেমন পুরো পৃষ্ঠার নোট) Extended Thinking মডেল **background-এ** বানাবে — লাইভ কথা থামবে না; তৈরি হলেই bubble “Ready” হয়ে হালকা নড়ে উঠবে।
- Bubble গুলো সার্ভারে সেভ থাকবে (বই/টপিক/পৃষ্ঠার সঙ্গে বাঁধা), যাতে পরের দিন এসেও “গতকালের নোটগুলো” ফিরে পাওয়া যায়।

### ৩.৫ Structured Notes — পয়েন্ট করে সাজানো নোট

সাধারণ লেখা/পৃষ্ঠা থেকে এক কমান্ডে (“এই পেইজটা নোট বানিয়ে দাও”) নিচের কাঠামোয় নোট তৈরি হবে:

- **শিরোনাম ও এক-লাইনের সারমর্ম**
- **মূল পয়েন্টগুলো** — স্তরভিত্তিক bullet (মূল → উপ-পয়েন্ট), প্রতিটিতে মূল শব্দ **bold**
- **সংজ্ঞা বাক্স** — গুরুত্বপূর্ণ সংজ্ঞা আলাদাভাবে
- **উদাহরণ** — প্রতিটি কঠিন পয়েন্টের পাশে একটি করে উদাহরণ
- **মনে রাখার কৌশল** — mnemonic / ছোট্ট ছন্দ বা সংযোগ
- **পরীক্ষার ফাঁদ** — যেখানে ভুল হওয়ার সম্ভাবনা বেশি
- **উৎস** — কোন বইয়ের কোন পৃষ্ঠা থেকে নেওয়া, ক্লিক করলে সেই পৃষ্ঠা খুলবে

নোট প্রথমে bubble আকারে আসবে; পছন্দ হলে এক ক্লিকে Study Vault-এ সেভ বা বইয়ের Study Tab (Key Points) হিসেবে যুক্ত করা যাবে। বিদ্যমান `/api/ai/study-content` পথ ও Key Points ট্যাবের কাঠামোই পুনর্ব্যবহার হবে।

### ৩.৬ আরও যা যোগ করা যায়

- **জায়গায় দাঁড়িয়ে quiz:** পড়া শেষে bubble-এ ৩–৫টি প্রশ্ন; ভয়েসে উত্তর দিলে এজেন্ট সঙ্গে সঙ্গে যাচাই করে স্ক্রিনে ✓/✗ দেখাবে।
- **বুঝতে না পারলে অন্যভাবে:** “বুঝিনি” শুনলে (বা affective tone-এ দ্বিধা বুঝলে) একই কথা উদাহরণ/অ্যানিমেশন দিয়ে আবার বোঝানো — পুনরাবৃত্তি নয়, পদ্ধতি বদল।
- **উচ্চারণ যাচাই:** শিক্ষার্থী পড়ে শোনালে ভুল শব্দ হাইলাইট করে শুদ্ধটা শোনানো।
- **Session recap bubble:** পড়া শেষে “আজ যা পড়লে” — পড়া পৃষ্ঠা, বানানো নোট, quiz-এর ফল — এক bubble-এ সারাংশ।
- **Revision nudge:** নির্ধারিত revision-এর সময় হলে companion হালকা নড়ে মনে করিয়ে দেবে (proactive, কিন্তু বিরক্তিকর নয় — দিনে সীমিত বার)।

---

## ৪ · Function Registry — এজেন্ট যেসব call করতে পারবে

নিয়ম: মডেল শুধু সিদ্ধান্ত নেয়; call execute করে আমাদের অ্যাপ/সার্ভার, ফল ফিরে গেলে মডেল কথা চালিয়ে যায়। বিদ্যমান `go_to_page`-এর প্যাটার্নটাই (server-এ যাচাই → client-এ কাজ → result ফেরত) সবগুলোর ভিত্তি হবে।

| Function | ভয়েস উদাহরণ | কে execute করে | মডেল | Phase |
| --- | --- | --- | --- | --- |
| `go_to_page` *(আছে)* | “১২ নম্বর পৃষ্ঠা খোলো” | Client (Reader) | দুটোই | — |
| `navigate_app` | “আমার Exam History দেখাও” | Client (AppContext route) | Flash Live | 0 |
| `control_reader` | “ফন্ট বড় করো / সেপিয়া থিম দাও” | Client (Reader settings) | Flash Live | 1 |
| `highlight_reading_span` | *(পড়ার সময় স্বয়ংক্রিয়)* | Client (Highlight engine) | Flash Live | 2 |
| `set_reading_position` | “দ্বিতীয় অনুচ্ছেদ থেকে পড়ো” | Client | Flash Live | 2 |
| `show_example_card` | “একটা উদাহরণ দাও” | Client (Show Layer) | Flash Live | 4 |
| `spotlight_element` | “এই টেবিলটা দেখাও” | Client (Show Layer) | Flash Live | 4 |
| `show_concept_animation` | “ধাপে ধাপে বুঝিয়ে দাও” | Client (Show Layer) | Extended Thinking পরিকল্পনা, Flash Live প্রদর্শন | 4 |
| `open_diagram_3d` | “হৃৎপিণ্ডের মডেলটা খোলো” | Client (ThreeDiagramLab) | Flash Live | 4 |
| `draw_whiteboard` | “এঁকে বুঝিয়ে দাও” | Client (SVG overlay) | Extended Thinking | 4 |
| `create_artifact` | “এই পেইজের লেখাটা লিখে দাও” | Server তৈরি → Client bubble | Extended Thinking | 3 |
| `make_structured_notes` | “এই পেইজটা নোট বানিয়ে দাও” | Server তৈরি → Client bubble | Extended Thinking | 3 |
| `start_mini_quiz` | “আমাকে প্রশ্ন করো” | Server (প্রশ্ন) + Client (bubble) | Extended Thinking | 3 |
| `save_to_vault` | “এটা সেভ করে রাখো” | Server (DB) | দুটোই | 3 |
| `schedule_revision` | “কাল এটা আবার পড়িও” | Server (DB) | দুটোই | 3 |
| `get_my_progress` | “আমি কতদূর পড়েছি?” | Server (DB) | দুটোই | 0 |

সব server-side function-এ ব্যবহারকারীর সেশন যাচাই বাধ্যতামূলক; শিক্ষার্থী admin-এর function (যেমন publish) ডাকতে পারবে না।

---

## ৫ · স্থাপত্য — যা যা বদল/যোগ হবে

1. **AssistantSessionProvider (নতুন, root):** Live session, WebSocket, mic ও transcript-এর মালিক হবে `app/page.tsx`-এর root provider — কোনো view/route নয়। `FloatingAiTutor` ও `ReaderLiveControl`-এর session যুক্তি এখানে উঠে আসবে; Reader Live আর Book Manager view-র সঙ্গে বাঁধা থাকবে না। দুটি WebSocket পথ (`/api/live-ws`, `/api/reader-live-ws`) একই session-এর দুটি প্রসঙ্গ (সাধারণ / PDF) হিসেবে থাকবে, অথবা ধাপে ধাপে একীভূত হবে।
2. **Session resilience:** `liveConfig`-এ `sessionResumption` + `contextWindowCompression: { slidingWindow }` যোগ; resumption handle client-এ নিরাপদে রাখা; `goAway`/connection বন্ধ হলে নীরবে reconnect ও resume; `visibilitychange`-এ session **stop নয়, pause** — frame বন্ধ, ফিরে এলে resume; transcript আগের মতোই সার্ভারে সেভ।
3. **Assistant Stage (নতুন overlay layer):** root-এ একটি portal layer — companion, pointer, spotlight, whiteboard ও bubble dock সব এখানে render হবে। নিচের কনটেন্টের ক্লিক যেন বাধা না পায়, তাই `pointer-events` শুধু সক্রিয় উপাদানে।
4. **Action Bus:** server → client typed action message (বিদ্যমান WS বার্তার ধাঁচে: `navigate`-এর মতো `action` বার্তা), client execute করে `result` ফেরত দেয় — `lib/reader-live/socket.ts`-এর বর্তমান `go_to_page` প্রবাহের সাধারণ রূপ।
5. **Highlight Engine (নতুন):** পৃষ্ঠার লেখাকে বাক্যাংশে ভাগ করে id দেওয়া; প্রকাশিত Reader-এ DOM range হাইলাইট; পড়ার transcript-এর সঙ্গে বর্তমান বাক্য মেলানো; scroll-follow ও click-to-seek।
6. **Artifact Store:** client state AppContext-এ + সার্ভার persistence। নতুন Prisma মডেল প্রস্তাব: `AssistantArtifact` (`id, userId, bookId, topicId, page, type, title, contentJson, pinned, createdAt, updatedAt`) ও `/api/ai/artifacts` (তৈরি/তালিকা/মুছে ফেলা) — বিদ্যমান AI history action-এর প্যাটার্নে।
7. **Model routing:** Flash Live = তাৎক্ষণিক UI action ও পড়া; Extended Thinking = নোট, quiz, জটিল artifact — background job আকারে, ফল bubble-এ। কোন কাজে কোন মডেল, তা বিদ্যমান model registry/settings থেকেই নির্ধারিত হবে।
8. **নিরাপত্তা ও খরচ:** প্রতিটি function-এ permission যাচাই; screen frame শুধু session চলাকালে; দীর্ঘ session-এ compression-এর খরচ/ভুলে-যাওয়া ভারসাম্য settings-এ দৃশ্যমান।

---

## ৬ · ধাপে ধাপে বাস্তবায়ন ও গ্রহণযোগ্যতার পরীক্ষা

| ধাপ | কী করতে হবে | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- |
| **০ · Session persistence ঠিক করা** | Session root provider-এ তোলা; `visibilitychange`-এ stop-এর বদলে pause + resumption/compression চালু; `navigate_app` ও `get_my_progress` function যোগ | Live চালিয়ে Dashboard → Reader → Exam ঘুরে এলে কথা চলতে থাকে। ব্রাউজার ট্যাব বদলে ১ মিনিট পর ফিরলে একই আলাপ resume হয়, আগের কথা মনে থাকে। ১০ মিনিটের connection reset পেরিয়েও session ভাঙে না। |
| **১ · Roaming companion** | Stage overlay, draggable/dockable companion, অবস্থা-অ্যানিমেশন, ঐচ্ছিক roam mode, pointer companion-এর ভিত্তি | Companion টেনে যেকোনো জায়গায় রাখা যায়, reload-এ জায়গা মনে থাকে। Roam চালু থাকলে পড়ার লেখা ঢাকে না; কাজ শুরু করলেই থেমে যায়। Reader-এর পূর্ণ-স্ক্রিন view-তেও companion থাকে। |
| **২ · Read-along highlight (প্রকাশিত Reader)** | Highlight engine, বাক্যভিত্তিক হাইলাইট, scroll-follow, click-to-seek, গতি নিয়ন্ত্রণ | এজেন্ট পড়ার সময় সঠিক বাক্য হাইলাইট হয় ও পৃষ্ঠা নিজে scroll হয়। মাঝপথে থামিয়ে আবার চালালে সেখান থেকেই শুরু হয়। যেকোনো বাক্যে ক্লিক করলে সেখান থেকে পড়ে। বাংলা ও ইংরেজি — দুই ভাষাতেই পরীক্ষা। |
| **৩ · Artifact bubbles ও structured notes** | Artifact store + API, bubble dock (collapse/expand/pin/drag), `create_artifact`, `make_structured_notes`, `start_mini_quiz`, `save_to_vault` | “এই পেইজের লেখাটা লিখে দাও” বললে কথা চলার মাঝেই bubble তৈরি হয়; expand করে পুরো লেখা পড়া যায়। নোটের কাঠামো ৩.৫ অনুযায়ী আসে ও উৎস-পৃষ্ঠার লিংক কাজ করে। Bubble সেভ করলে পরের লগইনে ফিরে পাওয়া যায়। |
| **৪ · Show Layer** | Example card, spotlight, callout zoom, concept animation, whiteboard sketch, `open_diagram_3d` | উদাহরণ চাইলে কার্ড স্ক্রিনে আসে ও companion সেদিকে নির্দেশ করে। “এঁকে বুঝিয়ে দাও” বললে ধাপে ধাপে sketch আঁকা হয়। 3D মডেল খুলে সঠিক অংশ highlight হয়। দেখানো শেষ হলে overlay পরিষ্কার হয়ে যায়, মূল কনটেন্টে কোনো দাগ থাকে না। |
| **৫ · PDF highlight ও mobile hardening** | কাঁচা PDF-এ text layer দিয়ে হাইলাইট; Document Picture-in-Picture companion (Chromium); Wake Lock; Android-এ background আচরণের বাস্তব পরীক্ষা ও সীমা নথিভুক্ত করা | Smart Reader-এ কাঁচা PDF পড়ার সময়ও হাইলাইট হয়। অন্য ট্যাবে গেলে PiP companion দেখা যায় (সমর্থিত ব্রাউজারে)। Android-এ অন্য অ্যাপ থেকে ফিরলে session resume হয় ও কী হারিয়েছে তা ব্যবহারকারীকে পরিষ্কার জানানো হয়। |

প্রতিটি ধাপের শেষে ব্যবহৃত মডেল ID, পরীক্ষার ইনপুট, প্রত্যাশিত ও প্রকৃত ফল PROJECT_CONTEXT-এ যোগ করতে হবে।

---

## ৭ · ঝুঁকি ও সীমা — আগেই জানা থাক

- **ব্রাউজারের background সীমা:** ট্যাব hidden থাকলে mic ও frame ব্রাউজারই থামাতে পারে; resume দিয়ে আলাপ বাঁচানো যায়, কিন্তু লুকিয়ে লাইভ শোনা ওয়েবে সম্ভব নয়।
- **Session সীমা:** compression ছাড়া audio-only ১৫ মিনিট, audio+video ২ মিনিট, connection ~১০ মিনিট — তাই resumption + compression Phase 0-তেই বাধ্যতামূলক, পরে নয়।
- **হাইলাইটের নির্ভুলতা:** বাক্যভিত্তিক মিল; স্ক্যান করা/OCR পৃষ্ঠায় লেখা ভুল থাকলে হাইলাইট সরে যেতে পারে — click-to-seek দিয়ে সংশোধনের পথ রাখা আছে।
- **Roam বনাম মনোযোগ:** ঘুরে বেড়ানো যেন পড়ার ক্ষতি না করে — roam default বন্ধ, গতি ধীর, এবং পড়া/পরীক্ষার সময় সম্পূর্ণ নিষ্ক্রিয়।
- **খরচ:** দীর্ঘ লাইভ session ও প্রতিটি artifact তৈরিতে API খরচ আছে; Extended Thinking শুধু জটিল কাজে, Flash Live দৈনন্দিন কাজে — এই routing-ই খরচ নিয়ন্ত্রণে রাখবে।
- **গোপনীয়তা:** screen frame শুধু session চলাকালে ও শুধু পড়ার অংশের; ব্যক্তিগত PDF-এর কনটেন্ট global search index-এ যাবে না (বর্তমান নিয়মই বহাল)।

## ৮ · সিদ্ধান্ত বাকি (ব্যবহারকারীর)

1. Companion-এর default জায়গা: ডান-নিচে (বর্তমান) নাকি ডান-মাঝে?
2. Roam mode কি প্রথম সংস্করণেই থাকবে, নাকি Phase 1-এর শেষে ঐচ্ছিক সংযোজন?
3. নোটের ভাষা: পড়ার ভাষা অনুযায়ী স্বয়ংক্রিয়, নাকি সবসময় বাংলা?
4. Bubble dock-এর জায়গা: বাম পাশে সারি, নাকি নিচে chip বার?

এই সিদ্ধান্তগুলো ছাড়াই Phase 0 শুরু করা যায়; Phase 1–3-এর আগে উত্তর পেলেই যথেষ্ট।

---

## ৯ · পরিপূরক (২৪ নভেম্বর) — কাস্টম বইয়ের ডাটার উপর এজেন্ট

ব্যবহারকারীর নতুন দিকনির্দেশনা: হাতে ডাটা ইনপুট দিয়ে কাস্টম বই বানানো হবে — Add New Book, Add Chapter, Topic, Subtopic, Point, যত ইচ্ছা। এর পুরো পরিকল্পনা আলাদা ফাইলে: [Custom Book Builder Plan](Custom_Book_Builder_Plan.md)।

সেই বইগুলো structured ডাটা হওয়ায় এজেন্টের জন্য নতুন ক্ষমতা খুলে যায় — এগুলো মডেলের স্মৃতি/অনুমান নয়, **সরাসরি ডাটাবেস query-র নির্ভুল উত্তর**, প্রতিটির সঙ্গে breadcrumb (বই > অধ্যায় > টপিক) উল্লেখসহ:

| বললেই | Function | ফল |
| --- | --- | --- |
| “এই লেখকের বইগুলো দেখাও” | `find_books_by_author` | ওই লেখকের সব কাস্টম বইয়ের তালিকা |
| “অমুক বইটার সূচি জানাও” | `get_book_toc` | পুরো গাছ সূচিপত্র আকারে স্ক্রিনে; চাইলে পড়ে শোনাবে |
| “অমুক টপিকটা বের করো” | `find_node` → `open_node` | সব বই খুঁজে ঠিক সেই Topic/Subtopic/Point Reader-এ খুলে দেবে; একই নাম একাধিক বইয়ে থাকলে বেছে নিতে বলবে |
| “ওই পয়েন্টটা বুঝিয়ে দাও” | `get_node_content` | আসল লেখা পড়া + ব্যাখ্যা — মূল লেখা ও ব্যাখ্যা আলাদা চিহ্নিত |
| “কোন বইয়ে এই বিষয়টা আছে?” | `search_nodes` | সব কাস্টম বই জুড়ে খুঁজে breadcrumb-সহ তালিকা |
| “এই বইয়ে কটা অধ্যায় আছে?” | `get_book_stats` | গাছ গুনে সঠিক সংখ্যা |

নিয়ম: বইয়ে যা নেই, এজেন্ট স্পষ্ট বলবে “এই বইয়ে নেই”; বাইরের জ্ঞান যোগ করলে তা আলাদা করে চিহ্নিত থাকবে। এই function গুলো §৪-এর registry-র সম্প্রসারণ হিসেবে Phase 3-এর সঙ্গে বা Book Builder-এর ধাপ B4-এ চালু হবে।

---

## ১০ · পরিপূরক (২৪ নভেম্বর) — Three.js “Compiler” দিয়ে কমান্ডে কাস্টম চিত্র, আর নেট থেকে চিত্র খুঁজে দেখানো

### ১০.১ বর্তমান অবস্থা

- `lib/three-models.ts`-এ **মাত্র ৪টি** মডেল হাতে-কোড করা procedural builder দিয়ে বানানো: Human Heart, Eukaryotic Cell, Atomic Structure, Molecular Geometry। প্রতিটির parts-এ দ্বিভাষিক label আছে, আর Topic-এর `model3dKey` দিয়ে চিত্র যুক্ত হয়।
- ফলে নতুন চিত্র মানেই নতুন করে কোড লেখা — কমান্ড দিয়ে চিত্র বানানোর কোনো পথ এখন নেই।
- Chat-এ Google Search grounding আছে (টেক্সট + citation), কিন্তু **ছবি খুঁজে এনে দেখানোর** কোনো পাইপলাইন নেই।

### ১০.২ মূল ধারণা — Diagram Spec Compiler

এজেন্ট সরাসরি Three.js কোড চালাবে না; চালাবে একটি **ঘোষণামূলক Diagram Spec (JSON)** — আর আমাদের compiler সেই spec থেকে দৃশ্য বানাবে:

```
ভয়েস কমান্ড → এজেন্ট Spec তৈরি/বদল করে (function call)
            → Spec যাচাই (zod schema) — ভুল হলে compiler-এর error ফিরে যায়, এজেন্ট নিজে ঠিক করে (সর্বোচ্চ ৩ বার)
            → Generic Builder: spec → THREE scene (live preview)
            → ব্যবহারকারী দেখে আবার কমান্ড দিলে spec-এ ছোট বদল (diff) → পুনরায় compile
```

Spec-এ যা যা থাকতে পারবে:

| উপাদান | উদাহরণ |
| --- | --- |
| Primitive আকৃতি | sphere, box, cylinder, cone, torus, tube (বক্রপথ ধরে), lathe, plane, double helix-এর মতো যৌগিক helper |
| Part | নাম (বাংলা + English label), আকৃতি, অবস্থান/ঘূর্ণন/আকার, রং ও material |
| সংযোগ ও প্রবাহ | দুই part-এর মধ্যে তীর/নল; flow animation — কণা পথ ধরে চলা (যেমন রক্তপ্রবাহ) |
| Exploded view | প্রতিটি part-এর বিস্ফোরণ-দূরত্ব — বিদ্যমান Lab-এর মতোই |
| Animation | rotate, pulse (হৃৎস্পন্দন), ধাপে ধাপে জ্বলে ওঠা, ক্যামেরা ভ্রমণ |
| Label | 3D-তে ভাসমান দ্বিভাষিক label, part-এ ক্লিক/নাম বললে highlight |

**কেন spec, সরাসরি কোড নয়:** spec হলো শুধু ডাটা — যাচাই করা যায়, সেভ করা যায়, version রাখা যায়, আর মডেল ভুল করলেও অ্যাপ ভাঙে না। এটাই নিরাপদ ও নির্ভরযোগ্য “compiler” পথ।

### ১০.৩ কমান্ডে যা যা করা যাবে

| বললেই | Function | যা ঘটবে |
| --- | --- | --- |
| “একটা DNA double helix বানাও — দুই strand নীল আর লাল, ধাপগুলোতে label দাও” | `build_custom_diagram(spec)` | নতুন কাস্টম 3D চিত্র live তৈরি হয়ে Lab-এ/পাশের প্যানেলে দেখা যাবে |
| “Mitochondria-টা বড় করো, রং কমলা দাও” | `edit_custom_diagram(diff)` | পুরো নতুন নয় — spec বদলে শুধু ওই অংশ বদলাবে |
| “Valve গুলো আলাদা করে দেখাও” | `animate_diagram(explode)` | Exploded view অ্যানিমেশন |
| “রক্ত কোন পথে যায়, দেখাও” | `animate_diagram(flow)` | পথ ধরে flow animation চলবে, এজেন্ট সঙ্গে বর্ণনা দেবে |
| “এই চিত্রটা এই টপিকের সঙ্গে রেখে দাও” | `save_diagram_to_topic` | `CustomDiagram` রেকর্ড সেভ; Topic/Point খুললেই চিত্র পাশে আসবে |
| “আগের রূপটা দেখাও” | version history | প্রতিটি সম্পাদনার version থাকবে, ফিরে যাওয়া যাবে |

নতুন ডাটা মডেল (প্রস্তাব): `CustomDiagram` (`id, title, specJson, version, createdBy, linkedNodeId/topicId, createdAt, updatedAt`)। বিদ্যমান ৪টি মডেলকেও spec আকারে প্রকাশ করা হবে — তাতে প্রমাণ হবে compiler পুরনো সবকিছুই বানাতে পারে, আর সেগুলোও তখন কমান্ডে বদলানো যাবে।

### ১০.৪ নেট থেকে চিত্র খুঁজে এনে দেখানো

হ্যাঁ, করা যাবে — তবে কাজটা করবে আমাদের **সার্ভারের tool**, লাইভ মডেল নিজে নেট ঘাঁটে না:

```
“মানব হৃৎপিণ্ডের একটা ভালো চিত্র খুঁজে দাও”
   → find_reference_image(query)  — সার্ভার ছবি খোঁজে
   → প্রার্থী ছবিগুলো Show Layer-এ কার্ড আকারে: ছবি + উৎসের নাম + লিংক + লাইসেন্স তথ্য
   → ব্যবহারকারী বেছে নিলে: বড় করে দেখা / টপিকে pin করা / reference হিসেবে সেভ
   → চাইলে: “এটার মতো একটা 3D বানাও” — এজেন্ট ছবিটা দেখে (multimodal) spec-এর খসড়া বানিয়ে দেবে
```

- **উৎসের অগ্রাধিকার:** প্রথমে Wikimedia Commons ও উন্মুক্ত-লাইসেন্সের শিক্ষামূলক ছবি (স্বাধীনভাবে ব্যবহারযোগ্য), তারপর সাধারণ web image search (Google Programmable Search-এর image সুবিধা বা Bing — settings-এ API key লাগবে)।
- **কপিরাইটের নিয়ম:** প্রতিটি ছবির সঙ্গে উৎস ও লাইসেন্স দেখানো বাধ্যতামূলক। লাইসেন্স অনুমতি দিলে তবেই সেভ; নইলে শুধু লিংক/thumbnail reference হিসেবে থাকবে, টপিকে “সূত্র: …” উল্লেখসহ।
- **2D বিকল্প:** সব চিত্র 3D নয় — প্রয়োজনে একই কমান্ডে 2D SVG diagram (whiteboard layer-এ) বানানো/দেখানো যাবে; কোনটা উপযুক্ত, এজেন্ট প্রস্তাব দেবে, সিদ্ধান্ত ব্যবহারকারীর।

### ১০.৫ ধাপ ও পরীক্ষা

| ধাপ | কী | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- |
| **D1 · Spec + Compiler** | Spec schema, generic builder, বিদ্যমান ৪ মডেল spec-এ রূপান্তর | ৪টি পুরনো মডেল spec থেকে হুবহু তৈরি হয়; ভুল spec দিলে compiler পরিষ্কার error দেয়, অ্যাপ ভাঙে না |
| **D2 · কমান্ডে তৈরি ও সম্পাদনা** | `build_custom_diagram`, `edit_custom_diagram`, সেভ ও Topic-এ সংযোগ, version | ভয়েসে নতুন চিত্র তৈরি, অংশ বদল, সেভ — পুনরায় লগইনে চিত্র টপিকের পাশে ফিরে আসে |
| **D3 · ছবি খোঁজা** | `find_reference_image`, reference প্যানেল, ছবি থেকে spec খসড়া | ছবি চাইলে উৎস/লাইসেন্সসহ অন্তত ৩টি প্রার্থী আসে; বেছে নেওয়া ছবি টপিকে pin থাকে; “এটার মতো 3D বানাও” দিলে সম্পাদনযোগ্য খসড়া চিত্র তৈরি হয় |

### ১০.৬ সৎ সীমা

- AI-বানানো চিত্র **শিক্ষামূলক রূপ** — বৈজ্ঞানিক নির্ভুলতা প্রতিটি part-এর label ও গঠনে যাচাইয়ের দায়িত্ব সম্পাদকের; সেভের আগে preview দেখে অনুমোদন দেওয়ার ধাপ থাকবে।
- জটিল জৈবিক গঠন (যেমন পুরো মস্তিষ্ক) এক কমান্ডে নিখুঁত হবে না — ধাপে ধাপে অংশ যোগ করে বানানোই বাস্তব পথ, spec সেই সুবিধাই দেয়।
- ছবি খোঁজার মান নির্ভর করবে উৎসের উপর; লাইসেন্স-মুক্ত ভালো ছবি না পেলে এজেন্ট তা জানিয়ে 3D/SVG বিকল্প প্রস্তাব দেবে।
