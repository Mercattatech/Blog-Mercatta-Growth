'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeSeo } from '@/lib/seo.js';
import RichEditor from './RichEditor.js';
import { api, Icon, Spin, toast } from './ui.js';
import { StatusBadge } from './Badges.js';
import CoverStudioModal from './CoverStudioModal.js';

const slugify = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
const toLocalInput = (v) => { if (!v) return ''; const d = new Date(v); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function Counter({ value, min, max }) {
  const n = value.length;
  const cls = n === 0 ? '' : n > max ? 'bad' : n >= min ? 'ok' : 'warn';
  return <span className={`a-counter ${cls}`}>{n}/{max}</span>;
}

function ChipInput({ id, items, onChange, placeholder, max = 15 }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim().replace(/,$/, ''); if (t && !items.includes(t) && items.length < max) onChange([...items, t]); setV(''); };
  return (
    <div>
      <div className="a-chips" style={{ marginBottom: items.length ? 8 : 0 }}>
        {items.map((t) => <span className="a-chip" key={t}>{t}<button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(items.filter((x) => x !== t))}>×</button></span>)}
      </div>
      <input id={id} className="a-input" value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !v && items.length) onChange(items.slice(0, -1)); }} onBlur={add} />
    </div>
  );
}

export default function PostEditor({ initial, categories, role, siteUrl, aiNote, tenant = {} }) {
  const router = useRouter();
  const isAdmin = role === 'admin';
  const [id, setId] = useState(initial.id || null);
  const [meta, setMeta] = useState({ status: initial.status || 'draft', ai: !!initial.ai_generated, author: initial.author_name });
  const [f, setF] = useState({
    title: initial.title || '', slug: initial.slug || '', content: initial.content || '', excerpt: initial.excerpt || '',
    cover_url: initial.cover_url || '', cover_thumb: initial.cover_thumb || '', cover_alt: initial.cover_alt || '',
    cats: (initial.cats || []).map((c) => c.slug), tags: initial.tags || [],
    seo_title: initial.seo_title || '', seo_description: initial.seo_description || '', focus_keyword: initial.focus_keyword || '',
    secondary_keywords: initial.secondary_keywords || [], faq: initial.faq || [], publish_at: toLocalInput(initial.publish_at),
  });
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const slugTouched = useRef(!!initial.slug);
  const fileRef = useRef(null);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setDirty(true); };

  const readOnly = !isAdmin && meta.status === 'published';
  const seo = useMemo(() => analyzeSeo({ ...f, seo_description: f.seo_description, faq: f.faq }), [f]);
  const scheduled = f.publish_at && new Date(f.publish_at) > new Date();
  const isPublished = meta.status === 'published';

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(action, okMsg) {
    if (!f.title.trim()) { toast('Informe o título do artigo.', 'err'); return; }
    if (action === 'publish' && seo.score < 50 && !window.confirm(`A nota de SEO está em ${seo.score}/100. Publicar mesmo assim?`)) return;
    setBusy(action);
    try {
      const payload = { ...f, category_slugs: f.cats, publish_at: f.publish_at ? new Date(f.publish_at).toISOString() : null, action, ai_generated: meta.ai };
      const res = id ? await api(`/api/admin/posts/${id}/`, { method: 'PUT', data: payload }) : await api('/api/admin/posts/', { method: 'POST', data: payload });
      setDirty(false);
      setMeta((m) => ({ ...m, status: res.status }));
      setF((s) => ({ ...s, slug: res.slug }));
      toast(okMsg);
      if (!id) { setId(res.id); router.replace(`/admin/posts/${res.id}/`); } else router.refresh();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(''); }
  }
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!readOnly && !busy) document.getElementById('btn-save')?.click(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [readOnly, busy]);

  async function upload(file) {
    const form = new FormData(); form.append('file', file);
    return api('/api/admin/upload/', { method: 'POST', form });
  }
  async function uploadCover(file) {
    if (!file) return;
    setBusy('cover');
    try { const r = await upload(file); setF((s) => ({ ...s, cover_url: r.url, cover_thumb: r.thumb })); setDirty(true); toast('Capa enviada.'); }
    catch (e) { toast(e.message, 'err'); } finally { setBusy(''); }
  }
  async function remove() {
    if (!id || !window.confirm('Excluir este artigo definitivamente?')) return;
    setBusy('del');
    try { await api(`/api/admin/posts/${id}/`, { method: 'DELETE' }); setDirty(false); toast('Artigo excluído.'); router.replace('/admin/posts/'); }
    catch (e) { toast(e.message, 'err'); setBusy(''); }
  }

  const toggleCat = (slug) => set('cats', f.cats.includes(slug) ? f.cats.filter((c) => c !== slug) : [...f.cats, slug]);
  const Busy = ({ k, children }) => (busy === k ? <Spin /> : children);
  const url = `${siteUrl}/${f.slug || 'endereco-do-artigo'}/`;
  const ringColor = seo.score >= 80 ? '#3b9c46' : seo.score >= 55 ? '#e6a800' : '#d94c4c';

  return (
    <>
      <div className="adm-head">
        <div>
          <h2>{id ? 'Editar artigo' : 'Novo artigo'}</h2>
          <p className="a-row" style={{ gap: 8 }}>
            {id && <StatusBadge post={{ status: meta.status, display_status: isPublished && scheduled ? 'scheduled' : meta.status, ai_generated: meta.ai }} />}
            {meta.author && <span>por {meta.author}</span>}
            {dirty && <span className="a-badge draft">Alterações não salvas</span>}
          </p>
        </div>
        <div className="a-row">
          {isPublished && !scheduled && <a className="a-btn ghost" href={`/${f.slug}/`} target="_blank" rel="noopener"><Icon name="eye" size={17} />Ver no blog</a>}
          {id && !readOnly && <button className="a-btn danger" type="button" onClick={remove} disabled={!!busy}><Busy k="del"><Icon name="trash" size={16} />Excluir</Busy></button>}
        </div>
      </div>

      {aiNote && <div className="a-note info" style={{ marginBottom: 16 }}>✦ {aiNote}</div>}
      {meta.ai && !readOnly && <div className="a-note info" style={{ marginBottom: 16 }}>✦ Este texto foi escrito pela IA. Revise os fatos, ajuste o que quiser (título, texto, SEO, FAQ, capa) e só então publique.</div>}
      {readOnly && <div className="a-note warn" style={{ marginBottom: 16 }}>Este artigo já foi publicado. Somente administradores podem alterá-lo.</div>}
      {!isAdmin && meta.status === 'pending' && <div className="a-note info" style={{ marginBottom: 16 }}>Enviado para aprovação. Um administrador vai revisar e publicar.</div>}

      <div className="ed-layout">
        <div>
          <div className="a-field">
            <label htmlFor="title" className="a-label" style={{ position: 'absolute', left: -9999 }}>Título</label>
            <input id="title" className="a-input big" placeholder="Título do artigo" value={f.title} readOnly={readOnly} maxLength={200}
              onChange={(e) => { set('title', e.target.value); if (!slugTouched.current) setF((s) => ({ ...s, title: e.target.value, slug: slugify(e.target.value) })); }} />
            <div className="ed-slug">
              <span>{siteUrl.replace(/^https?:\/\//, '')}/</span>
              <input value={f.slug} aria-label="Endereço (slug) do artigo" readOnly={readOnly} placeholder="endereco-do-artigo" onChange={(e) => { slugTouched.current = true; set('slug', slugify(e.target.value)); }} />
              <span>/</span>
            </div>
          </div>

          <RichEditor key="editor" html={initial.content || ''} onChange={(h) => set('content', h)} onUpload={upload} readOnly={readOnly} />
          <div className="ed-stats"><span>{seo.words} palavras</span><span>≈ {Math.max(1, Math.ceil(seo.words / 200))} min de leitura</span></div>

          <section className="a-card">
            <h3>Perguntas frequentes (FAQ)</h3>
            <p className="sub">Aparecem no fim do artigo e ajudam o Google e as IAs a citarem sua resposta. Recomendado: 3 a 6 perguntas.</p>
            {f.faq.map((q, i) => (
              <div className="faq-item" key={i}>
                <div className="a-field"><label htmlFor={`fq${i}`}>Pergunta {i + 1}</label><input id={`fq${i}`} className="a-input" value={q.q} readOnly={readOnly} onChange={(e) => set('faq', f.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} /></div>
                <div className="a-field"><label htmlFor={`fa${i}`}>Resposta</label><textarea id={`fa${i}`} className="a-textarea" rows={3} value={q.a} readOnly={readOnly} onChange={(e) => set('faq', f.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} /></div>
                {!readOnly && <button type="button" className="a-btn danger sm" onClick={() => set('faq', f.faq.filter((_, j) => j !== i))}><Icon name="trash" size={14} />Remover</button>}
              </div>
            ))}
            {!readOnly && f.faq.length < 12 && <button type="button" className="a-btn ghost" onClick={() => set('faq', [...f.faq, { q: '', a: '' }])}><Icon name="plus" size={16} />Adicionar pergunta</button>}
          </section>
        </div>

        <aside className="ed-side">
          <section className="a-card">
            <h3>Publicação</h3>
            <div className="a-field" style={{ marginTop: 10 }}>
              <label htmlFor="pub">Data e hora {isAdmin ? '(deixe vazio para publicar agora; futura = agendar)' : '(sugestão para o administrador)'}</label>
              <input id="pub" className="a-input" type="datetime-local" value={f.publish_at} disabled={readOnly} onChange={(e) => set('publish_at', e.target.value)} />
              {f.publish_at && !readOnly && <button type="button" className="a-btn ghost sm" style={{ marginTop: 6 }} onClick={() => set('publish_at', '')}>Limpar data</button>}
            </div>
            {!readOnly && (
              <div style={{ display: 'grid', gap: 8 }}>
                <button id="btn-save" type="button" className="a-btn blue block" disabled={!!busy} onClick={() => save('draft', 'Rascunho salvo.')}><Busy k="draft"><Icon name="check" size={16} />{isPublished ? 'Salvar alterações' : 'Salvar rascunho'}</Busy></button>
                {!isAdmin && meta.status !== 'pending' && <button type="button" className="a-btn primary block" disabled={!!busy} onClick={() => save('submit', 'Enviado para aprovação!')}><Busy k="submit"><Icon name="send" size={16} />Enviar para aprovação</Busy></button>}
                {isAdmin && (
                  <button type="button" className="a-btn primary block" disabled={!!busy} onClick={() => save('publish', scheduled ? 'Publicação agendada!' : isPublished ? 'Artigo atualizado!' : 'Artigo publicado!')}>
                    <Busy k="publish"><Icon name={scheduled ? 'clock' : 'send'} size={16} />{isPublished ? (scheduled ? 'Reagendar' : 'Atualizar publicado') : scheduled ? 'Agendar publicação' : meta.status === 'pending' ? 'Aprovar e publicar' : 'Publicar agora'}</Busy>
                  </button>
                )}
                {isAdmin && meta.status === 'pending' && <button type="button" className="a-btn ghost block" disabled={!!busy} onClick={() => save('reject', 'Devolvido ao autor como rascunho.')}><Busy k="reject">Devolver ao autor</Busy></button>}
                {isAdmin && isPublished && <button type="button" className="a-btn ghost block" disabled={!!busy} onClick={() => save('unpublish', 'Artigo voltou para rascunho.')}><Busy k="unpublish">Despublicar (voltar a rascunho)</Busy></button>}
              </div>
            )}
          </section>

          <section className="a-card">
            <h3>Capa</h3>
            <p className="a-hint" style={{ margin: '0 0 10px' }}>Aparece inteira, sem cortes. Ideal: 1200×675 px (16:9).</p>
            <div className={`cover-box${drag ? ' drag' : ''}`} style={f.cover_url ? { '--bg-img': `url(${f.cover_thumb || f.cover_url})` } : undefined}
              onClick={() => !readOnly && fileRef.current?.click()} role="button" tabIndex={0} aria-label="Enviar imagem de capa"
              onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); if (!readOnly) uploadCover(e.dataTransfer.files?.[0]); }}>
              {busy === 'cover' ? (
                <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Spin />
                  <span style={{ fontSize: 13, color: '#fff' }}>Processando imagem...</span>
                </div>
              ) : f.cover_url ? (
                <img
                  src={f.cover_url}
                  alt={f.cover_alt || ''}
                  onError={(e) => {
                    // Evita exibir ícone quebrado do navegador se URL for inacessível
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ position: 'relative' }}>
                  <Icon name="upload" size={26} />
                  <br />
                  Clique ou arraste a imagem aqui
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(e) => {
                uploadCover(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {!readOnly && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="a-btn ghost sm"
                  style={{ justifyContent: 'center', width: '100%' }}
                  onClick={() => fileRef.current?.click()}
                  disabled={busy === 'cover'}
                  title="Escolha um arquivo do seu computador"
                >
                  <Icon name="upload" size={16} />{busy === 'cover' ? 'Enviando...' : 'Subir manual'}
                </button>
                <button
                  type="button"
                  className="a-btn primary sm"
                  style={{ justifyContent: 'center', width: '100%' }}
                  onClick={() => {
                    if (!f.title.trim()) {
                      toast('Digite o título do artigo antes de gerar a capa com IA.', 'err');
                      return;
                    }
                    setCoverModalOpen(true);
                  }}
                  disabled={busy === 'cover'}
                  title="Criar capa profissional com inteligência artificial"
                >
                  <Icon name="sparkles" size={16} />Capa com IA
                </button>
              </div>
            )}
            {f.cover_url && !readOnly && (
              <button
                type="button"
                className="a-btn ghost sm"
                style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                onClick={() => { set('cover_url', ''); set('cover_thumb', ''); }}
              >
                Remover capa
              </button>
            )}
            <div className="a-field" style={{ marginTop: 12 }}>
              <label htmlFor="calt">Texto alternativo da capa</label>
              <input id="calt" className="a-input" value={f.cover_alt} readOnly={readOnly} onChange={(e) => set('cover_alt', e.target.value)} placeholder="Descreva a imagem" />
            </div>
          </section>

          <section className="a-card">
            <h3>Categorias</h3>
            <p className="a-hint" style={{ margin: '0 0 8px' }}>A primeira marcada é a principal.</p>
            {categories.map((c) => (
              <label className="a-check" key={c.slug}>
                <input type="checkbox" checked={f.cats.includes(c.slug)} disabled={readOnly} onChange={() => toggleCat(c.slug)} />{c.name}{f.cats[0] === c.slug && <span className="a-badge draft" style={{ marginLeft: 'auto' }}>principal</span>}
              </label>
            ))}
            <div className="a-field" style={{ marginTop: 14 }}><label htmlFor="tags">Tags</label>
              <ChipInput id="tags" items={f.tags} onChange={(v) => set('tags', v)} placeholder="Digite e tecle Enter" />
            </div>
            <div className="a-field" style={{ marginBottom: 0 }}>
              <label htmlFor="exc">Resumo (aparece nos cards) <Counter value={f.excerpt} min={100} max={200} /></label>
              <textarea id="exc" className="a-textarea" rows={3} value={f.excerpt} readOnly={readOnly} maxLength={400} onChange={(e) => set('excerpt', e.target.value)} />
            </div>
          </section>

          <section className="a-card">
            <h3>SEO e busca por IA</h3>
            <div className="seo-score" style={{ marginTop: 10 }}>
              <div className="ring" style={{ '--p': seo.score, '--c': ringColor }}><b>{seo.score}</b></div>
              <div><strong>{seo.score >= 80 ? 'Excelente' : seo.score >= 55 ? 'Bom, dá para melhorar' : 'Precisa de ajustes'}</strong><br /><small className="muted">Baseado nas diretrizes do Google</small></div>
            </div>

            <div className="a-field"><label htmlFor="fk">Palavra-chave principal</label><input id="fk" className="a-input" value={f.focus_keyword} readOnly={readOnly} onChange={(e) => set('focus_keyword', e.target.value)} placeholder="ex.: aprender francês sozinho" /></div>
            <div className="a-field"><label htmlFor="sk">Palavras-chave secundárias</label><ChipInput id="sk" items={f.secondary_keywords} onChange={(v) => set('secondary_keywords', v)} placeholder="Digite e tecle Enter" max={10} /></div>
            <div className="a-field">
              <label htmlFor="st">Título SEO <Counter value={f.seo_title} min={30} max={60} /></label>
              <input id="st" className="a-input" value={f.seo_title} readOnly={readOnly} onChange={(e) => set('seo_title', e.target.value)} placeholder={f.title || 'Título que aparece no Google'} maxLength={120} />
              {!readOnly && !f.seo_title && f.title && <button type="button" className="a-btn ghost sm" style={{ marginTop: 6 }} onClick={() => set('seo_title', f.title.slice(0, 60))}>Usar o título do artigo</button>}
            </div>
            <div className="a-field">
              <label htmlFor="sd">Meta description <Counter value={f.seo_description} min={120} max={160} /></label>
              <textarea id="sd" className="a-textarea" rows={3} value={f.seo_description} readOnly={readOnly} onChange={(e) => set('seo_description', e.target.value)} placeholder="Resumo que aparece abaixo do título no Google" maxLength={320} />
              {!readOnly && !f.seo_description && f.excerpt && <button type="button" className="a-btn ghost sm" style={{ marginTop: 6 }} onClick={() => set('seo_description', f.excerpt.slice(0, 158))}>Usar o resumo</button>}
            </div>
            <div className="serp" aria-label="Pré-visualização no Google">
              <div className="u">{url}</div>
              <div className="t">{f.seo_title || f.title || 'Título do artigo'}</div>
              <div className="d">{f.seo_description || f.excerpt || 'A descrição do artigo aparece aqui.'}</div>
            </div>
            <div className="seo-list" style={{ marginTop: 14 }}>
              {[...seo.checks].sort((a, b) => Number(a.ok) - Number(b.ok)).map((c) => (
                <div key={c.id} className={`seo-item ${c.level}`}>
                  <span className="dot">{c.ok ? '✓' : c.level === 'warn' ? '!' : '✕'}</span>
                  <span>{c.label}{!c.ok && <small>{c.tip}</small>}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <CoverStudioModal
        isOpen={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        postTitle={f.title}
        postExcerpt={f.excerpt}
        categoryName={categories.find((c) => f.cats.includes(c.slug))?.name || ''}
        tenant={tenant}
        onApply={(data) => {
          set('cover_url', data.cover_url);
          set('cover_thumb', data.cover_thumb);
          if (data.cover_alt) set('cover_alt', data.cover_alt);
          toast('Capa oficial gerada e aplicada com sucesso!');
        }}
      />
    </>
  );
}
