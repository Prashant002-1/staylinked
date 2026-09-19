# Staylinked interface

## Direction

A private relationship app, built with owned shadcn/ui components on Base UI. People and their work lead the interface. The shell carries the `Staylinked` name, horizontal navigation, and account access. It has no company breadcrumb or dashboard sidebar.

The visual system uses Geist Variable, warm neutral surfaces, clear hierarchy, and illustrated portraits. Profile and conversation views have room to read, while forms stay compact. Decoration should not compete with the person or their words.

## Components

- [shadcn/ui](https://ui.shadcn.com/docs): component source lives in the project and can be adapted with the rest of the interface.
- [Base UI](https://base-ui.com/): accessible behavior for dialogs, menus, selections, and related controls.
- [Geist](https://vercel.com/font): a consistent variable sans for navigation, text, and forms.

Shared components own focus states, surface styling, spacing, and control behavior. Application CSS defines the relationship views. Changes should be checked at both desktop and narrow phone widths, including keyboard access and reduced motion.

## Information architecture

**People** contains only existing connections. Search works over those people and their shared context. Opening someone reveals the person, the encounter, their work, and the conversation.

**Updates** contains posts from the signed-in user and their direct connections. There is no public feed, follower count, or audience discovery.

**Profile** holds the user's introduction and links. Candidates also manage notes and files. Editing should happen close to the content, without a separate administrative workspace.

**Event sharing** remains a recruiter action. The QR portal leads with the recruiter and the event, then asks the candidate for their recap. Role lookup is secondary to the person and uses ordinary language.

## Copy contract

Use names, dates, content, and short actions. Explain an error or a consequential sharing choice when needed. Avoid slogans, greeting banners, repeated instructions, and technical labels such as “Role evidence.” Do not label the shell as a demo workspace.

No statuses, queues, saved states, bookmarks, rankings, or score badges are part of the relationship interface. An action's loading or error feedback is still necessary; removing labels must not hide whether a save or message succeeded.

## Avatars

Local SVG portraits use [Notionists by Zoish via DiceBear](https://www.dicebear.com/styles/notionists/), licensed CC0 1.0. `npm run avatars:generate` rebuilds the 32 static illustrations. Names choose a stable placeholder; these are decorative illustrations, not user-uploaded photos or identity signals. The generator is a development dependency and no external image service receives names.

Company names may appear in introductions. They do not supply the app's brand or a separate logo system.
