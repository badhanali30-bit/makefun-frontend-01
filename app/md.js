// A tiny, safe Markdown renderer for bounty descriptions and rules.
// The text is escaped first, so no HTML from the API can ever execute;
// only the markup this file generates reaches the page.
//
// Supports: # / ## / ### headings, - and 1. lists, > quotes, ``` fences,
// paragraphs, **bold**, *italic*, `code` and [text](https://…) links.

import { esc } from './format.js';

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

export function md(source) {
  const lines = esc(source ?? '').split('\n');
  let html = '';
  let list = null; // 'ul' | 'ol' | null
  let para = [];
  let fence = false;

  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };
  const closePara = () => {
    if (para.length) {
      html += `<p>${inline(para.join(' '))}</p>`;
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      closePara();
      closeList();
      fence = !fence;
      html += fence ? '<pre><code>' : '</code></pre>';
      continue;
    }
    if (fence) {
      html += `${line}\n`;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closePara();
      closeList();
      html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
      continue;
    }
    if (/^---+$/.test(line)) {
      closePara();
      closeList();
      html += '<hr>';
      continue;
    }
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closePara();
      closeList();
      html += `<blockquote><p>${inline(quote[1])}</p></blockquote>`;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      closePara();
      const kind = bullet ? 'ul' : 'ol';
      const text = (bullet || ordered)[1];
      if (list !== kind) {
        closeList();
        list = kind;
        html += `<${kind}>`;
      }
      html += `<li>${inline(text)}</li>`;
      continue;
    }
    if (line === '') {
      closePara();
      closeList();
      continue;
    }
    closeList();
    para.push(line.trim());
  }
  closePara();
  closeList();
  if (fence) html += '</code></pre>';
  return html;
}
