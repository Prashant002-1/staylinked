# Staylinked

HR hackathon submission exploring how people keep in touch after meeting in person.

At a career fair, someone might remember a conversation about a particular project but lose that context a few weeks later. `Staylinked` keeps the encounter alongside the person's work and a direct conversation. It is a private circle of people who have connected, with no public profiles or discovery feed.

## What I built

- **A short QR introduction.** A recruiter shares an event QR. The candidate records what they discussed and the detail worth remembering, without asking the recruiter to write another note.
- **A lasting connection.** Both people can exchange messages and share updates with their connections. Profiles and project notes can be edited; files can be replaced as someone's work changes.
- **The original encounter.** An edited recap preserves the original submission, so the first conversation is still available later.
- **Source passages for a role.** A small Rust program finds exact passages containing words from role requirements. It returns the source text, without ranking people or assigning confidence scores.
- **Access tied to the relationship.** Private routes check the session and connection. Removing a connection revokes access through it; a second connection between the same people can still grant access.

These are implementation choices, not measured claims about hiring outcomes or time saved. Profiles and recaps are author supplied; a QR submission does not verify that a meeting occurred.

## Run locally

Requires **Node.js 24+**, npm, and a **stable Rust toolchain** with Cargo. Install Rust using [rustup](https://rustup.rs/).

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The entry page offers recruiter and candidate access with fictional data. Use separate browsers or a phone for independent sessions. Switching accounts in one browser replaces that browser's session.

No model API key is required. SQLite records persist in `data/again.sqlite`; uploads stay in `data/uploads/`. These paths and `.env` are ignored by Git. Set `DATA_DIR` for a separate local instance.

```sh
npm run build   # Rust release binary + TypeScript + Vite
npm start       # serve the built application
npm run check   # build, Rust tests/fmt/Clippy, HTTP workflow tests
npm run format:check
```

## How it is built

```text
React + TypeScript
  shadcn/ui / Base UI, Geist, Tailwind
          │ same-origin requests + session cookie
Express + SQLite + private local files
          ├── PDF / text extraction
          ├── Rust passage lookup (JSON stdin/stdout)
          └── optional OpenCode Go summary
```

Express owns authentication, access checks, persistence, QR creation, uploads, updates, and messages. Rust has one bounded job: tokenize source text, compare whole words with requirements, and return exact passages. Node starts the binary asynchronously without a shell, limits its input and output, applies a timeout, and validates its quotations.

There is no embedding model, vector database, retrieval service, or index. There is also no performance claim over JavaScript. Rust provides a small processing boundary for practicing Serde, borrowing, error handling, and integration between languages.

The interface uses People and Updates instead of a recruiting dashboard. There are no status queues, bookmarks, public follower counts, or automated outreach. Candidate and recruiter use the same relationship model; role lookup and event sharing remain available where needed.

## Optional OpenCode Go

The adapter uses OpenCode Go's OpenAI-compatible **Chat Completions** endpoint. Copy `.env.example` to `.env`, set server-only values, and restart:

```dotenv
OPENCODE_API_KEY=your-key-here
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_MODEL=glm-5.2
```

An OpenAI key is not needed. The configured model must support `/chat/completions`; see the [OpenCode Go documentation](https://opencode.ai/v2/docs/console/go).

When configured, a role lookup sends bounded excerpts from that person's supplied work to the provider: at most 40,000 source characters, with 4,500 per source. Source IDs, exact quotations, and requirement coverage are validated before display. The cache includes the role, materials, recap, model, and endpoint. Invalid output, provider failure, or a 25-second timeout returns local matches. The model cannot send messages or modify records.

**Live provider verification is pending a key.** Controlled-response tests cover request shape, caching, malformed output, unsupported citations, and failure behavior.

## Tests and limits

Rust tests cover exact Unicode passages, whole-word boundaries, limited word normalization, deterministic ties, negation preservation, and input limits. HTTP tests use isolated SQLite databases and upload directories to exercise authentication, QR destinations, persistence, files, connection access, private updates and messages, and the provider adapter.

This is a local development project. Demo accounts are shared and intended for fictional data. Email verification, password reset, upload malware scanning, OCR, audit logs, pagination, and production deployment are outside the current implementation. Literal matching misses synonyms and can return negated claims or learning interests. A citation establishes where text came from, not whether it is true. The application makes no hiring decisions.

`DEMO_MODE=false` disables demo access and seed creation for a new database. It does not erase existing demo records.

## Notes

- [Problem and scope](docs/product.md)
- [Architecture and tradeoffs](docs/architecture.md)
- [Interface and avatar credits](docs/design-system.md)
- [Manual verification](docs/demo.md)
