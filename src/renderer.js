import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import cssLang from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('go', go);

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
});

const renderer = new marked.Renderer();

let currentFilePath = null;

function resolveRelativePath(href) {
  if (!href || /^(https?:\/\/|data:|#)/i.test(href)) return href;
  if (!currentFilePath) return href;
  const dir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
  if (dir && !href.startsWith('/')) {
    return dir + '/' + href;
  }
  return href;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

renderer.image = function ({ href, title, text }) {
  const src = resolveRelativePath(href);
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
  const altAttr = escapeAttr(text);
  return `<img src="${escapeAttr(src)}" alt="${altAttr}"${titleAttr} loading="lazy" />`;
};

renderer.link = function ({ href, title, text }) {
  const isExternal = /^https?:\/\//i.test(href);
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
  const target = isExternal ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${escapeAttr(href)}"${titleAttr}${target}>${text}</a>`;
};

export function render(markdown, filePath) {
  currentFilePath = filePath;
  const html = marked.parse(markdown, { renderer });
  return html;
}

export function highlightCode() {
  document.querySelectorAll('#render-area pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}
