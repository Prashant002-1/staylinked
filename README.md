# Staylinked

HR hackathon submission exploring how people retain context after meeting in person.

A recruiter shares an event QR. The candidate records what they discussed and adds work to their profile. Both people can revisit the encounter later, see the connected person's profile, and reach out through email, LinkedIn, or a website. Candidates can edit their recap, profile, and project notes, or replace uploaded files. The original recap is preserved.

Candidates can read an invitation QR in the browser using a camera or an image, review the recruiter and event, then continue to the connection form.

## Interface

The candidate keeps a specific memory of each meeting: the question someone asked, the work they discussed, and what they offered to share next. The recruiter can revisit that encounter alongside the candidate's current work.

![Candidate connections and the remembered encounter](docs/media/connection-memory.gif)

Selecting a role opens relevant passages beside the meeting note. Each quotation links back to its source, where the selected text is highlighted.

![Role context and the exact quotation in its source](docs/media/source-context.gif)

These loops were rendered with HyperFrames from screenshots of the running app using fictional profiles. Both GIFs are under 1 MB. A [24-second overview](docs/media/staylinked-ui-overview.mp4) is also available as a 1080p MP4 (2.6 MB).

Full-size screens: [candidate connections](docs/media/candidate-connections.jpg), [candidate profile](docs/media/candidate-profile.jpg), [role context](docs/media/role-context.jpg), and [source inspection](docs/media/source-quotation.jpg).

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

Sample data is created for a new database. To try updated fixtures while keeping existing records, set `DATA_DIR` to a new directory in `.env`, such as `data/fresh-preview`, before starting the app.

## Optional model adapter

The OpenCode Go adapter uses an OpenAI-compatible Chat Completions endpoint. Copy `.env.example` to `.env` and configure the server:

```dotenv
OPENCODE_API_KEY=your-key-here
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_MODEL=glm-5.3
```

The model must support `/chat/completions`; see the [provider documentation](https://opencode.ai/docs/go/). Restart the server after changing `.env`. A role lookup sends bounded source excerpts. The server validates source IDs, exact quotations, and requirement coverage, then caches valid results. Invalid responses, provider failures, and timeouts fall back to local Rust matches. The model cannot modify records or contact people.

Run `npm run provider:check` after building to make one live request with the fictional Aisha/Product Engineer fixture, validate its quotations, and verify the second lookup uses the cache. This opt-in check consumes provider usage; normal tests use controlled responses. It prints only status metadata. A GLM-5.3 check on September 19, 2026 returned four valid citations in 3.9 seconds and passed the cache check. This is one observation, not a latency guarantee.

## Verification and limits

Rust tests cover exact passages, whole-word boundaries, normalization, deterministic ties, negation, and input limits. HTTP tests use isolated databases and upload directories to cover sessions, QR destinations, persistence, ownership, file access, access revocation, role lookup, and the provider adapter. Client tests cover account changes, request deadlines, cancellation, and malformed responses using controlled fetches and clocks.

| Failure case                                  | Behavior covered by tests                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A replacement file fails validation or saving | The previous document and record remain available.                                                     |
| Two file replacements overlap                 | A stale replacement is rejected before it can overwrite the newer version.                             |
| Work changes while a role lookup is running   | The pending result is rejected; a new lookup reads the current sources.                                |
| Another tab changes the signed-in account     | Requests carrying the earlier account identity are rejected, and stale client responses are discarded. |

This is a local development project. Demo accounts are shared. Email verification, password reset, malware scanning, OCR, pagination, and production deployment are outside the current implementation. Recaps and profiles are author supplied; a QR submission does not verify attendance. Literal word matches can miss synonyms or include negated claims. A citation identifies its source, not its truth.

- [Scope](docs/product.md)
- [Trust, encounter context, and existing tools](docs/trust-and-context.md)
- [Architecture](docs/architecture.md)
- [Interface and avatar credits](docs/design-system.md)
