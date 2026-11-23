# Advance Assistant implementation

The [feature plan](Advance_assistant_feature.md) covers the companion, PDF and visual workflows. The [tool expansion plan](Advance_assistant_tool_calls_plan.md) defines packages T0–T4.

| Area | Implemented | Remaining |
| --- | --- | --- |
| Live session | Root Floating Tutor across app routes. Microphone and screen frames pause while hidden. Upstream and browser WebSocket resumption reuse the same conversation when a valid handle is available. | Verify with a configured Gemini Live model on desktop and Android. The browser resume cache lives for three minutes in one Node process. |
| PDF | **Share PDF with Tutor** opts the selected document into the root session. Page commands wait for rendering and send the page frame. The standalone Reader Live control remains available when sharing is off. Read Aloud highlights selectable PDF text and published Reader sentences. | Verify spoken page commands and text highlighting in a browser. Scanned images need an aligned OCR layer, and device speech synthesis determines the available Bangla voices. |
| Results | Per-account PostgreSQL dock for examples, notes, diagrams and reference results. Pin, delete, export and save notes to Study Vault. The Study Content text model can generate topic notes while Live Voice continues. | Background generation runs in the server process and saves completed results even if the browser disconnects. Persistent job status, retries after restart, quiz and flashcard artifact workflows are pending. |
| Visuals | Spotlight and enlarged text for a uniquely matched Reader block, animated walkthroughs, whiteboard strokes, and custom 3D diagrams with editing and version history. Wikimedia Commons reference cards include source and license metadata. | PDF-region callouts, topic-linked diagrams, built-in model conversion, flow and exploded animations, image-to-diagram generation and physical WebGL verification. |
| Companion | Drag the compact button and dock it near either side. The default is bottom-right. | Position persistence after reload, automatic roaming, picture-in-picture and wake lock. |
| Tool expansion T0 | Catalog search, book-scoped search, library listing, exam history, study streak, due flashcards, and continue reading. The server verifies the caller and uses published book access rules for catalog data. Tool calls are logged with model and result status. | Voice evaluation in Bangla and English and search evaluation against larger catalogs. Continue Reading opens the most recent readable topic. |
| Tool expansion T1–T4 | The published Reader spotlight can locate a unique text block. | Reader annotation and speech tools, exam and revision controls, personal planning and memory, teacher tools and photo workflows remain open. Destructive operations need explicit confirmation in the application before any tool is enabled. |

New dashboard controls use English. Generated study notes can be in Bangla, English or both. Set the **Live Voice** channel to a model and credential slot supported by the Gemini account. Background topic notes use the **Study Content** channel and its text model. Apply the Prisma schema before starting the updated app. See the [README](../README.md) for setup.

## Verification

The production build passed. The local production server returned HTTP 200 for the homepage, health and database readiness. Manual Book Builder autosave now uses React hooks available in the production bundle.

The local test uses temporary PostgreSQL and simulated Gemini Live and text responses. It exercises authenticated WebSocket setup, Bengali catalog search, access denial for locked books, background notes, tool action acknowledgment, resumption under both transports, rejection of cross-account resume attempts, and artifact ownership and diagram versioning. It also checks the T0 profile, exam, revision and library tools. Provider voice output, PDF canvas behavior, WebGL and Android remain unverified.
