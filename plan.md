# Scrapbook Stages — Implementation Plan

> Living plan for the staged "Scrapbook" demo. If a context is lost, a fresh one
> can resume from here. Update the **Progress** section as chunks land.
> See `CLAUDE.md` for the project's hard rules (plain DOM, no build, parity, etc.).

## The concept

Rename "parking lot" → **Scrapbook** (thematically tied to the clipboard it builds on).
A word-processor **viewer** with an attached **Scrapbook** panel (today's "file browser").
The narrative arc is **flat accretion (messy by design) → "anything goes in" → bulk
gather → the system imposes structure → structure becomes a substrate for a new action
(a map).**

The whole arc is driven by **Spacebar** = "advance to the next scripted beat" (like a
presentation clicker). **Manual drags stay live the entire time** — Space only triggers
the *scripted* additions; the user can still drag things in by hand whenever.

## The 5 stages

1. **Introduce the concept.** Scrapbook open with a single entry: `Design Proposal.doc`
   (the open document). Viewer to the side (exactly what exists now). The user drags
   things from the **doc** into the scrapbook. **All items are TOP-LEVEL. No folders.**
2. **Things can come from elsewhere.** Reveal the two side windows (Finder + Browser).
   Drag in: a Finder file, a URL, and a browser text selection. Point: the scrapbook
   holds nearly anything. **Still flat.**
3. **Bulk gather (messy by design).** One keypress instantly adds **4 more items** —
   hotels gathered "from around the web" (Berlin; the talk location). Top-level, flat.
4. **Categorize.** A keypress asks the system to organize. **Folders appear for the
   first time** — the 4 hotels animate into a **Hotels** folder; the other dragged
   items move into 1–2 sensible folders. (Content may be tweaked so the non-hotel
   groupings tell a clean story.)
5. **Act on structure.** Click the **Hotels** folder → a small **chatbox floats** over
   the scrapbook. Type *"Put these on a map"* → creates a new **top-level** item
   **"Hotels Map"**, auto-selected, showing a **stylized map with 4 red pins** for the
   hotels.

## Decisions (locked)

- **Advance key:** Spacebar. (`[←]`/`[→]` keep showing/hiding the scrapbook; `[w]`
  side-window toggle still exists but Stage 2 also reveals them via Space.)
- **Categorize trigger:** a keypress (Space, as the Stage-4 beat). Items **animate**
  from flat rows into folders — reads as "the system reorganized for me."
- **Stage 5 trigger:** the floating **chatbox** (NOT Space). Clicking the Hotels folder
  shows it; pressing Enter runs the make-map effect. It is scripted, not real NLP.
- **Map fidelity:** stylized static map — SVG/CSS, hand-placed red pins. **No tiles,
  no library, no network.** On-thesis (everything is faked DOM) and demo-reliable.
- **Hotel content:** pre-authored in `index.html`, hidden until Stage 3 reveals it.
  City = **Berlin**. Hand-written to look real (name, neighborhood, price/night, blurb).
- **Manual drags UNCHANGED:** finder-icon drag, word-processor text drag, URL drag,
  browser text drag all keep working exactly as they do now. The ONLY change to them is
  **flattening** — they append a top-level row instead of nesting in a folder.

## Architecture notes

- Plain DOM + vanilla JS, no build (per CLAUDE.md). All sizes in desktop-px inside
  `#stage` (3440×1440, letterbox-scaled).
- **Stage sequencer** is the new spine: `let stageIdx; const stages = [fn, ...];` and a
  Space handler that runs `stages[stageIdx++]`. Each stage fn performs its scripted
  effect (reveal windows / bulk-add hotels / categorize / etc.). Idempotent-ish: extra
  Space past the end is a no-op.
- **Flatten:** remove `ensureGroup` / `ensureSnippetsGroup` / `ensureWebPagesGroup` and
  `.fb-nested`. `createSnippet` / `createFileItem` / `createWebPageItem` each just
  `fbItems.appendChild(item)`. Folders return ONLY as the Stage-4 outcome.
- **Folders (Stage 4):** reintroduce a minimal folder group (`.fb-group` + `.fb-folder`)
  as an *animated outcome*, not the default. Move existing rows in; brief highlight.
- **Chatbox (Stage 5):** a small floating input over the scrapbook (absolute, stage-px).
  Shown on Hotels-folder click. Enter → `createMapItem()`. Whatever is typed, it fires
  (user controls the demo); optionally gate on a map-ish phrase.
- **Map (Stage 5 output):** a `.map-panel` viewer panel — stylized Berlin-ish SVG/CSS
  base + 4 absolutely-positioned red pins with tiny labels matching the 4 hotels. New
  top-level row (🗺️ Hotels Map), auto-selected.
- **Naming:** UI labels say "Scrapbook"; CSS class names (`.fb-item`, etc.) stay as-is
  to avoid churn unless a full rename is requested.

## Build order (chunks; commit between)

1. **Flatten + rename to Scrapbook.** Drags append flat top-level rows; header says
   SCRAPBOOK; remove folder machinery. Isolated, get it solid.
2. **Stage sequencer + Stages 1–2.** Space advances; Stage 2 reveals the side windows.
   → **STOP, confirm with Scott before continuing.**
3. **Stage 3 hotels.** Pre-authored Berlin hotel content (rows + panels), hidden;
   Space bulk-reveals them flat.
4. **Stage 4 categorize.** Folders appear as an animated outcome; hotels → Hotels folder,
   others → sensible folders. (May tweak content for a clean grouping story.)
5. **Stage 5 chatbox + map.** Click Hotels folder → chatbox → "Put these on a map" →
   stylized Berlin map with 4 red pins as a new top-level item.

## Open / to-decide later

- Exact non-hotel folder names in Stage 4 (depends on what's been dragged in — may
  pre-script a couple of drags or adjust content for a tidy story).
- Whether the chatbox should gate on the typed phrase or always fire.
- Folder behavior beyond Stage 4 (collapse/expand) — out of scope for now.

## Progress

- [x] Chunk 1 — Flatten + rename to Scrapbook. Drags append flat top-level rows;
      header says SCRAPBOOK; ensureGroup/Snippets/WebPages + .fb-nested removed from JS
      (folder CSS kept for chunk 4). Manual drags unchanged otherwise.
- [x] Chunk 2 — Stage sequencer (`stages[]` + `advanceStage`, Spacebar). Stage 2 beat =
      `revealSideWindows`. Verified: first Space reveals Finder+Browser. Stages 3–4 are
      stubbed as TODO entries in the `stages` array.  ← **CONFIRM HERE before chunk 3**
- [x] Chunk 3 — Stage 3 hotels. 4 pre-authored Berlin hotels (Adlon/Mitte,
      Michelberger/Friedrichshain, 25hours/Charlottenburg, Oderberger/Prenzlauer Berg),
      hidden via `.stage-hidden`. `bulkAddHotels` (stages[1]) reveals them flat + wires
      click/hover. Rows carry data-mx/data-my normalized pin coords for the Stage-5 map.
      Hotel panels + `.hotel-panel` CSS authored. Verified.
- [ ] Chunk 4 — Stage 4 categorize (folders appear; hotels→Hotels folder, others→folders).
      Add `categorize` as stages[2].
- [ ] Chunk 5 — Stage 5 chatbox + map (click Hotels folder → chatbox → map item).
