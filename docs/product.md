# Again

Good conversations go somewhere.

## The product promise

A recruiter shares a QR after a meaningful conversation. The candidate supplies the memory and evidence. When a role opens, the recruiter can find the person, recall the encounter, and inspect relevant work without reconstructing the relationship from an inbox.

## Prototype decisions

- Recruiter shares one event portal. No installation or account is needed just to see it. Candidates create a password-protected profile before submitting or use the fictional demo profile.
- A connection contains candidate-authored conversation context, the event, a timestamp, and the original submission. It is a reported encounter until the recruiter acknowledges remembering it. A QR scan proves neither attendance nor endorsement.
- Profile, text notes, links, and PDF/text uploads remain candidate-owned. Updates appear on existing connections. Original encounter context stays visible.
- Recruiter can search, filter by event and saved people, acknowledge a conversation, and save someone for later. No requirement to write notes.
- A role lens maps requirements to cited excerpts. The default local mode uses literal term matching, clearly labeled. Optional OpenCode Go summaries use the same source contract. Neither mode ranks people or makes a hiring recommendation.
- Recruiter composes contact in their own email client. Again sends no messages automatically.
- The demo includes fictional lab-research and engineering profiles so changing roles meaningfully changes the evidence surfaced.

## Deliberately outside this demo

Lie detection, identity verification, applicant scores, autonomous outreach, live ATS integrations, scraped LinkedIn data, external link verification, and behavior-based inference. No claim of measured time savings until a pilot measures it.

## Technology

React + TypeScript + Vite for the interface. Express and Node SQLite for a small single-process server. Uploaded material stays on local disk outside the public folder. Session cookies and per-resource ownership checks protect both sides. Server-side OpenCode Go integration can be enabled later without rebuilding the UI.

## Design

Warm editorial utility: forest green, pale citrus, warm paper, a readable humanist sans, restrained serif headings. Desktop prioritizes an efficient list-detail workspace; mobile prioritizes the candidate's one-minute connection and durable profile.

## Demonstration

1. Enter the recruiter demo and display the event QR.
2. Open the candidate portal on a phone or the included preview link.
3. Create a candidate profile, capture a memorable CRISPR conversation, and upload supporting material.
4. Return to the recruiter workspace and find the new connection.
5. Select a lab role, view cited relevant material, then switch to an engineering role to demonstrate what changes.
6. Save the candidate and open a human-written email in the recruiter's mail app.
