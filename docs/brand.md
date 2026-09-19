# Staylinked mark

The mark contains two distinct curved forms around a shared open center. Together they suggest an S. The gap keeps the two forms recognizable while giving the composition a point of connection.

Asset: [`public/brand/staylinked-mark.png`](../public/brand/staylinked-mark.png). The file is a generated 1254 × 1254 RGBA PNG with genuine transparency. It is a raster source, not a vector. Its alpha channel is preserved without post-processing. Use it at small interface sizes with the Staylinked wordmark set as ordinary text.

The asset was created with the built-in image generation tool. No external image service or API key is needed at runtime. The intended ink color is `#252d2a`; the generated PNG contains minor color variation. An alpha-mask presentation can keep the interface mark aligned with the surrounding text color.

## Interface presentation

The interface uses the PNG's alpha channel as a CSS mask and fills it with `currentColor`. The generated RGB variation therefore does not determine the displayed mark color. The same silhouette can inherit an ink or garnet CSS token without changing the source asset.

The current fill is `#9f1942`, overridden by `color(display-p3 0.63 0.06 0.24)` only when CSS syntax support and the `color-gamut: p3` media query both match. This affects the mask's CSS fill, not the PNG's color encoding or the portrait assets. The generation prompts below record how the source was made; they do not define the current interface palette.

## Generation prompt

> Use case: logo-brand. Create one finished abstract symbol for Staylinked, a private app for retaining meaningful in-person connections. Two independent sculptural forms meet around one small shared negative-space center; together the silhouette subtly suggests an S and the continuity of a remembered meeting. Quiet editorial sophistication, optically balanced unequal forms, crisp confident curves with a few deliberate straight cuts. Single flat solid ink color #252d2a on a genuinely transparent background. Strong legibility at 24 pixels. Center one mark, tightly framed with only 8% clear padding on each edge. Vector-like clean geometry, no texture, no gradients, no shadows, no mockup, no badge, no text. Avoid chain links, infinity symbols, handshakes, network nodes, sparkles, arrows, stock tech logo clichés. Deliver only the isolated symbol with alpha transparency.

## Framing refinement

> Use case: precise-object-edit. Keep the exact two-form silhouette and central negative space of this Staylinked symbol. Change only the finish and framing: make every opaque interior pixel a perfectly flat solid #252d2a, with no grain, gradient, lighting, texture, or shading; preserve smooth antialiased edges and genuine alpha transparency. Tight crop to the symbol bounds plus 5% transparent margin on all sides, so the symbol fills the asset. Do not add elements, text, shadows, background, or a badge.
