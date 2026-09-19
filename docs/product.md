# Problem and scope

Staylinked is an HR hackathon submission about maintaining a relationship after meeting in person.

## Scenario

At a university career fair, a candidate describes an offline-first application they built. Maya, a talent partner at the fictional software company Northstar, remembers their explanation of a difficult synchronization bug. There may be no suitable opening that day. Weeks later, the candidate has shipped another version, and Maya's team is looking for someone with related experience.

The useful record is the person, the conversation, and what has changed since they met. The app keeps those together. The candidate records the initial recap after scanning a QR, both people can share updates, and a private conversation lets them pick things up later.

Existing recruiting CRMs and networking tools address parts of this problem. This project explores a small set of relationship interactions and a particular division of effort, without claiming that the category is new.

## Design decisions

| Problem                                                      | Implemented choice                                                                         | Limit                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| A recruiter cannot take detailed notes on every conversation | The candidate records a short recap through an event QR                                    | The candidate still needs to complete the form and authenticate   |
| The memorable detail disappears among contact exchanges      | The encounter stays attached to the person, preserving the original recap                  | Author-supplied context does not verify attendance                |
| A profile goes stale after meeting                           | Both people can update their profile and share updates with their connections              | There is no email or push notification service                    |
| Reconnecting requires finding the old email thread           | Each connection has a private conversation                                                 | Messages stay inside the app                                      |
| Work becomes relevant to a new role                          | Exact passages from candidate-supplied work can be inspected against role requirements     | Literal matching misses meaning and synonyms                      |
| A public network introduces unwanted exposure                | People and updates are limited to direct connections, with no public profiles or discovery | Another connection with the same person continues to grant access |

## Working scope

Both sides have People, Updates, an editable profile, and private conversations. Candidates add project notes, upload PDF/TXT/Markdown files, and edit their encounter recap. Recruiters create event portals, share QR codes, and inspect a person's supplied work for a role. Either person can remove a connection.

People can search their connections without assigning them statuses, saved flags, or bookmarks. Company information belongs in a person's introduction where relevant; the company does not become the application's navigation or branding.

The Rust matcher and optional OpenCode Go adapter return sources. Neither ranks people, verifies identity, assigns candidate confidence, or decides whom to contact. There is no public feed, automated messaging, or lie detection.

## Questions for a small usability study

Can candidates record the useful detail without rewriting their résumé? Can either person find a remembered conversation weeks later? Is it easy to share a small update or restart the conversation? Can a recruiter inspect relevant work without reading every file?

Measure time on those tasks and observe errors. No recruiting outcome, time saving, or trust improvement has been measured by this project.
