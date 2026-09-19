# again-hr

An engineering prototype for retaining context from in-person recruiting conversations. The name is a placeholder.

The starting problem: a recruiter can remember a candidate's specific project after a career fair, yet lose the connection between that conversation, the person's work, and a role that opens later. Requiring the recruiter to write detailed notes after every interaction adds another task to an already crowded day.

This project moves the initial recap to the candidate. An event QR leads to a short form; the candidate records what they discussed and adds work to a reusable profile. The recruiter gets a searchable workspace with the conversation beside the person, then can inspect source passages for a role, shortlist connections, and export them. It was started for an HR hackathon and is maintained here as a development and portfolio project.

## What is different about this implementation

- **The encounter is a record, not a tag on a résumé.** The event, original recap, current recap, and candidate-owned materials stay connected. Editing a recap preserves the original submission.
- **Context comes from the candidate.** Recruiters can use an event QR without writing a note for each person. This is a workflow hypothesis, not a measured claim of time saved.
- **The role view shows passages, not scores.** A small Rust program matches words in requirements to text the candidate supplied. Every result points to an exact source quotation. It does not rank people or infer qualifications.
- **The handoff is concrete.** Role shortlists, follow-up status, batch actions, and spreadsheet export persist on the backend. Planned ATS and communication connectors are separate from these working actions.
- **Ownership crosses the whole flow.** A candidate can update shared work or remove a connection. Download and workspace routes check access server-side; private recruiter status is omitted from candidate responses.

## Run locally

Requires **Node.js 24+**, npm, and a **stable Rust toolchain** with Cargo. Install Rust using [rustup](https://rustup.rs/).

```sh
npm ci
npm run dev
```

`dev` builds the small Rust binary, then starts Express with Vite middleware. Open [localhost:5173](http://localhost:5173). Choose **Recruiter workspace** or **Candidate workspace** to use fictional demo data. Separate browsers or a phone provide independent sessions; switching demos in one browser replaces that browser's session.

No model API key is required. Profiles and workflow state persist in `data/again.sqlite`; uploads stay in `data/uploads/`. These paths and `.env` are ignored by Git.

```sh
npm run build   # Rust release binary + TypeScript + Vite
npm start       # serve the built application
npm run check   # build, Rust tests/fmt/Clippy, HTTP workflow tests
npm run format:check
```

## Architecture

```text
React + TypeScript
  shadcn/ui / Base UI, Geist, Tailwind
          │ same-origin requests + session cookie
Express + SQLite + private local files
          ├── PDF / text extraction
          ├── Rust passage lookup (JSON stdin/stdout)
          └── optional OpenCode Go summary
```

The web server owns authentication, persistence, resource access, QR creation, and uploads. Rust owns the deterministic passage lookup. The binary has no network or database access in its implementation. Node invokes it asynchronously without a shell, with an input limit, output limit, and timeout. It then checks that every quoted result exists in the supplied source.

The retrieval algorithm is deliberately small: tokenize text, normalize a short explicit list of word forms, compare whole words, and select a passage with the most matching terms. Ties favor uploaded work over the profile or recap, then preserve source order. There is no embedding model, vector database, retrieval service, or index to maintain. This implementation makes **no performance claim** over JavaScript; Rust provides a narrow, testable processing boundary and practical experience with Serde, borrowing, errors, and process integration.

The optional model adapter uses a direct HTTP request. It is not responsible for the underlying connection workflow. [Architecture and tradeoffs](docs/architecture.md) covers the contracts and limits; [design system](docs/design-system.md) records the interface decisions.

## Walk through the workflow

1. Open the recruiter workspace. Search for **CRISPR** and open **Aisha Patel**.
2. Read the event recap, choose a role under **Role evidence**, and open the cited material. **Text matches** is the local Rust path.
3. Add the connection to a role shortlist or mark it **Follow-up**. Select multiple rows to change status, save, shortlist, or export together.
4. Open **Share QR** and preview the candidate portal. A candidate can submit a recap, edit their profile, and add a project note or file.
5. Return to the recruiter window or reload it. The updated work is available on the existing connection.
6. Open **Integrations**. CSV export works. Cards marked **Planned** are workflow sketches, not live connections.

For phone testing, use the same Wi-Fi. The local QR chooses the laptop's active `en0`/`en1` IPv4 address on macOS. You can set `PUBLIC_URL=http://YOUR-LAPTOP-LAN-IP:5173` in `.env` for another network setup. The network must allow devices to reach each other. See the [manual verification guide](docs/demo.md).

## Optional OpenCode Go

The [OpenCode Go documentation](https://opencode.ai/v2/docs/console/go) lists model-specific protocols. This adapter uses its OpenAI-compatible **Chat Completions** endpoint.

```dotenv
OPENCODE_API_KEY=your-key-here
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_MODEL=glm-5.2
```

Copy `.env.example` to `.env`, set server-only values, and restart. An OpenAI key is not needed. The configured model must support `/chat/completions`.

With a key, opening a role view sends candidate-provided source excerpts for that person and role to OpenCode Go. The request is capped at 40,000 source characters, with up to 4,500 per source. The key stays on the server. Source IDs, verbatim quotations, and requirement coverage are validated before a generated response is displayed. Cache keys include the role, materials, recap, model, and endpoint. Invalid output, provider failure, or a 25-second timeout returns labeled local matches.

**Live provider verification is pending a key.** Request format, caching, malformed responses, unsupported citations, and failure behavior are tested with controlled responses.

## Tests and constraints

Rust tests cover exact Unicode passages, whole-word boundaries, limited word normalization, deterministic ties, negation preservation, and input limits. Node tests exercise the Rust binary through the real HTTP flow, plus sessions, decoded QR destinations, persistence, PDF extraction, ownership, access revocation, batch atomicity, role ownership, private state, CSV escaping, and the provider adapter. Each HTTP test fixture has its own temporary database and upload directory.

This remains a local prototype. Demo accounts are shared and intended for fictional data. There is no email verification, password reset, upload malware scanning, OCR, audit log, pagination, or production deployment. A submitted recap is not proof that a meeting occurred. Literal word matching misses synonyms and can surface negated claims or learning interests; an exact citation verifies the text's source, not the claim's truth. The application sends no email and makes no hiring decisions.

`DEMO_MODE=false` disables demo access and seed creation for a new database. It does not erase existing demo data; use a fresh `DATA_DIR` for a separate instance.

## Further reading

- [Problem and scope](docs/product.md)
- [Architecture and tradeoffs](docs/architecture.md)
- [Design system and avatar credits](docs/design-system.md)
- [Manual verification](docs/demo.md)
- [Market and relationship research](exa-results/networking-trust-2026-09-19.md)
