# Skyx Academy

A bilingual English and Bangla study app with a book reader, learner workspace, administrator dashboard, and Gemini-assisted study tools.

## Current state

- PostgreSQL and Prisma handle application data and account sign-in. Administrators use the regular **Sign In** screen.
- General Tools saves model selections to PostgreSQL. General Gemini tools read API keys from the server environment. The Book Reader Assistant has separate settings and supports voice-driven PDF page navigation.
- Shared API-key management, saved AI chat history, and the Floating Voice connection are still in progress.

## Run locally

Install the dependencies and set `DATABASE_URL` and `JWT_SECRET` in `.env.local`. For a new local database, run the setup command and create the first administrator with your own email.

```sh
npm ci
npx prisma generate --config prisma/prisma.config.ts
npm run db:setup
npm run admin:create -- your-email@example.com
npm run dev
```

If the database and administrator already exist, start with `npm run dev`. Open [localhost:3000](http://localhost:3000/).

## Book Manager and search

Upload one or more books from the shared shelf in Smart Reader and Extract Studio. Open an original for reading, edit its extracted content, or save a customized edition. PDF, EPUB, DOCX, TXT, Markdown, CSV and SkyxBook projects are supported.

- **Portable mode** stores the shelf in IndexedDB for the current browser and account. Clearing site data removes these copies.
- **VPS mode** uses PostgreSQL and a persistent directory outside the public web root. Set `SKYX_STORAGE_MODE=vps_local` and `SKYX_VPS_STORAGE_DIR`. Original file bytes are addressed by content hash. Customized editions are compressed separately. Back up both the database and the originals directory.
- **Global search** indexes the loaded catalog, topic text and question bank. The shelf indexes file names and whether each item is an original or edited copy. Bengali and ASCII digits match. Titles and exact terms rank ahead of other text. Search indexes rebuild when their source lists change.

[Current project context](Knowledge/PROJECT_CONTEXT.md) · [Source navigation index](Knowledge/SEARCH_INDEX.md) · [Development plan](Knowledge/PLAN.md)
-->

## Bengali PDF extraction

Extract Studio uses positioned PDF text, with server-side Bengali and English OCR for image-only pages and suspected broken character maps. For visually correct pages that extract as nonsense, select the Bengali OCR checkbox before uploading the PDF. The page inspector shows the extraction method and detected layout. Table details show the original detected cell text. Column and table classification is heuristic.

On Debian or Ubuntu, install the OCR runtime on the app server:

```sh
apt-get install poppler-utils tesseract-ocr tesseract-ocr-ben tesseract-ocr-eng
tesseract --list-langs
```

The language list should include both ben and eng. Alternative installations can set TESSDATA_PREFIX to a directory containing both models. Four Bengali reader font families ship under public/fonts with their respective licenses. Smart Reader's manual clip selection uses the digital layout extractor. Use Extract Studio for OCR.

## Book Library marketplace

Apply the updated PostgreSQL schema and regenerate the Prisma client before running the marketplace. In **Admin → Books → Digital Products**, select a published book and configure its listing. A listing can offer a free claim, a BDT purchase price, inclusion in one published subscription plan, or a combination. Newly published books from Build Manually start with an unlisted product.

Set `SKYX_STORE_PAYMENT_INSTRUCTIONS` to the payment directions customers should see. Customers submit a transaction reference, then an administrator independently verifies the received payment and approves or rejects it in **Sales and Payment Review**. Purchase approval adds a lasting license. Subscription approval grants 30 days and adds that time to any remaining period for the same plan. Checkout uses manual review. Automatic payment collection and recurring billing require a payment provider integration.

At the server, Book Library, Reader and catalog search use the learner's own access. My Library includes entitled titles. Notes, highlights and progress stay in the learner's account after subscription access ends.

Use `GET /api/readiness` to check that PostgreSQL and the marketplace schema are available. It returns HTTP 503 when the database check fails. `GET /api/health` is the process health endpoint.

### Password recovery

Set `APP_URL` to the public HTTPS app origin. Set `SKYX_RESET_MAIL_WEBHOOK` to an HTTPS mail relay under your control and `SKYX_RESET_MAIL_KEY` to the relay's bearer secret. The relay accepts a JSON POST with `to`, `subject` and `text`, sends an email, and replies with a successful HTTP status. The reset link expires in 30 minutes and can be used once. Configure these settings and apply the database schema before enabling recovery on a live installation.

### Existing catalog books

In **Admin → Book Builder**, select a legacy catalog book and choose **Migrate Legacy Topics**. Review the converted hierarchy, then use **Sync & Publish**. Migrated reading sections keep their original topic IDs so references from notes, progress, questions and study tabs remain valid. Books authored in **Build Manually** have their own revisioned drafts.

### Advance Assistant

Use **Floating Tutor → Live Voice** to navigate the app, search accessible books, resume reading, or ask for study notes. In the PDF Reader, enable **Share PDF with Tutor** to use voice page commands in the same session. **Assistant Results** keeps saved notes, attributed images and editable 3D diagrams in your account. Read Aloud uses the device's speech synthesis and highlights selectable text.

Configure the Live Voice channel with an account-supported Gemini Live model and a server key. Background notes require a configured Study Content text model. Run `npm run db:setup` with the target database configured before starting this version. See the [implementation and verification status](Knowledge/ADVANCE_ASSISTANT_IMPLEMENTATION.md).
