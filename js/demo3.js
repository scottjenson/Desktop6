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
  // like "theverge.com" isn't name.ext).
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

/* ── Keyboard choreography ── */
/* [w] toggles the two side windows (Finder left, Browser right). They start
   hidden (.win-hidden) so the opening frame matches Demo 2; this reveals/hides
   both at once during narration. */
const sideWindows = document.querySelectorAll('#win-finder, #win-browser');
function toggleSideWindows() {
  sideWindows.forEach(w => w.classList.toggle('win-hidden'));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); showBrowser(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); hideBrowser(); }
  else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); toggleSideWindows(); }
});

/* ══════════════════════════════════════════════════════════════════════════
   DRAG INTO THE FILE BROWSER
   Custom pointer-drag (not native HTML5 DnD, which is fragile under the scaled
   stage). Two sources, one shared mechanic:
     • a text selection in the doc OR the browser → a clip nested in "Snippets"
       (the selection is CUT from its source);
     • a Finder icon → a top-level file row (sibling of the document).
   In both cases a full-size visual chip follows the cursor and a drop over the
   open file browser creates the item. The Snippets folder is created lazily on
   the first text drop (it is no longer authored into the HTML).
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

  // Full-size floating copy of the selected text
  const chip = document.createElement('div');
  chip.className = 'drag-snippet';
  chip.style.width = selW + 'px';
  chip.appendChild(fragment);

  const startStage = clientToStage(e.clientX, e.clientY);
  const selTopLeft = clientToStage(minL, minT);

  runChipDrag(e, chip, startStage.x - selTopLeft.x, startStage.y - selTopLeft.y, () => {
    if (!capturedText) return;
    createSnippet(capturedHTML, capturedText, provenance);
    if (cut) range.deleteContents();        // doc = cut; web page = copy (leave the text)
    window.getSelection().removeAllRanges(); // either way, clear the highlight on drop
  });
}

const docPanel = document.getElementById('panel-doc');
docPanel.addEventListener('mousedown', (e) =>
  startSelectionDrag(e, 'Clipped from Design Proposal.doc', true));   // cut

// Browser article text → same mechanic, but a COPY (the page can't be edited).
const browserContent = document.querySelector('#win-browser .browser-content');
if (browserContent) {
  browserContent.addEventListener('mousedown', (e) =>
    startSelectionDrag(e, 'Clipped from The Verge', false));          // copy
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

/* ── Drag the BROWSER URL → a "Web pages" folder entry ──
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

// Lazily create (once) a named folder group in the tree and return it. Cached on
// `groups` by id so repeated drops reuse the same folder.
const groups = {};
function ensureGroup(id, label) {
  if (groups[id]) return groups[id];
  const group = document.createElement('div');
  group.className = 'fb-group revealed';
  group.id = id;
  group.innerHTML =
    `<div class="fb-folder">
       <img class="fb-folder-icon-img" src="icons/folder.png" alt="">
       <span class="fb-name">${label}</span>
     </div>`;
  fbItems.appendChild(group);
  groups[id] = group;
  return group;
}
const ensureSnippetsGroup = () => ensureGroup('fb-snippets-group', 'Snippets');
const ensureWebPagesGroup = () => ensureGroup('fb-webpages-group', 'Web pages');

// Text clip (doc/browser) → a snippet panel + a row nested in Snippets.
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
  item.className = 'fb-item fb-nested revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'text';
  item.innerHTML = `<span class="fb-ico">📝</span><span class="fb-name">${name}</span>`;
  ensureSnippetsGroup().appendChild(item);

  wireItem(item);
}

// Finder icon → a top-level file row + its viewer panel. Spreadsheets reuse the
// authored budget panel (same toolbar/formula-bar/grid view); everything else gets
// a simple "no preview" placeholder.
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

  // Top-level row (sibling of the document), kept ABOVE any folder group so plain
  // files stay grouped above the Snippets / Web pages folders.
  const item = document.createElement('div');
  item.className = 'fb-item revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'file';
  item.innerHTML = `<span class="fb-ico">${icon}</span><span class="fb-name">${name}</span>`;
  const firstGroup = fbItems.querySelector('.fb-group');
  if (firstGroup) fbItems.insertBefore(item, firstGroup);
  else fbItems.appendChild(item);

  wireItem(item);
}

// Browser URL → a row nested in "Web pages" + a viewer panel that MIRRORS the page
// (a clone of the browser's authored .browser-content — it's all local DOM, so this
// is the real markup, not a screenshot). Clicking the row shows it in the viewer.
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
  item.className = 'fb-item fb-nested revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'webpage';
  item.innerHTML = `<span class="fb-ico">🌐</span><span class="fb-name">${domain}</span>`;
  ensureWebPagesGroup().appendChild(item);

  wireItem(item);
}
