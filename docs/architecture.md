# Architecture and tradeoffs

## Boundaries

The React client uses one same-origin Express API. Node handles sessions, scrypt password hashes, SQLite, files, PDF extraction, QR creation, and the optional model call. Rust handles passage matching behind one JSON stdin/stdout contract. The executable has no server, persistent state, vector index, or network client.

A process boundary is easy to inspect and test across languages, but launching a process has overhead. This is acceptable for a prototype's on-demand, single-person view. It is not evidence of a speed improvement. Measure before replacing it with a resident process, FFI, or a service. There is no need for a queue or distributed architecture at this stage.

## Records

- User: authenticated recruiter or candidate; candidate profile and links.
- Event: owned by one recruiter; public portal metadata and candidate prompt.
- Connection: one candidate/event pair; original and current conversation, memorable detail, interest, timestamps. Recruiter-only status, saved flag, and role IDs live on this record.
- Material: candidate-owned note or uploaded file, extracted text, extraction state, timestamp.
- Role: recruiter-owned title, description, and explicit requirements.
- Brief cache: validated model output keyed by the source and role inputs.

SQLite stores these small records as JSON alongside indexed ownership columns. This keeps iteration simple but limits query efficiency as datasets grow. The current workspace loads all authorized connections and searches in the browser; pagination and server-side search are future work.

## Rust retrieval

`rust/src/lib.rs` exposes typed `Request`, `Source`, `Finding`, and `Response` structures. Serde derives JSON serialization. Input validation returns a `Result`; the CLI writes a concise error to stderr and exits unsuccessfully for invalid input. Library tests exercise the algorithm without starting a process.

1. Validate 1–12 requirements and at most 22 sources. Requirements are capped at 200 characters and source text at 18,000 characters. The CLI caps total stdin at 2 MB.
2. Split source text into borrowed sentence/line slices. Quotations are never rewritten.
3. Lowercase/tokenize, remove a fixed stop list, and normalize a short explicit list such as `cells → cell`.
4. Count matching whole words for each requirement. Prefer greater coverage, then a passage of at least nine words; equal passages preserve order. Work precedes the profile and recap in equal conditions.
5. Return the original requirement, source ID, quotation, and matching terms. No match returns null source/quote.

Node invokes the binary with `execFile`, no shell, a three-second timeout, and a one-megabyte output buffer. Node validates source IDs, exact quotations, and requirement order again at the process boundary. The fallback mode is labeled **Text matches** in the UI.

The matcher does not understand meaning, infer qualifications, or detect deception. It intentionally preserves a sentence such as “I have no CRISPR experience.” That is a text match, not a positive assessment. The UI shows the original passage so the recruiter can read it.

Patterns consulted: [Rust Result-based error handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html), [Rust test organization](https://doc.rust-lang.org/book/ch11-03-test-organization.html), and [Serde derives](https://serde.rs/derive.html).

## Optional model adapter

OpenCode Go is an optional Chat Completions provider. A separate, bounded excerpt selection step constructs at most 40,000 characters of context. A result must contain each role requirement exactly once and only quote provided source text. It is validated against both the full sources and the smaller model context. This establishes quotation provenance, not factual truth or summary accuracy.

The model has no tools, write actions, or message-sending capability. Source documents are treated as untrusted input. Failed validation, provider errors, or timeout fall back to Rust text matches. The API key stays in server environment variables. Real-provider behavior and cost have not been measured.

## Access and handoff

Every private connection, role, material, and download route checks session identity and ownership. Candidate responses strip recruiter-only workflow state. Batch mutations validate the entire ID set and role ownership before a SQLite transaction; partial updates are not allowed. CSV export uses the same ownership checks, escapes CSV cells, and prefixes spreadsheet formula-like values.

Candidate removal revokes access through that connection. A separate connection to the same recruiter continues to share the profile. Local file storage is outside the public static directory. No claim is made that these controls are a complete production security system.

## Integration sketches

The UI catalogs proposed ATS and communication handoffs. None is connected. A real connector would need explicit account authorization, field mapping, duplicate handling, ownership semantics, and sync failure behavior. CSV is intentionally the only implemented external-system handoff in this version. It still requires mapping columns to the receiving system's import format.
