# Development

Install Node.js 24+ with npm and a stable Rust toolchain. `node`, `npm`, and `cargo` must be on your terminal's `PATH`. The full check also uses Rustfmt and Clippy:

```sh
node --version
npm --version
cargo --version
rustup component add rustfmt clippy
npm ci
npm run dev
```

Open `http://localhost:5173`. No `.env` or model key is needed for the fictional demo accounts. Use separate browsers to keep recruiter and candidate sessions independent; switching accounts replaces that browser's session.

## Commands

| Command                | Purpose                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`          | Build the Rust release executable, then start Express with Vite middleware.                   |
| `npm run build`        | Build Rust, typecheck TypeScript, and produce the browser assets.                             |
| `npm start`            | Serve the built application; fails early if its client or Rust build is missing.              |
| `npm run check`        | Build, run Rust tests, check Rust formatting/Clippy, and run Node tests.                      |
| `npm run format:check` | Check repository formatting without changing files.                                           |
| `npm run smoke`        | Exercise the built production entry with temporary data and no model key. Run after building. |

`npm test` runs Node tests and expects the Rust executable to exist. For a smaller edit, choose the relevant check:

```sh
node --test tests/api.test.mjs tests/qr.test.mjs
node --test tests/start.test.mjs
npm run rust:build
node --test tests/workflow.test.mjs
```

The smoke check starts its own server on an available port, checks health, HTML/assets, a recruiter demo session, and exact local Rust citations, then stops the process and removes its temporary data. It does not read `.env`, call a model provider, or use the running demo. Readiness is bounded to 10 seconds and each HTTP request to 5 seconds.

## Local configuration and data

Copy `.env.example` to `.env` only when changing configuration. For a separate instance or fresh example records, use a new data directory:

```dotenv
PORT=5175
DATA_DIR=data/local-preview
DEMO_MODE=true
PUBLIC_URL=
```

Keep the existing data directory when preserving your work. Files and SQLite records are stored together under `DATA_DIR`; the default is `data/`. A new directory receives the sample records. `DEMO_MODE=false` disables demo login and seeding without erasing an existing database.

`PUBLIC_URL` controls the address encoded in invitation QR codes. For another device on the same Wi-Fi, use the laptop's reachable LAN address and port. Browser camera access needs HTTPS or localhost; the image-upload scanner remains available when the camera is unavailable. Do not use shared demo accounts for private information.

## Common setup issues

- **Cargo not found:** make the installed Rust toolchain available on `PATH`, then reopen the terminal. The repository does not install Rust for you.
- **Missing production build or evidence engine:** run `npm run build` before `npm start`, or `npm run rust:build` before Node workflow tests.
- **Port already in use:** choose another `PORT`; do not stop an unrelated server.
- **Old sample content:** select a fresh `DATA_DIR` rather than deleting existing work.

The optional `npm run provider:check` reads `.env` and makes a paid provider request. It is separate from ordinary tests and CI. See the README for its configuration and limits.
