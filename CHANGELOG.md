# Changelog
All notable changes to **ScribbleSense** will be documented in this file.

The project adheres to **Semantic Versioning**: MAJOR.MINOR.PATCH  
and the structure recommended by **Keep a Changelog 1.1.0**.

---

## [Unreleased]
### Added
- Road-map items drafted (GPU image, TS/Vite front-end, formula OCR, PWA, multi-user).
- `docs/demo.gif` placeholder to be replaced once UI video is captured.

---

## [0.1.0] – 2024-06-30
### Added
- **Single-container deployment**: Dockerfile + `docker-compose.yml`.
- **Static site served at root** (`/`) via `app.mount("/", StaticFiles, html=True)`.
- FastAPI ML endpoints:  
  - `POST /digit` → digit classification (ONNXRuntime, 40 kB CNN).  
  - `POST /ocr`   → lightweight handwriting OCR (EasyOCR English).
- Automatic model bootstrap (`download_models.py`) with SHA-256 verification.
- CORS middleware (`*`) so the browser can call the API from any origin.
- Stand-alone front-end (`static/index.html`) using CDN UMD bundles:
  React 18, Excalidraw 0.18, no build step.
- Toolbar actions: “🔢 Recognise Digit”, “📝 OCR Text” with real-time output.
- README with journey, performance benchmarks and tech-stack table.
- MIT License.

### Changed
- Collapsed former two-service architecture (web + ml-service) into one folder
  (`ml-service`) to simplify onboarding.

### Removed
- Node/Vite front-end boilerplate from prototype (no longer required).

### Fixed
- PNG export sometimes including shadow artefacts → `includeShadow:false`.
- Selection guard: alert user when nothing is selected.

---

## [0.0.1] – 2024-06-27
### Added
- First working prototype:
  - React + Excalidraw front-end scaffold (Vite dev server).
  - FastAPI back-end with `/digit` route (OpenCV k-NN baseline).
  - Basic Docker compose with two containers.
- Initial documentation stub.

---

[Unreleased]: https://github.com/your-org/scribblesense/compare/v0.1.0...HEAD
[0.1.0]:      https://github.com/your-org/scribblesense/compare/v0.0.1...v0.1.0
[0.0.1]:      https://github.com/your-org/scribblesense/releases/tag/v0.0.1
