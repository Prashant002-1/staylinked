# Architecture and tradeoffs

## Boundaries

The React client uses one same-origin Express API. Node handles sessions, scrypt password hashes, SQLite, private files, PDF extraction, QR creation, and the optional model call. Rust handles passage matching behind one JSON stdin/stdout contract. The executable has no server, persistent state, vector index, or network client.

A process boundary is easy to inspect and test across languages, but starting a process has overhead. The current on-demand, single-person lookup does not justify a resident service or queue. This choice is not evidence of a speed improvement; measure before changing it.

## Records

- User: authenticated recruiter or candidate, with an editable profile and links.
- Event: owned by a recruiter, with public portal metadata and a candidate prompt.
- Connection: one candidate/event pair, retaining the original and current conversation, memorable detail, interest, and timestamps.
- Material: candidate-owned note or uploaded file, extracted text, extraction state, and timestamps.
- Update: author-owned text visible to the author and people directly connected to them.
- Message: text from one participant in a specific connection, visible to its two participants.
- Role: recruiter-owned title, description, and explicit requirements.
- Brief cache: validated model output keyed by the source and role inputs.

SQLite stores small records as JSON alongside indexed ownership columns. This keeps iteration simple but limits query efficiency as the data grows. People search runs in the client over authorized connections. Update and message reads return bounded results; pagination remains future work.

## Relationship access

The connection graph currently joins a recruiter and candidate. It does not expose candidates to other candidates or make a recruiter's whole network visible. A connection grants access to that person's shared profile and, for recruiters, the candidate's materials. The only unauthenticated relationship entry point is an event portal with the recruiter's limited introduction and event details. There is no public profile directory or discovery endpoint.

`GET /api/updates` returns the latest 100 updates authored by the signed-in user or their direct connections. Feed author objects omit email addresses. Authors can create, edit, and delete their own updates, with a 3,000-character text limit.

Messages belong to a connection, not a global inbox address. Its two participants can read and write messages; reads return the latest 100 in chronological order, and messages are limited to 4,000 characters. The application sends no email or automated outreach.

Either participant can remove a connection. Its messages are deleted with it. Feed and download access disappear when no other connection between those people remains. Removing a connection does not delete the other person's profile, updates, or work. The author retains those records.

Both account types can edit their own profile. Candidates can edit the title and text of their notes. Uploaded documents remain unchanged; replacing one means uploading the new file and deleting the old one. Local file storage is outside the public static directory, and downloads check access on every request.

These are implemented access boundaries, not a claim of complete production security. Shared demo accounts are unsuitable for private personal information.

## Rust retrieval

`rust/src/lib.rs` exposes typed `Request`, `Source`, `Finding`, and `Response` structures. Serde derives JSON serialization. Input validation returns a `Result`; the CLI writes a concise error to stderr and exits unsuccessfully for invalid input. Library tests exercise the algorithm without starting a process.

1. Validate 1–12 requirements and at most 22 sources. Requirements are capped at 200 characters and source text at 18,000 characters. The CLI caps total stdin at 2 MB.
2. Split source text into borrowed sentence or line slices. Quotations are never rewritten.
3. Lowercase and tokenize, remove a fixed stop list, and normalize a short explicit list of word forms.
4. Count matching whole words for each requirement. Prefer greater coverage, then a passage of at least nine words. Work precedes the profile and recap in equal conditions; other ties preserve source order.
5. Return the original requirement, source ID, quotation, and matching terms. No match returns null source and quote.

Node invokes the binary with `execFile`, no shell, a three-second timeout, and a one-megabyte output buffer. Node validates source IDs, exact quotations, and requirement order again at the process boundary.

The matcher does not understand meaning, infer qualifications, or detect deception. A sentence such as “I have no Kubernetes experience” can match Kubernetes. The original passage remains visible so the reader can interpret it. Private messages and updates are not added to the role lookup corpus; the inputs remain the candidate's recap, profile, and work.

Patterns consulted: [Rust Result-based error handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html), [Rust test organization](https://doc.rust-lang.org/book/ch11-03-test-organization.html), and [Serde derives](https://serde.rs/derive.html).

## Optional model adapter

OpenCode Go is an optional Chat Completions provider. Bounded excerpt selection constructs at most 40,000 characters of context. A result must contain each role requirement exactly once and only quote provided source text. It is validated against both the full sources and the smaller model context. This establishes quotation provenance, not factual truth or summary accuracy.

The model has no tools, write actions, or message-sending capability. Source documents are treated as untrusted input. Failed validation, provider errors, or timeout fall back to Rust text matches. The API key stays in server environment variables. Real-provider behavior and cost have not been measured.

## Export

CSV export checks ownership of every selected connection, escapes cells, and prefixes spreadsheet formula-like values. It exports the encounter and contact information without a status, saved flag, or shortlist. Import mapping remains the receiving system's responsibility. Live ATS, email, and calendar connectors are not implemented.
