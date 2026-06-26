# Demo 3 — Clipboard ↔ Filesystem Bridge (Project Context)

## 🤖 Read this first
**Demo 3** of three web prototypes about rethinking the desktop — a **standalone project**
split off from Demo 2 (a 3D HTML-in-canvas window manager). This file records *why* it's
built the way it is and *what is intentionally fake*, so you don't "improve" things that
are simple on purpose.

Author (Scott) prefers: **discuss before coding; reuse existing structure over new
machinery; edit only the files named; never commit/push without approval.**

## 🎯 What it shows
A word-processor **viewer** with an attached **Scrapbook** panel (Obsidian-like) that
slides out from its left — a side panel that **bridges the clipboard and the filesystem**.
Content dragged from the document, Finder, or a web page becomes a real scrapbook item you
can open beside the doc. Items accrue FLAT and messy; later they're organized into a folder
that can be acted on ("put these on a map"). One panel at a time (no tabs) — clicking a row
shows it in the viewer. The arc is a scripted, Spacebar-driven sequence (see Gesture map).

**Staged story, real gestures.** The clipboard/filesystem *narrative* is faked, but the
drag interactions are built for real (custom pointer-drag — see Learning #4). Source
*content* (doc prose, the article, the spreadsheet) is hand-authored to look real — that
authoring IS the work. Do **not** build real file parsing, network fetches, or clipboard
plumbing.

## 🔗 Tab-switch illusion with Demo 2
Each demo is its own browser tab; the author switches Demo 2 → Demo 3 live and the switch
must be **invisible**. So the shared chrome — **pill menubar, dock, trash, wallpaper grid,
window frame** (`.os-window`, traffic lights, titlebar) — is **lifted from Demo 2 and must
stay pixel-identical** (`css/desktop.css` + that markup). Demo 3 opens where Demo 2 leaves
off: menubar already a collapsed pill, one centered word-processor window, no scrapbook yet.
If you're tweaking the chrome, you're about to make the seam visible — stop.

*(Deferred, NOT here: Demo 2 will get an "align" keypress animating its live WP window to
match Demo 3's opening frame. Lives in Demo 2's `js/windows.js`. Out of scope.)*

## 🏗 Architecture — plain DOM + CSS + vanilla JS
No Three.js, no WebGL window layer, no raycasting, **no build step**. Demo 2's 3D layer was
dropped on purpose: everything Demo 3 wants (per-item hover, cards escaping window bounds,
sliding panels) is trivial in DOM and was hard/impossible as baked meshes. Keep it plain.

**Stage / letterbox:** `#stage` is a fixed **3440×1440** element scaled by
`--stage-scale = min(vw/3440, vh/1440)` (`js/stage.js`), centered with black bars.
**Everything inside `#stage` is authored in desktop-px** — one coordinate system, no second.

**The attached unit:** the scrapbook panel (`#scrapbook`) is a child of `#viewer`,
positioned `right:100%` so it slides out to the **left** via `transform` without moving the
viewer (see Learning #1). The viewer shows exactly ONE panel = the highlighted row
(`data-panel` links row→panel; `.active` toggles both). Authored panels live in the HTML;
dragged-in items get panels built at runtime.

**File map:**
```
index.html            #stage: grid bg, pill menubar, the attached unit, the two inlined
                      side windows (Finder/Browser), dock, trash. Authored viewer panels
                      (doc, spreadsheet, hotels) live here.
css/base.css          reset, :root vars, #stage letterbox scaling. (from Demo 2)
css/desktop.css       LIFTED chrome — menubar pill, dock, trash, .os-window frame. Keep in sync.
css/wordprocessor.css canonical .wp-* document styles.
css/windows.css       chrome for the two side windows (Finder + Browser) + --win-* vars.
css/demo3.css         parity rect, #scrapbook, panel types, side-window placement/scale,
                      provenance highlight + History toast, doc overrides.
js/stage.js           letterbox scale on load/resize.
js/grid-bg.js         WebGL background grid (Demo 2's shader ported; see Learning #6).
js/demo3.js           ALL interactive logic: Space stage sequencer, row select, window
                      drag, drag-in factories, chatbox→map, minimize/restore, provenance.
icons/                dock + file-row icons + scrapbook.png (collapsed desktop icon).
```

## 🚨 Anti-patterns (do NOT)
1. Re-introduce Three.js / WebGL window layer / a build step / a framework.
2. Change the appearance of the lifted chrome (must match Demo 2 pixel-for-pixel).
3. Move the viewer off its rect, or let the scrapbook push it.
4. Build real drag/drop, clipboard, or file I/O — the bridge is narrated, not coded.
5. Add a second coordinate system — author inside `#stage` in desktop-px.

## ⌨️ Gesture map (the demo's spine — see `js/demo3.js`)
- **`[Space]`** — advance the scripted arc, one beat per press (`stages[]`):
  reveal side windows → bulk-add the remaining hotels → hide the windows → categorize the
  4 hotels into a **Hotels** folder. No-op past the end.
- **`[←]` / `[→]`** — show / hide the scrapbook (not a toggle). **`[w]`** — toggle the two
  side windows. **`[h]`** — toggle **History** (provenance hover; starts OFF; brief toast).
- **Click** a row → show it in the viewer · the **Hotels folder** → chatbox · a **Finder
  file** → select it · the viewer's **traffic-lights** → minimize the unit to a desktop
  icon · the **desktop icon** → restore. **Drag** any titlebar → move that window.
- **Drag into the open scrapbook** (live throughout; all land FLAT as a top-level row):
  - Finder icon → file row (spreadsheets clone `#panel-budget`; else "no preview").
  - Doc text → a Snippet (a CUT) · Browser text → a Snippet (a COPY) · Browser URL pill →
    a web-page row mirroring `.browser-content`.
  - The web page's Editor's Pick (Adlon) is `[data-hotel]`, so dragging it reveals the
    AUTHORED hotel row, not a generic clip.

**Off-Space beats:** clicking the Hotels folder → chatbox → any text + Enter → a **Hotel
Map** item (stylized Berlin map, a red pin per hotel from `data-mx/data-my`; idempotent).
Minimize/restore is click-driven (traffic-lights ↔ desktop icon), deliberately NOT on Space.

Hotels read as plain CLIPPED TEXT (`.snippet-panel`: name + blurb + address + phone +
review) so the map step has real per-hotel data.

## 🔎 Provenance on hover ("History", `[h]`)
Hovering a scrapbook row reminds you where it came from: reveal its source window (only if
hidden — and re-hide only what we opened) and paint a soft red highlight over the exact
origin. One engine, a per-kind descriptor (`provenanceFor`):
- **doc snippet** → a marker span left in the doc on cut (collapsed `display:none`, so the
  text reads as "cut"); hover pops it back, red, scrolled into view. *(The cut no longer
  deletes — it wraps + collapses; this is the anchor that survives.)*
- **browser snippet / hotels** → the authored page block (`[data-hotel]` on each card).
- **finder file** → its source Finder cell · **map** → the 4 hotel rows.
- The box is painted AFTER a revealed window's transition settles, and CLAMPED to the
  window's content rect so it can't bleed past the frame.

## 🧠 Learnings (don't rediscover these)
1. **Scrapbook panel stays a child of `#viewer`, escaping via `right:100%`.** It's
   `position:absolute; right:100%` and slides via `transform`; `#viewer` is
   `overflow:visible` (an inner `.viewer-clip` restores the rounded-corner clip for the
   titlebar/panels). Pulling it out and re-anchoring to stage-px broke positioning AND
   "moves with the window".
2. **Panel-type CSS must not set `display`.** `.viewer-panel.active{display:flex}` shows a
   panel; a `.snippet-panel{display:flex}` rule overrides that and leaks the wrong panel.
   Style backgrounds/padding on panel types, never `display`.
3. **Custom pointer-drag, NOT native HTML5 DnD** (fragile under `#stage`'s `transform:scale`).
   On `mousedown` inside the selection (`getClientRects()` hit-test), float a clone in
   stage-px; on drop, build the item. All coords go through `clientToStage()` (÷ scale).
4. **CSS reveal of a `display:none` element:** transitions don't fire on the display flip —
   use a keyframe `animation` instead (e.g. the doc-clip red fade-in).
5. **Menubar pill is a plain centered `width:1720px` div** (= 3440−860−860), NOT Demo 2's
   `clip-path` + menu-shift transforms. Match Demo 2's `padding: 0 14px` and menu items
   verbatim (` Finder File Edit View Go Window Help`) or they jump on the tab switch.
6. **Background grid = Demo 2's shader on a static WebGL canvas** (`js/grid-bg.js`), drawn
   once, replacing an 8 MB PNG. Gotchas: `#extension GL_OES_standard_derivatives` must be
   the literal first frag line (for `fwidth()`); colors need sRGB→linear before upload;
   wrap the file in an IIFE (plain `<script>`s share global scope — `DESKTOP_W` collides
   with `stage.js`).
7. **Readability beats parity for the viewer (deliberate break).** The viewer is enlarged
   past the old parity rect and `#panel-doc .wp-*` fonts bumped ~15% via demo3.css
   overrides. Only the *chrome* (menubar/dock/grid) must stay pixel-identical for the
   tab-switch — not the WP window rect.
8. **`body` stays black** (letterbox bars) — don't tint it.

## ▶️ Running it
No build step — serve over HTTP:
```
python3 -m http.server 8000      # then open http://localhost:8000
```
