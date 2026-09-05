# Third-Party Notices

This project uses open-source libraries and studied open-source reference
projects during design. This file records both — the libraries that ship in
the built application, and the reference projects that shaped its design
even where their code was not reused.

## Runtime dependencies (shipped)

The `LICENSE` for each runtime dependency is bundled by npm at install time
under `node_modules/<pkg>/LICENSE`; a full machine-readable inventory can
be produced with `npm run licenses` (which runs `license-checker`). The
headline dependencies and their licenses are:

| Package | License | Purpose |
|---|---|---|
| `next` | MIT | Framework |
| `react`, `react-dom` | MIT | UI runtime |
| `typescript` | Apache-2.0 | Language |
| `tailwindcss`, `postcss`, `autoprefixer` | MIT | Styling |
| `@prisma/client`, `prisma` | Apache-2.0 | ORM |
| `next-auth` | ISC | Authentication |
| `bcryptjs` | MIT | Password hashing |
| `zod` | MIT | Runtime validation |
| `exceljs` | MIT | Excel import/export |
| `qrcode` | MIT | QR generation |
| `zustand`, `zundo` | MIT | Map editor state + undo/redo |
| `lucide-react` | ISC | Icons |
| `clsx`, `tailwind-merge` | MIT | Class-name composition |
| `vitest` | MIT | Unit tests |
| `@playwright/test` | Apache-2.0 | Browser tests |

## Reference projects studied during design

The following five projects were listed in the build prompt as references.
Each was audited for license and architecture. Where a project's license
did not permit code reuse in a permissively-licensed application, only
ideas (which are not copyrightable) were used. See
`docs/ARCHITECTURE_ANALYSIS.md` for the reasoning.

| Project | License | Reuse posture |
|---|---|---|
| [rcasto123/Floorcraft](https://github.com/rcasto123/Floorcraft) | MIT | Studied for editor architecture (canvas, room/wall shapes, snap, undo). No code lifted — Floorcraft uses Konva, we use SVG. Attribution given here. |
| [Shelf-nu/shelf.nu](https://github.com/Shelf-nu/shelf.nu) | AGPL-3.0 | **No code reused** (AGPL is copyleft and would force this app to become AGPL). Only the shape of the asset/location/custom-field domain (ideas, not code) was used. Attribution given here. |
| [mehanix/arcada](https://github.com/mehanix/arcada) | Apache-2.0 | Studied for the walls/rooms/doors data model. No code lifted — Arcada uses Pixi.js, we use SVG. If any Apache-2.0 code is subsequently ported into this repo, its `NOTICE` will be reproduced here. |
| [Open-Location-Stack/floorplan-editor](https://github.com/Open-Location-Stack/floorplan-editor) | **No LICENSE file** (all rights reserved by default) | **No code reused.** The public README idea of a building/floor/location hierarchy influenced our schema. |
| [syncfusion/ej2-showcase-react-floor-planner](https://github.com/syncfusion/ej2-showcase-react-floor-planner) | Syncfusion commercial (`@syncfusion/ej2-react-diagrams` is proprietary) | **No code reused, no runtime dependency.** Only the visible UX (symbol palette, snap grid) was noted. |

## Data

The Excel workbook `Output_1__FA_Schedule_All_Years.xlsx` was supplied by
the project owner and is treated as owner data. It is not committed to
this repository. A tiny derived, clearly-labeled demo dataset ships in
`prisma/seed/` for development.
