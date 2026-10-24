# Library choices and references

Checked against upstream repositories and npm package metadata on 2026-10-24. Exact installed versions are pinned by package-lock.json. No unrelated repository was copied into this app.

## Graph decision

The user supplied [Nate Herk's AIS-OS](https://github.com/nateherkai/AIS-OS). Its [3D Brain package](https://github.com/nateherkai/AIS-OS/tree/main/.claude/skills/3d-brain) documents a named globe with search, orbit/zoom, note reading, cinema and growth replay. The repository [license](https://github.com/nateherkai/AIS-OS/blob/main/LICENSE) is MIT with trademark reservations. This confirms the visual reference; it is not a fraud engine. Commerce Shield independently implements the useful interaction pattern over actual case relationships. No AIS-OS code, brand or framework is copied, and no historical-growth claim is made.

| Candidate                                                            | Fit and tradeoff                                                                                                                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [React Force Graph](https://github.com/vasturiano/react-force-graph) | Selected: MIT, React API, Three.js 3D orbit/zoom, selection and camera controls; aligns with requested brain-style exploration. Larger bundle and WebGL requirement. |
| [Cytoscape.js](https://js.cytoscape.org/)                            | MIT, graph-analysis/layout focus; strong future 2D analyst view, but less aligned with the requested 3D interaction.                                                 |
| [Sigma.js](https://www.sigmajs.org/)                                 | WebGL network renderer; suitable alternative for a large 2D network. Not selected for this 3D foundation.                                                            |

Installed renderer: react-force-graph-3d 1.29.2 (MIT), plus Three.js (MIT) and three-spritetext (MIT) for selected entity labels. Search, accessible node directory, linked-case inspection, camera reset and cinema are application code. Geometry represents layout, not fraud probability or a historic timeline.

## Rules and ML

[GoRules ZEN](https://github.com/gorules/zen) is MIT. Deferred until visual decision tables or complex branching justify it. Current rules are typed allowlisted numeric comparisons with no eval and explicit contributions; a native runtime is unnecessary for this small rule set.

[XGBoost](https://github.com/dmlc/xgboost/blob/master/LICENSE) uses Apache-2.0 and remains a future supervised-model candidate. [River](https://github.com/online-ml/river/blob/main/LICENSE) is BSD-3-Clause and remains an uninstalled streaming-research candidate; verify version/module compatibility before adoption. [Fraud Detection Handbook](https://github.com/Fraud-Detection-Handbook/fraud-detection-handbook) is an evaluation reference, not an installed model or source of merchant labels. [Neo4j P2P demo](https://github.com/neo4j-product-examples/demo-fraud-detection-with-p2p) is a relationship-investigation reference; no code or data is imported.

No pretrained/untrained model is presented as fraud intelligence. Rule weights are illustrative defaults requiring merchant calibration.

## Runtime stack

Fastify, better-sqlite3, Zod, React, React DOM, Vite and TypeScript are permissively licensed (MIT or Apache-2.0 as declared by their package metadata); Lucide icons use ISC. npm retains their package license files in dependencies. Review lockfile/license inventories before redistributing compiled artifacts. Commerce Shield's own source distribution terms are not yet selected; public repository visibility does not grant a source redistribution license.
