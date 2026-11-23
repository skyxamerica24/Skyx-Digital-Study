# Skyx Digital Study — Custom Book Builder Plan (ম্যানুয়াল বই তৈরির সিস্টেম)

২৪ নভেম্বর ২০২৬ · [প্রজেক্ট কনটেক্সট](PROJECT_CONTEXT.md) · [মূল উন্নয়ন পরিকল্পনা](PLAN.md) · [Advance Assistant Plan](Advance_assistant_feature.md)

## লক্ষ্য — ব্যবহারকারীর ভাষায়

কোনো PDF বা AI-এর উপর নির্ভর না করে, নিজে হাতে ডাটা ইনপুট দিয়ে বই বানানো যাবে:

- **Add New Book** — বইয়ের নাম, লেখকসহ পুরো তথ্য দিয়ে নতুন বই শুরু।
- **Add Chapter** — অধ্যায়ের নাম; তার ভেতরে **Topic**, তার ভেতরে **Subtopic**, তার ভেতরে **Point** — একদম কাস্টম মেনুর মতো, যেখানে যত ইচ্ছা, যত গভীরে ইচ্ছা যোগ করা যাবে।
- গঠন (structure) তৈরি হয়ে গেলে প্রতিটি অংশে **টেক্সট যোগ** করা যাবে।
- এভাবে **অনেকগুলো বই** তৈরি হবে — পুরোপুরি ডাটাভিত্তিক নিজের কাস্টম বইয়ের লাইব্রেরি।
- এরপর এজেন্টকে বললেই সে ডাটা থেকে উত্তর দেবে: “এই লেখকের বইটার সূচি জানাও”, “অমুক টপিকটা বের করো” — এগুলো সে পারবে (বিস্তারিত §৫ ও Advance Assistant প্ল্যানের §৯-এ)।

---

## ১ · বর্তমান অবস্থা — কোডে যা আছে, যা নেই

| বিষয় | অবস্থা |
| --- | --- |
| বইয়ের রেকর্ড | আছে। `Book` মডেলে title, subtitle, author, subject, language, accessTier, description, isPublished — Add New Book ফর্মও Admin-এ আছে (`components/admin/AdminWorkspace.tsx`) |
| অধ্যায়/টপিকের গঠন | **সমতল (flat)।** `BookTopic`-এর গায়েই `chapterNumber`, `chapterTitle`, `sectionTitle`, `topicTitle` ও `contentMarkdown` — Chapter আলাদা সত্তা নয় |
| Subtopic / Point | **নেই।** Topic-এর নিচে আর কোনো স্তর নেই; গভীরতা বাড়ানোর উপায় নেই |
| Tree আকারে সাজানো | ক্যাটালগ বইয়ের জন্য নেই। Extract Studio-র প্রজেক্টে `TocOrganizerPanel` আছে — তার ধাঁচ পুনর্ব্যবহারযোগ্য |
| Drag-and-drop | `@dnd-kit` আগে থেকেই dependencies-তে আছে |
| টেক্সট এডিটর | Markdown কনটেন্ট ও Tiptap dependencies আছে; AI Book Auto-Splitter দিয়ে লেখা থেকে Chapter → Section → Topic বানানো যায়, কিন্তু হাতে গাছ সাজানোর builder নেই |
| লেখক দিয়ে খোঁজা | `Book.author` আছে, কিন্তু লেখক/বিষয় দিয়ে catalog filter ও এজেন্টের জন্য নির্দিষ্ট query function নেই |

**সিদ্ধান্ত:** সমতল `BookTopic` দিয়ে এই চাওয়া পূরণ হবে না। দরকার আসল **tree (গাছ) কাঠামো** — নিচে তার নকশা।

---

## ২ · ডাটা মডেল — একটাই গাছ, অসীম গভীরতা

নতুন Prisma মডেল `BookNode` (প্রস্তাবিত):

| ফিল্ড | কাজ |
| --- | --- |
| `id` | UUID |
| `bookId` | কোন বইয়ের অংশ |
| `parentId` | উপরের node-এর id; বইয়ের সরাসরি সন্তান (Chapter) হলে `null` — **self-relation**-এই পুরো গাছ |
| `kind` | `chapter` \| `topic` \| `subtopic` \| `point` — তবে এটি শুধু নামের ট্যাগ; যেকোনো node-এর নিচে আরও node যোগ করা যাবে, তাই গভীরতা কার্যত **সীমাহীন** |
| `title` | অংশের নাম (বাংলা/ইংরেজি যেকোনো) |
| `orderIndex` | একই parent-এর নিচে ক্রম |
| `contentMarkdown` | ওই অংশের লেখা। যেকোনো node-এ লেখা থাকতে পারে — যেমন Topic-এর ভূমিকা + তার নিচে Subtopic-গুলো |
| `contentBlocks` (ঐচ্ছিক, পরে) | লেখার ভেতরে ছবি/টেবিল/চিত্রের block — প্রথম সংস্করণে Markdown-ই যথেষ্ট |
| `diagramId` / `model3dKey` | ওই node-এর সঙ্গে যুক্ত 3D চিত্র (বিদ্যমান `model3dKey` ধাঁচে) |
| `isPublished` | node-ভিত্তিক প্রকাশ নিয়ন্ত্রণ — অর্ধেক লেখা অধ্যায় লুকিয়ে রাখা যাবে |
| `searchTokens` | শিরোনাম + পুরো breadcrumb পথ (যেমন “জীববিজ্ঞান > কোষ > কোষ বিভাজন > মাইটোসিস”) — সার্চে সঠিক জায়গা খুঁজে পেতে |
| `createdAt` / `updatedAt` | অডিট ও “শেষ বদল” দেখাতে |

বইয়ের অতিরিক্ত তথ্য (ঐচ্ছিক সংযোজন): `publisher`, `edition`, `publishYear`, `isbn` — একই নামের/লেখকের একাধিক বই আলাদা করতে কাজে লাগবে।

### পুরনো ডাটার migration

- বিদ্যমান প্রতিটি `BookTopic` থেকে: `chapterTitle` → একটি Chapter node, `sectionTitle` → Topic node, `topicTitle` → Subtopic node, তার `contentMarkdown` ওই node-এই থাকবে। Point পরে হাতে যোগ করা যাবে।
- Migration একবারই চলবে, আগে ডাটাবেস backup; পুরনো `BookTopic` টেবিল transition সময়ে read-only রেখে Reader যাচাইয়ের পর সরানো হবে।
- Study Tab, Question, Flashcard যেগুলো `topicId` ধরে আছে, সেগুলোর জন্য migration-এ পুরনো topic id → নতুন node id mapping সংরক্ষণ থাকবে।

---

## ৩ · Builder UI — কাস্টম মেনুর মতো গাছ সাজানো

Admin-এ নতুন পৃষ্ঠা/বিভাগ: **Book Builder** (Books বিভাগের ভেতরে “Build Manually” ট্যাব)।

### বাম প্যানেল — Structure Tree

- বই বেছে নেওয়ার পর পুরো গাছ: `▸ Chapter 1: কোষ ও এর গঠন` → ভেতরে Topic → Subtopic → Point।
- প্রতিটি node-এর পাশে/hover-এ **`+` বোতাম**: Add Chapter (বইয়ের স্তরে), Add Topic, Add Subtopic, Add Point — এবং “Add inside” দিয়ে যেকোনো node-এর ভেতরে নতুন node।
- **Inline rename:** নামে ডাবল-ক্লিক করে সেখানেই বদলানো।
- **Drag-and-drop:** টেনে ক্রম বদলানো এবং এক parent থেকে আরেক parent-এর ভেতরে নেওয়া (reparent)। নিজের সন্তানের ভেতরে ফেলা সিস্টেম আটকাবে (cycle protection)।
- **ডান-ক্লিক/মেনু:** Duplicate (পুরো subtree সহ), Delete (সন্তান থাকলে সতর্কবার্তা সহ), Publish/Unpublish, “Open in Reader”।
- Collapse/expand সব, গাছের ভেতরে শিরোনাম দিয়ে খোঁজা (filter), node সংখ্যার হিসাব (মোট Chapter/Topic/Point)।
- **কীবোর্ড:** Enter = নতুন sibling, Tab = ভেতরে ঢোকানো (indent), Shift+Tab = বাইরে আনা — outline লেখার মতো দ্রুত গঠন বানানো যাবে।

### ডান প্যানেল — Content Editor

- নির্বাচিত node-এর শিরোনাম, ধরন (kind), প্রকাশ অবস্থা।
- **টেক্সট এডিটর:** Markdown + live preview (বিদ্যমান Reader-এর rendering-ই), ছবি যোগ, টেবিল, 3D চিত্র সংযুক্ত করা।
- **Autosave:** লেখা থামলেই draft সেভ; সার্ভার নিশ্চিত করলে তবেই “Saved” দেখাবে (PLAN.md ধাপ ২-এর শিক্ষা — ব্যর্থ হলে draft হারাবে না, পুনরায় চেষ্টা থাকবে)।
- শব্দসংখ্যা ও আনুমানিক পড়ার সময় নিজে থেকে হিসাব।
- Node-এর breadcrumb ও “Reader-এ যেমন দেখাবে” preview।

### দ্রুত গঠন বানানোর সাহায্য

- **Outline paste:** ইন্ডেন্ট দেওয়া লেখা paste করলেই গাছ হয়ে যাবে —
  ```
  অধ্যায় ১: কোষ
      কোষের গঠন
          কোষ ঝিল্লি
              গঠন
              কাজ
  ```
- **AI Splitter-এর ফল** এখন থেকে এই tree-তেই বসবে (আলাদা flat তালিকায় নয়)।
- **Extract Studio-র প্রজেক্ট** থেকে import করলে তার TOC এই tree হয়ে যাবে।
- **Duplicate Book / Template:** একটা বইয়ের গঠন কপি করে নতুন বই শুরু।
- **Export/Import:** পুরো বই JSON (`.skyxbook`) ও Markdown আকারে — backup ও অন্য ইনস্ট্যান্সে নেওয়ার জন্য।

---

## ৪ · পড়ার দিকে (Learner Reader)

- Reader-এর বাম গাছ এই node tree-ই দেখাবে — যত গভীর, তত গভীর পর্যন্ত collapse/expand।
- প্রতিটি node নিজে একটি পড়ার পৃষ্ঠা: তার নিজের লেখা + নিচে সন্তানদের তালিকা (“এই অধ্যায়ে যা আছে”)।
- Reading progress node ধরে: Point পড়া শেষ = tick; অধ্যায়ের অগ্রগতি শতাংশ নিজে থেকে হিসাব।
- Global Search প্রতিটি node-কে breadcrumb-সহ ফল দেবে; ফলে ক্লিক করলে ঠিক সেই Subtopic/Point খুলবে।
- Study Tab (Summary, Key Points, Quiz ইত্যাদি) যেকোনো node-এর জন্য তৈরি করা যাবে — শুধু পুরো বইয়ের জন্য নয়।

---

## ৫ · এজেন্ট যা যা করতে পারবে এই ডাটা দিয়ে

কারণ বইগুলো এখন খাঁটি structured ডাটা, এজেন্টের উত্তর হবে **ডাটাবেস থেকে নির্ভুল** — মডেলের অনুমান নয়। প্রতিটি উত্তরে কোন বই/অধ্যায়/টপিক থেকে বলা হলো, সেই breadcrumb থাকবে।

| বললেই | Function | ফল |
| --- | --- | --- |
| “এই লেখকের বইগুলো দেখাও” | `find_books_by_author(author)` | ওই লেখকের সব বইয়ের তালিকা |
| “অমুক বইটার সূচি জানাও” | `get_book_toc(bookId)` | পুরো গাছ আকারে সূচিপত্র — স্ক্রিনে tree, চাইলে পড়েও শোনাবে |
| “অমুক টপিকটা বের করো” | `find_node(query)` → `open_node(nodeId)` | সব বই খুঁজে সঠিক টপিক Reader-এ খুলে দেবে; একই নামের টপিক একাধিক বইয়ে থাকলে বেছে নিতে বলবে |
| “ওই পয়েন্টটা পড়ে শোনাও / বুঝিয়ে দাও” | `get_node_content(nodeId)` | ওই Point-এর আসল লেখা পড়া + ব্যাখ্যা (মূল লেখা আর ব্যাখ্যা আলাদা করে) |
| “এই বইয়ে মোট কটা অধ্যায়/টপিক আছে?” | `get_book_stats(bookId)` | গাছ গুনে সঠিক সংখ্যা |
| “কোন বইয়ে ‘আলোকসংশ্লেষণ’ আছে?” | `search_nodes(query)` | সব কাস্টম বই জুড়ে খুঁজে breadcrumb-সহ তালিকা |
| “দুই বইয়ের এই টপিক দুটো তুলনা করো” | `get_node_content` × ২ → তুলনা | পাশাপাশি মিল/পার্থক্য (Advance প্ল্যানের compare view) |
| “এই অধ্যায় থেকে নোট/quiz বানাও” | Advance প্ল্যানের `make_structured_notes` / `start_mini_quiz` (nodeId দিয়ে) | ঠিক ওই অধ্যায়ের ডাটা থেকেই তৈরি |
| *(Admin)* “নতুন অধ্যায় যোগ করো: …” | `create_node(...)` — শুধু admin/editor-এর জন্য, নিশ্চিতকরণ সহ | ভয়েস দিয়েই গঠনে node যোগ; সাজানো/লেখা পরে Builder-এ |

সৎ সীমা: এজেন্ট শুধু **যে ডাটা আছে** তাই বলতে পারবে। বইয়ে যে টপিক নেই, তা সে “এই বইয়ে নেই” বলবে — বাইরের জ্ঞান মেশালে সেটা আলাদাভাবে চিহ্নিত থাকবে (grounding উত্তরের মতো)।

---

## ৬ · ধাপে ধাপে বাস্তবায়ন ও গ্রহণযোগ্যতার পরীক্ষা

| ধাপ | কী করতে হবে | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- |
| **B0 · ডাটা মডেল** | `BookNode` মডেল + server actions (`lib/actions/book-node-actions.ts`: create/update/move/delete/reorder) + পুরনো `BookTopic` থেকে migration | Test বইয়ে API দিয়ে ৪ স্তরের গাছ বানানো যায়; cycle-ওয়ালা move আটকায়; migration-এর পর পুরনো বইয়ের সব লেখা নতুন গাছে মিলে যায় |
| **B1 · Builder UI** | Tree প্যানেল (+ যোগ, rename, drag-and-drop, duplicate, delete), editor প্যানেল, autosave | হাতে একটি বই বানিয়ে: ৩ Chapter, প্রতিটিতে Topic → Subtopic → Point, যত ইচ্ছা যোগ হয়; drag করে ক্রম বদলালে সেভ থাকে; reload-এ গাছ হুবহু ফিরে আসে |
| **B2 · Reader সংযোগ** | Reader tree ও progress node-ভিত্তিক; search breadcrumb | Builder-এ বানানো বই publish করলে শিক্ষার্থী ঠিক সেই গাছ দেখে পড়তে পারে; Point-এ ক্লিক করলে তার লেখাই আসে |
| **B3 · দ্রুত গঠন** | Outline paste, AI Splitter → tree, Extract Studio import, export/import | ইন্ডেন্ট-দেওয়া outline paste করলে সঠিক গাছ হয়; export করা বই import করলে হুবহু ফিরে আসে |
| **B4 · এজেন্ট সংযোগ** | §৫-এর function গুলো Advance Assistant-এর registry-তে চালু | “এই লেখকের বইটার সূচি জানাও” বললে সঠিক বইয়ের পুরো সূচি আসে; “অমুক টপিক বের করো” বললে Reader-এ ঠিক সেই node খোলে; বইয়ে না থাকা টপিক চাইলে স্পষ্ট “নেই” উত্তর আসে |

## ৭ · ঝুঁকি ও নোট

- **বড় গাছের গতি:** হাজার node-এর বইয়ে গাছ একবারে না এনে স্তর ধরে lazy-load; Reader-এ virtual list প্রয়োজনে।
- **মুছে ফেলার সুরক্ষা:** সন্তানসহ node delete-এ সতর্কবার্তা ও soft-delete (কিছুদিন পুনরুদ্ধারযোগ্য)।
- **একসঙ্গে সম্পাদনা:** একই বই দুজন admin খুললে শেষ সেভ জিতবে — প্রথম সংস্করণে এই নিয়মই নথিভুক্ত থাকবে; পরে lock/সতর্কবার্তা।
- **Publish নিয়ম:** অপ্রকাশিত node শিক্ষার্থীর কাছে থাকবেই না — সার্চ, এজেন্ট, Reader কোথাও নয়।

---

## বাস্তবায়ন অবস্থা · ২৪ নভেম্বর ২০২৬

- **B0 সম্পন্ন** — `BookNode` মডেল, `lib/actions/book-node-actions.ts`, `lib/book-builder/tree.ts`; পুরনো `BookTopic` থেকে migration action সহ।
- **B1 সম্পন্ন** — Admin-এ Book Builder UI (tree + editor + autosave + outline paste + drag-reparent)।
- **B2 সম্পন্ন (bridge পথে)** — Reader অপরিবর্তিত; Sync & Publish গাছকে `BookTopic` সারিতে রূপান্তর করে, তাই শিক্ষার্থী একই Reader-এই বই পড়ে।
- **B3 আংশিক** — Outline paste ও export-এর মধ্যে outline import হয়েছে; AI Splitter → tree ও Extract Studio import, `.skyxbook` export/import বাকি।
- **B4 আংশিক** — ডাটা ফাংশন (`getBookToc`, `findBooksByAuthor`, `searchBookNodes`, `getBookNodeStats`) তৈরি ও পরীক্ষিত; লাইভ এজেন্টের function registry-তে যুক্ত করা Advance Assistant-এর Phase অনুযায়ী হবে।
- যাচাই: অস্থায়ী PostgreSQL-এ ১৯টি end-to-end assertion পাস, TypeScript পাস, production build পাস, সার্ভার চালিয়ে homepage 200 ও health ok।
