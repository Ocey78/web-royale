# Reference comparison and visual polish

User authorization: compare Web Royale with accessible Clash Royale screenshots, client and original assets, make changes, and continue the existing GitHub site update workflow.

Baseline: 0.54.0, commit 2d01d1c. Existing checkout is clean; synced ChatGPT project sources remain read-only.

- [x] Compare the deck, collection and shop at normalized viewport sizes; correct measured card proportions, background colors, frame depth and typography in the existing components.
- [x] Inspect original model materials and animation data; implement supported material fidelity and motion continuity improvements, with deterministic bounded rendering.
- [x] Inspect live-client availability and original shadow configuration; improve grounding only where source or image evidence supports the change.
- [x] Capture matching before/after screenshots and motion samples. Review responsive layouts, both teams, classic and modern actors, and existing form interactions.
- [x] Run focused checks, the release regression suite and a production build; independently review, publish and verify the live release.

Published 0.55.0 from `68aa4a9f97e6f8d5f463ce8cc1e75d73d3728086` through successful Pages workflow `38441505138`. A fresh browser loaded the public site without page errors; the live release, app, styles, runtime, model manifest and all 23 new material textures matched the verified local bytes. Evidence: `docs/qa/v055/deployment.json`.

Assignments: reference_review owns menu CSS and visual QA; models owns modern 3D presentation and its focused tests; parent owns grounding, integration and deployment; final_review discovers live/source references and independently reviews the final changes.

Acceptance: visibly closer to the supplied references, preserved gameplay/save behavior, no missing models or clipped controls. Pixel-identical native rendering is not an acceptance claim; remaining material/animation limitations must be documented.
