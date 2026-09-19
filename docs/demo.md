# Manual verification

Use fictional data. Run `npm run check`, then `npm start`. The page title is Staylinked. A fresh database includes Maya Chen at Northstar and six people working in software, design, and data. Existing databases are preserved; use a separate `DATA_DIR` for a clean set of examples.

## People and conversations

1. Enter as the recruiter. Confirm that People shows connected people without a company header, sidebar, status controls, or bookmarks.
2. Search for Aisha Patel and open her profile. Read the NYU Tech & Design Fair encounter and her work on offline-first software.
3. Send a short test message. Open the candidate account in a separate browser and confirm that the message appears in the same connection. Reply and check the recruiter view.
4. Reload both sides. The encounter and messages should persist.
5. With an unrelated test account, request that connection's messages and materials. The server must deny access.

## Updates and profile edits

1. Share a short update as the candidate. Confirm it appears for the connected recruiter and the author.
2. Edit the update, then reload the recruiter view. Confirm that the edit persists. An unrelated account must not see it.
3. Edit a profile field on each account type and save. Check the changed introduction from the other side.
4. Add a candidate project note, then edit its title and text. Upload a small PDF or text file and open it from the recruiter's view.
5. Delete a test update and note. Confirm their removal after reload. Another user must not be able to edit or delete them.

## Meeting someone new

1. Share the recruiter's event QR and preview its destination.
2. On a separate browser or phone, create a candidate account and submit a specific recap. One browser shares one session, so switching accounts replaces that session.
3. Confirm that both people can find their new connection.
4. Edit the recap. The original encounter should remain available.
5. Remove this test connection from either side. Its message history should disappear. Updates and file access must end when there is no other connection between those people.

## Work and role lookup

1. From a person's view, choose the Product Engineer role and inspect a quoted passage.
2. Confirm the quote appears exactly in the referenced source.
3. Choose Data Engineer. Requirements and passages should reflect the new role.
4. A missing match must not turn into a qualification judgment. The UI must not assign a person a score or ranking.
5. Export selected connections if testing CSV. Confirm the file contains only authorized records, without status or saved columns.

## Interface states

Check desktop and 390px phone widths: header navigation, People, Updates, profile editing, conversations, upload controls, event sharing, and the QR portal. Check Escape, keyboard focus, and visible focus rings in dialogs and menus. Empty searches should allow recovery. Form errors should preserve entered values, and long names or messages should not cause horizontal overflow.

## Model boundary

Without a key, role lookup uses local Rust word matching. With a compatible OpenCode Go key, the server can request a source summary. Live provider verification is pending. Controlled-response tests cover request shape, caching, unsupported citations, malformed output, and fallback. Messages and updates should never trigger model calls.

## Network setup

Phone and laptop must share a reachable network. The QR uses the laptop's local address, or `PUBLIC_URL` when configured. Set `PUBLIC_URL=http://YOUR-LAPTOP-LAN-IP:5173` in `.env` if automatic address selection does not fit the network. A network with client isolation may require a hotspot. Local preview is not a deployed public site.
