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

// Card size in stage-px (≈25% of the 740×900 viewer area)
const PC_W = 380;
const PC_H = 470;
previewCard.style.setProperty('--pc-w', PC_W + 'px');
previewCard.style.setProperty('--pc-h', PC_H + 'px');

function showPreview(item) {
  const panel = document.getElementById(item.dataset.panel);
  if (!panel) return;

  // Clone the panel and force it visible & laid out at the viewer's content size
  const clone = panel.cloneNode(true);
  clone.classList.add('active');           // panels are display:none unless active
  clone.classList.add('pc-clone');

  // Size the clone to the viewer's content area, then scale to fit the card
  const contentW = viewer.offsetWidth;                       // 740
  const contentH = viewer.offsetHeight - 64;                 // minus titlebar+tabs
  const scale = Math.min(PC_W / contentW, PC_H / contentH);
  clone.style.width  = contentW + 'px';
  clone.style.height = contentH + 'px';
  clone.style.transform = `scale(${scale})`;

  previewCard.innerHTML = '';
  previewCard.appendChild(clone);

  positionPreview(item);
  previewCard.classList.add('visible');
}

function positionPreview(item) {
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

/* ── Window drag (titlebar → move #viewer) ── */
const titlebar = viewer.querySelector('.win-titlebar');

titlebar.addEventListener('mousedown', (e) => {
  if (e.target.closest('.traffic-lights')) return;  // don't steal traffic-light clicks

  const scale  = parseFloat(getComputedStyle(document.getElementById('stage'))
                   .getPropertyValue('--stage-scale')) || 1;

  // current position in desktop-px (CSS left/top, falling back to the parity-rect vars)
  const startLeft = parseFloat(viewer.style.left) || parseFloat(getComputedStyle(viewer).left);
  const startTop  = parseFloat(viewer.style.top)  || parseFloat(getComputedStyle(viewer).top);
  const startX = e.clientX;
  const startY = e.clientY;

  function onMove(ev) {
    viewer.style.left = (startLeft + (ev.clientX - startX) / scale) + 'px';
    viewer.style.top  = (startTop  + (ev.clientY - startY) / scale) + 'px';
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup',   onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onUp);
  e.preventDefault();
});

/* ── Keyboard choreography ── */
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); showBrowser(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); hideBrowser(); }
  else if (e.key === 'ArrowDown')  { e.preventDefault(); revealNext(); }
  else if (e.key === 'ArrowUp')    { e.preventDefault(); unrevealLast(); }
});
