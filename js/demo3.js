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
const fbFolder    = document.getElementById('fb-folder');
const fbItemsWrap = document.getElementById('fb-items');
const fbItems     = Array.from(document.querySelectorAll('#fb-items .fb-item'));
const tabsBar     = document.getElementById('viewer-tabs');
const panelsWrap  = document.getElementById('viewer-panels');

let nextReveal = 0;   // index of the next fb-item to reveal on [Space]

/* ── File browser slide ── */
function toggleBrowser() {
  filebrowser.classList.toggle('open');
}

/* ── Reveal items one at a time ── */
function revealNext() {
  if (!filebrowser.classList.contains('open')) filebrowser.classList.add('open');
  if (nextReveal >= fbItems.length) return;
  fbItems[nextReveal].classList.add('revealed');
  nextReveal++;
  recalcFolderHeight();
}

/* Keep the collapsible folder's max-height in step with revealed rows. */
function recalcFolderHeight() {
  if (fbFolder.classList.contains('collapsed')) return;
  fbItemsWrap.style.maxHeight = fbItemsWrap.scrollHeight + 'px';
}

/* ── Collapsible top-level folder ── */
fbFolder.addEventListener('click', () => {
  fbFolder.classList.toggle('collapsed');
  if (fbFolder.classList.contains('collapsed')) {
    fbItemsWrap.style.maxHeight = '0px';
  } else {
    recalcFolderHeight();
  }
});

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
    const ico  = item.querySelector('.fb-ico').textContent;
    const name = item.querySelector('.fb-name').textContent;
    tab.innerHTML =
      `<span class="vt-ico">${ico}</span><span class="vt-label">${name}</span>` +
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
fbItems.forEach(item => {
  item.addEventListener('click', () => openItem(item));
});

/* ── Keyboard choreography ── */
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); toggleBrowser(); }
  else if (e.key === ' ')     { e.preventDefault(); revealNext(); }
});
