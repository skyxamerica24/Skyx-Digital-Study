# Skyx Digital Study — উন্নয়ন পরিকল্পনা

২৪ নভেম্বর ২০২৬ · [প্রজেক্ট কনটেক্সট](PROJECT_CONTEXT.md)

লক্ষ্য হলো একজন শিক্ষার্থী যেন একটি প্রকাশিত বই পড়তে, নিজের কাজ সংরক্ষণ করতে এবং একই বই নিয়ে বাংলা ভাষায় AI-এর সহায়তা নিতে পারেন। নিচের ধাপগুলো পরিকল্পিত কাজ।

## ডেভেলপমেন্ট অগ্রগতি

Extract Studio-র PDF ইমপোর্টে মূল ফাইল ডিস্কে ও পৃষ্ঠাভিত্তিক টেক্সট PostgreSQL-এ সংরক্ষণ বাস্তবায়িত। ব্যবহারকারী নিজের আগের ইমপোর্ট আবার খুলতে পারেন। Extract Studio-তে বাংলা ও ইংরেজি OCR, সারি-কলাম শনাক্তকরণ এবং স্থানীয় বাংলা ফন্ট যুক্ত হয়েছে। বই সম্পাদনার পর পরিবর্তন সেভ ও শিক্ষার্থীর ক্যাটালগে প্রকাশ আলাদা কাজ। ডেপ্লয় পরবর্তী পর্যায়ে।

## প্রথম ব্যবহারযোগ্য সংস্করণ

প্রথম লক্ষ্য: ফোন থেকে একটি স্থায়ী প্রাইভেট লিংকে ঢুকে একজন শিক্ষার্থী বই পড়বেন, নোট রাখবেন, পরীক্ষা দেবেন এবং পরের দিন নিজের অ্যাকাউন্টে ফল ফিরে পাবেন। এর জন্য প্রথম চারটি ধাপ সম্পন্ন করতে হবে। হোস্টিংয়ের প্রস্তুতি ও ডেটা সেভের সংশোধন পাশাপাশি শুরু করা যায়।

| ধাপ | কী করতে হবে | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- |
| ১ · স্থায়ী ক্লাউড | বিদ্যমান server.ts চালাতে পারে এমন Node.js হোস্ট, স্থায়ী PostgreSQL ও বইয়ের ফাইল সংরক্ষণের জায়গা নির্ধারণ। HTTPS ও WebSocket চালু করা। Prisma Client জেনারেশন, schema migration, প্রথম অ্যাডমিন তৈরি ও রোলব্যাকের নির্দেশনা রাখা। | ফোনে প্রাইভেট URL খুলে সাইন ইন হয়। সার্ভার রিস্টার্ট ও নতুন সংস্করণ ডেপ্লয়ের পরেও অ্যাকাউন্ট, আপলোড করা বই ও নোট ফিরে আসে। ডেটাবেস অপ্রাপ্য হলে readiness পরীক্ষায় কারণ দেখা যায়। |
| ২ · সেভ ও প্রকাশ | AppContext-এর বই, টপিক ও প্রশ্ন সেভের পথে সার্ভারের ফল অনুযায়ী UI আপডেট। ব্যর্থ হলে সম্পাদিত খসড়া ও পুনরায় চেষ্টার সুযোগ রাখা। স্টাডি ট্যাবের সংজ্ঞা ও কনটেন্ট PostgreSQL-এ লিখে সেখান থেকে পড়া। | টেস্ট ডেটাবেস সাময়িক বন্ধ থাকলে সাফল্য দেখাবে না। পুনরায় চালু করে একই খসড়া সেভ করলে একটি রেকর্ড হবে। প্রকাশিত ট্যাব আলাদা ব্রাউজারে শিক্ষার্থী দেখতে পাবেন। |
| ৩ · অ্যাকাউন্ট | লগইন, চ্যাট হিস্ট্রি, অ্যাডমিন অ্যাকশন ও ভয়েস সংযোগে একই ব্যবহারকারীর সেশন যাচাই। লগআউট ও মেয়াদ শেষের আচরণ ঠিক করা। পাসওয়ার্ড ফেরাতে ইমেইলে একবার ব্যবহারযোগ্য মেয়াদযুক্ত লিংক পাঠানো। | দুই শিক্ষার্থীর আলাপ ও নোট আলাদা থাকে। পুনরায় লগইনে নিজের ইতিহাস ফেরে। শিক্ষার্থীর অ্যাকাউন্টে প্রকাশের অনুমতি থাকে না। রিসেটের পর নতুন পাসওয়ার্ড কাজ করে এবং ব্যবহৃত লিংক আর চলে না। |
| ৪ · প্রকাশ থেকে পরীক্ষার ফল | Book Manager থেকে বাংলা বই ইমপোর্ট, অধ্যায় সম্পাদনা, ড্রাফট ও প্রকাশ পরীক্ষা। রিডার, সার্চ, বুকমার্ক, নোট, ফ্ল্যাশকার্ড ও Exam Center-এ একই বইয়ের তথ্য মিলিয়ে দেখা। পৃষ্ঠাসীমা যাচাই করা। | এক অ্যাডমিন ও দুই শিক্ষার্থী দিয়ে পূর্ণ ব্রাউজার পরীক্ষা। ৪০ পৃষ্ঠার বইয়ে ‘১২–১৫’ কাজ করবে, ‘৯৯৯’ দিলে বৈধ সীমা দেখা যাবে। পরীক্ষা একবার জমা দিলে একটিই ফল থাকবে। পুনরায় লগইনে নোট ও ফল ফিরে আসবে। |

## AI সহকারী ও মোবাইল

| ধাপ | কী করতে হবে | গ্রহণযোগ্যতার পরীক্ষা |
| --- | --- | --- |
| ৫ · নিজস্ব মডেল | General Tools-এ অ্যাডমিনের দেওয়া model ID সংরক্ষণ করে সংশ্লিষ্ট টুলে প্রয়োগ। ব্যবহারকারীর Google AI Studio অ্যাকাউন্টে উপলভ্য ফ্রি মডেল দিয়ে শুরু। টেক্সট, লাইভ অডিও ও ফাংশন কল আলাদা করে পরীক্ষা। | একটি মডেল বদলে পরের অনুরোধে সেই ID ব্যবহারের প্রমাণ পাওয়া যায়। ভুল ID, অসমর্থিত ভয়েস ও কোটা শেষ হলে আলাদা বার্তা আসে। AI অপ্রাপ্য থাকলেও বই ও পরীক্ষা চলে। |
| ৬ · ফ্লোটিং সহকারী | বিদ্যমান go_to_page পুনর্ব্যবহার করে ড্যাশবোর্ড, রিডার ও চিত্রের স্ক্রিনে একই ফ্লোটিং বাটন দেওয়া। অনুমোদিত কাজগুলো টেক্সট ও বাংলা ভয়েস থেকে ডাকা। | ‘আমার ড্যাশবোর্ড দেখাও’, ‘১২ নম্বর পৃষ্ঠা খোলো’ ও ‘আমার সংরক্ষিত চিত্র দেখাও’ সঠিক দৃশ্য খোলে। একাধিক চিত্র মিললে পছন্দ জানতে চায়। মাইকের অনুমতি বন্ধ থাকলে টেক্সট কমান্ড চলে। |
| ৭ · Android ও রিলিজ | একই ফোনে প্রথম লোড, PDF ও 3D দৃশ্য খোলার সময় মাপা। প্রয়োজন অনুযায়ী ভারী মডিউল লোড করা। একই নমুনা বই দিয়ে প্রতিটি রিলিজে মূল কাজগুলো পুনরায় চালানো। | পরিবর্তনের আগের ও পরের লোডের সময় নথিভুক্ত থাকে। রিডার ছাড়লে মাইক বন্ধ হয়। নেটওয়ার্ক বিচ্ছিন্ন হলে সেভের অবস্থা দেখা যায়। ব্যাকআপ থেকে টেস্ট পরিবেশে বই ও শিক্ষার্থীর ফল ফিরিয়ে আনা যায়। |

প্রতিটি ধাপের শেষে ব্যবহৃত সংস্করণ, পরীক্ষার ইনপুট, প্রত্যাশিত ও প্রকৃত ফল কনটেক্সটে যোগ করতে হবে। লাইভ মডেল পরীক্ষায় ব্যবহৃত মডেল ID ও ফল লিখতে হবে। API key ও সেশন টোকেন ব্যক্তিগত থাকবে।

### সম্পন্ন · এক জায়গায় বই রাখা ও কাজ করা

Book Manager-এর ফাইল তালিকা, ব্যাচ আপলোড, পড়া ও সম্পাদনা, সম্পাদিত কপি সেভ এবং পুনরায় খোলা যোগ হয়েছে। গ্রহণযোগ্যতার যাচাই Knowledge/PROJECT_CONTEXT.md-তে আছে। পরবর্তী ডিভাইস পরীক্ষায় Android ব্রাউজারে ব্যাচ আপলোড, বড় তালিকা স্ক্রল এবং সম্পাদিত বই পুনরায় খোলার অভিজ্ঞতা মাপতে হবে।

## Custom Book Builder

1. Add a revisioned draft in PostgreSQL with stable section IDs, parent IDs and sibling order. Keep legacy topic IDs for existing books.
2. Add **Build Manually** to Admin Books. Provide book metadata, nested sections, outline paste, reorder and reparent controls, Markdown editing, preview and draft autosave.
3. Publish visible sections in one transaction. Use the existing catalog topic model for navigation, progress and search. Preserve the published version while changes are in draft.
4. Render nested sections in the Reader and include the full section path in Search. Keep interface labels and messages in English.
5. Verify four levels, draft reload, hidden sections, revision conflicts and invalid trees in PostgreSQL. Follow with browser verification of the full workflow.

Steps 1–4 are implemented. The PostgreSQL and TypeScript checks passed. Browser verification remains open. PDF outline import, assistant commands and historical topic migration remain follow-up work.

## Book Store and learner access

- Add a store listing for each book with a free claim option, a one-time purchase price, plan inclusion, or a combination of purchase and plan access. Keep a draft unpublished until the administrator chooses to list it.
- Keep the original book and its published contents in the catalog. Store each learner's access separately. A free claim or confirmed one-time purchase adds the book to My Library. An active subscription grants access to the books included in that plan until the entitlement expires.
- Apply the same server-side access check to the Reader, full-text Search and AI content retrieval. Store listings can display title, author, cover and an approved preview before access is granted.
- Record payment amounts in integer minor units and keep orders pending until payment is confirmed on the server. Process duplicate confirmations once. Connect a payment provider after the store owner selects it.
- Keep annotations, highlights and reading progress per signed-in learner. A subscription expiry should retain those records so the learner can resume after renewing or purchasing the book.
- Use English for all dashboard labels and status messages.

Acceptance checks cover free claims, confirmed purchases, plan access and expiration, concurrent payment confirmations, account isolation, and attempted access to book content without an entitlement.

## Implementation checkpoint · 24 November 2026

- Book Manager publication now saves the book and extracted topics in one transaction. Repeating the same publish keeps the existing IDs. A new imported title needs a listing in Digital Products before learners can claim it or purchase it.
- Extract Studio and AI Splitter previews can create a nested Builder draft. The administrator can edit the draft before publishing.
- Study tab definitions and published topic tabs persist in PostgreSQL. Learner reads follow book access and published topic visibility.
- Exam submissions use a stable attempt ID and require the signed-in account. The result screen offers a retry if saving fails. Invalid PDF page numbers leave the current page unchanged.
- AI conversation history uses the same signed-in session as the dashboard. The readiness endpoint checks PostgreSQL.
- PostgreSQL and HTTP verification passed for publication rollback, repeated publish and exam submission, study-tab access, chat isolation and database outage reporting.
- Remaining work includes browser verification on Android, migration of older catalog books into Builder drafts with topic links preserved, password recovery email delivery, live AI model and voice command verification, payment gateway integration, and release to a configured host.
