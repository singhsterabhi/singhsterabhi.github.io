# Portfolio Site — Design

**Date:** 2026-08-22
**Repo:** `singhsterabhi/singhsterabhi.github.io` — retained as the source
repo despite the now-misleading name; renaming is optional and can happen at
any time without affecting the Cloudflare build.
**Deployed to:** Cloudflare Pages — `singhsterabhi.pages.dev`
**Visual design:** Claude Design project `12c21a8e-0603-4e34-a387-e896282178ce`
("Portfolio website design plan"), artboard `Portfolio Site.dc.html`, design
system `_ds/nocturne-…/styles.css`
**Status:** Approved design, pending implementation plan

## 1. Goal

Replace the single hand-written `index.html` with a fast, characterful two-page
portfolio that a recruiter can grasp in ten seconds and a peer can play with.
The site must stay credible at a small content volume: two strong projects
presented honestly beat five padded ones.

Concept: **editorial + content-first spine** (Comeau/Fisher lineage), with a
**terminal mode** as the single signature interactive medium.

The site has a **third audience alongside recruiters and peers: automated
agents and crawlers.** It must be discoverable, readable, and *operable*
without JavaScript execution or human interpretation. This is a primary goal,
not a bolt-on — see §11.

## 2. Hosting and hard constraints

**Host: Cloudflare Pages**, static output, served at `singhsterabhi.pages.dev`.

Chosen over GitHub Pages specifically to gain **custom HTTP header control**,
which GitHub Pages does not offer at any price. Without headers the AgentReady
Discoverability section is permanently capped (no `Link` headers) and content
negotiation is impossible. That ceiling was the deciding factor.

- **`singhsterabhi.github.io` cannot be served by Cloudflare.** That hostname
  belongs to GitHub; its DNS is not ours to point. Moving hosts necessarily
  means changing the URL. A custom domain was considered and declined for now;
  the free `*.pages.dev` subdomain is used instead.
- **Cloudflare's Git integration builds from this repo** on push to `master`.
  There is therefore **no GitHub Actions deploy workflow** — the build lives
  with the host. One less moving part than the GH Pages approach.
- **Astro stays on static output.** No SSR adapter. Cloudflare serves the built
  files directly.
- **No `dist/` in git.** The host builds; output is never committed.
- **`base` must not be set** in `astro.config.mjs` — the site serves from the
  domain root. `site` is set to the deployed URL so that sitemap, canonical
  URLs, and JSON-LD emit absolute URLs.

### Disposition of the old URL

`singhsterabhi.github.io` must not be left serving stale content — that is the
worst outcome, since existing links and crawler caches would point at a dead
version of the site indefinitely.

GitHub Pages is repointed to a dedicated `gh-pages-redirect` branch containing
a single `index.html`: a `<meta http-equiv="refresh">`, a `<link
rel="canonical">` to the Cloudflare URL, and a **visible anchor** so any client
that does not follow the refresh — including agents — still resolves the new
location. `.nojekyll` is not needed on that branch.

## 3. Scope

**In v1:** Home, About, a terminal overlay, a 404 page, the agent-readability
surface of §11, and Cloudflare Pages deployment.

**Explicitly out of v1:** case-study routes, `/lab`, blog, custom cursor, 3D /
WebGL, animated mascot, live-data widgets (GitHub stats, now-playing), API
playground, status dashboard, Cloudflare Pages Functions of any kind (and so
also: `Accept`-based content negotiation, and a hosted MCP endpoint).

Out-of-scope items are excluded because shipping them empty is worse than not
having them. The content collection and layout are structured so case studies
and `/lab` can be added later as new collections without changing Home.

## 4. Stack

- **Astro** — static output, zero JS by default.
- **Tailwind CSS v4** — CSS-first config; design tokens live in a stylesheet,
  not in JS config.
- **Astro content collections** — schema-validated project *data* (YAML or
  JSON entries, not prose). The MDX integration is deliberately *not* installed
  in v1: with no case studies or blog, there is no long-form content to author,
  and an unused integration is dead weight. It is added when case studies are.
- **React** — one island only (the terminal), lazy-loaded.
- **`@astrojs/sitemap`** — required by §11 Discoverability.
- **pnpm** as the package manager. `pnpm-lock.yaml` is committed; Cloudflare
  detects the package manager from it, so the deployed build resolves the same
  tree that was tested locally.
- No animation library. Native CSS scroll-driven animation and the View
  Transitions API instead.

## 5. Repo layout

```
/
├── astro.config.mjs
├── src/
│   ├── commands/           # SHARED COMMAND REGISTRY — see §7.1
│   ├── content/            # projects collection (Zod schema)
│   ├── components/         # .astro — Hero, ProjectGrid, ProjectCard, Nav, Footer, Timeline
│   ├── islands/Terminal/   # the only React in the project
│   ├── layouts/Base.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── index.md.ts         # markdown twin of Home (§11)
│   │   ├── about.astro
│   │   ├── about.md.ts         # markdown twin of About (§11)
│   │   ├── llms.txt.ts         # generated (§11)
│   │   ├── llms-full.txt.ts    # generated (§11)
│   │   ├── terminal.astro      # alias route: renders Home, deep-opens the overlay
│   │   └── 404.astro
│   └── styles/tokens.css   # OKLCH palette + motion contract
└── public/
    ├── _headers            # Link headers — Cloudflare-specific (§11)
    ├── robots.txt          # with explicit AI policy (§11)
    ├── .well-known/
    │   └── agent-card.json # A2A — generated into public/ at build (§11)
    └── …                   # résumé PDF, favicon
```

No `.nojekyll` is needed — that was a GitHub Pages requirement and Cloudflare
does not run Jekyll.

The existing root `index.html` is deleted. Its copy is the source for the About
page and is carried forward close to verbatim; its warm personal voice
(Gorakhpur, the nomad line, music and movies, "hit me up") is an asset, not
placeholder text to be rewritten into portfolio-speak.

## 6. Single source of truth for projects

One content collection, Zod-validated:

| field | type | notes |
|---|---|---|
| `title` | string | outcome-led, e.g. "Cut p99 latency 40% on a high-traffic orders API" |
| `summary` | string | one line of context |
| `tags` | string[] | tech, used for context not as a logo wall |
| `repo` | url? | optional |
| `demo` | url? | optional |
| `featured` | boolean | spans two grid cells |
| `kicker` | string | small uppercase mono label above the title (`open source`, `side project`) |
| `slug` | string | terminal identifier for `open <slug>` and tab-completion |

### v1 entries (confirmed real)

| slug | kicker | title | tags | links |
|---|---|---|---|---|
| `table-kit` | open source | A headless table toolkit built on TanStack Table — column sizing, pinning and virtualised rows packaged once | TypeScript, React, TanStack Table | repo (**featured**) |
| `gym-log` | side project | A workout tracker that fits between sets — log a set in two taps, offline-first | React, IndexedDB, PWA | repo + live demo |

Both are confirmed as real work. The actual repo and demo URLs are outstanding
(§13) and no card renders a link until its URL is supplied and verified
resolving.

`ProjectGrid` renders from this collection, and the terminal's `projects` and
`open` commands read the same data imported at build time. Adding a project is
one entry; both surfaces update. Nothing to drift.

**Dead-link rule:** a card renders only the links it actually has. A project
with no working demo shows the repo link alone rather than a broken button.
Broken demos are an instant credibility killer.

**The rule is not limited to project cards.** It applies to every outbound link
whose target is an outstanding input, including the hero's Résumé CTA: the
button is rendered only when `public/abhishek-singh.pdf` actually exists, so it
appears automatically when the file is supplied and never points at a 404 before
then. A link to a promised-but-absent file is the same defect as a dead demo,
and the hero is a worse place for it than a card.

## 7. Information architecture

### Home (`/`)

1. **Hero** — name; a specific positioning line; three always-visible escape
   hatches (Résumé PDF · Email · GitHub); one small hint that a terminal exists.
2. **Project bento** — asymmetric grid, featured entry spanning two cells.
   Must look deliberate at 2–4 cards, not sparse. No filler entries.
3. **About teaser** → `/about`.

### About (`/about`)

Expanded existing copy, plus a compact semantic experience timeline (media.net
and prior). No skill bars, no percentage ratings, no tech logo wall.

### 404 (`/404.html`)

On-brand and playful, in the site's own voice, with working links back to Home
and About. Cloudflare Pages serves a root `404.html` automatically for static
projects; no configuration is required. It must return a real **HTTP 404**, not
a 200 — a soft 404 is both an SEO problem and an explicit AgentReady failure
under recoverable error handling (§11), since an agent cannot distinguish a
missing page from a real one.

### Terminal overlay

Opens via `` ` ``, `Ctrl+K`, or the hero affordance. Rendered as a `<dialog>`.

| command | behaviour |
|---|---|
| `help` | list commands |
| `whoami` | positioning line + one-liner |
| `projects` | table rendered from the content collection |
| `open <project>` \| `open about` | navigate to the real route |
| `resume` | open the PDF |
| `contact` | email / GitHub / LinkedIn |
| `theme <light\|dark>` | flip the token set |
| `clear` | clear output |
| `exit` | close the overlay |

Behaviour that makes it real rather than decorative: command history on ↑/↓,
tab-completion on both command and project names, nearest-match suggestion on
an unknown command, `Esc` to close.

The artboard renders the overlay as a `<div role="dialog" aria-modal="true">`.
**The implementation uses a native `<dialog>` element instead** — it gives real
focus trapping, focus restore on close, and `Esc` handling from the platform
rather than hand-rolled. This is invisible to the design and strictly better.

`/terminal` **canonicalises to Home**, not to itself. It renders Home's content
with the overlay already open, so it is an alias; a self-canonical would
advertise near-duplicate content to search engines. The URL stays shareable and
functional — only the indexing signal points elsewhere.

It is an overlay layer rather than a destination so that recruiters are never
blocked by it and peers find it immediately. `/terminal` exists as a shareable
alias that deep-opens the overlay, giving a linkable URL without making the CLI
feel bolted on. On touch devices the affordance is present and functional but
de-emphasized.

The terminal is the only JavaScript on the site, code-split behind a dynamic
import triggered by first open. Home and About ship as pure HTML and CSS.

### 7.1 The shared command registry

`src/commands/` defines each command exactly once:

```
{ name, description, argSchema (JSON Schema), handler }
```

**Three consumers read this one registry:**

1. **The terminal overlay** — renders commands for humans, powers `help`, and
   drives tab-completion from the same names.
2. **WebMCP** (`document.modelContext`) — registers each command as a callable
   tool for in-browser agents. `description` and `argSchema` are exactly what a
   tool declaration needs, which is why the registry is shaped this way.
3. **The build step** — emits the tool list in
   `/.well-known/agent-card.json`.

Adding a command therefore extends the human CLI, the agent tool surface, and
the published agent card together, with no duplicated definitions and nothing
to drift.

This is the structural reason the terminal is load-bearing rather than
decorative: it is not a novelty that happens to sit beside the agent surface,
it *is* the agent surface, rendered for a different kind of visitor. Commands
must be designed accordingly — each one does a real, nameable thing with
schema-describable arguments, which is also what makes a good CLI.

Handlers that navigate (`open`) are side-effecting and are declared as such in
the tool metadata; read-only commands (`whoami`, `projects`, `contact`) are
marked read-only so agents can call them freely.

## 8. Visual system

### Source of truth

The visual design is the Claude Design artboard `Portfolio Site.dc.html`, built
against this spec. It defines three screens (Home, About, 404) plus the
terminal overlay, and imports the **Nocturne** design system
(`_ds/nocturne-…/styles.css`) for tokens.

**The artboard is a design reference, not code to port.** Specifically excluded
from implementation:

- The fixed bottom `screens` switcher — a canvas navigation affordance.
- The `screen`, `terminalAffordance`, and `bentoColumns` props. These are
  canvas preview knobs. Resolved values: `terminalAffordance: "button"` (the
  labelled `❯ poke around in the terminal` button with a `` ` or ⌘K `` kbd
  hint; the `hint` and `preview` variants are discarded) and
  `bentoColumns: 3`.
- Every inline `style="…"` attribute. These are the canvas idiom. They are
  reimplemented as Tailwind utilities and token-backed classes; copied inline
  style strings are not acceptable output.
- `support.js` — the generated `dc-runtime` canvas preview engine
  (`<x-dc>`, `sc-for`, `sc-if`, `DCLogic`). Nothing to port.

### Palette — retuned, both themes first-class

Nocturne as imported is **dark-only**: `styles.css` defines exactly one
palette. The artboard nevertheless shows a header theme toggle (`◑`) and the
terminal exposes `theme <light|dark>` — two controls with nothing to switch to.

**Resolution: light and dark are both first-class**, and the palette is
retuned rather than merely extended. Nocturne is the starting point, not a
constraint.

- **Both themes are authored deliberately.** Dark is not derived by inverting
  light, or the reverse. Every component is checked in both.
- **Tokens are expressed in OKLCH.** Nocturne documents OKLCH derivation in its
  comments (hue 289.2, L 0.660, C 0.125 for the accent) but commits hex values.
  Converting to real OKLCH preserves the documented lightness and chroma
  relationships and makes `color-mix()` tinting behave predictably across both
  themes.
- Structural token roles carried over from Nocturne, since they are sound: a
  `bg` / `surface` / `text` ground, a 9-step neutral ramp and a 9-step accent
  ramp on **one shared lightness scale** (so the same step of any role matches
  in visual value), and a `divider` token.
- The **fading-rule signature** is kept: freestanding rules fade to transparent
  over 48px at each end. Box outlines and in-control separators stay solid.
  It is a distinctive, cheap detail and it appears throughout the artboard.

**DECIDED 2026-08-22 — direction "Systems Console".** The user reviewed three
structurally different concepts and chose the Console for its colour, living
background and feel, while keeping this artboard's layout and structure. The
exact OKLCH values for both themes live in
`docs/superpowers/decisions/2026-08-22-palette-and-type.md`, which Task 3
transcribes verbatim.

Two accents, with a strict division of labour: **cyan** is structural (buttons,
focus rings, links, featured border), **magenta** is reserved for what is
*happening* (the live caret, active state, errors) and appears two or three
times per screen at most.

**Ramp semantics — unusual and load-bearing:** the step number is **contrast
rank against the ground, not absolute lightness**. `100` is the text colour,
`900` is a fill barely off the ground. Lightness therefore descends through the
dark ramp and ascends through the light one, which is what lets a component
write `var(--color-neutral-800)` once and be correct in both themes.

### Type — no separate display face

- **Headings: JetBrains Mono at weight 700, tracking `-0.03em`.**
  `--font-heading` resolves to the same family as `--font-mono`. Mono at display
  size is what makes the page read as a console rather than a dark page with
  cyan on it. It also means **no third font is downloaded and
  `astro.config.mjs` needs no new entry.**
- **Body: Inter** (as designed). Excellent and unobtrusive.
- **Mono: JetBrains Mono**, shared by headings, the terminal, kickers, section
  labels and inline code — that sharing is now the whole identity, not just a
  tie-in.
- **Retired:** the characterful-display-face plan and its Cabinet Grotesk /
  Clash Display / Space Grotesk / Instrument Serif candidates. The first two are
  Fontshare, not Google, and so were unavailable to `fontProviders.google()`
  without self-hosting.
- **All fonts are self-hosted.** The artboard pulls Inter and JetBrains Mono
  from `fonts.googleapis.com`; that is a third-party request on the critical
  path. Subset and self-host, with `font-display: swap` and a real fallback
  stack.

### Layout facts fixed by the artboard

- Content column `max-width: 1120px`, `padding-inline: 40px`.
- Home hero: uppercase mono kicker → `clamp(44px, 6.4vw, 76px)` name →
  21px positioning line at `max-width: 34ch` → three CTA buttons (Résumé PDF
  accented, Email and GitHub secondary) → terminal button.
- Bento: `repeat(3, minmax(0,1fr))`, 20px gap. The featured card spans two
  columns with a gradient fill, accent border, and a `featured` pill; others
  are flat with a neutral border. **With two projects this fills exactly one
  row (2 + 1), which is why the grid reads deliberate rather than sparse at
  this count** (§6).
- Section headings are 13px uppercase mono with `0.16em` tracking, above a
  fading rule.
- About: two-column `1.35fr / 1fr` grid, prose left at `max-width: 62ch`,
  portrait right at `aspect-ratio: 4/5`; timeline below as a `180px / 1fr`
  grid per row.
- Terminal overlay: `max-width: 760px`, `max-height: 72vh`, opens at `8vh` from
  the top, with a title bar, a scrolling output region, and a footer strip
  reading `tab completes · ↑↓ history · help lists everything · shareable at
  /terminal`.

### Copy adopted from the artboard

The artboard resolves §13's positioning-line blocker:

> **Full-stack developer — I build interfaces people enjoy and APIs that hold
> up at scale.**

with the kicker **"Bengaluru · open to talk"**. The About prose is adopted as
written — it keeps the original site's voice (Gorakhpur, nomad, music and
movies, "hit me up") while adding the concrete detail that does the selling:
*"cold starts, empty states, the third click."* The 404 copy is adopted as
written.

## 9. Motion contract

- Durations: 120 / 180 / 240 / 520 ms. One signature easing:
  `cubic-bezier(0.16, 1, 0.3, 1)`. Defined once as tokens; consistency is what
  reads as craft.
- Scroll reveals use native CSS `animation-timeline` behind `@supports`. No
  animation library ships.
- Page transitions use the View Transitions API via Astro, degrading to normal
  navigation where unsupported.

### The living background (signature element)

A **character-rain field** of mono glyphs falling in columns at varied speeds
(bright magenta head, dim cyan tail) at a per-theme alpha ceiling (the scanline
drift originally specified here was removed at the user's request — static
stripes added noise without motion and competed with the glyphs). Adopted from the chosen concept; specified in the decision doc.

Non-negotiable, because a decorative background is exactly where performance and
accessibility quietly die:

1. **Canvas, code-split, started on idle.** Never in the critical path, never
   blocking LCP.
2. **`prefers-reduced-motion`: one static frame, then nothing moves.** A still
   field, not a blank one — the composition stays intact.
3. **JS disabled: no effect on the page.** The canvas is decorative and
   `aria-hidden`; without JS it is an empty transparent element.
4. **Mobile: fewer columns, lower frame budget, paused when not visible**
   (`IntersectionObserver`). The user asked specifically for mobile
   compatibility; a background that drains a phone battery fails that.
5. **Light theme uses a HIGHER alpha than dark** — corrected after the user
   reported the field invisible in light mode. Dark glyphs on a white ground lose
   contrast faster than light glyphs on a dark one, so the light theme needs more
   opacity, not less. See the decision doc for the measured reasoning.

## 10. Accessibility

Treated as structure, not polish. There is no "fast path to build first"
because there is no slow path — the static, keyboard-navigable version *is* the
site.

- `prefers-reduced-motion` gets a genuine reduced path: opacity substituted for
  movement, never a deleted animation that leaves a broken layout.
- An on-page motion toggle persisted to `localStorage`, because WCAG 2.2.2
  wants a mechanism and not every user can set the OS flag.
- A theme toggle in the site chrome (the artboard's `◑` button), reachable by
  keyboard and carrying an accessible name. Theme defaults to
  `prefers-color-scheme`, is persisted to `localStorage` once explicitly set,
  and is applied via a `data-theme` attribute on the root element before first
  paint to avoid a flash. The terminal's `theme <light|dark>` command sets this
  same state — a second control over one mechanism, never a parallel
  implementation. **Both themes are fully authored (§8); neither control is
  permitted to exist without somewhere real to switch to.**
- Contrast is verified in **both** themes, not just the designed dark one.
- Semantic HTML, visible focus states, alt text on every image.
- The terminal `<dialog>` traps focus, restores it on close, and reports output
  through `aria-live`.

## 11. Agent readability (AgentReady v1)

Target: the **is-agentic.com** score (Vercel's scorer; scans executed by Ora
against the AgentReady v1 standard). Scoring is an 80-point Essential pool plus
a 20-point Recommended pool. Critically, **checks that do not apply are
excluded rather than failed**, so a personal portfolio is not penalised for
lacking a commerce or OAuth surface.

The standard defines five sections. Sections 4 (Identity & Access) and 5
(Commerce) are **not applicable** to this site and are expected to be excluded
from scoring. Nothing is built to satisfy them.

### Section 1 — Discoverability

| Artefact | Implementation |
|---|---|
| `robots.txt` with AI policy | Hand-authored, naming crawlers explicitly: `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. An explicit stated policy, not a bare wildcard allow. |
| `sitemap.xml` | `@astrojs/sitemap`. |
| `llms.txt` | Generated route. Concise: who Abhishek is, the positioning line, the project list with URLs, where to find the résumé and contact. |
| `llms-full.txt` | Generated route. Full text of Home and About plus every project entry. |
| `Link` headers | `public/_headers`, pointing at `llms.txt` and the sitemap. **Cloudflare-specific — this is the capability GitHub Pages could not provide.** |

### Section 2 — Content for Agents

- **JSON-LD**: `Person`, `WebSite`, and `ProfilePage`, including `speakable`
  markup. Emitted from the same data the pages render from.
- **`/index.md` and `/about.md`**: plain-markdown twins of each page, generated
  at build time from the content collection and page copy. Because they are
  generated rather than hand-maintained, they cannot drift from the HTML.
- **No JavaScript required** for any content. Already true by construction —
  Astro ships zero JS on both pages (§4, §7). This is the single
  highest-weight property in the section and the architecture already
  guarantees it.

### Section 3 — Capabilities

- **WebMCP** via **`document.modelContext.registerTool`**, sourced from the
  shared command registry (§7.1). Runs entirely client-side, so a static site
  can genuinely expose callable tools. Registration is feature-detected —
  WebMCP is an origin trial and its absence is the normal case.
  `annotations.readOnlyHint` carries the registry's `readOnly` flag, and an
  `AbortController` signal unregisters.

  > **Corrected 2026-08-22.** An earlier revision of this spec specified
  > `navigator.modelContext`. That surface is deprecated as of Chrome 150;
  > `document.modelContext` is current. Verified against Chrome's WebMCP
  > imperative-API documentation.
- **A2A `agent-card.json`** at `/.well-known/`, generated at build from the
  same registry. Cloudflare serves dot-directories reliably.
- Not applicable in v1: hosted MCP over Streamable HTTP, OpenAPI, NLWeb,
  MCP Apps, agent-skills. All require a running service (see §14).

### Sections 4 & 5 — Identity & Access, Commerce

Not applicable. No authentication surface and no payment surface exist, and
none is invented to score points.

### Dependency direction: content is a leaf

`src/lib/site-content.ts` holds the site's prose **and** its contact details and
résumé path, and imports nothing from the command registry. The registry is a
*consumer* of content, not a source of it — it imports `POSITIONING`, `CONTACT`
and `RESUME_PATH` from the content module. The inverse direction creates a cycle
and, worse, invites a second copy of the positioning claim to live in the
terminal's `whoami` output where nothing keeps it in sync.

Neither constant is re-exported from the registry. A convenience re-export leaves
two import paths for one constant, which is how the next drift starts.

### Ordering must match the human pages

Any list the agent surface emits uses the **same sort as the human-facing page**.
Projects are featured-first in `llms.txt`, `llms-full.txt` and the markdown twins,
exactly as on Home and `/terminal`. "Featured" is the signal about which project
to look at first; an agent that receives a different order receives a different
answer to that question, which is the drift this whole section exists to prevent.

### Design principle

Every artefact above is **generated from the same source as the human-facing
page** — the content collection and the command registry. No hand-maintained
parallel copy of the site's content exists anywhere. An agent-readable site
whose machine copy has silently gone stale is worse than one with no machine
copy at all.

## 12. Verification

Claims are reported with evidence, not asserted.

1. `astro build` passes; the Cloudflare Pages build deploys successfully to
   `singhsterabhi.pages.dev`.
2. Every project card's outbound links resolve — zero dead demos.
3. Lighthouse run on Home and About; actual numbers reported.
4. Keyboard-only walkthrough of both pages and the complete terminal flow.
5. **JS disabled:** Home and About fully usable. This is the real test of the
   islands claim.
6. `prefers-reduced-motion` enabled: no broken layouts, no motion.
7. Throttled-network and small-viewport pass. **Mobile compatibility is an
   explicit user requirement, not a nice-to-have:** 375px and 414px viewports
   both checked on every page, the bento grid reflowing to one column, the
   terminal overlay usable with a touch keyboard, no horizontal body scroll, and
   the living background measured for frame cost on a throttled CPU.
8. **The is-agentic.com scan is actually run** against the deployed URL using
   the `browse` skill (the site requires a real browser to submit; it cannot be
   driven by a plain fetch). The real score and the list of failed checks are
   reported — never estimated. Re-run after fixes.
9. `curl` of `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`,
   `/index.md`, `/about.md`, and `/.well-known/agent-card.json` — each returns
   200 with the correct content type.
10. `Link` headers confirmed present on a real response (`curl -I`), since
    `_headers` is host-specific and silently does nothing if malformed.
11. JSON-LD validated, and the markdown twins diffed against the rendered page
    content to prove they have not drifted.
12. The old `singhsterabhi.github.io` URL confirmed serving the redirect stub
    with a working visible link, not stale content.

## 13. Required content inputs (blockers)

The site cannot ship honestly without these, and they cannot be invented:

1. ~~Positioning line~~ — **resolved** by the artboard (§8).
2. ~~Project titles, summaries, tags~~ — **resolved** by the artboard (§6).
3. **Real URLs** for `table-kit` (repo) and `gym-log` (repo + live demo). Each
   is verified resolving before its button renders (§6).
4. **Real email address.** The artboard uses `hello@example.com`. The old site
   used `singhsterabhi@gmail.com` — confirm which to publish.
5. **Timeline entries.** All three artboard entries are notes-to-self ("Fill
   in — one line of what you owned and what changed because of you"). Needed:
   the media.net entry with two or three concrete outcomes, and a decision on
   whether earlier roles are included at all. The artboard's own advice is
   sound: three entries reads more confident than six.
6. **Portrait photo** for About. The artboard has a striped placeholder
   captioned "drop a real photo here", shot on a dark background for the
   `.lighten` blend. Optional — the layout must also work with the figure
   removed rather than shipping a placeholder.
7. **Résumé PDF** for `public/`.

Implementation can proceed on layout, theming, and the terminal ahead of
these, but **no placeholder copy is committed to `master`** in their place —
specifically not `hello@example.com`, not the notes-to-self timeline entries,
and not the striped portrait.

## 14. Deferred decisions

Recorded so they are not silently re-litigated:

- Case studies (`Problem → Constraints → Approach → Tradeoffs → Outcome`) are
  the highest-credibility element with recruiters and are the most likely first
  addition once there is content to fill them.
- `/lab` is the natural second addition and the low-stakes place to keep
  shipping.
- **Cloudflare Pages Functions materially change what is possible**, and this
  is the most consequential consequence of the host change. Moving off GitHub
  Pages means a real API can now live on the same host. That resurrects the
  backend showcase — live API playground, latency dashboard, live-rendered
  architecture diagrams — which is the strongest available differentiator for a
  full-stack profile and was flatly impossible before.
- Functions would also unlock the remaining AgentReady items: true
  `Accept: text/markdown` content negotiation, a hosted MCP endpoint over
  Streamable HTTP, and an OpenAPI document. Combined with the backend showcase
  these are the obvious phase 2.
- A **custom domain** was declined for now in favour of `*.pages.dev`. If it is
  bought later, it is a Cloudflare DNS change plus updating `site` in
  `astro.config.mjs` and the redirect stub — cheap, but every absolute URL in
  the sitemap, JSON-LD, `llms.txt`, and agent card derives from `site`, so it
  must be changed in that one place and nowhere else.
