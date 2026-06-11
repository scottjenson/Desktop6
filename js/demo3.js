/* Demo 3 choreography — the only interactive logic in the demo.
   Three gestures, nothing more (everything else is static visual staging):

     [→] / [ArrowRight]  → slide the file browser out (toggle)
     [Space]             → reveal the next pre-authored item in the folder
     click a file row    → open it as a tab in the viewer (Tab 1 = doc, never lost)
     hover a file row     → CSS-only card pops out to the left (see demo3.css)

   Tabs: Tab 1 (the document) is authored in the HTML and always present. Clicking a
   file row that hasn't been opened yet appends a tab for its panel and activates it;
   clicking a row whose tab already exists just re-activates that tab. Close (×)
   removes the tab and falls back to the document. The document tab has no ×. */

const filebrowser = document.getElementById('filebrowser');
const tabsBar     = document.getElementById('viewer-tabs');
const panelsWrap  = document.getElementById('viewer-panels');

// Revealable steps — direct children of the tree that aren't already revealed.
// Each step is either a single .fb-item or a whole .fb-group (folder + contents).
const fbSteps = Array.from(document.getElementById('fb-items').children)
  .filter(el => (el.classList.contains('fb-item') || el.classList.contains('fb-group'))
                && !el.classList.contains('revealed'));
let nextReveal = 0;   // index of the next step to reveal

/* ── File browser slide ── */
function showBrowser() { filebrowser.classList.add('open'); }
function hideBrowser() { filebrowser.classList.remove('open'); }

/* ── Reveal / un-reveal items one at a time ── */
function revealNext() {
  if (!filebrowser.classList.contains('open')) filebrowser.classList.add('open');
  if (nextReveal >= fbSteps.length) return;
  fbSteps[nextReveal].classList.add('revealed');
  nextReveal++;
}

function unrevealLast() {
  if (nextReveal <= 0) return;
  nextReveal--;
  fbSteps[nextReveal].classList.remove('revealed');
}

/* ── Tabs ── */
function activateTab(panelId) {
  document.querySelectorAll('.viewer-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.panel === panelId));
  document.querySelectorAll('.viewer-panel').forEach(p =>
    p.classList.toggle('active', p.id === panelId));
  document.querySelectorAll('.fb-item').forEach(it =>
    it.classList.toggle('active', it.dataset.panel === panelId));
}

function openItem(item) {
  const panelId = item.dataset.panel;
  let tab = tabsBar.querySelector(`.viewer-tab[data-panel="${panelId}"]`);
  if (!tab) {
    tab = document.createElement('div');
    tab.className = 'viewer-tab';
    tab.dataset.panel = panelId;
    const icoEl = item.querySelector('.fb-ico');
    const imgEl = item.querySelector('.fb-file-img');
    const name  = item.querySelector('.fb-name').textContent;
    const icoHtml = icoEl
      ? `<span class="vt-ico">${icoEl.textContent}</span>`
      : (imgEl ? `<img class="vt-ico-img" src="${imgEl.src}" alt="">` : '');
    tab.innerHTML =
      `${icoHtml}<span class="vt-label">${name}</span>` +
      `<span class="vt-close">×</span>`;
    tabsBar.appendChild(tab);
  }
  activateTab(panelId);
}

/* Tab clicks (activate / close) — delegated so dynamically-added tabs work. */
tabsBar.addEventListener('click', (e) => {
  const tab = e.target.closest('.viewer-tab');
  if (!tab) return;
  if (e.target.classList.contains('vt-close')) {
    const wasActive = tab.classList.contains('active');
    const panelId = tab.dataset.panel;
    tab.remove();
    document.querySelectorAll('.fb-item').forEach(it => {
      if (it.dataset.panel === panelId) it.classList.remove('active');
    });
    if (wasActive) activateTab('panel-doc');   // fall back to the document
    return;
  }
  activateTab(tab.dataset.panel);
});

/* File row clicks → open as tab. */
document.querySelectorAll('#fb-items .fb-item').forEach(item => {
  item.addEventListener('click', () => openItem(item));
});

/* ── Hover preview card ──
   One shared card lives in #stage (so it scales with the desktop). On hover we
   clone the item's viewer panel, scale it to fit, and float it left of the browser.
   Cloning (not moving) keeps the live panel intact and means edits to the source
   DOM show up in the preview automatically. */
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
  else if (e.key === 'ArrowDown')  { e.preventDefault(); revealNext(); }
  else if (e.key === 'ArrowUp')    { e.preventDefault(); unrevealLast(); }
  else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); toggleSideWindows(); }
});

/* ── Drag a text selection out of the document into the file browser ──
   Custom pointer-drag (not native HTML5 DnD, which is fragile under the scaled
   stage). On mousedown inside an existing selection we build a full-size visual
   copy of the selected text and float it under the cursor; dropping it on the
   file browser creates a new snippet (the original text stays in the document). */
const snippetsGroup = document.getElementById('fb-snippets-group');
let snippetSeq = 0;

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

const docPanel = document.getElementById('panel-doc');

docPanel.addEventListener('mousedown', (e) => {
  if (!pointInSelection(e.clientX, e.clientY)) return;   // only drag an existing selection

  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  const rects = range.getClientRects();
  if (rects.length === 0) return;

  // Bounding box of the whole selection, in stage-px
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  for (const r of rects) {
    minL = Math.min(minL, r.left); minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right); maxB = Math.max(maxB, r.bottom);
  }
  const s = stageScale();
  const selW = (maxR - minL) / s;
  const selH = (maxB - minT) / s;

  // Capture the selected HTML (single source of truth for the new snippet)
  const fragment = range.cloneContents();
  const capture = document.createElement('div');
  capture.appendChild(fragment.cloneNode(true));
  const capturedHTML = capture.innerHTML;
  const capturedText = sel.toString().trim();

  // Build a full-size floating copy of the selected text
  const chip = document.createElement('div');
  chip.className = 'drag-snippet';
  chip.style.width = selW + 'px';
  chip.appendChild(fragment);
  stage.appendChild(chip);

  // Grab offset so the chip tracks the cursor naturally
  const startStage = clientToStage(e.clientX, e.clientY);
  const selTopLeft = clientToStage(minL, minT);
  const grabDX = startStage.x - selTopLeft.x;
  const grabDY = startStage.y - selTopLeft.y;

  function place(clientX, clientY) {
    const p = clientToStage(clientX, clientY);
    chip.style.left = (p.x - grabDX) + 'px';
    chip.style.top  = (p.y - grabDY) + 'px';
  }
  place(e.clientX, e.clientY);

  function overBrowser(clientX, clientY) {
    if (!filebrowser.classList.contains('open')) return false;
    const r = filebrowser.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right &&
           clientY >= r.top  && clientY <= r.bottom;
  }

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
    if (dropped && capturedText) {
      createSnippet(capturedHTML, capturedText);
      range.deleteContents();              // cut: remove the selected text from the doc
      window.getSelection().removeAllRanges();
    }
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  e.preventDefault();   // don't start a native selection-drag
});

// Create a new Snippets item + its viewer panel from captured document HTML
function createSnippet(html, text) {
  snippetSeq++;
  const panelId = `panel-snippet-${snippetSeq}`;
  // Name it from the first few words of the selection
  const words = text.split(/\s+/).slice(0, 3).join('-').replace(/[^\w-]/g, '').toLowerCase();
  const name = `${words || 'snippet'}.txt`;

  // Panel
  const panel = document.createElement('div');
  panel.className = 'viewer-panel snippet-panel';
  panel.id = panelId;
  panel.innerHTML =
    `<div class="snippet-body">
       <div class="snippet-provenance">Clipped from Design Proposal.doc</div>
       <div class="snippet-content">${html}</div>
     </div>`;
  panelsWrap.appendChild(panel);

  // File row (revealed immediately, nested in Snippets)
  const item = document.createElement('div');
  item.className = 'fb-item fb-nested revealed';
  item.dataset.panel = panelId;
  item.dataset.kind = 'text';
  item.innerHTML = `<span class="fb-ico">📝</span><span class="fb-name">${name}</span>`;
  snippetsGroup.appendChild(item);

  // Make sure the Snippets group is shown
  snippetsGroup.classList.add('revealed');

  // Wire interactions (click to open, hover preview)
  item.addEventListener('click', () => openItem(item));
  item.addEventListener('mouseenter', () => showPreview(item));
  item.addEventListener('mouseleave', hidePreview);

  // Briefly flash the new item so the user sees it land
  item.classList.add('snippet-new');
  setTimeout(() => item.classList.remove('snippet-new'), 800);
}
