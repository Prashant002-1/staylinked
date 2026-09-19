# Manual verification guide

Use fictional data. Run `npm run check`, then `npm start`. The page title and placeholder name are `again-hr`.

## Recruiter workflow

1. Choose **Recruiter workspace**. Confirm that six seeded connections load.
2. Search **CRISPR**. Open Aisha's profile; confirm that the event and candidate recap appear first.
3. Select **Research Lab Technician** under **Role evidence**. Open a quoted source and confirm that the passage appears verbatim.
4. Choose a different role. Confirm that the requirements and passages change. Missing text must not become a qualification judgment.
5. Add the person to a role shortlist, close the panel, and open **Roles**. The shortlist count and filtered connections should agree after reload.
6. Select two rows. Set their status to **Follow-up**, save them, and export. Confirm that only selected records appear in the CSV.
7. Open **Follow-up** and **Saved**. Confirm the backend state survives a reload.

## Candidate workflow

1. Open **Share QR** and select an event. Decode the QR or use **Preview**.
2. On a separate browser or phone, create a candidate account and submit a specific recap. A single browser shares its session; use the portal's demo switch for a one-browser check.
3. In **Profile**, edit a field and save. In **Work**, add a note or small text PDF.
4. Return to the recruiter window or reload. Search for the candidate and inspect the new material.
5. Edit the recap. In the recruiter panel, **Activity** should retain the original conversation.
6. Remove a test connection. That recruiter should lose access through it. Another connection to the same recruiter may continue to grant access.

## UI states

Check desktop and 390px mobile widths: navigation, scrollable table, person panel, role selection, QR dialog, profile form, and portal. Check Escape and keyboard focus in dialogs and menus. Empty searches should offer a useful recovery action. Form failures should leave entered values intact.

**Integrations** must label Greenhouse, Ashby, Lever, Workday, Gmail, Outlook, Slack, and Google Calendar as **Planned**. No sync should be represented as active. CSV export is the working handoff. Email opens the user's mail client; do not send a message during testing.

## Model boundary

Without a key, the UI displays **Text matches**, returned by Rust. With a compatible OpenCode Go key, the server can request a source summary. Live provider verification is pending. Controlled-response tests cover the adapter contract, caching, unsupported citations, malformed output, and fallback.

## Network setup

Phone and laptop must share a reachable network. The QR uses the laptop's local address, or `PUBLIC_URL` when configured. A network with client isolation may require a hotspot. Local preview is not a deployed public site.
