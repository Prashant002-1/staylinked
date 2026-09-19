# Two-minute desktop demo

The demo addresses **Side A: Trust coming in, the applicant flood**. Preserve the context behind a recruiter's prior human impression through a candidate-authored meeting note and inspectable work. When applications arrive, the recruiter can revisit people already met. This covers existing encounters, not every application; recruiter time savings have not been measured.

Use fictional **Maya Chen**, recruiter at Northstar, and **Aisha Patel**, applicant. Keep uploads, event creation, account setup, and role lookup warmup outside the two-minute clock.

## Before the clock

1. Start the local app and open [localhost:5173](http://localhost:5173). Use the recruiter/applicant demo accounts. Ordinary tabs share a session: switch accounts in one active tab, rather than treating two tabs as independent users. Keep existing records; no database reset is needed.
2. As Aisha, use **Your profile** to check her headline and the seeded **Wayfinder · building an offline trip planner** note. If you want an uploaded file in the demo, upload `examples/software-project.txt` now. Finish all profile/work edits before warming the role lookup. Leave LinkedIn blank unless an appropriate URL is supplied.
3. Switch to Maya. Use **Share my code → New event** to create **Desktop rehearsal** with today's date. Save a screenshot of its QR, including the full white border, and copy its invitation link. QR capture and image scanning are preparation, not timed steps.
4. Use **Preview → Try as an applicant**. Submit the detail and recap below once. This prepares a repeatable encounter; the timed run will use **Save changes**, not pretend to create a second connection.
5. Switch back to Maya, open Aisha, choose **Desktop rehearsal** in **Meeting** if needed, then **View for a role → Product Engineer**. Wait for passages, open a source, and check its highlighted quotation. Keep the same profile, work, role, and recap for the live run. Return to **Connections** and choose **Desktop rehearsal** in the event filter.
6. Start as Maya with the QR dialog closed. Have the two short texts below ready to paste. Rehearse once with a timer; wait at each boundary if ahead. **Preview** stays in the same tab, so the entire timed path uses one window.

**A detail to remember**

```text
The trip planner that still works on the subway
```

**Meeting recap**

```text
We talked about Wayfinder's offline editing queue and the merge preview for conflicting changes. You mentioned Northstar's collaborative editing work. I explained how I tested interrupted sync and duplicate requests.
```

## Timed actions

| Time      | Action                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | As Maya, click **Share my code**. Show **Desktop rehearsal**, then **Preview**.                                                                           |
| 0:15–0:45 | Click **Try as an applicant**. Show Aisha's specific detail and recap. Paste the prepared text if needed, then **Save changes**.                          |
| 0:45–1:00 | Click **Add your work**. Briefly show the already-prepared Wayfinder note in **Your work**.                                                               |
| 1:00–1:20 | Account menu → **Switch to recruiter**. Open **Aisha Patel**. Show the rehearsal's human meeting note; choose that meeting if necessary.                  |
| 1:20–1:50 | Click **View for a role**, select **Product Engineer**, then click a source title beneath a quotation. Show the highlighted passage and close the source. |
| 1:50–2:00 | Point to or hover over Aisha's **email icon**. Leave the profile on screen and finish at 2:00. Do not open the mail app or send outreach.                 |

## Spoken script

**0:00–0:15**

> When applications flood in, a recruiter may already have met someone worth revisiting. I built Staylinked to preserve that prior impression. Maya shares her event QR with Aisha; I’m opening the invitation directly for this desktop demo.

**0:15–0:45**

> Aisha records the detail Maya will remember: the trip planner that still works on the subway. She explains their discussion about offline editing and conflicting changes. This is her account of the conversation. I prepared this encounter earlier, so I’m saving the same note.

**0:45–1:00**

> Aisha maintains her own profile and work. Maya is not asked to write hundreds of recaps. This connection can develop after the event, as Aisha adds material.

**1:00–1:20**

> Back as Maya, I see that specific conversation alongside Aisha’s work. The useful memory survives beyond a name and a resume. Neither person needs to recreate their introduction when a relevant role opens.

**1:20–1:50**

> For Product Engineer, the model helps organize role context around supplied work. I can open the source and inspect the exact quotation. Rust provides local passage lookup when the provider is unavailable. React and SQLite handle the interface and records. Maya still judges what the experience means.

**1:50–2:00**

> Maya can reach out herself. When the flood arrives, start with people already met. The QR establishes access and context, not verified identity, truth, or endorsement.

## Short fallbacks

- **Camera or QR image unavailable:** use **Preview** or the copied invitation link. This is the same invitation route. The timed path does not require a camera.
- **Provider unavailable:** use the local Rust lookup. No model key is required for it. Replace the script's model sentence with, “For Product Engineer, local Rust lookup finds passages in the supplied work.” The app falls back after a provider failure, but avoid waiting on a live timeout: check the prepared result before starting. If lookup still stalls, open the existing Wayfinder note directly and say, “Here is the underlying work; the role lookup is unavailable for this run.”
- **Provider status:** `npm run provider:check` uses the fictional Aisha/Product Engineer fixture. A live OpenCode Go `glm-5.3` check returned HTTP 200 and valid exact quotations for all four requirements. The fresh lookup took 3,906 ms with lightweight reasoning; repeating it reused the cache with only one network request across both lookups. This is one observation, not a latency guarantee. Warm the actual demonstration encounter separately before starting.

The people and work are fictional demo data. Contact controls use supplied details; the seed has no invented LinkedIn URL. Author-supplied material and cited passages are evidence to read, not verified claims or hiring scores.
