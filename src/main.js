import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import i18n, { applyTranslations, setLocale, getSupportedLocales, onLocaleChanged } from './i18n.js';
import './style.css';
import { render, highlightCode } from './renderer.js';

const appWindow = getCurrentWindow();

// ─── Title Bar Controls ───
document.getElementById('titlebar-minimize').addEventListener('click', () => appWindow.minimize());
document.getElementById('titlebar-maximize').addEventListener('click', async () => {
  await appWindow.toggleMaximize();
});
document.getElementById('titlebar-close').addEventListener('click', () => appWindow.close());

let currentFilePath = null;

const welcomeEl = document.getElementById('welcome');
const viewerEl = document.getElementById('viewer');
const renderArea = document.getElementById('render-area');
const toolbarFilename = document.getElementById('toolbar-filename');
const titlebarFilename = document.getElementById('titlebar-filename');
const titlebarText = document.getElementById('titlebar-text');
const statusText = document.getElementById('status-text');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const langSelect = document.getElementById('btn-lang');

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
    renderArea.innerHTML = html;
    highlightCode();

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
    }
  } catch (err) {
    console.log('No CLI args or error:', err);
  }
}

document.getElementById('btn-open').addEventListener('click', openFileDialog);
document.getElementById('btn-error-dismiss').addEventListener('click', hideError);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    openFileDialog();
  }
});

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

const themeToggle = document.getElementById('btn-theme');
let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
}

applyTheme();

themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  applyTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  darkMode = e.matches;
  applyTheme();
});

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

listen('file-opened', (event) => {
  const path = event.payload;
  if (typeof path === 'string') {
    loadFile(path);
  }
});
