# Skyx Academy

A bilingual English and Bangla study app with a book reader, learner workspace, administrator dashboard, and Gemini-assisted study tools.

## Current state

- PostgreSQL and Prisma handle application data and account sign-in. Administrators use the regular **Sign In** screen.
- General Tools saves model selections to PostgreSQL. General Gemini tools read API keys from the server environment. The Book Reader Assistant has separate settings and supports voice-driven PDF page navigation.
- Shared API-key management, saved AI chat history, and the Floating Voice connection are still in progress.

## Run locally

Install the dependencies and set `DATABASE_URL` and `JWT_SECRET` in `.env.local`. For a new local database, run the setup command and create the first administrator with your own email.

```sh
npm install
npm run db:setup
npm run admin:create -- your-email@example.com
npm run dev
```

If the database and administrator already exist, start with `npm run dev`. Open [localhost:3000](http://localhost:3000/).

<!--
Work on the user's current request. Planning notes, snapshots, and checklists are optional references. They do not set the scope, order, or completion criteria for a task.
-->

## Bengali PDF extraction

Extract Studio uses positioned PDF text, with server-side Bengali and English OCR for image-only pages and suspected broken character maps. For visually correct pages that extract as nonsense, select the Bengali OCR checkbox before uploading the PDF. The page inspector shows the extraction method and detected layout. Table details show the original detected cell text. Column and table classification is heuristic.

On Debian or Ubuntu, install the OCR runtime on the app server:

```sh
apt-get install poppler-utils tesseract-ocr tesseract-ocr-ben tesseract-ocr-eng
tesseract --list-langs
```

The language list should include both ben and eng. Alternative installations can set TESSDATA_PREFIX to a directory containing both models. Four Bengali reader font families ship under public/fonts with their respective licenses. Smart Reader's manual clip selection uses the digital layout extractor. Use Extract Studio for OCR.
