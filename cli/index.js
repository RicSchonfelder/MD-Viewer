#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { marked } from 'marked';
import chalk from 'chalk';
import hljs from 'highlight.js';

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

const C = {
  accent: chalk.hex('#FF6B9D'),
  accent2: chalk.hex('#C084FC'),
  accent3: chalk.hex('#A78BFA'),
  code: chalk.bgHex('#1E1E2E').hex('#CDD6F4'),
  codeLang: chalk.hex('#89B4FA').italic,
  quote: chalk.hex('#6C7086').italic,
  link: chalk.hex('#89B4FA').underline,
  hr: chalk.hex('#45475A'),
  bullet: chalk.hex('#FF6B9D'),
  dim: chalk.hex('#585B70'),
  search: chalk.bgHex('#FF6B9D').hex('#1E1E2E'),
  number: chalk.hex('#585B70'),
  headerBorder: chalk.hex('#313244'),
  warn: chalk.bgHex('#F38BA8').hex('#1E1E2E'),
  ok: chalk.bgHex('#A6E3A1').hex('#1E1E2E'),
  title: chalk.bold.hex('#CDD6F4'),
};

let contentLines = [];
let searchResults = [];
let currentSearchIdx = -1;

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '');
}

function ansiFromHtml(html) {
  let result = html;
  result = result.replace(/<span class="hljs-keyword">(.*?)<\/span>/g, (_, t) => chalk.hex('#C586C0')(t));
  result = result.replace(/<span class="hljs-string">(.*?)<\/span>/g, (_, t) => chalk.hex('#CE9178')(t));
  result = result.replace(/<span class="hljs-number">(.*?)<\/span>/g, (_, t) => chalk.hex('#B5CEA8')(t));
  result = result.replace(/<span class="hljs-comment">(.*?)<\/span>/g, (_, t) => chalk.hex('#6A9955').italic(t));
  result = result.replace(/<span class="hljs-built_in">(.*?)<\/span>/g, (_, t) => chalk.hex('#DCDCAA')(t));
  result = result.replace(/<span class="hljs-title">(.*?)<\/span>/g, (_, t) => chalk.hex('#DCDCAA')(t));
  result = result.replace(/<span class="hljs-attr">(.*?)<\/span>/g, (_, t) => chalk.hex('#9CDCFE')(t));
  result = result.replace(/<span class="hljs-params">(.*?)<\/span>/g, (_, t) => chalk.hex('#9CDCFE')(t));
  result = result.replace(/<span class="hljs-literal">(.*?)<\/span>/g, (_, t) => chalk.hex('#569CD6')(t));
  result = result.replace(/<span class="hljs-meta">(.*?)<\/span>/g, (_, t) => chalk.hex('#569CD6')(t));
  result = result.replace(/<span class="hljs-selector-tag">(.*?)<\/span>/g, (_, t) => chalk.hex('#D7BA7D')(t));
  result = result.replace(/<span class="hljs-selector-class">(.*?)<\/span>/g, (_, t) => chalk.hex('#D7BA7D')(t));
  result = result.replace(/<span class="hljs-section">(.*?)<\/span>/g, (_, t) => chalk.hex('#FFD700')(t));
  result = result.replace(/<span class="hljs-variable">(.*?)<\/span>/g, (_, t) => chalk.hex('#9CDCFE')(t));
  result = result.replace(/<span class="hljs-attribute">(.*?)<\/span>/g, (_, t) => chalk.hex('#CE9178')(t));
  result = result.replace(/<span class="hljs-type">(.*?)<\/span>/g, (_, t) => chalk.hex('#4EC9B0')(t));
  result = result.replace(/<span[^>]*>(.*?)<\/span>/g, '$1');
  result = result.replace(/<[^>]*>/g, '');
  return result;
}

function renderWidth(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padLine(text, width) {
  const visible = renderWidth(text);
  if (visible < width) {
    return text + ' '.repeat(width - visible);
  }
  return text;
}

function parseMarkdown(md) {
  const lines = [];
  const tokens = marked.lexer(md);
  let inTable = false;

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const prefix = '#'.repeat(token.depth);
        const colors = [C.accent, C.accent2, C.accent3, C.accent3, C.accent3, C.accent3];
        const color = colors[Math.min(token.depth - 1, colors.length - 1)];
        lines.push({ text: color.bold(`${prefix} ${token.text}`), raw: `# ${token.text}`, type: 'heading' });
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'paragraph': {
        const text = inlineAnsi(token.tokens || []);
        if (text.trim()) {
          const wrapped = wrapText(text, process.stdout.columns - 4 || 76);
          for (const w of wrapped) {
            lines.push({ text: w, raw: stripTags(token.raw).replace(/\n/g, ' '), type: 'text' });
          }
          lines.push({ text: '', raw: '', type: 'spacer' });
        }
        break;
      }
      case 'code': {
        const lang = token.lang || '';
        if (lang) {
          lines.push({ text: C.codeLang(` ─ ${lang} ─`), raw: `\`\`\`${lang}`, type: 'codelang' });
        }
        const highlighted = token.text;
        const codeLines = highlighted.split('\n');
        for (const cl of codeLines) {
          let ansi;
          if (lang && hljs.getLanguage(lang)) {
            const hl = hljs.highlight(cl, { language: lang }).value;
            ansi = C.code(ansiFromHtml(hl));
          } else {
            const hl = hljs.highlightAuto(cl).value;
            ansi = C.code(ansiFromHtml(hl));
          }
          lines.push({ text: ansi, raw: cl, type: 'code' });
        }
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'blockquote': {
        const text = token.tokens ? inlineAnsiFromTokens(token.tokens) : token.text;
        const wrapped = wrapText(C.quote(`▌ ${stripTags(text)}`), process.stdout.columns - 4 || 76);
        for (const w of wrapped) {
          lines.push({ text: w, raw: `> ${stripTags(token.raw)}`, type: 'quote' });
        }
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'list': {
        for (let i = 0; i < token.items.length; i++) {
          const item = token.items[i];
          const bullet = token.ordered ? `${i + 1}.` : '•';
          const text = item.tokens ? inlineAnsiFromTokens(item.tokens) : (item.text || '');
          const bulletColored = C.bullet(bullet);
          const indent = '  ';
          const firstLine = `${indent}${bulletColored} ${stripTags(text)}`;
          const lines2 = wrapText(firstLine, process.stdout.columns - 4 || 76);
          for (const l of lines2) {
            lines.push({ text: l, raw: `${indent}${bullet} ${stripTags(item.raw || '')}`, type: 'list' });
          }
          if (item.tokens && item.tokens.some(t => t.type === 'list')) {
            for (const sub of item.tokens.filter(t => t.type === 'list')) {
              for (const subItem of sub.items) {
                const subText = subItem.tokens ? inlineAnsiFromTokens(subItem.tokens) : '';
                const subLines = wrapText(`    ◦ ${stripTags(subText)}`, process.stdout.columns - 4 || 76);
                for (const sl of subLines) {
                  lines.push({ text: sl, raw: `  - ${stripTags(subItem.raw || '')}`, type: 'sublist' });
                }
              }
            }
          }
        }
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'hr': {
        const w = process.stdout.columns - 4 || 76;
        lines.push({ text: C.hr('─'.repeat(w)), raw: '---', type: 'hr' });
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'table': {
        if (token.header && token.header.length) {
          const headerRow = token.header.map(c => c.text).join(' │ ');
          const aligned = ' ' + headerRow + ' ';
          lines.push({ text: chalk.bold(aligned), raw: aligned, type: 'table' });
          const sep = token.header.map(() => '───────').join('─┼─');
          lines.push({ text: C.dim(` ${sep} `), raw: sep, type: 'table' });
        }
        for (const row of token.rows || []) {
          const rowText = row.map(c => c.text).join(' │ ');
          lines.push({ text: ` ${rowText} `, raw: rowText, type: 'table' });
        }
        lines.push({ text: '', raw: '', type: 'spacer' });
        break;
      }
      case 'space':
        break;
      default:
        if (token.type === 'html' && token.raw === '\n') break;
        if (token.raw && token.raw.trim()) {
          lines.push({ text: stripTags(token.raw), raw: token.raw, type: 'text' });
        }
    }
  }
  return lines;
}

function inlineAnsi(tokens) {
  let result = '';
  for (const t of tokens || []) {
    switch (t.type) {
      case 'text': result += t.text; break;
      case 'strong': result += chalk.bold(inlineAnsi(t.tokens || [])); break;
      case 'em': result += chalk.italic(inlineAnsi(t.tokens || [])); break;
      case 'codespan': result += C.code(` ${t.text} `); break;
      case 'link': result += C.link(t.text || t.href || ''); break;
      case 'del': result += chalk.strikethrough(t.text || ''); break;
      case 'image': result += chalk.italic(t.text || t.href || ''); break;
      case 'br': result += '\n'; break;
      default: result += t.raw || t.text || '';
    }
  }
  return result;
}

function inlineAnsiFromTokens(tokens) {
  return inlineAnsi(tokens);
}

function wrapText(text, maxWidth) {
  if (maxWidth <= 0) return [text];
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  if (clean.length <= maxWidth) return [text];

  const lines = [];
  const parts = [];
  let current = '';
  let currentClean = '';
  let ansiStack = '';

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\x1b') {
      const end = text.indexOf('m', i);
      if (end !== -1) {
        ansiStack = text.slice(i, end + 1);
        current += ansiStack;
        i = end;
        continue;
      }
    }
    current += text[i];
    currentClean += text[i];

    if (currentClean.length >= maxWidth || text[i] === '\n') {
      if (text[i] === '\n') {
        lines.push(current.slice(0, -ansiStack.length || current.length));
      } else {
        lines.push(current);
      }
      current = ansiStack;
      currentClean = '';
    }
  }
  if (currentClean) lines.push(current);
  return lines.length ? lines : [text];
}

function buildContent(md, filename) {
  contentLines = parseMarkdown(md);
  searchResults = [];
  currentSearchIdx = -1;
}

function findMatches(query) {
  searchResults = [];
  if (!query) return;
  const lower = query.toLowerCase();
  for (let i = 0; i < contentLines.length; i++) {
    if (!contentLines[i]) continue;
    const raw = contentLines[i].raw || '';
    if (raw.toLowerCase().includes(lower)) {
      searchResults.push(i);
    }
  }
  currentSearchIdx = searchResults.length > 0 ? 0 : -1;
}

let scrollPos = 0;
let searchQuery = '';
let isSearching = false;
let statusMsg = '';

function render() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const contentRows = rows - 3;

  if (scrollPos > contentLines.length - contentRows) {
    scrollPos = Math.max(0, contentLines.length - contentRows);
  }

  const output = [];

  output.push(C.headerBorder('┌') + C.title(` MD Viewer `) + C.dim(filename) + C.headerBorder(' '.repeat(Math.max(1, cols - renderWidth(` MD Viewer ${filename}`) - 5)) + '┐'));

  let visibleLines = contentLines.slice(scrollPos, scrollPos + contentRows);
  for (let i = 0; i < contentRows; i++) {
    const line = visibleLines[i];
    const lineNum = scrollPos + i + 1;
    const numStr = C.number(String(lineNum).padStart(4, ' '));

    if (!line) {
      output.push(C.headerBorder('│') + ' '.repeat(cols - 2) + C.headerBorder('│'));
      continue;
    }

    const isCurrentSearch = searchResults.includes(scrollPos + i);
    let text = line.text;
    if (isCurrentSearch && searchQuery) {
      const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
      const idx = clean.toLowerCase().indexOf(searchQuery.toLowerCase());
      if (idx !== -1) {
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + searchQuery.length);
        const after = text.slice(idx + searchQuery.length);
        text = before + chalk.inverse(match) + after;
      }
    }

    const padded = padLine(text, cols - 7);
    output.push(C.headerBorder('│') + ' ' + padded + ' ' + C.headerBorder('│'));
  }

  let footer = '';
  if (statusMsg) {
    footer = C.warn(` ${statusMsg} `);
    statusMsg = '';
  } else if (isSearching) {
    const total = searchResults.length;
    const idx = currentSearchIdx + 1;
    const pos = total > 0 ? ` ${idx}/${total}` : ' no matches';
    footer = C.headerBorder('├') + chalk.bold(` /${searchQuery}${pos} `);
  } else {
    const total = contentLines.length;
    const pct = total > 0 ? Math.round((scrollPos / Math.max(1, total - contentRows)) * 100) : 0;
    const sr = searchResults.length > 0 ? `  ${searchResults.indexOf(scrollPos) + 1}/${searchResults.length}` : '';
    footer = C.headerBorder('├') + C.dim(` ↑↓ scroll  / search  q quit  g/G top/bottom${sr}`);
  }

  const footerPadded = padLine(footer, cols - 1);
  output.push(footerPadded.slice(0, cols));
  output.push(C.headerBorder('└' + '─'.repeat(cols - 2) + '┘'));

  process.stdout.write('\x1b[?25l');
  process.stdout.write('\x1b[0;0H' + output.join('\n'));
}

function handleInput(key) {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const contentRows = rows - 3;

  if (isSearching) {
    if (key === '\x1b' || key === '\x03') {
      isSearching = false;
      searchQuery = '';
      searchResults = [];
      currentSearchIdx = -1;
    } else if (key === '\r' || key === '\n') {
      isSearching = false;
      if (searchResults.length > 0) {
        scrollPos = searchResults[0];
      } else {
        statusMsg = 'No matches';
      }
    } else if (key === '\x7f' || key === '\b') {
      searchQuery = searchQuery.slice(0, -1);
      findMatches(searchQuery);
    } else if (key.length === 1) {
      searchQuery += key;
      findMatches(searchQuery);
    }
    return;
  }

  switch (key) {
    case 'q':
    case '\x03':
      cleanup();
      process.exit(0);
      break;
    case '\x1b[A':
    case 'k':
      scrollPos = Math.max(0, scrollPos - 1);
      break;
    case '\x1b[B':
    case 'j':
      scrollPos = Math.min(contentLines.length - contentRows, scrollPos + 1);
      break;
    case '\x1b[5~':
      scrollPos = Math.max(0, scrollPos - contentRows);
      break;
    case '\x1b[6~':
      scrollPos = Math.min(contentLines.length - contentRows, scrollPos + contentRows);
      break;
    case '\x1b[7~':
    case 'g':
      scrollPos = 0;
      break;
    case '\x1b[8~':
    case 'G':
      scrollPos = Math.max(0, contentLines.length - contentRows);
      break;
    case '/':
      isSearching = true;
      searchQuery = '';
      searchResults = [];
      currentSearchIdx = -1;
      break;
    case 'n':
      if (searchResults.length > 0) {
        currentSearchIdx = (currentSearchIdx + 1) % searchResults.length;
        scrollPos = searchResults[currentSearchIdx];
      }
      break;
    case 'N':
      if (searchResults.length > 0) {
        currentSearchIdx = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
        scrollPos = searchResults[currentSearchIdx];
      }
      break;
    case '\x1b[H': // Home
      scrollPos = 0;
      break;
    case '\x1b[F': // End
      scrollPos = Math.max(0, contentLines.length - contentRows);
      break;
    case '?':
      statusMsg = '↑↓/j k scroll  PgUp/PgDn page  g top  G bottom  / search  n/N next/prev  q quit';
      break;
  }
}

function cleanup() {
  process.stdout.write('\x1b[?25h\x1b[0m\x1b[2J\x1b[0;0H');
  if (process.stdin.isRaw) {
    try { process.stdin.setRawMode(false); } catch {}
  }
  process.stdin.removeAllListeners('data');
}

function startTui() {
  process.stdout.write('\x1b[?1049h');
  process.stdout.write('\x1b[2J');

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');

  let buffer = '';
  process.stdin.on('data', (data) => {
    buffer += data;

    if (buffer === '\x1b') {
      setTimeout(() => {
        if (buffer === '\x1b') {
          handleInput('\x1b');
          render();
        }
        buffer = '';
      }, 50);
      return;
    }

    if (buffer.startsWith('\x1b[')) {
      if (/^(\x1b\[[0-9;~]*[A-Za-z~])$/.test(buffer)) {
        handleInput(buffer);
        buffer = '';
        render();
      }
      return;
    }

    for (const ch of buffer) {
      handleInput(ch);
    }
    buffer = '';
    render();
  });

  process.stdout.on('resize', () => { render(); });
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  render();
}

if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.includes('/?')) {
  console.log(`
  ${chalk.bold('mdviewer')} — Terminal Markdown Viewer

  ${chalk.dim('Usage:')}
    ${chalk.bold('mdviewer')} ${chalk.italic('<file.md>')}    Open a markdown file
    ${chalk.bold('mdviewer')}                  Opens README.md in current dir
    ${chalk.bold('mdviewer')} ${chalk.italic('file.md')} ${chalk.dim('--plain')}    Output plain text (no TUI)

  ${chalk.dim('Controls (TUI mode):')}
    ${chalk.bold('↑/↓')} or ${chalk.bold('j/k')}    Scroll line by line
    ${chalk.bold('PgUp/PgDn')}         Scroll full page
    ${chalk.bold('g')} / ${chalk.bold('G')}          Go to top / bottom
    ${chalk.bold('/')}                 Search
    ${chalk.bold('n')} / ${chalk.bold('N')}          Next / previous match
    ${chalk.bold('?')}                 Show controls
    ${chalk.bold('q')}                 Quit

  ${chalk.dim('Examples:')}
    mdviewer README.md
    mdviewer docs/guide.md
    mdviewer file.md --plain | less
`);
  process.exit(0);
}

const filename = process.argv[2] || 'README.md';

if (filename === '--plain') {
  console.error(chalk.bgHex('#F38BA8').hex('#1E1E2E')(` Provide a filename before --plain `));
  process.exit(1);
}

const filePath = resolve(process.cwd(), filename);

if (!existsSync(filePath)) {
  console.error(chalk.bgHex('#F38BA8').hex('#1E1E2E')(` File not found: ${filename} `));
  process.exit(1);
}

const md = readFileSync(filePath, 'utf-8');
buildContent(md, filename);

if (!process.stdout.isTTY || process.argv.includes('--plain')) {
  for (const line of contentLines) {
    const clean = line.text.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(clean);
  }
} else {
  startTui();
}
