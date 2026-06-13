/* Demo 3 choreography — the only interactive logic in the demo.

   Gestures:
     [←] / [→]           → slide the file browser out / in
     [w]                 → toggle the two side windows (Finder / Browser)
     drag a Finder icon  → adds a top-level file row to the browser
     drag a text sel.    → from the doc OR the browser → a clip nested in "Snippets"
     click a file row    → open it as a tab in the viewer (Tab 1 = doc, never lost)
     hover a file row    → preview card pops out to the left (see demo3.css)

   The browser STARTS with only the open document. Everything else is dragged in
   (the "Snippets" folder is created on the first text drop). Tab 1 (the document)
   is authored in the HTML and always present. Clicking a file row appends a tab for
   its panel and activates it; clicking a row whose tab exists re-activates it.
   Close (×) removes the tab and falls back to the document; the doc tab has no ×. */

const filebrowser = document.getElementById('filebrowser');
const panelsWrap  = document.getElementById('viewer-panels');
const viewerTitle = document.getElementById('viewer-title');

const fbItems = document.getElementById('fb-items');

/* ── File browser slide ── */
function showBrowser() { filebrowser.classList.add('open'); }
function hideBrowser() { filebrowser.classList.remove('open'); }

/* ── Selection (no tabs) ──
   The viewer shows exactly one panel = the highlighted sidebar row. Clicking a row
   activates its panel, moves the .active highlight, and retitles the window. */
function openItem(item) {
  const panelId = item.dataset.panel;
  document.querySelectorAll('.viewer-panel').forEach(p =>
    p.classList.toggle('active', p.id === panelId));
  document.querySelectorAll('.fb-item').forEach(it =>
    it.classList.toggle('active', it === item));

  // Title = the item's name. Strip a file extension, but not for web pages (a domain
  // like "timeout.com" isn't name.ext).
  const nameEl = item.querySelector('.fb-name');
  if (nameEl) {
    const raw = nameEl.textContent;
    viewerTitle.textContent =
      item.dataset.kind === 'webpage' ? raw : raw.replace(/\.[^.]+$/, '');
  }
}

/* File row clicks → show in the viewer. */
document.querySelectorAll('#fb-items .fb-item').forEach(item => {
  item.addEventListener('click', () => openItem(item));
});

/* ── Hover preview card ──
   One shared card lives in #stage (so it scales with the desktop). On hover we
   clone the item's viewer panel, scale it to fit, and float it left of the browser.
   Cloning (not moving) keeps the live panel intact and means edits to the source
   DOM show up in the preview automatically.

   TEMPORARILY DISABLED (felt redundant with one-click open). Flip the flag to bring
   it back — all the wiring/code below is intact. Likely to be repurposed later as a
   provenance/relationship channel rather than a content preview. */
const HOVER_PREVIEW_ENABLED = false;

const stage = document.getElementById('stage');
const browserEl = document.getElementById('filebrowser');
const viewer = document.getElementById('viewer');

const previewCard = document.createElement('div');
previewCard.className = 'preview-card';
stage.appendChild(previewCard);

// Card width in stage-px (≈ the 740-wide viewer scaled down). Height is dynamic,
// derived from the cloned content, capped at PC_H_MAX so a long document doesn't
// produce a giant card.
const PC_W = 380;
const PC_H_MAX = 520;
previewCard.style.setProperty('--pc-w', PC_W + 'px');

function showPreview(item) {
  if (!HOVER_PREVIEW_ENABLED) return;
  const panel = document.getElementById(item.dataset.panel);
  if (!panel) return;

  // Clone the panel and force it visible & laid out at the viewer's content width.
  const clone = panel.cloneNode(true);
  clone.classList.add('active');           // panels are display:none unless active
  clone.classList.add('pc-clone');

  const contentW = viewer.offsetWidth;                       // ~880
  const scale = PC_W / contentW;            // scale by WIDTH so it fills the card
  clone.style.width  = contentW + 'px';
  clone.style.height = 'auto';              // let it take its natural height
  clone.style.transform = `scale(${scale})`;

  previewCard.innerHTML = '';
  previewCard.appendChild(clone);

  // Measure the clone's natural (unscaled) height, then size the card to fit.
  const naturalH = clone.scrollHeight;
  const cardH = Math.min(naturalH * scale, PC_H_MAX);
  previewCard.style.setProperty('--pc-h', cardH + 'px');
  previewCard.style.height = cardH + 'px';

  positionPreview(item, cardH);
  previewCard.classList.add('visible');
}

function positionPreview(item, cardH) {
  // Work in stage-px. #filebrowser is positioned relative to #viewer; compute its
  // left edge in stage coordinates so the card sits just to its left.
  const browserLeftPx = parseFloat(getComputedStyle(viewer).left)        // viewer x
                      - parseFloat(getComputedStyle(browserEl).width);   // minus browser width
  const gap = 16;
  const cardLeft = browserLeftPx - PC_W - gap;

  // Align the card's top with the hovered row's top (in stage-px) so it reads as
  // visually attached to that specific item.
  const stageScale = parseFloat(getComputedStyle(stage).getPropertyValue('--stage-scale')) || 1;
  const stageRect = stage.getBoundingClientRect();
  const itemRect  = item.getBoundingClientRect();
  const cardTop = (itemRect.top - stageRect.top) / stageScale;

  previewCard.style.left = cardLeft + 'px';
  previewCard.style.top  = cardTop + 'px';
}

function hidePreview() {
  previewCard.classList.remove('visible');
}

document.querySelectorAll('#fb-items .fb-item').forEach(item => {
  item.addEventListener('mouseenter', () => showPreview(item));
  item.addEventListener('mouseleave', hidePreview);
});

/* ── Window drag (titlebar → move the window) ──
   Shared by #viewer and the two side windows. Reads the layout left/top (the side
   windows' transform:scale doesn't affect getComputedStyle().left, so this is the
   pre-transform position we set) and applies cursor deltas divided by --stage-scale.
   Mousedown is NOT preventDefault-ed off the titlebar, so body text stays selectable. */
let topZ = 20;   // dragged window comes to front; starts above the viewer's resting z:10
function makeDraggable(win) {
  const bar = win.querySelector('.win-titlebar');
  if (!bar) return;
  bar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.traffic-lights')) return;  // don't steal traffic-light clicks

    win.style.zIndex = ++topZ;                        // raise the grabbed window
    const scale = parseFloat(getComputedStyle(document.getElementById('stage'))
                    .getPropertyValue('--stage-scale')) || 1;
    const startLeft = parseFloat(win.style.left) || parseFloat(getComputedStyle(win).left);
    const startTop  = parseFloat(win.style.top)  || parseFloat(getComputedStyle(win).top);
    const startX = e.clientX, startY = e.clientY;

    function onMove(ev) {
      win.style.left = (startLeft + (ev.clientX - startX) / scale) + 'px';
      win.style.top  = (startTop  + (ev.clientY - startY) / scale) + 'px';
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    e.preventDefault();
  });
}

[viewer, document.getElementById('win-finder'), document.getElementById('win-browser')]
  .forEach(makeDraggable);

/* ── Finder: click a file/folder to select it (single-selection highlight). ──
   .finder-file.selected styling already exists in windows.css. */
document.querySelectorAll('#win-finder .finder-file').forEach(file => {
  file.addEventListener('click', () => {
    document.querySelectorAll('#win-finder .finder-file.selected')
      .forEach(f => f.classList.remove('selected'));
    file.classList.add('selected');
  });
});

/* ── Side windows (Finder left, Browser right) ──
   They start hidden (.win-hidden) so the opening frame matches Demo 2. */
const sideWindows = document.querySelectorAll('#win-finder, #win-browser');
function revealSideWindows() { sideWindows.forEach(w => w.classList.remove('win-hidden')); }
function hideSideWindows()   { sideWindows.forEach(w => w.classList.add('win-hidden')); }   // .win-hidden fades (opacity transition)
function toggleSideWindows() { sideWindows.forEach(w => w.classList.toggle('win-hidden')); }

/* ── Hotels ──
   Hotel rows are pre-authored in the scrapbook but hidden (.stage-hidden). revealHotel
   un-hides one (flat, at the list bottom, wired + flashed). The Adlon is revealed by
   dragging it from the web page (see startSelectionDrag); bulkAddHotels (Stage 3 / Space)
   reveals whatever hotels remain hidden. Rows carry data-panel + data-mx/my (for the map). */
function revealHotel(row) {
  if (!row || !row.classList.contains('stage-hidden')) return;
  row.classList.remove('stage-hidden');
  row.classList.add('revealed');           // .fb-item is display:none until .revealed
  fbItems.appendChild(row);                // move to the BOTTOM of the list
  row.addEventListener('click', () => openItem(row));
  row.addEventListener('mouseenter', () => showPreview(row));
  row.addEventListener('mouseleave', hidePreview);
  row.classList.add('snippet-new');
  setTimeout(() => row.classList.remove('snippet-new'), 800);
}
function bulkAddHotels() {
  document.querySelectorAll('#fb-items .hotel-row.stage-hidden').forEach(revealHotel);
}

/* ── Stage 4: categorize — collect the hotels into a "Hotels" folder ──
   Folders appear for the FIRST time here (everything was flat until now). We build a
   .fb-group, move the 4 flat hotel rows into it (nested + expanded), and animate. The
   doc and any hand-dragged items stay flat at top level — only the hotels have a clear
   category for now. Clicking the folder row selects it and floats the chatbox (Stage 5). */
let hotelsFolder = null;
function categorize() {
  const hotelRows = document.querySelectorAll('#fb-items .hotel-row');
  if (!hotelRows.length || hotelsFolder) return;

  // The expandable group: a folder row + the nested hotel rows, shown expanded.
  hotelsFolder = document.createElement('div');
  hotelsFolder.className = 'fb-group revealed';
  hotelsFolder.id = 'fb-hotels-group';
  const folderRow = document.createElement('div');
  folderRow.className = 'fb-folder';
  folderRow.innerHTML =
    `<img class="fb-folder-icon-img" src="icons/folder.png" alt="">
     <span class="fb-name">Hotels</span>`;
  hotelsFolder.appendChild(folderRow);

  fbItems.appendChild(hotelsFolder);
  folderRow.classList.add('cat-folder-in');   // folder header slides in

  // Re-home the flat rows into the folder; each fades+settles with a short stagger
  // (no flying across the list — the calm version).
  hotelRows.forEach((row, i) => {
    row.classList.add('fb-nested', 'cat-settle');
    row.style.animationDelay = (0.12 + i * 0.09) + 's';
    hotelsFolder.appendChild(row);
    row.addEventListener('animationend', () => {
      row.classList.remove('cat-settle');
      row.style.animationDelay = '';
    }, { once: true });
  });

  folderRow.addEventListener('click', () => selectHotelsFolder(folderRow));
}

/* ── Stage sequencer (the demo's spine) ──
   Spacebar advances the scripted narrative one beat at a time (like a presentation
   clicker). Manual drags stay live throughout — Space only fires the SCRIPTED beats.
   stages[i] runs when advancing INTO stage i+2 (Stage 1 is just the opening state, so
   the first Space runs stages[0] = the Stage-2 beat). Beats past the end are no-ops.

   Stages (see plan.md):
     1  opening state (doc only, side windows hidden) — no beat, it's how we load
     2  reveal the two side windows                   — stages[0]
     3  bulk-add the hotels                            — bulkAddHotels (stages[1])
     4  categorize: hotels collect into a Hotels folder — categorize (stages[2])
     5  (map is triggered by the chatbox, not Space)
     6  fade the side windows back out (sources no longer needed) — stages[3]   */
let stageIdx = 0;
const stages = [
  revealSideWindows,                       // → Stage 2
  bulkAddHotels,                           // → Stage 3
  categorize,                              // → Stage 4
  hideSideWindows,                         // → after the map: sources fade away
];
function advanceStage() {
  if (stageIdx >= stages.length) return;   // nothing scripted left
  stages[stageIdx++]();
}

/* ── Keyboard choreography ── */
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); showBrowser(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); hideBrowser(); }
  else if (e.key === ' ')          { e.preventDefault(); advanceStage(); }
  else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); toggleSideWindows(); }
});

/* ══════════════════════════════════════════════════════════════════════════
   DRAG INTO THE SCRAPBOOK
   Custom pointer-drag (not native HTML5 DnD, which is fragile under the scaled
   stage). Sources: a doc/browser text selection (CUT from doc, COPY from browser),
   a Finder icon, and the browser URL pill. A full-size visual chip follows the
   cursor; a drop over the open scrapbook creates the item. Everything lands FLAT as
   a top-level row — no folders yet (folders arrive in the later "categorize" stage).
   ══════════════════════════════════════════════════════════════════════════ */
let itemSeq = 0;

// stage-px helpers (everything inside #stage is authored in desktop-px, scaled as a whole)
function stageScale() {
  return parseFloat(getComputedStyle(stage).getPropertyValue('--stage-scale')) || 1;
}
function clientToStage(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const s = stageScale();
  return { x: (clientX - r.left) / s, y: (clientY - r.top) / s };
}

// Is a point (client coords) inside the current text selection?
function pointInSelection(clientX, clientY) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  for (const rect of range.getClientRects()) {
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top  && clientY <= rect.bottom) return true;
  }
  return false;
}

function overBrowser(clientX, clientY) {
  if (!filebrowser.classList.contains('open')) return false;
  const r = filebrowser.getBoundingClientRect();
  return clientX >= r.left && clientX <= r.right &&
         clientY >= r.top  && clientY <= r.bottom;
}

/* Shared pointer-drag loop: float `chip` under the cursor, highlight the browser
   as a drop target, and call onDrop() if released over it. Caller owns the chip's
   size/contents and the cleanup of the source. */
function runChipDrag(e, chip, grabDX, grabDY, onDrop) {
  stage.appendChild(chip);
  function place(clientX, clientY) {
    const p = clientToStage(clientX, clientY);
    chip.style.left = (p.x - grabDX) + 'px';
    chip.style.top  = (p.y - grabDY) + 'px';
  }
  place(e.clientX, e.clientY);

  function onMove(ev) {
    place(ev.clientX, ev.clientY);
    filebrowser.classList.toggle('drop-target', overBrowser(ev.clientX, ev.clientY));
  }
  function onUp(ev) {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    const dropped = overBrowser(ev.clientX, ev.clientY);
    filebrowser.classList.remove('drop-target');
    chip.remove();
    if (dropped) onDrop();
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  e.preventDefault();
}

/* ── Drag a TEXT SELECTION (doc or browser) → a clip in Snippets ──
   `cut` = true removes the source text (the editable doc); false leaves it in place
   (a web page is read-only, so it's a copy). */
function startSelectionDrag(e, provenance, cut) {
  if (!pointInSelection(e.clientX, e.clientY)) return;   // only drag an existing selection

  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  const rects = range.getClientRects();
  if (rects.length === 0) return;

  // Bounding box of the whole selection, in stage-px
  let minL = Infinity, minT = Infinity, maxR = -Infinity;
  for (const r of rects) {
    minL = Math.min(minL, r.left); minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right);
  }
  const s = stageScale();
  const selW = (maxR - minL) / s;

  // Capture the selected HTML (single source of truth for the new snippet)
  const fragment = range.cloneContents();
  const capture = document.createElement('div');
  capture.appendChild(fragment.cloneNode(true));
  const capturedHTML = capture.innerHTML;
  const capturedText = sel.toString().trim();

  // If the selection sits inside a [data-hotel] block (e.g. the web page's Editor's Pick
  // for the Adlon), this drag yields that AUTHORED hotel row (panel + map pin), not a clip.
  const hotelHost = range.startContainer.parentElement?.closest('[data-hotel]');
  const hotelPanelId = hotelHost?.getAttribute('data-hotel') || null;

  // Full-size floating copy of the selected text
  const chip = document.createElement('div');
  chip.className = 'drag-snippet';
  chip.style.width = selW + 'px';
  chip.appendChild(fragment);

  const startStage = clientToStage(e.clientX, e.clientY);
  const selTopLeft = clientToStage(minL, minT);

  runChipDrag(e, chip, startStage.x - selTopLeft.x, startStage.y - selTopLeft.y, () => {
    if (!capturedText) return;
    if (hotelPanelId) {                      // a hotel drag → reveal its authored row
      revealHotel(document.querySelector(`.hotel-row[data-panel="${hotelPanelId}"]`));
    } else {
      createSnippet(capturedHTML, capturedText, provenance);
    }
    if (cut) range.deleteContents();        // doc = cut; web page = copy (leave the text)
    window.getSelection().removeAllRanges(); // either way, clear the highlight on drop
  });
}

const docPanel = document.getElementById('panel-doc');
docPanel.addEventListener('mousedown', (e) =>
  startSelectionDrag(e, 'Clipped from Tech Corridor Study.doc', true));   // cut

// Browser article text → same mechanic, but a COPY (the page can't be edited).
const browserContent = document.querySelector('#win-browser .browser-content');
if (browserContent) {
  browserContent.addEventListener('mousedown', (e) =>
    startSelectionDrag(e, 'Clipped from Time Out — Berlin Hotels', false));   // copy
}

/* ── Drag a FINDER ICON → a top-level file row ── */
document.querySelectorAll('#win-finder .finder-file').forEach(file => {
  file.addEventListener('mousedown', (e) => {
    const nameEl = file.querySelector('.file-name');
    const iconEl = file.querySelector('.file-icon');
    if (!nameEl || !iconEl) return;
    const name = nameEl.textContent.trim();
    const icon = iconEl.textContent.trim();

    // Full-size copy of the finder cell that follows the cursor.
    const r = file.getBoundingClientRect();
    const s = stageScale();
    const chip = document.createElement('div');
    chip.className = 'drag-finder';
    chip.style.width = (r.width / s) + 'px';
    chip.innerHTML = `<div class="file-icon">${icon}</div><div class="file-name">${name}</div>`;

    const startStage = clientToStage(e.clientX, e.clientY);
    const cellTopLeft = clientToStage(r.left, r.top);

    runChipDrag(e, chip, startStage.x - cellTopLeft.x, startStage.y - cellTopLeft.y,
      () => createFileItem(name, icon));
  });
});

/* ── Drag the BROWSER URL → a top-level web-page row ──
   Drags the address-bar pill; on drop, captures the whole page (a CLONE of the
   browser's authored .browser-content — it's all local DOM, so the viewer mirrors
   the page, not a screenshot). */
const urlPill = document.querySelector('#win-browser .browser-url');
if (urlPill && browserContent) {
  urlPill.addEventListener('mousedown', (e) => {
    const domain = (urlPill.querySelector('.domain')?.textContent || '').trim();
    const path   = (urlPill.querySelector('.path')?.textContent || '').trim();

    // Full-size copy of the URL pill that follows the cursor.
    const r = urlPill.getBoundingClientRect();
    const s = stageScale();
    const chip = document.createElement('div');
    chip.className = 'browser-url drag-url';
    chip.style.width = (r.width / s) + 'px';
    chip.innerHTML =
      `<span class="lock">🔒</span><span class="domain">${domain}</span><span class="path">${path}</span>`;

    const startStage = clientToStage(e.clientX, e.clientY);
    const pillTopLeft = clientToStage(r.left, r.top);

    runChipDrag(e, chip, startStage.x - pillTopLeft.x, startStage.y - pillTopLeft.y,
      () => createWebPageItem(domain, path, browserContent.innerHTML));
  });
}

/* ── Item factories ── */

// Wire a freshly-created row: click to open, hover to preview, brief land-flash.
function wireItem(item) {
  item.addEventListener('click', () => openItem(item));
  item.addEventListener('mouseenter', () => showPreview(item));
  item.addEventListener('mouseleave', hidePreview);
  item.classList.add('snippet-new');
  setTimeout(() => item.classList.remove('snippet-new'), 800);
}

// Append a freshly-built row to the scrapbook as a flat, top-level entry, then wire
// it. (Stage 1–3: everything is flat — no folders. Folders are introduced later, in
// the "categorize" stage, which will re-home these rows.)
function addRow(item) {
  fbItems.appendChild(item);
  wireItem(item);
}

// Text clip (doc/browser) → a snippet panel + a top-level row.
function createSnippet(html, text, provenance) {
  itemSeq++;
  const panelId = `panel-snippet-${itemSeq}`;
  const words = text.split(/\s+/).slice(0, 3).join('-').replace(/[^\w-]/g, '').toLowerCase();
  const name = `${words || 'snippet'}.txt`;

  const panel = document.createElement('div');
  panel.className = 'viewer-panel snippet-panel';
  panel.id = panelId;
  panel.innerHTML =
    `<div class="snippet-body">
       <div class="snippet-provenance">${provenance}</div>
       <div class="snippet-content">${html}</div>
     </div>`;
  panelsWrap.appendChild(panel);

  const item = document.createElement('div');
  item.className = 'fb-item revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'text';
  item.innerHTML = `<span class="fb-ico">📝</span><span class="fb-name">${name}</span>`;
  addRow(item);
}

// Finder icon → a top-level row + its viewer panel. Spreadsheets reuse the authored
// budget panel (same toolbar/formula-bar/grid view); everything else gets a simple
// "no preview" placeholder.
const SPREADSHEET_RE = /\.(xlsx|xls|csv|numbers)$/i;
function createFileItem(name, icon) {
  itemSeq++;
  const panelId = `panel-file-${itemSeq}`;

  const panel = document.createElement('div');
  panel.id = panelId;
  if (SPREADSHEET_RE.test(name)) {
    // Clone the authored spreadsheet view so it reads as a real app, not a placeholder.
    panel.className = 'viewer-panel sheet-panel';
    panel.innerHTML = document.getElementById('panel-budget').innerHTML;
  } else {
    panel.className = 'viewer-panel file-panel';
    panel.innerHTML =
      `<div class="file-panel-inner">
         <div class="file-panel-icon">${icon}</div>
         <div class="file-panel-name">${name}</div>
         <div class="file-panel-note">No preview available</div>
       </div>`;
  }
  panelsWrap.appendChild(panel);

  const item = document.createElement('div');
  item.className = 'fb-item revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'file';
  item.innerHTML = `<span class="fb-ico">${icon}</span><span class="fb-name">${name}</span>`;
  addRow(item);
}

// Browser URL → a top-level row + a viewer panel that MIRRORS the page (a clone of the
// browser's authored .browser-content — it's all local DOM, so this is the real markup,
// not a screenshot). Clicking the row shows it in the viewer.
function createWebPageItem(domain, path, pageHTML) {
  itemSeq++;
  const panelId = `panel-web-${itemSeq}`;

  const panel = document.createElement('div');
  panel.className = 'viewer-panel web-panel';
  panel.id = panelId;
  // .browser-content is the scroll container in the browser; reuse it here so the
  // page's own .page-* styles (css/windows.css) apply unchanged.
  panel.innerHTML = `<div class="browser-content">${pageHTML}</div>`;
  panelsWrap.appendChild(panel);

  const item = document.createElement('div');
  item.className = 'fb-item revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'webpage';
  item.innerHTML = `<span class="fb-ico">🌐</span><span class="fb-name">${domain}</span>`;
  addRow(item);
}

/* ══════════════════════════════════════════════════════════════════════════
   STAGE 5 — act on the folder: a chatbox over the Hotels folder, "Put these on a
   map" → a new top-level "Hotel Map" scrapbook item showing a stylized Berlin map
   with a red pin per hotel (positions from each hotel row's data-mx/data-my).
   The chatbox is scripted, not real NLP — any text fires it (the presenter drives).
   ══════════════════════════════════════════════════════════════════════════ */

// Click the Hotels folder → highlight it and TOGGLE the chatbox (clicking again, or
// the ×, Escape, or clicking elsewhere, dismisses it — so it can't stack/re-fire).
function selectHotelsFolder(folderRow) {
  document.querySelectorAll('.fb-item, .fb-folder').forEach(el => el.classList.remove('active'));
  folderRow.classList.add('active');
  if (chatbox) hideChatbox();              // already open → second click closes it
  else showChatbox(folderRow);
}

let chatbox = null;
function hideChatbox() {
  if (!chatbox) return;
  chatbox.remove();
  chatbox = null;
  document.removeEventListener('keydown', onChatEscape, true);
  document.removeEventListener('mousedown', onChatOutside, true);
}
function onChatEscape(e) { if (e.key === 'Escape') { e.stopPropagation(); hideChatbox(); } }
function onChatOutside(e) {
  // a mousedown outside the chatbox (and not on the Hotels folder, which toggles) closes it
  if (chatbox && !e.target.closest('.scrap-chat') && !e.target.closest('#fb-hotels-group .fb-folder')) {
    hideChatbox();
  }
}

function showChatbox(anchorRow) {
  chatbox = document.createElement('div');
  chatbox.className = 'scrap-chat';
  chatbox.innerHTML =
    `<div class="scrap-chat-head">Prompt for “Hotels”<span class="scrap-chat-close">×</span></div>
     <div class="scrap-chat-log"></div>
     <input class="scrap-chat-input" type="text" />`;
  stage.appendChild(chatbox);

  // Position in stage-px so it pops right AT the clicked folder row (overlapping the
  // scrapbook's right edge, spilling toward the viewer) — i.e. where the eye already is.
  const stageScaleV = stageScale();
  const stageRect = stage.getBoundingClientRect();
  const rowRect = anchorRow.getBoundingClientRect();
  const rowX = (rowRect.left   - stageRect.left) / stageScaleV;   // folder row, stage-px
  const rowBottom = (rowRect.bottom - stageRect.top) / stageScaleV;
  chatbox.style.left = (rowX + 60) + 'px';     // nudge right so it overlaps the row/edge
  chatbox.style.top  = (rowBottom + 8) + 'px'; // just below the row

  chatbox.querySelector('.scrap-chat-close').addEventListener('click', hideChatbox);

  const input = chatbox.querySelector('.scrap-chat-input');
  input.focus();
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();                     // don't let Space/arrows hit the stage handler
    if (e.key === 'Enter' && input.value.trim()) runChatPrompt(input.value.trim());
  });

  // Dismiss on Escape or an outside click (capture phase so we see it first).
  document.addEventListener('keydown', onChatEscape, true);
  document.addEventListener('mousedown', onChatOutside, true);
}

// "Thinking" beat, then build the map and dismiss the chatbox.
function runChatPrompt(text) {
  const log = chatbox.querySelector('.scrap-chat-log');
  const input = chatbox.querySelector('.scrap-chat-input');
  log.innerHTML = `<div class="scrap-chat-you">${text}</div>
                   <div class="scrap-chat-bot">Working on it<span class="dots">…</span></div>`;
  input.disabled = true;
  setTimeout(() => { createMapItem(); hideChatbox(); }, 1100);
}

// New top-level "Hotel Map" item + a .map-panel with a red pin per hotel.
// Idempotent: only one map ever — a repeat prompt just re-opens the existing one.
let mapItem = null;
function createMapItem() {
  if (mapItem) { openItem(mapItem); return; }
  itemSeq++;
  const panelId = `panel-map-${itemSeq}`;

  // One pin per hotel, placed by its normalized data-mx/data-my (0–1) on the map.
  const pins = [...document.querySelectorAll('#fb-items .hotel-row')].map(row => {
    const name = row.querySelector('.fb-name').textContent;
    const mx = parseFloat(row.dataset.mx), my = parseFloat(row.dataset.my);
    return `<div class="map-pin" style="left:${mx * 100}%; top:${my * 100}%;">
              <span class="map-pin-dot">📍</span><span class="map-pin-label">${name}</span>
            </div>`;
  }).join('');

  const panel = document.createElement('div');
  panel.className = 'viewer-panel map-panel';
  panel.id = panelId;
  panel.innerHTML =
    `<div class="map-canvas">
       <div class="map-roads"></div>
       <div class="map-park map-tiergarten"></div>
       <div class="map-park map-volkspark"></div>
       <div class="map-block map-block-a"></div>
       <div class="map-block map-block-b"></div>
       <div class="map-water"></div>
       <div class="map-water map-canal"></div>
       <div class="map-label map-label-river">Spree</div>
       <div class="map-label map-label-park">Tiergarten</div>
       <div class="map-label map-label-mitte">Mitte</div>
       <div class="map-label map-label-fhain">Friedrichshain</div>
       ${pins}
     </div>`;
  panelsWrap.appendChild(panel);

  const item = document.createElement('div');
  item.className = 'fb-item revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'map';
  item.innerHTML = `<span class="fb-ico">🗺️</span><span class="fb-name">Hotel Map</span>`;
  // Top-level: insert before the first folder group so it stays above the Hotels folder.
  const firstGroup = fbItems.querySelector('.fb-group');
  if (firstGroup) fbItems.insertBefore(item, firstGroup); else fbItems.appendChild(item);
  wireItem(item);

  mapItem = item;                            // remember it so we never make a second
  openItem(item);                            // select + show it immediately
}
