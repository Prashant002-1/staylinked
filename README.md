# Staylinked

HR hackathon submission exploring how people retain context after meeting in person.

A recruiter shares an event QR. The candidate records what they discussed and adds work to their profile. Both people can revisit the encounter later, see the connected person's profile, and reach out through email, LinkedIn, or a website. Candidates can edit their recap, profile, and project notes, or replace uploaded files. The original recap is preserved.

Candidates can read an invitation QR in the browser using a camera or an image, review the recruiter and event, then continue to the connection form.

## Implementation

React and TypeScript provide the interface, using shadcn/ui on Base UI, Geist, and Tailwind. Express handles cookie sessions, access checks, QR creation, PDF/text extraction, and private files. SQLite stores profiles, encounters, materials, and role definitions.

An optional role lookup passes candidate-supplied text to a small Rust executable. It compares whole words and returns exact source passages. Node invokes it without a shell, limits input and output, applies a timeout, and validates quotations. There is no vector database or retrieval service. The Rust boundary is an exercise in Serde, borrowing, error handling, and integration between languages; no speed advantage over JavaScript has been measured.

Profiles and materials are available through authenticated connections. Either person can remove a connection. Another encounter between the same pair may continue to grant access. There are no public profile or discovery routes.

## Run locally

Requires **Node.js 24+**, npm, and a stable [Rust toolchain](https://rustup.rs/) with Cargo.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). Recruiter and candidate demo accounts use fictional data. Use separate browsers for independent sessions; switching accounts replaces the current browser session.

```sh
npm run build   # Rust release binary + TypeScript + Vite
npm start       # serve the built application
npm run check   # build, Rust tests/fmt/Clippy, HTTP workflow tests
npm run format:check
```

No model key is required. Records persist in `data/again.sqlite`, with files in `data/uploads/`. These paths and `.env` are ignored by Git. Set `DATA_DIR` for a separate instance. `DEMO_MODE=false` disables demo access and seed creation for a new database without erasing existing records.

## Optional model adapter

The OpenCode Go adapter uses an OpenAI-compatible Chat Completions endpoint. Copy `.env.example` to `.env` and configure the server:

```dotenv
OPENCODE_API_KEY=your-key-here
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_MODEL=glm-5.2
```

The model must support `/chat/completions`; see the [provider documentation](https://opencode.ai/v2/docs/console/go). A role lookup sends bounded source excerpts. The server validates source IDs, exact quotations, and requirement coverage, then caches valid results. Invalid responses, provider failures, and timeouts fall back to local Rust matches. The model cannot modify records or contact people.

**Live provider verification is pending a key.** Controlled-response tests cover the adapter's request format, caching, validation, and fallback.

## Verification and limits

Rust tests cover exact passages, whole-word boundaries, normalization, deterministic ties, negation, and input limits. HTTP tests use isolated databases and upload directories to cover sessions, QR destinations, persistence, ownership, file access, access revocation, role lookup, and the provider adapter. Client tests cover account changes, request deadlines, cancellation, and malformed responses using controlled fetches and clocks.

This is a local development project. Demo accounts are shared. Email verification, password reset, malware scanning, OCR, pagination, and production deployment are outside the current implementation. Recaps and profiles are author supplied; a QR submission does not verify attendance. Literal word matches can miss synonyms or include negated claims. A citation identifies its source, not its truth.

- [Scope](docs/product.md)
- [Architecture](docs/architecture.md)
- [Interface and avatar credits](docs/design-system.md)
- [Manual verification](docs/demo.md)
