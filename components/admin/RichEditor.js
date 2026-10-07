'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon, toast } from './ui.js';

const ALLOW = new Set(['H2', 'H3', 'H4', 'P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR']);
const MAP = { B: 'STRONG', I: 'EM', H1: 'H2', H5: 'H4', H6: 'H4' };
const BLOCKS = new Set(['DIV', 'SECTION', 'ARTICLE', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TABLE', 'PRE', 'FIGURE']);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const safeUrl = (u) => /^(https?:|mailto:|tel:|\/|#)/i.test(u || '');

/** Limpa HTML colado (Word, Google Docs, sites): mantém só estrutura semântica. */
function cleanNode(node) {
  if (node.nodeType === 3) return esc(node.textContent);
  if (node.nodeType !== 1) return '';
  let tag = node.tagName;
  if (['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'NOSCRIPT'].includes(tag)) return '';
  tag = MAP[tag] || tag;
  const inner = [...node.childNodes].map(cleanNode).join('');
  if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
    const hasBlock = [...node.children].some((c) => BLOCKS.has(c.tagName));
    return hasBlock ? inner : (inner.trim() ? `<p>${inner}</p>` : '');
  }
  if (!ALLOW.has(tag)) return inner;
  const t = tag.toLowerCase();
  if (tag === 'BR' || tag === 'HR') return `<${t}>`;
  if (tag === 'A') { const h = node.getAttribute('href'); return safeUrl(h) ? `<a href="${esc(h)}">${inner}</a>` : inner; }
  if (tag === 'IMG') { const s = node.getAttribute('src'); return /^https?:|^\//i.test(s || '') ? `<img src="${esc(s)}" alt="${esc(node.getAttribute('alt') || '')}">` : ''; }
  if (tag === 'SPAN') return inner;
  return `<${t}>${inner}</${t}>`;
}

export function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let out = cleanNode(doc.body);
  // Google Docs envolve tudo em <b id="docs-internal-guid-…"> (vira STRONG gigante): desfaz.
  out = out.replace(/^<strong>(<(?:p|h2|h3|h4|ul|ol)[\s\S]*)<\/strong>$/, '$1');
  return out.replace(/<(p|h2|h3|h4)>\s*<\/\1>/g, '');
}

function Btn({ title, on, children, ...p }) {
  return <button type="button" className={`ed-btn${on ? ' on' : ''}`} title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} {...p}>{children}</button>;
}

/**
 * Editor visual (contentEditable) + modo HTML. Fonte de verdade é o HTML do próprio editor;
 * o servidor sanitiza novamente ao salvar.
 */
export default function RichEditor({ html, onChange, onUpload, readOnly }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [source, setSource] = useState(false);
  const [src, setSrc] = useState('');
  const [block, setBlock] = useState('p');

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html || '';
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ }
    const sel = () => {
      if (!ref.current?.contains(window.getSelection()?.anchorNode)) return;
      const v = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
      setBlock(['h2', 'h3', 'h4', 'p', 'blockquote'].includes(v) ? v : 'p');
    };
    document.addEventListener('selectionchange', sel);
    return () => document.removeEventListener('selectionchange', sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current.innerHTML);
  const exec = (cmd, val) => { ref.current.focus(); document.execCommand(cmd, false, val); emit(); };
  const insert = (h) => exec('insertHTML', h);

  function onPaste(e) {
    const html = e.clipboardData.getData('text/html');
    e.preventDefault();
    if (html) insert(cleanHtml(html));
    else insert(esc(e.clipboardData.getData('text/plain')).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''));
  }
  function link() {
    const sel = window.getSelection();
    const cur = sel?.anchorNode?.parentElement?.closest?.('a')?.getAttribute('href') || 'https://';
    const url = window.prompt('Endereço do link (deixe vazio para remover):', cur);
    if (url === null) return;
    if (!url.trim()) exec('unlink'); else if (safeUrl(url.trim())) exec('createLink', url.trim()); else toast('Use um endereço começando com http://, https:// ou /', 'err');
  }
  async function pickImage(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    try {
      const up = await onUpload(file);
      const alt = window.prompt('Descreva a imagem (texto alternativo, importante para SEO e acessibilidade):', '') || '';
      ref.current.focus();
      if (range) { sel.removeAllRanges(); sel.addRange(range); }
      insert(`<p><img src="${up.url}" alt="${esc(alt).replace(/"/g, '&quot;')}"></p>`);
    } catch (err) { toast(err.message, 'err'); }
  }
  function toggleSource() {
    if (!source) setSrc(ref.current.innerHTML);
    else { ref.current.innerHTML = src; emit(); }
    setSource(!source);
  }

  const quick = '<div class="quick-answer"><p><strong>Resposta rápida:</strong> escreva aqui uma resposta direta de 40 a 60 palavras.</p></div><p><br></p>';
  const table = '<table><thead><tr><th>Título</th><th>Título</th><th>Título</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>';

  return (
    <div>
      <div className="ed-bar" role="toolbar" aria-label="Formatação do texto">
        {!source && !readOnly && (
          <>
            <select value={block} aria-label="Estilo do parágrafo" onChange={(e) => exec('formatBlock', `<${e.target.value}>`)}>
              <option value="p">Parágrafo</option><option value="h2">Título (H2)</option><option value="h3">Subtítulo (H3)</option><option value="h4">Título menor (H4)</option><option value="blockquote">Citação</option>
            </select>
            <span className="sep" />
            <Btn title="Negrito (Ctrl+B)" onClick={() => exec('bold')}><b>B</b></Btn>
            <Btn title="Itálico (Ctrl+I)" onClick={() => exec('italic')}><i style={{ fontFamily: 'serif' }}>I</i></Btn>
            <Btn title="Lista com marcadores" onClick={() => exec('insertUnorderedList')}>•≡</Btn>
            <Btn title="Lista numerada" onClick={() => exec('insertOrderedList')}>1.≡</Btn>
            <Btn title="Citação" onClick={() => exec('formatBlock', '<blockquote>')}>❝</Btn>
            <span className="sep" />
            <Btn title="Inserir/editar link" onClick={link}><Icon name="link" size={17} /></Btn>
            <Btn title="Inserir imagem" onClick={() => fileRef.current.click()}><Icon name="img" size={17} /></Btn>
            <Btn title="Inserir tabela" onClick={() => insert(table)}>▦</Btn>
            <Btn title="Linha separadora" onClick={() => exec('insertHorizontalRule')}>―</Btn>
            <Btn title="Caixa de resposta rápida (ótima para Google e IAs)" onClick={() => insert(quick)}>⚡</Btn>
            <span className="sep" />
            <Btn title="Desfazer" onClick={() => exec('undo')}>↶</Btn>
            <Btn title="Refazer" onClick={() => exec('redo')}>↷</Btn>
            <Btn title="Limpar formatação" onClick={() => exec('removeFormat')}>Tx</Btn>
          </>
        )}
        <span style={{ flex: 1 }} />
        <Btn title="Alternar entre editor visual e código HTML" on={source} onClick={toggleSource}>{'</>'}</Btn>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
      </div>
      <div
        ref={ref}
        className="ed-area"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Conteúdo do artigo"
        data-ph="Comece a escrever o seu artigo… Use o botão ⚡ para uma resposta rápida no início."
        onInput={emit}
        onPaste={onPaste}
        hidden={source}
      />
      {source && (
        <textarea className="ed-src" value={src} spellCheck={false} onChange={(e) => { setSrc(e.target.value); onChange(e.target.value); }} aria-label="HTML do artigo" readOnly={readOnly} />
      )}
    </div>
  );
}
