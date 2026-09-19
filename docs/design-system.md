# again-hr interface system

## Direction

A compact recruiting workspace, built with official shadcn/ui components on Base UI. The interface uses Geist Variable, neutral surfaces, a single indigo accent, and visible data instead of decorative copy. No serif display type, greeting banners, slogans, explanatory footers, ornamental icons, or oversized statistics.

## Decisions and research

- [shadcn/ui](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default): owned component source, broad ecosystem, and current Base UI support. The project reports 6M+ weekly Base UI downloads and a 2:1 preference for Base UI in shadcn/create in July 2026. These are the project's adoption measures, not proof that any design is tasteful.
- [Base UI](https://base-ui.com/): accessible primitives from creators of Radix, Floating UI, and Material UI. Selected under shadcn for predictable dialogs, selection, menus, and keyboard handling.
- [Mantine](https://mantine.dev/): strong complete component and hook ecosystem. A viable alternative for an application with more specialized input needs.
- [React Aria](https://react-aria.adobe.com/): a strong accessibility-focused alternative with more assembly required for our visual system.
- [Geist](https://vercel.com/font): a variable sans suited to dense interfaces. Use its normal text cuts, not wide tracking or tiny uppercase labels.

## Tokens

- Text: 14px body, 13px compact rows, 12px metadata, 20–24px page titles. 10–11px is used for compact status badges and supplemental labels.
- Type: Geist Variable; tabular numerals for counts. Geist Mono is available as a utility token.
- Spacing: 4px base; 8/12/16px inside controls and rows; 24/32px page gutters.
- Radius: 6px controls, 8px surfaces, 12px dialogs.
- Color: neutral white/gray surfaces, near-black main text, accessible muted text; indigo for the active selection and primary action.
- Density: 32px compact actions, 36px desktop form controls, 42px mobile fields, and 64–76px person rows.
- Motion: 120–180ms opacity and position changes. Honor reduced motion.

## Information architecture

Recruiter: Connections, Follow-up, Saved, Roles, Events, Integrations. Search and filters stay near the table. Selecting a person opens an inspector with the encounter, relevant sources, work, and recruiter actions. Selection supports batch saving, shortlisting for a role, status changes, and CSV export.

Candidate: Profile, Work, Connections. The QR portal asks for the conversation and a memorable detail, then uses the existing profile or creates an account. Candidate records continue to update existing recruiter connections.

## Workflow under study

The recruiter gets a usable record without taking notes, can search the conversation itself, and can move an existing relationship into a specific role shortlist. Candidate updates appear with timestamps. CSV provides a manual handoff to an existing recruiting workflow.

## Integration boundaries

Greenhouse, Ashby, Lever, Workday, Gmail, Outlook, Slack and calendar connections are deliberately marked Planned. They do not imply an authenticated or active connection. Their details show intended data scopes. CSV export is functional and available today.

The [Greenhouse Harvest API](https://docs.greenhouse.io/harvest.html) supports candidates/prospects, jobs, attachments and candidate notes, including user attribution. The [Ashby developer platform](https://developers.ashbyhq.com/docs/getting-started) provides the integration foundation for its recruiting platform. A production connector must map identities, avoid duplicates, apply permission scopes, and preserve the encounter source and candidate ownership. We do not fabricate a live sync in the prototype.

## Copy contract

Use nouns, values, statuses, dates, and actions. Explain only an error, a consequential sharing choice, or a clearly unavailable integration. Examples: “Connections,” “New,” “Save,” “Add to role,” “Export CSV,” “Conversation,” “Shared Sep 19.” Implementation decisions and limitations belong in the engineering docs. Keep interface copy limited to the task at hand.

## Avatars

Local SVG portraits use [Notionists by Zoish via DiceBear](https://www.dicebear.com/styles/notionists/), licensed CC0 1.0. `npm run avatars:generate` rebuilds the 32 static illustrations. Names choose a stable placeholder; these are decorative illustrations, not user-uploaded photos or identity signals. The generator is a development dependency and no external image service receives names.

Company identities use a local SVG mark beside the name. Helix Bio is fictional and has a custom helix mark; other companies receive a neutral workspace mark. The same component appears in the recruiter sidebar, QR sheet, candidate connections, and event portal. Company logo upload and remote brand lookup are outside this prototype.
