# Staylinked interface

The connections list leads to a person's profile, the meeting recap, and their work. Contextual back navigation returns to the list; the account avatar opens profile and account actions. There are no persistent navigation tabs. QR sharing and existing contact links stay close to the relevant person.

## Components and hierarchy

The interface uses [shadcn/ui](https://ui.shadcn.com/docs) components on [Base UI](https://base-ui.com/), with [Geist](https://vercel.com/font) and shared application styles. Components own focus behavior, controls, and dialogs. Content flows directly on white surfaces with ink text and a garnet accent. The encounter sits within the profile instead of a separate callout. Optional role lookup stays secondary to the person.

| Token                                         | Size               |
| --------------------------------------------- | ------------------ |
| Page title                                    | 28px               |
| Section title                                 | 16px               |
| Body                                          | 14px               |
| Metadata                                      | 13px               |
| Desktop control height                        | 40px               |
| Button touch target at widths up to 480px     | At least 44 × 44px |
| Input and textarea text at widths up to 480px | 16px               |

Use spacing and type hierarchy to separate content. Avoid stacked panels, decorative dividers, and repeated explanatory copy.

Keep names and substantive content prominent. Use short action labels. Explain errors and consequential sharing choices where needed, and preserve clear feedback when saving. Implementation details belong in the documentation.

Event name, date, and location are plain metadata under "Where we met." When the same two people meet again, a separate "Change meeting" button opens a radio menu with each event's date and location. The selected encounter is stored in the URL; switching it preserves the profile and resets role-specific passages. The note's byline shows when it was submitted or edited, separately from the event date.

Use a select for a form value, a radio menu for switching among recorded meetings, and a menu for account actions. Keep dropdown icons inside the primitive's icon wrapper so library defaults cannot replace the SVG's children. Escape returns focus to the trigger; meeting names support typeahead.

Check desktop and narrow phone widths, keyboard focus, Escape behavior, long content, empty states, and reduced motion. A completed build does not establish visual acceptance.

## Color rendering

Declare sRGB colors first. Override selected tokens with `color(display-p3 ...)` only when both CSS syntax support and `@media (color-gamut: p3)` match. Browsers that cannot parse the syntax or report a narrower gamut keep the sRGB palette.

| Token                                  | Value                              | Calculated contrast against white |
| -------------------------------------- | ---------------------------------- | --------------------------------- |
| Surface                                | `#ffffff`                          | n/a                               |
| Text                                   | `#211d21`                          | 16.64:1                           |
| Secondary text                         | `#6e6670`                          | 5.53:1                            |
| Primary, brand, focus ring: sRGB       | `#9f1942`                          | 7.80:1                            |
| Primary, brand, focus ring: Display P3 | `color(display-p3 0.63 0.06 0.24)` | 7.59:1                            |
| Input boundary                         | `#938b96`                          | 3.29:1                            |

The selection tint is `#faf0f3`, or `color(display-p3 0.985 0.947 0.962)` on the gated P3 path. Supporting surfaces use neutral values from `src/styles.css`.

Contrast values are calculated from the declared colors. Check CSS support, the P3 media query, and computed colors in the running browser when verifying the rendering path. The sRGB fallback has been checked in source and by calculation, not on a separate sRGB device. These checks do not measure a physical display's color accuracy. The logo mask inherits CSS color; its source PNG and the neutral SVG portraits are not P3-encoded assets.

## Avatar credits

Local SVG portraits use [Notionists by Zoish via DiceBear](https://www.dicebear.com/styles/notionists/), licensed CC0 1.0. `npm run avatars:generate` rebuilds 32 static illustrations. Names choose a stable decorative portrait; these are not uploaded photos or identity signals. No external image service receives names.

Portrait backgrounds are encoded as sRGB SVG colors.

Company information may appear in a person's introduction. The application carries the Staylinked name.
