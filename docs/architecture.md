# Architecture

## Application and records

React calls a same-origin Express API. Node handles cookie sessions, scrypt password hashes, SQLite, private files, PDF extraction, QR creation, and optional model requests.

The JSON client applies a 30-second deadline through response-body reading. A caller's earlier cancellation still takes priority; QR reads use 12 seconds. Timers and abort listeners are released after completion. Requests are not retried automatically. If a mutation times out or its response cannot be read, the interface explains that it may have saved and asks the user to refresh before retrying.

SQLite stores JSON records alongside indexed ownership columns: users, recruiter-owned events and roles, candidate-owned materials, candidate/event connections, and a cache of validated role summaries. A connection retains the original and current recap, memorable detail, interest, and timestamps. This storage model keeps iteration small; pagination and more structured querying remain future work.

Both account types can edit their own profile. Candidates can edit note titles and text or replace an uploaded document in place. Replacement preserves the material ID and original creation date, records an updated date, and changes the inputs used for role context. Validation, extraction, and persistence failures leave the previous document intact; overlapping changes are rejected before saving. The obsolete file is removed only after its replacement is stored. Files live outside the public static directory, with authorization checked on each download.

## Access

Authenticated connection routes expose a person's shared profile and, to a connected recruiter, the candidate's materials. The event portal exposes only its public event metadata and a limited recruiter introduction. There is no public profile directory.

Either participant can remove a connection. Access remains only if another connection between those people still grants it. Removing a connection does not delete the other person's profile or work. Contact actions use existing email and web links; the server does not send outreach.

The client includes its current account ID in API requests. If another tab has changed the shared session cookie, the server rejects the mismatched request before reading or writing private records. Focus and visibility refreshes reconcile the session, and responses from an earlier account are discarded. This consistency check supplements session authentication.

CSV export validates ownership of selected connections, escapes cells, and prefixes spreadsheet formula-like values. Import mapping is the receiving system's responsibility. Shared demo accounts are unsuitable for private personal information.

## QR reader

The browser decodes camera frames or a selected image with `jsQR`. Camera access starts only after **Use camera** is selected and requires a secure browser context. Image selection remains available when a camera cannot be used. Media tracks, animation frames, pending lookups, and temporary image URLs are released when scanning stops or the dialog closes. Finding a code stops capture before looking up the invitation. Lookup reads time out after 12 seconds and can be retried.

The decoder accepts an invitation-shaped `/connect/:id` path, extracts only the event ID, and requests the current application's portal endpoint. It never fetches or navigates to the host encoded in the QR. A valid local event is shown for review; **Continue** opens its local connection route. Physical-camera behavior has not been tested.

## Rust passage lookup

`rust/src/lib.rs` defines typed `Request`, `Source`, `Finding`, and `Response` structures. Serde handles JSON. Validation returns a `Result`; the CLI reports invalid input on stderr and exits unsuccessfully.

1. Accept 1–12 requirements and at most 22 sources. Requirements are capped at 200 characters, source text at 18,000 characters, and total stdin at 2 MB.
2. Split source text into borrowed sentence or line slices, preserving quotations.
3. Tokenize whole words, remove a fixed stop list, and normalize a short explicit list of word forms, including APIs to API and Golang to Go. Ordinary tokens are case folded. The short technical tokens `C`, `R`, `C#`, `ML`, `UI`, `UX`, and `AI` require their canonical capitalization; `C`, `C#`, and `C++` remain separate tokens.
4. Count matching whole words. Prefer greater coverage, then a passage of at least nine words. Work precedes the profile and recap in equal conditions; remaining ties preserve source order.
5. Return the requirement, source ID, quotation, and matching terms. An unmatched requirement has null source and quote.

Node invokes `staylinked-evidence` with `execFile`, no shell, a three-second timeout, and a one-megabyte output buffer. It validates source IDs, exact quotations, and requirement order again at the process boundary. Inputs are the candidate's recap, profile, and work.

Before returning a pending role lookup, the server rechecks the connection and current sources. A removed connection or changed source set invalidates that response.

A requirement may name `Go` directly. A source must use `Go` with adjacent coding wording, such as “Go API”, “Go services”, or “in Go”; lowercase everyday “go” and “Go to…” do not match the language. `Golang` is an explicit alias. These conservative rules can miss lowercase acronyms or a standalone Go skill-list entry. The optional model excerpt selector uses the same vocabulary. This is a small literal vocabulary, not language understanding.

The executable has no database, network client, or index. Starting a process adds overhead, so this boundary does not imply a speed improvement. A sentence such as “I have no Kubernetes experience” can match Kubernetes; the reader must interpret the passage. Literal matching does not establish qualifications.

References: [Rust error handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html), [test organization](https://doc.rust-lang.org/book/ch11-03-test-organization.html), and [Serde derives](https://serde.rs/derive.html).

## Optional OpenCode Go adapter

The Chat Completions adapter constructs at most 40,000 source characters, with up to 4,500 per source. A result must contain each role requirement exactly once and quote only supplied text. Validation checks both the full sources and the smaller model context. Cache inputs include the role, materials, recap, model, and endpoint.

The key stays in server environment variables. The model has no tools or write actions. Invalid output, provider errors, and a 25-second timeout fall back to Rust matches. A short failure category is returned for diagnostics without provider response bodies. Quotation provenance does not establish factual truth or summary accuracy.

GLM-5.3 uses `reasoning_effort: low` for this bounded organization task. Its [documented default is maximum reasoning](https://docs.z.ai/guides/llm/glm-5.3); reasoning remains enabled. Requests identify Staylinked through its user agent and carry a stable opaque session hash for the person, encounter, and role, following [OpenCode Go's client guidance](https://opencode.ai/docs/go/). No external provider SDK is needed.

`npm run provider:check` runs an opt-in live check against the seeded fictional Aisha/Product Engineer fixture in an in-memory database. It checks citation validity and cache reuse, and prints status metadata without credentials or source text. It does not read or modify the user's stored records. Real-world latency and cost have not been benchmarked.
