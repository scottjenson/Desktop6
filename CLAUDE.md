# Demo 3 — Clipboard ↔ Filesystem Bridge (Project Context)

## 🤖 Read this first
This is **Demo 3** in a series of three web prototypes about rethinking the desktop.
It is a **standalone project** that was deliberately split off from Demo 2 (a 3D
HTML-in-canvas window manager). **Read this whole file before writing code.** It
records *why* the project is structured the way it is and *what is intentionally
fake*, so you don't "improve" things that are simple on purpose.

The author (Scott) prefers: **discuss before coding; propose the simplest solution
that reuses existing structure; edit only the files named; never commit/push without
explicit approval.**

---

## 🎯 What this demo shows
A word-processor-style **viewer** with an attached **Scrapbook** panel (Obsidian-like)
that slides out from its left. The story: a side panel that **bridges the clipboard and
the filesystem** — content dragged out of a document, the Finder, or a web page becomes a
real item you can open beside the document. Items accrue FLAT and messy; later the system
organizes them into folders, and a folder can be acted on (e.g. "put these on a map").
Clicking a scrapbook row shows that item in the viewer (no tabs — one panel at a time).
The arc is a staged script driven by Spacebar; see the Status section below for the beats.

**Crucial framing — staged, but the drag IS real now.** The clipboard/filesystem
*story* is narrated, but the holding-area interactions have since been built for real
(custom pointer-drag, not native DnD — see Learnings). The live interactivity is:
- `[←]`/`[→]` slide the scrapbook out / in
- `[w]` toggle the two side windows (Finder / Browser)
- drag into the open scrapbook: a Finder icon → a file row; a doc/browser text selection
  → a Snippet (doc = cut, browser = copy); the browser URL → a mirrored Web page
- click a sidebar row → show it in the viewer (no tabs); the highlight is the selection

Source *content* (the doc prose, the Verge article, the spreadsheet) is still hand-written
to *look* real — that authoring is the actual work. Do **not** build real file parsing,
network fetches, or clipboard plumbing; the bridge is faked, the gestures are not.
See the DONE list + gesture map below for the authoritative current state.

---

## 🔗 Relationship to Demo 2 (the tab-switch illusion)
Each demo is its own web page, shown in a **separate browser tab**. The author switches
Demo 2 → Demo 3 live; the switch must be **invisible**. That works because the shared,
static layers are **pixel-identical**:

- Same **pill menubar**, same **dock**, same **trash**, same **wallpaper**, same
  **window frame** (`.os-window`, traffic lights, titlebar).
- Demo 3 **opens where Demo 2 leaves off**: menubar already in its collapsed *pill*
  state, a single word-processor window centered, no scrapbook yet.

**Discipline:** the desktop chrome (`css/desktop.css`, the menubar/dock/trash markup)
is **lifted from Demo 2 and must stay in visual lock-step.** If you find yourself
tweaking the chrome, you're about to make the seam visible — stop and reconsider.

### The parity rect (single source of truth)
Demo 2's word processor lives at desktop-px **x=1600, y=280, w=740, h=900** in the
3440×1440 desktop space (from Demo 2's `index.html` source-canvas attributes). Demo 3's
viewer is pinned to that **exact rect** via CSS vars `--wp-x/--wp-y/--wp-w/--wp-h` in
`css/demo3.css`. If this rect ever changes, it must change in **both demos**. This is
the one number that, if it drifts, breaks the illusion.

### Deferred Demo-2 change (NOT in this repo, do not do now)
Demo 2 will get an "align" keypress that animates its live word-processor window to the
parity rect (and parks/hides the others) before the tab switch, so the live scene
already matches Demo 3's opening frame. That change lives in **Demo 2's** `js/windows.js`
(it fits the existing park-animation engine). It is **out of scope** for this project —
noted here only so the parity contract is understood end-to-end.

---

## 🏗 Architecture (deliberately plain — no WebGL)
Demo 3 is **plain DOM + CSS + vanilla JS.** No Three.js, no `layoutsubtree` canvases,
no raycasting, no build step. Demo 2's entire 3D layer was dropped on purpose: every
feature Demo 3 wants (per-item hover, cards that escape the window bounds, sliding
panels, tab swaps) is trivial in DOM and was *hard or impossible* as baked mesh
textures. Keep it plain.

### The stage / letterbox model (the one inherited trick)
Demo 2 renders a fixed **3440×1440** desktop and CSS-scales it to fit the viewport,
centered, with black letterbox bars. Demo 3 reproduces this with `#stage`: a fixed
3440×1440 element scaled by `--stage-scale = min(vw/3440, vh/1440)` (computed in
`js/stage.js`). **Everything inside `#stage` is authored in desktop-px**, so positions
copy 1:1 from Demo 2. Do not introduce a second coordinate system.

### File map
```
index.html            #stage: grid bg, menubar (pill), the attached unit, the two side
                      windows (Finder/Browser, inlined), dock, trash. Viewer panels are
                      inlined here too: the doc + the spreadsheet (the latter kept as the
                      clone source for spreadsheet files dragged from Finder).
css/base.css          reset, :root vars, #stage letterbox scaling. (from Demo 2)
css/desktop.css       chrome: menubar pill, dock, trash, shared .os-window frame. (LIFTED — keep in sync)
css/wordprocessor.css canonical .wp-* document styles (uses --win-* vars from windows.css;
                      custom props resolve at use-time so link order is fine).
css/windows.css       chrome for the two side windows only — Finder + Browser, plus the
                      shared --win-* vars. (Obsidian/Music/duplicate .wp-* were stripped.)
css/demo3.css         NEW: parity rect, scrapbook panel (`#filebrowser`), hover cards (flagged off), panel
                      types (snippet/file/web/sheet), side-window placement/scale,
                      doc-narrowing overrides.
js/stage.js           letterbox scale on load + resize.
js/grid-bg.js         WebGL background grid (Demo 2's shader ported; replaces the old PNG).
js/demo3.js           the Spacebar stage sequencer (windows → hotels → categorize),
                      sidebar-row select (no tabs), window dragging, finder select,
                      drag-in factories (finder file / text clip / web page), the
                      Hotels-folder chatbox → Hotel Map, and minimize/restore (click the
                      traffic-lights → desktop icon → click to re-open). See Status.
icons/                dock + file-row icons (copied from Demo 2) + scrapbook.png (the
                      collapsed desktop-file icon).
(No assets/ dir — the old 8 MB wallpaper PNG was replaced by the js/grid-bg.js shader.)
```

### The attached unit
The scrapbook panel (`#filebrowser`) and viewer share one frame (Obsidian-style). The
**viewer is pinned to the parity rect and never moves.** The scrapbook is positioned to
the **left** of it (`right:100%`) and slides in via `transform`; opening it does **not**
disturb the viewer's position — so parity holds even while the scrapbook is out. Hover
cards float further left, out into open desktop space (impossible in Demo 2's clipped meshes).

### Viewer selection (NO tabs — the tab bar was removed)
The viewer shows exactly ONE panel at a time = the highlighted scrapbook row. Clicking a
row (`data-panel` links row → panel id) toggles `.active` on its panel + the row, and
retitles the window. The document row is selected on open. Panels are static pre-authored
markup; dragged-in items get panels built at runtime (snippet / file / web / map).

---

## 🚨 Anti-patterns (do NOT do these)
1. **Do NOT** re-introduce Three.js / WebGL / `layoutsubtree`. Demo 3 is plain DOM by design.
2. **Do NOT** edit the lifted chrome (`desktop.css` menubar/dock/trash, the frame) in
   ways that change its appearance — it must match Demo 2 pixel-for-pixel.
3. **Do NOT** move the viewer off the parity rect, or make the scrapbook push it.
4. **Do NOT** build real drag/drop, clipboard, or file I/O. Items are pre-authored; the
   bridge is narrated, not coded.
5. **Do NOT** add a second coordinate system — author inside `#stage` in desktop-px.
6. **Do NOT** add a build step, framework, or bundler. Serve over HTTP, plain modules/scripts.

---

## 📍 Status & phased plan
> The side panel is now the **SCRAPBOOK**. The demo is a staged scripted arc driven by
> **Spacebar** (presentation-clicker); the full beat-by-beat list is in DONE below.
> Berlin is the through-theme (talk location): the doc is a Berlin
> tech-corridor study, the web page is "Great Hotels in Berlin", the gathered items are
> Berlin hotels.

**DONE — the Scrapbook arc (stages driven by Spacebar; see `js/demo3.js` `stages[]`):**
  Beats are the entries of `stages[]`, in order: `revealSideWindows`, `bulkAddHotels`,
  `hideSideWindows`, `categorize`. (The map is chatbox-driven, not a Space beat.)
- **Stage 1** — opens with only `Tech Corridor Study.doc` in the scrapbook; side windows
  hidden (Demo-2 opening frame preserved). Manual drags are live from here on.
- **Stage 2** (Space) — `revealSideWindows`: reveal Finder + Browser (the sources).
- Manually drag in the first hotel: the web page's Editor's Pick (Adlon) is wrapped in
  `[data-hotel]`, so a text-drag from it reveals the AUTHORED Adlon hotel row (panel +
  map pin), not a generic clip. The hotel panels read as plain CLIPPED TEXT (reuse the
  `.snippet-panel` structure) — name + blurb + address + phone + a quoted review, so the
  map step (Stage 6) has real per-hotel data. The styled `.hotel-panel` card was dropped.
- **Stage 3** (Space) — `bulkAddHotels`: reveal the REMAINING hotels (the 3 not yet
  added), FLAT at the bottom (icon = 📝, they're web items). "Messy by design."
- **Stage 4** (Space) — `hideSideWindows`: the sources are gathered, so fade Finder +
  Browser back out (reuses the `.win-hidden` opacity transition).
- **Stage 5** (Space) — `categorize`: the 4 hotels collect into an expanded **Hotels**
  `.fb-group`, animated (folder slides in, rows fade+settle with a stagger). Only hotels
  get foldered for now; the doc + any dragged items stay flat.
- **Stage 6** (chatbox, NOT Space) — click the Hotels folder → a chatbox ("Prompt for
  'Hotels'") pops at the row (toggle; dismiss via × / Escape / click-outside). Any text +
  Enter → ~1.1s "thinking" → a top-level **Hotel Map** item (stylized Berlin map: warm
  land, fine street grid, yellow arterials, Spree, parks, labels, a red pin per hotel from
  `data-mx/data-my`). Idempotent — one map ever.
- **Minimize-to-icon (CLICK, NOT Space)** — `minimizeToIcon` collapses the whole unit
  into a single desktop file icon (`#desktop-file`, `icons/scrapbook.png`). Triggered by
  **clicking the viewer's traffic-lights** (mousedown hit-test on `.win-titlebar`, since
  the dots are tiny under `#stage` scale and a synthetic click misses them). It was moved
  OFF Spacebar — too easy to hit mid-demo. The icon shows immediately as the window
  shrinks onto it (no dead beat). **Click the icon → `restoreFromIcon`**: the window
  scales back up first, then (on its `transform` `transitionend`) the scrapbook panel
  slides out — a sequenced reverse, not simultaneous. The titlebar drag handler already
  bails on traffic-light mousedowns, so dragging the window still works.
- **NO TAB BAR.** The viewer shows exactly one panel = the highlighted sidebar row
  (`.fb-item.active`). Clicking a row swaps the view + retitles the window. `.fb-item` is
  `display:none` until `.revealed` (or inside a revealed `.fb-group`).
- **Manual drags (live throughout), one shared custom pointer-drag (NOT native DnD — see
  Learning #4); all land FLAT as a top-level row:**
  - Finder icon → a file row. Spreadsheets (`.xlsx/.csv/...`) clone `#panel-budget`;
    others get a "no preview" placeholder.
  - DOC text selection → a Snippet (a CUT — text leaves the doc).
  - BROWSER article text → a Snippet (a COPY — page is read-only). Both deselect on drop.
  - browser URL pill → a web-page row whose panel MIRRORS `.browser-content` (real DOM).
- Background grid is a live WebGL shader port (no PNG) — see Learnings.
- Two side windows (Finder left, Browser right), inlined into index.html, styled by
  css/windows.css. Hidden on open; GPU-scaled 1.18× for readability. All three windows
  drag by titlebar; Finder rows click-to-select (dark-blue pill on the filename only).
- Hover preview cards exist but are behind a flag (`HOVER_PREVIEW_ENABLED = false`) —
  felt redundant with one-click open; likely repurposed later as a provenance channel.

**Current gesture map (js/demo3.js):**
- **`[Space]`** — advance the scripted stage: reveal windows → add hotels → hide windows
  → categorize. No-op past the end; the map is chatbox-driven, not Space.
- `[←]` show scrapbook · `[→]` hide it (NOT a toggle). `[w]` toggle the side windows.
- click a sidebar row → show it in the viewer · click the Hotels folder → chatbox ·
  drag any titlebar → move that window · click a Finder file → select it.
- click the viewer's traffic-lights → minimize the unit to a desktop icon ·
  click the desktop icon → restore (window grows, then the panel slides out).
- drag into the open scrapbook: Finder icon / doc or browser text / browser URL.

---

## 🧠 Learnings (hard-won — don't rediscover these)

**1. The scrapbook panel (`#filebrowser`) MUST stay a child of `#viewer`, escaping via `right:100%`.**
It's `position:absolute; right:100%` so its right edge sits on the viewer's left edge
and it slides via `transform`. `#viewer` is `overflow:visible` so the scrapbook isn't
clipped; the viewer's OWN rounded-corner clipping is restored by an inner `.viewer-clip`
wrapper (titlebar+tabs+panels live inside it, the scrapbook does NOT). Pulling the scrapbook
OUT of `#viewer` and re-anchoring to stage-px broke positioning AND "moves with the
window" — don't. The original scaffold already had the right structure.

**2. Panel-type CSS must not set `display`.** `.viewer-panel` is shown/hidden by
`.viewer-panel.active { display:flex }`. A panel-type rule like `.snippet-panel{display:flex}`
overrides that and makes the wrong panel show through. Style backgrounds/padding on panel
types, never `display`.

**3. Hover preview = `cloneNode(true)` of the real panel, scaled by WIDTH, dynamic height.**
Cloning (not moving) keeps the live panel intact and means edits to the source DOM show
in the preview for free. Scale = `cardWidth / viewer.offsetWidth`; then measure the
clone's `scrollHeight` and set card height = `naturalH * scale` capped at a max. The
clone needs `position:absolute; top/left:0; right/bottom:auto` to override the panel's
`inset:0`. Card is appended to `#stage` and positioned in stage-px.

**4. Drag-a-selection-to-file is CUSTOM pointer-drag, NOT native HTML5 DnD.**
Native DnD is fragile under `#stage`'s `transform:scale`. Instead: on `mousedown` that
lands INSIDE the current selection (`range.getClientRects()` hit-test), build a full-size
clone of the selected text that follows the cursor in stage-px; on drop over the open
browser, `range.deleteContents()` (cut) + create a new Snippet from the captured HTML.
All coords go through a `clientToStage()` helper (divide by `--stage-scale`).

**5. The menubar pill is a plain centered div, NOT Demo 2's clip-path.**
Demo 2 makes the pill with `clip-path: inset(... round)` on a full-width bar + 860px
`--menu-shift` transforms on the menu groups. We replaced that with a real
`width:1720px` (= 3440−860−860), centered, `border-radius`, and REMOVED the menu-shift
transforms. Parity gotcha: match Demo 2's `padding: 0 14px` exactly (24px pulled the
items inward and they jumped on the tab switch). Menu items must match Demo 2 verbatim:
` Finder File Edit View Go Window Help` — the scaffold had the wrong (word-processor) set.

**6. The background grid is Demo 2's shader ported to a static WebGL canvas (`js/grid-bg.js`),
replacing the 8 MB PNG** (which caused a heavy reswap on the Demo 2↔3 tab switch). It's
plain WebGL (no Three.js), one full-screen quad, drawn ONCE. Two non-obvious ports:
  - `fwidth()` needs `#extension GL_OES_standard_derivatives : enable` as the LITERAL
    first line of the frag source (no leading whitespace) + `gl.getExtension(...)`.
    Without it lines vanish (flat fill only).
  - Colors must be sRGB→linear converted before upload (Three.js's `THREE.Color` does
    this implicitly; raw WebGL does not) or lines render too white/desaturated.
  - Render at 3440×1440(×2) and CSS-stretch to fill `#stage`, matching the old PNG.
  - Resting uniforms = post-reveal state: `u_warpStrength = WARP_STRENGTH (1.33)`,
    `u_reveal = 1.0` (Demo 3 opens after Demo 2 has revealed the grid).
  Wrap the file in an IIFE — plain `<script>`s share one global scope and `DESKTOP_W`
  etc. collide with `stage.js`.

**7. Readability beats parity for the viewer (deliberate break).** The viewer window was
enlarged past the parity rect (now ~880×1040 at 1480,220) and `#panel-doc .wp-*` font
sizes bumped ~15% via demo3.css OVERRIDES (the lifted `wordprocessor.css` stays pristine).
The window rect is NO LONGER the Demo 2 parity rect — only the chrome (menubar/dock/grid)
must stay pixel-identical for the tab-switch illusion.

**8. `body` stays black** (cinema/letterbox bars). An experiment to tint it navy to mask
PNG-reswap flicker was abandoned once the PNG was replaced by the WebGL grid (no decode
delay), and black bars are the right look. Don't re-tint it.

---

## ▶️ Running it
No build step. Serve over HTTP (module/script + asset fetches need it):
```
python3 -m http.server 8000      # then open http://localhost:8000
```
