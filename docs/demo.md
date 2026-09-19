# Desktop demo rehearsal

This is a roughly three-minute walkthrough using fictional people and project work. No model API key is required. The default role lookup runs locally in Rust.

## Prepare once

```sh
npm ci
npm run build
npm start
```

Open [localhost:5173](http://localhost:5173) and choose **Maya Chen / Recruiter demo**. A fresh database includes Maya at Northstar, Aisha Patel, and five other connections. Existing local records are preserved. Use a separate `DATA_DIR` before starting if you need fresh demo data.

Keep `examples/software-project.txt` ready for upload. Use one desktop browser and the account menu's **Switch to applicant** / **Switch to recruiter** actions. For simultaneous views, use separate browser profiles; ordinary tabs share an account session.

Before recording, open **Share my code**, select **NYU Tech & Design Fair**, and save an image of its QR using the browser's image menu or a screenshot. Keep the entire white border. The applicant scanner accepts an image, so a camera is unnecessary for this rehearsal.

## Three-minute walkthrough

| Time      | Action                                                                                                                                                                                                                   | What to show                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | As Maya, open **Aisha Patel**.                                                                                                                                                                                           | Her name, project work, and the original conversation about offline editing stay together. Return to **Connections** and use **All events** to filter to **NYU Tech & Design Fair**. This filters existing connections. |
| 0:25–0:55 | Open **Share my code** and show the event. Close it, use the account menu to **Switch to applicant**, then **Scan a code → Choose image**. Select the saved QR and **Continue** after checking Maya and the event.       | The applicant confirms the invitation before entering a note. Aisha already has a seeded encounter at this event, so this rehearsal edits that encounter.                                                               |
| 0:55–1:20 | Keep or update the recap, then **Save changes**. Select **Add your work → Upload file** and choose `examples/software-project.txt`.                                                                                      | The saved connection leads directly to Aisha's profile. Open the uploaded file to read its extracted text; **Download original** retrieves the file without leaving the app.                                            |
| 1:20–1:45 | Open **Edit profile** and point out the optional **LinkedIn** field. Save a small headline change, then switch back to the recruiter.                                                                                    | Applicants maintain their own profile and work. Work is visible to their connections. Leave LinkedIn blank unless you have an appropriate URL to supply; the seed does not invent one.                                  |
| 1:45–2:30 | Open Aisha, select **View for a role**, and choose **Product Engineer** in the side panel. Click a source title beneath a quotation. Close the source and use the pencil beside the role selector to edit a requirement. | The human meeting note remains alongside role-specific passages. The source opens with the exact quotation highlighted. Saving the role recomputes the lookup; topics without a passage remain explicit.                |
| 2:30–3:00 | Return to **Connections**, open **Daniel Park**, and choose **Data Engineer**. Point out the email icon, then return and use the account menu's **Export event connections** or **Export connections**.                  | The selected role and open panel persist between people. Contact opens the user's email app or a supplied website; Staylinked does not send a message. CSV export follows the current event filter.                     |

## Repeat or recover

- To demonstrate a new connection instead of editing Aisha's seeded encounter, use **Share my code → New event**, create a clearly named rehearsal event, and capture that event's QR. The applicant's final button is then **Connect**.
- If the code cannot be read, choose a clearer image with its full border. If its invitation no longer exists, ask the recruiter to share the intended event's code again. **New event** creates a separate invitation; it does not rotate an existing code.
- On one computer, keep using `localhost:5173`. There is no Network selector in the interface. Another computer needs a reachable host address configured through `PUBLIC_URL`; that is outside this single-desktop rehearsal.
- Seed email addresses are fictional. Demonstrate the contact controls without sending outreach. A supplied LinkedIn URL gets the LinkedIn icon; other supplied links use a globe.
- Uploads and edits persist. Remove a rehearsal upload through its options menu when finished. A candidate can edit a recap or project note, and the original recap remains available to both people.

## Describe the implementation accurately

The QR establishes access to an invitation; it does not prove that two people met. Recaps, profiles, and work are author supplied. Local role lookup finds literal word matches and exact passages, not a candidate score or a verification of their claims. No chat agent contacts either person. The optional OpenCode Go adapter is separate from this default demo, and live provider verification is pending a key.
