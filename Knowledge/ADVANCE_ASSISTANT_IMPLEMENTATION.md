# Advance Assistant implementation

## Delivery order

| Phase | Implementation | Acceptance |
| --- | --- | --- |
| 1 | Stabilize the root companion, keep microphone frames out of hidden tabs, and resume the upstream session using its latest handle. Add typed Live tools for navigation, progress and existing 3D models. | Change app panels without releasing the microphone. Simulate an upstream restart. A command must report the actual result or a clear failure. |
| 2 | Add authenticated catalog tools for author lookup, contents, topic search and opening a topic. Give the model only published content readable by that account. | Locate a Bengali topic, find its breadcrumb and open it. Verify that another account cannot retrieve a locked topic. |
| 3 | Present examples and structured notes in a compact companion panel. Use Study Vault for deliberately saved notes. Add sentence-level playback highlighting to the published Reader. | Generate notes for a particular topic, reopen them from the Vault and follow a spoken sentence in the Reader. |
| 4 | Unify PDF and app session ownership, add PDF text-layer highlighting, durable artifact workflows, background generation and an optional roaming companion. | Read and highlight a raw PDF, change panels, and resume after returning on a supported mobile device. |
| 5 | Add a validated diagram specification and editing, versions, reference-image attribution, and spotlight/zoom/whiteboard tools. | Reject an invalid spec, edit and reopen a saved revision, and show image sources and licenses. |

Default placement is bottom-right. Roaming starts disabled. Notes follow the learner's language request. Keep the interface controls in English. The initial release should be tested before enabling optional display modes or automatic context capture.

## Delivered in this release

- The root Floating Tutor keeps its connection across app panels. It suppresses microphone and screen frames in a hidden document. The server reconnects to Gemini with its latest resumption handle and retains the same conversation record. PDF Reader Live pauses microphone and frame capture on tab hide. Leaving the PDF Reader still ends its separate session.
- Live tools open allowlisted pages and built-in 3D models, adjust the published Reader theme and text size, and get the user's reading progress. Catalog tools look up a book by author, return its contents, and find or open a published topic. Server queries apply marketplace access.
- Result cards show examples and structured notes. Cards support copy and download. Notes can be saved to Study Vault by the learner. One result card is visible at a time. Dismissing an unsaved card clears it.
- Read Aloud in the published Reader uses device speech synthesis. It shows the current sentence and highlights the source text on browsers with the CSS Highlight API. The speech voice depends on the device.

## Verification

A local PostgreSQL application with a simulated Gemini Live upstream verified authenticated WebSocket setup, progress, Bengali topic search, denial of locked content and unsupported destinations, notes context, action acknowledgment and connection resumption with the same conversation ID. Real Gemini audio, browsers and mobile background behavior require separate verification.

The remaining work covers browser transport reconnection after the app WebSocket drops, unified PDF/app session ownership and raw PDF highlighting. It also covers a persisted artifact dock, background generation, roaming and picture-in-picture, and custom diagram generation/editing with attribution.
