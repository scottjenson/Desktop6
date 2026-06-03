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
index.html            #stage: wallpaper, menubar (pill), the attached unit, dock, trash.
                      All panel content is inlined here (doc / image / markdown / sheet).
css/base.css          reset, :root vars, #stage letterbox scaling, #wallpaper. (from Demo 2)
css/desktop.css       chrome: menubar pill, dock, trash, shared .os-window frame. (LIFTED — keep in sync)
css/wordprocessor.css .wp-* document styles for Tab 1. (LIFTED from Demo 2's windows.css)
css/demo3.css         NEW: parity rect, file browser, tab bar, hover cards, panel types.
js/stage.js           letterbox scale on load + resize.
js/demo3.js           the 3 gestures: slide browser / reveal item / open tab. Folder collapse.
icons/                dock icons (copied from Demo 2).
assets/wallpaper.png  MUST be captured from Demo 2 — see assets/WALLPAPER_README.txt.
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
**DONE (this scaffold):**
- Stage + letterbox scaling matching Demo 2.
- Lifted chrome (pill menubar, dock, trash, window frame).
- Viewer pinned to the parity rect; attached file browser that slides out.
- Collapsible folder; 3 pre-authored items (image, markdown, spreadsheet) + the document.
- Reveal-one-at-a-time, hover preview cards, click-to-open tabs with close/fallback.
- Three gestures wired: `[→]` slide, `[Space]` reveal, click open.

**TODO when you start the fresh session:**
1. **Generate `assets/wallpaper.png`** using the Demo 2 grid-export tool (see
   WALLPAPER_README.txt): open `grid-export.html` in the Demo 2 project, click Download,
   drop the PNG here. It reuses Demo 2's real shader + config, so it's pixel-faithful.
   Until then the background falls back to flat dark navy — the demo still runs.
2. **Verify parity by eye:** open Demo 2 and Demo 3 side by side; confirm menubar pill,
   dock, and the viewer rect line up. Adjust only if they don't.
3. **Polish the authored content** (doc/image/markdown/spreadsheet) so each reads as a
   believable real file — this is where the demo lands or doesn't.
4. **Tune the choreography** to the narration (reveal pacing, card timing, which item
   opens first). Confirm the gesture keys feel right (`[→]` / `[Space]`).

**Deferred / backlog (only if asked):**
- The Demo-2 "align" key (lives in Demo 2, not here — see above).
- A lighter/heavier file-tree visual treatment (current is "window-manager, lighter
  than Obsidian" — taste call, expect iteration).
- Image panel currently uses a CSS placeholder; swap in a real image if desired.

---

## ▶️ Running it
No build step. Serve over HTTP (module/script + asset fetches need it):
```
python3 -m http.server 8000      # then open http://localhost:8000
```
Use Chrome (Canary not required — there's no experimental API here, unlike Demo 2).
