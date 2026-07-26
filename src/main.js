import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import './style.css';
import { render, highlightCode } from './renderer.js';

let currentFilePath = null;

const welcomeEl = document.getElementById('welcome');
const viewerEl = document.getElementById('viewer');
const renderArea = document.getElementById('render-area');
const filenameEl = document.getElementById('filename');
const appTitleEl = document.getElementById('app-title');
const statusText = document.getElementById('status-text');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');

function showError(msg) {
  errorMessage.textContent = msg;
  errorOverlay.classList.remove('hidden');
}

function hideError() {
  errorOverlay.classList.add('hidden');
}

function setStatus(msg) {
  statusText.textContent = msg;
}

function getFileName(path) {
  if (!path) return '';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

async function loadFile(filePath) {
  try {
    if (!filePath) return;
    setStatus(`Loading ${getFileName(filePath)}...`);

    const content = await invoke('read_file', { path: filePath });

    if (content === null || content === undefined) {
      showError('Failed to read file.');
      return;
    }

    const html = render(content, filePath);
    renderArea.innerHTML = html;
    highlightCode();

    currentFilePath = filePath;
    const fileName = getFileName(filePath);
    filenameEl.textContent = fileName;
    appTitleEl.textContent = `MD Viewer — ${fileName}`;

    welcomeEl.classList.add('hidden');
    viewerEl.classList.remove('hidden');
    hideError();
    setStatus(`Loaded ${fileName}`);
  } catch (err) {
    console.error('loadFile error:', err);
    showError(`Error reading file: ${err}`);
    setStatus('Error');
  }
}

async function openFileDialog() {
  try {
    hideError();
    const result = await open({
      title: 'Open Markdown File',
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'mdx', 'markdown']
      }],
    });
    if (result) {
      await loadFile(result);
    }
  } catch (err) {
    showError(`Dialog error: ${err}`);
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
    showError('Please drop a Markdown (.md) file.');
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

checkCliArgs();

listen('file-opened', (event) => {
  const path = event.payload;
  if (typeof path === 'string') {
    loadFile(path);
  }
});
