# Skyx Digital Study · প্রজেক্ট সার্চ ইনডেক্স

| যে কাজটি খুঁজছেন | কোড বা নথি |
| --- | --- |
| সেটআপ, PostgreSQL ও OCR নির্ভরতা | [README](../README.md) |
| বর্তমান অবস্থা ও পরীক্ষার ফল | [প্রজেক্ট কনটেক্সট](PROJECT_CONTEXT.md) |
| কাজের অগ্রাধিকার | [উন্নয়ন পরিকল্পনা](PLAN.md) |
| বাংলা ও ইংরেজি শব্দ খোঁজা, ফল সাজানো | [সার্চ ইনডেক্স](../lib/search-index.ts), [গ্লোবাল সার্চ](../components/search/GlobalSearchModal.tsx) |
| একাধিক বই আপলোড, ফাইল খোঁজা, পড়া ও সম্পাদনা | [Book Manager](../components/book-manager/BookManagerWorkspace.tsx) |
| স্থানীয় ব্রাউজারে বই রাখা | [IndexedDB ফাইল তালিকা](../lib/book-engine/local-shelf.ts) |
| VPS-এ মূল ফাইল ও পৃষ্ঠা সংরক্ষণ | [ইমপোর্ট সংরক্ষণ](../lib/book-engine/pdf-imports.ts), [স্কিমা](../prisma/schema.prisma) |
| মূল বই ও সম্পাদিত কপি খোলা এবং সেভ | [ফাইল তালিকা API](../app/api/book-engine/imports/route.ts) |
| PDF, DOCX, EPUB ও অন্যান্য ফাইল থেকে লেখা | [এক্সট্রাক্টর](../lib/book-engine/extractors.ts) |
| টেবিল, কলাম, বাংলা OCR | [পৃষ্ঠার বিন্যাস](../lib/book-engine/pdf-layout.ts), [OCR](../lib/book-engine/pdf-ocr.ts) |
| রিডারে পৃষ্ঠা দেখা ও টেক্সট নির্বাচন | [Smart Reader](../components/book-manager/SmartDocumentReader.tsx) |
| সেশন, সাইন ইন ও রেজিস্ট্রেশন | [অ্যাকাউন্ট অ্যাকশন](../lib/auth/server-actions.ts) |
| ফ্লোটিং AI ও লাইভ সংযোগ | [টিউটর](../components/ai/FloatingAiTutor.tsx), [সার্ভার](../server.ts) |
