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
A word-processor-style **viewer** with an attached, Obsidian-like **file browser**
that slides out from its left. The story: a side panel that **bridges the clipboard
and the filesystem** — content "dragged" out of a document becomes a real file you can
preview inline and open beside the document. Items appear in the browser, you hover
them for a preview card, and clicking one opens it as a **new tab** in the viewer
(the document is always Tab 1 and is never lost).

**Crucial framing — this is staged, not interactive.** The drag-in / clipboard / file
mechanics are *narrated over*, not implemented. The only real interactivity is:
- `[→]` slide the file browser out (toggle)
- `[Space]` reveal the next pre-authored item, one at a time (lets you pace narration)
- click a file row → open its tab
- hover a file row → preview card (CSS-only)

Do **not** build real drag-and-drop, file parsing, or clipboard plumbing unless asked.
The items are a **fixed, pre-authored set** (image, markdown, spreadsheet) plus the
document. Their content is hand-written to *look* real — that authoring is the actual
work; the mechanics are trivial.

---

## 🔗 Relationship to Demo 2 (the tab-switch illusion)
Each demo is its own web page, shown in a **separate browser tab**. The author switches
Demo 2 → Demo 3 live; the switch must be **invisible**. That works because the shared,
static layers are **pixel-identical**:

- Same **pill menubar**, same **dock**, same **trash**, same **wallpaper**, same
  **window frame** (`.os-window`, traffic lights, titlebar).
- Demo 3 **opens where Demo 2 leaves off**: menubar already in its collapsed *pill*
  state, a single word-processor window centered, no file browser yet.

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
                      windows (Finder/Browser, inlined), dock, trash. All panel content
                      is inlined here too (doc / image / markdown / sheet).
css/base.css          reset, :root vars, #stage letterbox scaling. (from Demo 2)
css/desktop.css       chrome: menubar pill, dock, trash, shared .os-window frame. (LIFTED — keep in sync)
css/wordprocessor.css .wp-* document styles for Tab 1. (LIFTED from Demo 2's windows.css)
css/windows.css       per-window chrome for the side windows (Finder/Browser/etc). (LIFTED from Demo 2)
css/demo3.css         NEW: parity rect, file browser, tab bar, hover cards, panel types,
                      side-window placement/scale, doc-narrowing overrides.
js/stage.js           letterbox scale on load + resize.
js/grid-bg.js         WebGL background grid (Demo 2's shader ported; replaces the old PNG).
js/demo3.js           gestures: slide browser / reveal item / open tab; window dragging,
                      finder select, [w] side-window toggle. Folder collapse.
icons/                dock + file-row icons (copied from Demo 2).
(No assets/ dir — the old 8 MB wallpaper PNG was replaced by the js/grid-bg.js shader.)
```

### The attached unit
The file browser and viewer share one frame (Obsidian-style). The **viewer is pinned to
the parity rect and never moves.** The browser is positioned to the **left** of it
(`right:100%`) and slides in via `transform`; opening it does **not** disturb the
viewer's position — so parity holds even while the browser is out. Hover cards float
further left, out into open desktop space (impossible in Demo 2's clipped meshes).

### Tabs
Tab 1 (the document) is authored in HTML and always present (no close button). Clicking
a file row appends a tab for its panel (`data-panel` links row → panel id) and activates
it; clicking a row whose tab exists re-activates it; `×` closes a tab and falls back to
the document. All panels are static, pre-authored markup; switching tabs just toggles
`.active`.

---

## 🚨 Anti-patterns (do NOT do these)
1. **Do NOT** re-introduce Three.js / WebGL / `layoutsubtree`. Demo 3 is plain DOM by design.
2. **Do NOT** edit the lifted chrome (`desktop.css` menubar/dock/trash, the frame) in
   ways that change its appearance — it must match Demo 2 pixel-for-pixel.
3. **Do NOT** move the viewer off the parity rect, or make the browser push it.
4. **Do NOT** build real drag/drop, clipboard, or file I/O. Items are pre-authored; the
   bridge is narrated, not coded.
5. **Do NOT** add a second coordinate system — author inside `#stage` in desktop-px.
6. **Do NOT** add a build step, framework, or bundler. Serve over HTTP, plain modules/scripts.

---

## 📍 Status & phased plan
**DONE:**
- Attached file browser sliding out from the viewer's left (keys below).
- Flat file list: `Design Proposal.doc` (the doc, pre-revealed) + `budget.csv` +
  a `Snippets` folder containing `research-notes.md`. Items reveal one step at a time.
- Hover preview cards (scaled `cloneNode` of the real panel — live, not a copy).
- Click a row → opens a tab with a × close (doc tab has none); tabs fall back to the doc.
- Drag a text selection out of the document into the browser → creates a new Snippet (a CUT).
- Spreadsheet panel dressed up with a toolbar + formula bar so it reads as an app.
- Background grid is now a live WebGL shader port (no PNG) — see Learnings.
- Two side windows (Finder left, Browser right of the viewer), inlined into index.html
  and styled by css/windows.css. Hidden on open (`.win-hidden`) so the Demo-2 tab-switch
  frame is unchanged; GPU-scaled 1.18× to match the viewer's readability scale. All three
  windows drag by their titlebar; Finder rows click-to-select; browser article is
  selectable text.

**Current gesture map (js/demo3.js):**
- `[←]` show file browser · `[→]` hide it (NOT a toggle — left always shows, right always hides).
- `[↓]` reveal next item/step · `[↑]` un-reveal last. A `.fb-group` (folder+contents)
  reveals as ONE step. The doc row is pre-revealed and excluded from the sequence.
- `[w]` toggle the two side windows (Finder/Browser) in/out.
- click row → open tab · hover row → preview card · drag any titlebar → move that window
  (raises it to front) · click a Finder file → select it.

**Deferred / backlog (only if asked):**
- The Demo-2 "align" key (lives in Demo 2, not here — see above).
- Image panel currently uses a CSS placeholder; swap in a real image if desired.

---

## 🧠 Learnings (hard-won — don't rediscover these)

**1. The file browser MUST stay a child of `#viewer`, escaping via `right:100%`.**
It's `position:absolute; right:100%` so its right edge sits on the viewer's left edge
and it slides via `transform`. `#viewer` is `overflow:visible` so the browser isn't
clipped; the viewer's OWN rounded-corner clipping is restored by an inner `.viewer-clip`
wrapper (titlebar+tabs+panels live inside it, the browser does NOT). Pulling the browser
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
Use Chrome (Canary not required — there's no experimental API here, unlike Demo 2).
