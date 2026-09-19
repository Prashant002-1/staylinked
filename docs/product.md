# Problem and scope

`again-hr` is a temporary name for a prototype built around the information lost between an in-person conversation and a later recruiting decision.

## Scenario

A candidate and recruiter discuss CRISPR delivery at a university career fair. The recruiter has a reason to remember this person beyond a résumé. Weeks later, a lab role opens. The useful record is the conversation, the candidate's relevant work, and how to contact them.

A résumé scanner does not capture that encounter. A contact exchange alone does not retain what made it relevant. Existing recruiting CRMs and networking tools already address parts of this problem; this prototype explores a particular division of effort and record structure, without claiming the category is new.

## Design decisions

| Problem                                                 | Implemented choice                                                      | Remaining limitation                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Recruiter cannot write notes on every person            | Candidate records the recap after scanning an event QR                  | Candidate must complete a short form and authenticate          |
| A useful interaction becomes difficult to reconstruct   | Preserve the event, original recap, current recap, and shared materials | Candidate-authored context is not proof of attendance          |
| A new role changes what matters                         | Show exact source passages for selected role requirements               | Literal matching misses meaning and synonyms                   |
| Existing recruiting systems remain the system of record | Persist shortlists/status and export selected connections to CSV        | ATS-specific import mapping and live sync are not built        |
| Candidate work changes after the event                  | Reusable profile and materials feed existing connections                | No email or push notification system                           |
| Data should remain under the candidate's control        | Authenticated updates, removal, and server-side access checks           | Another connection with the same recruiter still grants access |

## Working scope

Recruiter workspace: searchable connections, event/status filters, new/updated views, saved records, follow-up queue, role-specific shortlists, batch actions, CSV export, event creation, and QR sharing.

Candidate workspace: profile, links, skills, project notes, PDF/TXT/Markdown uploads, connection recaps, updates, and removal.

Evidence: a Rust executable for bounded word matching, plus an optional OpenCode Go adapter. Both return sources. Neither assigns candidate confidence, ranks people, verifies identity, or decides whom to contact.

## Questions for a small usability study

Can candidates record the useful detail without rewriting their résumé? Can recruiters locate a remembered person weeks later? Does source visibility help them assess a role without reading every file? Does the CSV handoff fit their existing process?

Measure time on those tasks and observe errors. No measured recruiting outcome, time saving, or trust improvement is claimed by this repository.
