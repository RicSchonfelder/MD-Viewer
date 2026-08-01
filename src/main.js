import { invoke } from '@tauri-apps/api/core';
import { open, message } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import i18n, { applyTranslations, setLocale, getSupportedLocales, onLocaleChanged } from './i18n.js';
import './style.css';
import { render, highlightCode } from './renderer.js';
import { checkForUpdates, installUpdate } from './updater.js';

const appWindow = getCurrentWindow();

// ─── Title Bar Controls ───
document.getElementById('titlebar-minimize').addEventListener('click', async () => {
  try { await appWindow.minimize(); } catch (e) { console.error('minimize:', e); }
});
document.getElementById('titlebar-maximize').addEventListener('click', async () => {
  try { await appWindow.toggleMaximize(); } catch (e) { console.error('maximize:', e); }
});
document.getElementById('titlebar-close').addEventListener('click', async () => {
  try { await appWindow.close(); } catch (e) { console.error('close:', e); }
});

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    openFileDialog();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
    e.preventDefault();
    try { await appWindow.close(); } catch (e) { console.error('close:', e); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    if (viewerEl.classList.contains('hidden')) return;
    window.print();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    if (viewerEl.classList.contains('hidden')) return;
    toggleFind();
    if (findActive) {
      const findInput = document.getElementById('find-input');
      setTimeout(() => findInput.select(), 0);
    }
  }
  if (e.key === 'F3' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (findActive && totalMatches > 0) findNext();
  }
  if (e.key === 'F3' && (e.shiftKey)) {
    e.preventDefault();
    if (findActive && totalMatches > 0) findPrev();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
    e.preventDefault();
    if (findActive && totalMatches > 0) {
      if (e.shiftKey) findPrev(); else findNext();
    }
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    zoomReset();
  }
});

// ─── Hamburger Menu ───
const menuBtn = document.getElementById('btn-menu');
const menuDropdown = document.getElementById('menu-dropdown');
let menuOpen = false;

function toggleMenu(open) {
  menuOpen = open !== undefined ? open : !menuOpen;
  menuDropdown.classList.toggle('hidden', !menuOpen);
}

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMenu();
});

document.addEventListener('click', (e) => {
  if (menuOpen && !menuDropdown.contains(e.target) && e.target !== menuBtn) {
    toggleMenu(false);
  }
});

document.getElementById('menu-open').addEventListener('click', () => {
  toggleMenu(false);
  openFileDialog();
});

document.getElementById('menu-find').addEventListener('click', () => {
  toggleMenu(false);
  if (viewerEl.classList.contains('hidden')) return;
  toggleFind();
  if (findActive) {
    setTimeout(() => document.getElementById('find-input').select(), 0);
  }
});

document.getElementById('menu-about').addEventListener('click', () => {
  toggleMenu(false);
  showAbout();
});

document.getElementById('menu-update').addEventListener('click', async () => {
  toggleMenu(false);
  setStatus('update.checking');
  const result = await checkForUpdates(true);
  if (result.available) {
    await installUpdate(result);
  } else {
    await message(result.message, {
      title: 'MD Viewer',
      kind: 'info',
    });
  }
  setStatus('status.ready');
});

document.getElementById('menu-print').addEventListener('click', () => {
  toggleMenu(false);
  if (viewerEl.classList.contains('hidden')) return;
  window.print();
});

// ─── About ───
function showAbout() {
  document.getElementById('about-overlay').classList.remove('hidden');
}

function hideAbout() {
  document.getElementById('about-overlay').classList.add('hidden');
}

document.getElementById('about-close').addEventListener('click', hideAbout);
document.getElementById('about-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideAbout();
});
document.getElementById('about-github').addEventListener('click', (e) => {
  e.preventDefault();
  openUrl('https://github.com/RicSchonfelder/MD-Viewer');
});

// ─── State ───
let currentFilePath = null;

// ─── Find in Page ───
let originalRenderedHtml = '';
let currentMatchIndex = -1;
let totalMatches = 0;
let findActive = false;

function toggleFind(show) {
  findActive = show !== undefined ? show : !findActive;
  const findBar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input');
  findBar.classList.toggle('hidden', !findActive);
  if (findActive) {
    findInput.value = '';
    document.getElementById('find-count').textContent = '';
    findInput.focus();
    currentMatchIndex = -1;
    totalMatches = 0;
    restoreOriginalHtml();
  } else {
    restoreOriginalHtml();
  }
}

function restoreOriginalHtml() {
  if (originalRenderedHtml) {
    renderArea.innerHTML = originalRenderedHtml;
    highlightCode();
  }
}

function findInPage(query) {
  restoreOriginalHtml();
  if (!query || query.length === 0) {
    document.getElementById('find-count').textContent = '';
    currentMatchIndex = -1;
    totalMatches = 0;
    return;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');

  const walker = document.createTreeWalker(renderArea, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  let node;
  while (node = walker.nextNode()) {
    regex.lastIndex = 0;
    if (regex.test(node.textContent)) {
      nodes.push(node);
    }
  }

  for (const textNode of nodes) {
    const parent = textNode.parentNode;
    if (!parent) continue;
    const text = textNode.textContent;
    regex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      const mark = document.createElement('mark');
      mark.className = 'find-match';
      mark.textContent = match[0];
      frag.appendChild(mark);
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    if (frag.childNodes.length > 0) {
      parent.replaceChild(frag, textNode);
    }
  }

  const matches = renderArea.querySelectorAll('mark.find-match');
  totalMatches = matches.length;

  if (totalMatches > 0) {
    currentMatchIndex = 0;
    matches[0].classList.add('find-active');
    matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('find-count').textContent = `${currentMatchIndex + 1} / ${totalMatches}`;
  } else {
    currentMatchIndex = -1;
    document.getElementById('find-count').textContent = `0 / 0`;
  }
}

function findNext() {
  const matches = renderArea.querySelectorAll('mark.find-match');
  if (matches.length === 0) return;
  matches.forEach(m => m.classList.remove('find-active'));
  currentMatchIndex = (currentMatchIndex + 1) % matches.length;
  matches[currentMatchIndex].classList.add('find-active');
  matches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('find-count').textContent = `${currentMatchIndex + 1} / ${totalMatches}`;
}

function findPrev() {
  const matches = renderArea.querySelectorAll('mark.find-match');
  if (matches.length === 0) return;
  matches.forEach(m => m.classList.remove('find-active'));
  currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
  matches[currentMatchIndex].classList.add('find-active');
  matches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('find-count').textContent = `${currentMatchIndex + 1} / ${totalMatches}`;
}

const welcomeEl = document.getElementById('welcome');
const viewerEl = document.getElementById('viewer');
const renderArea = document.getElementById('render-area');
const toolbarFilename = document.getElementById('toolbar-filename');
const titlebarFilename = document.getElementById('titlebar-filename');
const titlebarText = document.getElementById('titlebar-text');
const statusText = document.getElementById('status-text');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const langSelect = document.getElementById('menu-lang');

function showError(msg) {
  errorMessage.textContent = msg;
  errorOverlay.classList.remove('hidden');
}

function hideError() {
  errorOverlay.classList.add('hidden');
}

function setStatus(key, opts) {
  statusText.textContent = i18n.t(key, opts);
}

function getFileName(path) {
  if (!path) return '';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

async function loadFile(filePath) {
  try {
    if (!filePath) return;
    const fileName = getFileName(filePath);
    setStatus('status.loading', { filename: fileName });

    const content = await invoke('read_file', { path: filePath });

    if (content === null || content === undefined) {
      showError(i18n.t('error.failed'));
      return;
    }

    const html = render(content, filePath);
    originalRenderedHtml = html;
    renderArea.innerHTML = html;
    highlightCode();
    buildToc();
    if (findActive) toggleFind(false);

    currentFilePath = filePath;
    toolbarFilename.textContent = fileName;
    titlebarFilename.textContent = fileName;
    titlebarText.textContent = 'MD Viewer';

    welcomeEl.classList.add('hidden');
    viewerEl.classList.remove('hidden');
    hideError();
    setStatus('status.loaded', { filename: fileName });
  } catch (err) {
    console.error('loadFile error:', err);
    showError(i18n.t('error.readFile', { error: err }));
    setStatus('status.error');
  }
}

async function openFileDialog() {
  try {
    hideError();
    const result = await open({
      title: i18n.t('dialog.title'),
      filters: [{
        name: i18n.t('dialog.filterName'),
        extensions: ['md', 'mdx', 'markdown'],
      }],
    });
    if (result) {
      await loadFile(result);
    }
  } catch (err) {
    showError(i18n.t('error.dialog', { error: err }));
  }
}

async function checkCliArgs() {
  try {
    const args = await invoke('get_cli_args');
    if (args && args.length > 0) {
      await loadFile(args[0]);
      return;
    }
  } catch (err) {
    console.log('No CLI args or error:', err);
  }
  try {
    const pending = await invoke('get_pending_file');
    if (pending) {
      await loadFile(pending);
    }
  } catch (err) {
    console.log('No pending file or error:', err);
  }
}

async function checkPendingFileWithRetry(attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    try {
      const pending = await invoke('get_pending_file');
      if (pending) {
        await loadFile(pending);
        return;
      }
    } catch (err) {
      console.log('Pending file check error:', err);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

document.getElementById('btn-error-dismiss').addEventListener('click', hideError);

// ─── Find Bar Events ───
document.getElementById('find-input').addEventListener('input', (e) => {
  findInPage(e.target.value);
});

document.getElementById('find-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) findPrev(); else findNext();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    toggleFind(false);
  }
});

document.getElementById('find-next').addEventListener('click', () => findNext());
document.getElementById('find-prev').addEventListener('click', () => findPrev());
document.getElementById('find-close').addEventListener('click', () => toggleFind(false));

// ─── Table of Contents ───
let tocObserver = null;

const sidebarEl = document.getElementById('sidebar');
const tocList = document.getElementById('toc-list');
const tocBtn = document.getElementById('btn-toc');

function toggleToc(show) {
  const isVisible = !sidebarEl.classList.contains('hidden');
  const open = show !== undefined ? show : !isVisible;
  sidebarEl.classList.toggle('hidden', !open);
  tocBtn.classList.toggle('active', open);
}

tocBtn.addEventListener('click', () => toggleToc());

function buildToc() {
  tocList.innerHTML = '';
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

  const headings = renderArea.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  if (headings.length === 0) return;

  const frag = document.createDocumentFragment();
  const headingElements = [];

  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    const id = h.id;
    const text = h.textContent;

    const a = document.createElement('a');
    a.href = '#' + id;
    a.className = 'toc-h' + level;
    a.textContent = text;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    frag.appendChild(a);
    headingElements.push({ el: a, heading: h });
  });

  tocList.appendChild(frag);

  tocObserver = new IntersectionObserver((entries) => {
    let activeId = null;
    entries.forEach((entry) => {
      if (entry.isIntersecting) activeId = entry.target.id;
    });
    if (activeId) {
      tocList.querySelectorAll('a').forEach((a) => a.classList.remove('toc-active'));
      const activeLink = tocList.querySelector(`a[href="#${CSS.escape(activeId)}"]`);
      if (activeLink) activeLink.classList.add('toc-active');
    }
  }, { root: document.getElementById('main-area'), threshold: 0 });

  headingElements.forEach(({ heading }) => tocObserver.observe(heading));
}

// ─── Font Size / Zoom ───
const ZOOM_MIN = 12;
const ZOOM_MAX = 24;
const ZOOM_DEFAULT = 15;

let zoomLevel = ZOOM_DEFAULT;

function getSavedZoom() {
  const saved = localStorage.getItem('md-viewer-zoom');
  return saved ? parseInt(saved, 10) : ZOOM_DEFAULT;
}

function applyZoom() {
  document.documentElement.style.setProperty('--content-font-size', zoomLevel + 'px');
  document.getElementById('zoom-level').textContent = Math.round((zoomLevel / ZOOM_DEFAULT) * 100) + '%';
  localStorage.setItem('md-viewer-zoom', String(zoomLevel));
}

function zoomIn() {
  if (zoomLevel < ZOOM_MAX) { zoomLevel++; applyZoom(); }
}

function zoomOut() {
  if (zoomLevel > ZOOM_MIN) { zoomLevel--; applyZoom(); }
}

function zoomReset() {
  zoomLevel = ZOOM_DEFAULT; applyZoom();
}

zoomLevel = getSavedZoom();
applyZoom();

document.getElementById('zoom-in').addEventListener('click', () => { toggleMenu(false); zoomIn(); });
document.getElementById('zoom-out').addEventListener('click', () => { toggleMenu(false); zoomOut(); });
document.getElementById('zoom-reset').addEventListener('click', () => { toggleMenu(false); zoomReset(); });

// ─── Drag & Drop ───
let dragCounter = 0;
document.addEventListener('dragenter', () => { dragCounter++; });
document.addEventListener('dragleave', () => { dragCounter--; });
document.addEventListener('dragover', (e) => e.preventDefault());

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const name = file.name.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.mdx') || name.endsWith('.markdown')) {
    await loadFile(file.path);
  } else {
    showError(i18n.t('error.notMd'));
  }
});

// ─── CTRL+Click on links ───
document.getElementById('render-area').addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (href && /^https?:\/\//i.test(href)) {
      openUrl(href);
    }
  }
});

// ─── Theme ───
const THEMES = [
  { id: 'light', labelKey: 'theme.light' },
  { id: 'dark', labelKey: 'theme.dark' },
  { id: 'solarized-light', labelKey: 'theme.solarizedLight' },
  { id: 'solarized-dark', labelKey: 'theme.solarizedDark' },
  { id: 'salmon', labelKey: 'theme.salmon' },
];

const themeSelect = document.getElementById('menu-theme-select');

function populateThemeSelector() {
  THEMES.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = i18n.t(t.labelKey);
    themeSelect.appendChild(opt);
  });
}

function getSavedTheme() {
  return localStorage.getItem('md-viewer-theme');
}

function getInitialTheme() {
  const saved = getSavedTheme();
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const theme = getSavedTheme() || getInitialTheme();
  document.documentElement.setAttribute('data-theme', theme);
  themeSelect.value = theme;
}

themeSelect.addEventListener('change', () => {
  const theme = themeSelect.value;
  localStorage.setItem('md-viewer-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  toggleMenu(false);
});

populateThemeSelector();
applyTheme();

onLocaleChanged(() => {
  THEMES.forEach((t) => {
    const opt = themeSelect.querySelector(`option[value="${t.id}"]`);
    if (opt) opt.textContent = i18n.t(t.labelKey);
  });
});

// ─── Language ───
getSupportedLocales().forEach((loc) => {
  const opt = document.createElement('option');
  opt.value = loc.code;
  opt.textContent = loc.label;
  if (loc.code === i18n.language) opt.selected = true;
  langSelect.appendChild(opt);
});

langSelect.addEventListener('change', () => {
  setLocale(langSelect.value);
});

onLocaleChanged(() => {
  getSupportedLocales().forEach((loc) => {
    const opt = langSelect.querySelector(`option[value="${loc.code}"]`);
    if (opt) opt.selected = loc.code === i18n.language;
  });
});

applyTranslations();
checkCliArgs();
checkPendingFileWithRetry();

listen('file-opened', (event) => {
  const path = event.payload;
  if (typeof path === 'string') {
    loadFile(path);
  }
});
