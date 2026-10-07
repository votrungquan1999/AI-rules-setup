# Defect Catalogue

The rubric the reviewing agent checks every screenshot against. This file **is** the product — measured evidence says an open prompt ("find anything wrong") scores 6.67% precision, while a closed named-defect list takes the same model to 57.8%.

**How to use it.** The agent evaluates each screenshot against every entry and returns a verdict per entry. A finding must name the element it is about, or it is dropped. The agent never reports a number it did not read off the page.

**Severity.** `BLOCKING` — the user cannot complete their task. `DEGRADED` — usable but wrong. `COSMETIC` — looks unpolished.

**Entries marked `needs-interaction`** cannot be judged from a still image. Skip them during screenshot review and capture a dedicated state for them instead (a focused field, an open menu). Reporting them from a still is guesswork.

**This list grows, and that is the point.** Every real bug found in any project gets added here as a named entry with the screenshot that produced it. Problems seen but not on this list are not silently dropped: they go in the report's "noticed, not on the checklist" section ([node-report.md](../nodes/node-report.md)) and become candidate entries here.

---

## A. Things collide

- **overlap-elements** — two unrelated elements visibly on top of each other. *Spot it:* content of one is partially hidden by the other with no dropdown/modal reason. `BLOCKING`
- **text-over-text** — two runs of text occupying the same space, both unreadable. `BLOCKING`
- **content-under-sticky** — a sticky header/footer covers content, especially the field currently focused. *Spot it:* text disappears beneath a bar rather than scrolling past it. `BLOCKING`
- **overlay-behind-content** — a dropdown, tooltip or modal rendered behind the thing it should sit above. `BLOCKING`
- **icon-text-collision** — an icon sits on top of the label or input text it belongs beside. `DEGRADED`

## B. Things spill

- **horizontal-page-scroll** — the whole page scrolls sideways. *Spot it:* a horizontal scrollbar on the body, or content running past the right edge. `DEGRADED`
- **content-outside-container** — a child visibly extends past its parent's border or background. `DEGRADED`
- **table-no-scroll-container** — a wide table pushes the layout instead of scrolling inside its own box. `DEGRADED`
- **element-offscreen** — something rendered outside the viewport that should be visible. `BLOCKING`
- **long-string-breaks-row** — an unbroken URL, ID or branch name stretches its row. `DEGRADED`

## C. Things are cut

- **text-clipped** — text visibly cut mid-word or mid-line with no ellipsis. `DEGRADED`
- **truncation-loses-meaning** — an ellipsis appears so early the label is useless ("Creat…"). `DEGRADED`
- **fixed-column-squeeze** — a table column too narrow for its contents, wrapping to one character per line. `DEGRADED`
- **dropdown-clipped** — a menu cut off by an ancestor's `overflow: hidden` or the viewport edge. `BLOCKING`
- **tooltip-clipped** — a tooltip cut at the viewport edge, its text unreadable. `DEGRADED`

## D. Dead space and proportion

- **stretched-empty-region** — a large area of the layout is empty while other content is cramped. *Spot it:* one region holds almost nothing while a neighbour is visibly squeezed. `DEGRADED`
- **element-wrong-axis** — something that should sit above or below content is laid out as a side-by-side column (or vice versa). *Spot it:* a status banner, alert or summary rendered as a full-height column next to the content. `DEGRADED`
- **lone-item-in-row** — one item alone in a row built for several, leaving a gap. `COSMETIC`
- **hero-eats-viewport** — an opening section so tall the real content is pushed entirely below the fold. `DEGRADED`
- **disproportionate-panel** — two panels whose widths are obviously wrong for their roles (a form strip beside a vast empty pane). `DEGRADED`

## E. Squashed or unusable

- **input-too-narrow** — a text field too narrow to read what is typed in it. `BLOCKING`
- **button-label-wrapped** — a button whose label breaks across lines or per character. `DEGRADED`
- **touch-target-too-small** — a control noticeably smaller than a fingertip, or than comparable controls beside it. `DEGRADED`
- **image-squashed** — an image visibly stretched or compressed off its natural aspect ratio. `COSMETIC`

## F. Invisible when it shouldn't be

- **zero-size-element** — a rendered element with no width or height. `BLOCKING`
- **stuck-at-opacity-zero** — content that never becomes visible because a reveal animation never fired. `BLOCKING`
- **hidden-behind-sibling** — an element fully covered by another. `BLOCKING`
- **focus-ring-missing** `needs-interaction` — keyboard focus produces no visible indicator. `BLOCKING`
- **disabled-looks-enabled** — a disabled control indistinguishable from an active one. `DEGRADED`

## G. Readability

- **contrast-unreadable** — text against its background at a ratio that makes it effectively invisible. `BLOCKING`
- **text-on-busy-background** — text over an image or gradient that swallows it. `DEGRADED`
- **font-too-small** — body text noticeably smaller than the other text around it, or too small to read comfortably at this screen size. `DEGRADED`
- **placeholder-mistaken-for-value** — placeholder text styled so it reads as entered data. `DEGRADED`

## H. Broken media

- **image-failed-to-load** — a broken-image icon or empty frame where a picture belongs. `DEGRADED`
- **icon-missing** — a blank square, tofu box, or missing glyph. `DEGRADED`
- **avatar-hole** — a missing avatar leaving an empty gap rather than a fallback. `COSMETIC`
- **font-not-loaded** — the page renders in an obvious fallback face. `COSMETIC`

## I. Junk content

- **literal-undefined** — the words `undefined`, `null`, `NaN`, or `[object Object]` visible on screen. `BLOCKING`
- **raw-i18n-key** — an untranslated key like `form.title.label` shown to the user. `BLOCKING`
- **invalid-date-or-duration** — `Invalid Date`, `1970-01-01`, a nonsense timestamp, or an impossible duration such as a countdown reading `368191:24`. *Check the capture's `fontsSettled`/`stable` flags first: a frozen clock during capture can fake this.* `DEGRADED`
- **unformatted-number** — a raw float like `0.30000000000000004`, or an unformatted currency. `DEGRADED`
- **lorem-ipsum-in-production** — placeholder copy left in a real screen. `DEGRADED`
- **inconsistent-terminology** — the same thing called two different names across screens (a role named one way on its card and another in the prompt). `DEGRADED`
- **html-entity-escaped** — `&amp;` or `&lt;` rendered literally as text. `COSMETIC`

## J. Repetition and rhythm

- **sibling-height-mismatch** — one card in a row noticeably taller or shorter than its peers. `COSMETIC`
- **misaligned-row** — one item in a repeated set indented or offset from the rest. `COSMETIC`
- **inconsistent-gaps** — visibly uneven spacing between items that should be evenly spaced. `COSMETIC`
- **duplicate-element** — the same element rendered twice. `DEGRADED`

## K. Interaction and focus

- **no-hover-feedback** `needs-interaction` — a clickable element with no visible hover state. `COSMETIC`
- **focus-lost-after-action** `needs-interaction` — focus vanishes after a modal closes or a step completes. `DEGRADED`
- **keyboard-trap** `needs-interaction` — focus enters a region and cannot leave. `BLOCKING`
- **modal-scrolls-page-behind** `needs-interaction` — scrolling inside a modal moves the page underneath. `DEGRADED`
- **click-target-not-where-it-looks** `needs-interaction` — the clickable area is offset from the visible control. `BLOCKING`
- **enabled-when-invalid** — a control is tappable when its action cannot succeed (Start with nothing entered), leading to a broken or empty screen. `DEGRADED`
- **non-interactive-looks-interactive** — a heading or label styled like a button, or a real control styled like plain text. `DEGRADED`
- **scroll-position-lost** `needs-interaction` — the view jumps to the top after an action that should preserve position. `DEGRADED`

## L. Feedback and state

- **error-far-from-field** — a validation message rendered nowhere near the input it refers to. `DEGRADED`
- **error-invisible** — a submit fails with no visible message at all. `BLOCKING`
- **success-below-fold** — a confirmation the user cannot see without scrolling. `DEGRADED`
- **spinner-never-ends** — a loading indicator with no resolved state. `BLOCKING`
- **skeleton-never-replaced** — placeholder shapes that never become content. `BLOCKING`
- **conflicting-states** — loading and loaded, or error and success, shown at once. `DEGRADED`
- **blank-while-loading** — nothing at all on screen while the app starts, with no title, skeleton or spinner. `DEGRADED`
- **unrecoverable-error-page** — an error screen whose own recovery action fails the same way, leaving no way back into the app. `BLOCKING`
- **copy-contradicts-state** — the words describe something other than what happened ("tie — revote" when no revote follows). `DEGRADED`
- **no-empty-state** — an empty list renders a blank region instead of a message. `DEGRADED`

## M. Data-driven

- **long-name-breaks-layout** — a realistic long value distorts the row or card. `DEGRADED`
- **big-number-blows-column** — a large figure overflows its column. `DEGRADED`
- **many-rows-unvirtualized** — a long list renders in full and visibly degrades the page. `DEGRADED`
- **zero-state-vs-loading-confusion** — "no results" and "still loading" look identical. `DEGRADED`
- **single-item-looks-broken** — a grid with one item renders as a stretched full-width block. `COSMETIC`

## N. Responsive

- **breakpoint-dead-zone** — a width where neither the mobile nor desktop layout works. `DEGRADED`
- **mobile-nav-overlaps** — navigation covers page content when opened. `BLOCKING`
- **columns-dont-stack** — a multi-column layout stays side-by-side when it should stack, squeezing everything. `DEGRADED`
- **text-expansion-overflow** — longer translated text breaks the layout. *Force it:* run a pseudolocale (+40% length). `DEGRADED`

## O. Theme

- **invisible-in-dark-mode** — text or a border that disappears when the theme flips. `BLOCKING`
- **hardcoded-color-survives-theme** — an element keeping its light-mode colour in dark mode. `DEGRADED`
- **border-vanishes** — a divider or outline indistinguishable from its background. `COSMETIC`
- **theme-mismatch-within-page** — one region rendering in the other theme. `DEGRADED`

## P. Hierarchy and polish

- **two-competing-primaries** — two buttons both styled as the main action. `DEGRADED`
- **wrong-thing-emphasised** — a secondary element visually dominates the primary one. `COSMETIC`
- **orphaned-heading** — a heading separated from the content it introduces. `COSMETIC`
- **mismatched-radii-or-borders** — inconsistent corner radius or border weight between sibling elements. `COSMETIC`
- **everything-is-a-card** — uniform borders and shadows on every block, flattening the hierarchy. `COSMETIC`
- **alignment-drift** — labels, inputs or icons not aligned to a shared edge or baseline. `COSMETIC`
