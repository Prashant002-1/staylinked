# Again

Good conversations go somewhere.

A recruiter meets someone worth remembering. A QR connects them. The candidate writes the recap and shares their work. When a role opens, the recruiter can pick up the conversation with the relevant evidence in view.

Built as a working prototype for the **Trust in the Hiring Funnel** hackathon in New York. This explores the incoming-candidate problem through relationship context and sourced work, rather than applicant scores.

## Run it

Requires **Node.js 24 or later** and npm.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). Choose a recruiter or candidate demo. All seeded people, companies, encounters, and research materials are fictional. You can also create your own local account.

No API key is needed to use the prototype. Data persists in `data/again.sqlite`; uploads stay in `data/uploads/`. Both are excluded from Git.

For the built version:

```sh
npm run build
npm start
```

## What works

- Recruiter workspaces, event portals, real QR codes, and candidate accounts.
- Candidate-authored conversation recaps with the original submission preserved.
- Reusable profiles, project notes, external links, and PDF/TXT/Markdown uploads.
- Search by name, conversation, or extracted work; filter by event or saved people.
- Role-specific source passages, including gaps in the supplied material.
- Recruiter acknowledgment, saved connections, and an email link to their own mail client.
- Fresh work indicators when a candidate adds material after meeting.
- Candidate removal of materials and connections, with access checks on every private file.
- Server-side OpenCode Go adapter with citation validation, caching, and an explicit local fallback.

The application sends no email. The recruiter decides whether to reach out and writes the message themselves.

## A two-minute demonstration

1. Enter **Explore as a recruiter**. Open Aisha's connection and the CRISPR conversation.
2. Click **Share your QR**. Scan it on a phone using the same Wi-Fi as the laptop. Create a candidate account, write a memorable detail and a short recap, and save the connection.
3. Add a project note or PDF in the candidate workspace. Return to the recruiter and click Refresh, or refocus the window.
4. Find the new connection. Select **Research Lab Technician** and open a cited source. Show exactly what was supplied and what remains unknown.
5. Switch to **Research Software Engineer**, open Jun, and show how the work in view changes with the role.
6. Add a new role to demonstrate rediscovery later. Save the person or open the email link to continue the relationship.

For a one-computer demonstration, use **Open portal** in the QR dialog. If you are already signed in as a recruiter, the portal offers a candidate demo or sign-out option. Demo-side switches share the same browser session. Use a separate browser or a phone for simultaneous independent sessions.

### Phone QR links

On macOS, the server uses the active `en0`/`en1` IPv4 address for a QR opened from localhost. For other networks or platforms, set the address explicitly:

```sh
cp .env.example .env
```

Set `PUBLIC_URL=http://YOUR-LAPTOP-LAN-IP:5173` in `.env` and restart. Phone and laptop must be on a network that allows devices to reach one another. An event network with client isolation may require a hotspot or a separately hosted instance. The portal also exposes a copyable link.

## Add OpenCode Go later

The [official OpenCode Go endpoint documentation](https://opencode.ai/v2/docs/console/go) lists model-specific protocols. Again uses the **OpenAI-compatible Chat Completions** route, not the OpenCode CLI or an OpenAI API key.

Set these server-only values in `.env`:

```dotenv
OPENCODE_API_KEY=your-key-here
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_MODEL=glm-5.2
```

Restart the server. You can change the model to another Go model supporting `/chat/completions`. Models that only support `/messages` or `/responses` need a different adapter.

Without a key, the role view is labeled **Local source matches**. It uses keyword matching and light word normalization, not AI reasoning, qualification judgments, or scores. It can surface negated claims or expressions of interest; read the quoted passage. With a key, candidate-provided source text for the selected person and the selected role is sent to OpenCode Go when the recruiter opens that brief. The key never reaches the browser.

AI findings must cite a supplied source and include a verbatim excerpt that exists in it. Invalid responses, provider errors, or a 25-second timeout fall back to labeled local matches. Briefs are cached by role, candidate material, and model. A request includes at most 40,000 characters of source excerpts, with up to 4,500 per source, to bound cost and latency. The brief covers those supplied excerpts, not a guaranteed exhaustive reading of every document. A live provider call has not been verified because the key will be supplied later. Adapter tests use controlled responses and failure cases.

## Verification

```sh
npm run check
npm run format:check
```

The test suite exercises registration and sessions, exact QR decoding, the candidate-to-recruiter flow, persistent records, upload/download access, original recap preservation, multiple roles/events, revocation, cross-origin rejection, provider request shape, cache invalidation, invalid citations, and provider failures. Tests use isolated temporary databases.

## Implementation

- **React + TypeScript + Vite:** responsive list/detail recruiter workspace and mobile candidate flow.
- **Express + Node SQLite:** a small server with on-disk persistence, scrypt password hashes, and HTTP-only session cookies.
- **Local file storage + PDF parsing:** text extraction for the first 30 PDF pages, capped at 60,000 characters. Image-only or unreadable PDFs remain downloadable and are labeled as needing a supporting note. No OCR.
- **OpenCode Go:** a direct server-side API adapter, with no provider SDK required.

See [product decisions](docs/product.md), [the demo and pitch](docs/demo.md), and [market research](exa-results/networking-trust-2026-09-19.md).

## Prototype boundaries

This is a local demonstration, not a production recruiting system. Demo accounts are intentionally shared and one-click accessible. Use fictional data in them. `DEMO_MODE=false` disables demo access and seeding for a new database. Existing demo data remains on disk; use a fresh `DATA_DIR` for an independent instance.

There is no email verification, password recovery, malware scanning, consent audit, ATS integration, or identity/claim verification. A submitted recap is not proof of an encounter. A recruiter's “I remember this” acknowledgment is not an endorsement or hiring decision. Candidate updates do not guarantee a reply. Uploaded material and summaries are candidate-provided or generated, not independently verified facts.

The public repository contains code and fictional seed data. It does not publish local profiles, uploads, session data, or API keys.
