'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Icon, Spin, toast } from './ui.js';

const STATUS = {
  suggested: ['Nova ideia', 'draft'], writing: ['Escrevendo…', 'pending'], written: ['Artigo criado', 'published'], failed: ['Falhou', 'off'],
};

export default function IdeasManager({
  initial,
  categories,
  aiOn,
  isSuperAdmin = false,
  tenants = [],
  userTenantId = null,
}) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initial);
  const [gen, setGen] = useState(false);
  const [writing, setWriting] = useState(0);
  const [edit, setEdit] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState(userTenantId || (tenants[0]?.id ? String(tenants[0].id) : ''));
  const [instantOpen, setInstantOpen] = useState(false);
  const [generatingInstant, setGeneratingInstant] = useState(false);
  const [instantForm, setInstantForm] = useState({
    topic: '',
    category_slug: '',
    tenantId: userTenantId || (tenants[0]?.id ? String(tenants[0].id) : ''),
    publishImmediate: false,
    cover_prompt: '',
  });

  const catName = (slug) => categories.find((c) => c.slug === slug)?.name || slug || 'Sem categoria';

  const handleTenantChange = async (newTenantId) => {
    setSelectedTenantId(newTenantId);
    setInstantForm((prev) => ({ ...prev, tenantId: newTenantId }));
    try {
      const url = newTenantId ? `/api/admin/ideas/?tenantId=${newTenantId}` : '/api/admin/ideas/';
      const res = await api(url);
      setIdeas(res.ideas || []);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  async function generate() {
    setGen(true);
    try {
      const r = await api('/api/admin/ideas/', {
        method: 'POST',
        data: { tenantId: selectedTenantId || undefined },
      });
      setIdeas((cur) => [...r.ideas, ...cur]);
      toast(`${r.ideas.length} novas ideias geradas!`);
    } catch (e) { toast(e.message, 'err'); } finally { setGen(false); }
  }

  async function generateInstantArticle(e) {
    e.preventDefault();
    setGeneratingInstant(true);
    try {
      const res = await api('/api/admin/ai/instant-article/', {
        method: 'POST',
        data: {
          ...instantForm,
          tenantId: instantForm.tenantId || selectedTenantId || undefined,
        },
      });
      toast(`Artigo "${res.title}" gerado com sucesso! Abrindo editor...`, 'ok');
      setInstantOpen(false);
      router.push(`/admin/posts/${res.post_id}/`);
    } catch (err) {
      toast(err.message || 'Erro ao gerar artigo instantâneo.', 'err');
      setGeneratingInstant(false);
    }
  }

  async function approve(idea) {
    setWriting(idea.id);
    setIdeas((cur) => cur.map((i) => (i.id === idea.id ? { ...i, status: 'writing' } : i)));
    try {
      const r = await api(`/api/admin/ideas/${idea.id}/approve/`, { method: 'POST' });
      toast('Artigo escrito! Abrindo o editor para você revisar…');
      router.push(`/admin/posts/${r.post_id}/`);
    } catch (e) {
      toast(e.message, 'err');
      setIdeas((cur) => cur.map((i) => (i.id === idea.id ? { ...i, status: 'failed', error: e.message } : i)));
      setWriting(0);
    }
  }
  async function reject(idea) {
    try {
      await api(`/api/admin/ideas/${idea.id}/`, { method: 'PATCH', data: { status: 'rejected' } });
      setIdeas((cur) => cur.map((i) => (i.id === idea.id ? { ...i, status: 'rejected' } : i)));
      setSelected((s) => { const n = new Set(s); n.delete(idea.id); return n; });
      toast('Ideia enviada para a lixeira.');
    } catch (e) { toast(e.message, 'err'); }
  }

  // ---------- Seleção e ações em massa ----------
  const [tab, setTab] = useState('open');
  const [selected, setSelected] = useState(() => new Set());
  const [publishDirect, setPublishDirect] = useState(false);
  const [bulk, setBulk] = useState(null); // { label, done, total }

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSel = () => setSelected(new Set());
  const switchTab = (t) => { setTab(t); clearSel(); };

  async function bulkApprove() {
    const ids = [...selected].filter((id) => open.some((i) => i.id === id && i.status !== 'writing'));
    if (!ids.length) return;
    const verb = publishDirect ? 'escrever e PUBLICAR' : 'escrever (como rascunho)';
    if (!window.confirm(`A IA vai ${verb} ${ids.length} artigo(s), um de cada vez (cerca de 1 min cada).\n\nMantenha esta página aberta até terminar. Continuar?`)) return;
    let ok = 0; const fails = [];
    setBulk({ label: publishDirect ? 'Escrevendo e publicando' : 'Escrevendo', done: 0, total: ids.length });
    for (let n = 0; n < ids.length; n++) {
      const id = ids[n];
      setWriting(id);
      setIdeas((cur) => cur.map((i) => (i.id === id ? { ...i, status: 'writing' } : i)));
      try {
        // eslint-disable-next-line no-await-in-loop
        const r = await api(`/api/admin/ideas/${id}/approve/`, { method: 'POST', data: { publish: publishDirect } });
        ok++;
        setIdeas((cur) => cur.map((i) => (i.id === id ? { ...i, status: 'written', post_id: r.post_id } : i)));
      } catch (e) {
        fails.push(e.message);
        setIdeas((cur) => cur.map((i) => (i.id === id ? { ...i, status: 'failed', error: e.message } : i)));
      }
      setBulk((b) => ({ ...b, done: n + 1 }));
    }
    setWriting(0); setBulk(null); clearSel();
    toast(`${ok} artigo(s) ${publishDirect ? 'publicados' : 'criados como rascunho'}${fails.length ? ` · ${fails.length} falharam` : ''}.`, fails.length ? 'err' : 'ok');
    router.refresh();
  }

  async function bulkStatus(status, idsOverride = null) {
    const ids = idsOverride || [...selected];
    if (!ids.length) return;
    const restoring = status === 'suggested';
    setBulk({ label: restoring ? 'Restaurando' : 'Movendo para a lixeira', done: 0, total: ids.length });
    let ok = 0;
    for (let n = 0; n < ids.length; n++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const r = await api(`/api/admin/ideas/${ids[n]}/`, { method: 'PATCH', data: { status } });
        ok++;
        setIdeas((cur) => cur.map((i) => (i.id === ids[n] ? { ...i, ...(r.idea || { status }) } : i)));
      } catch (e) { toast(e.message, 'err'); }
      setBulk((b) => ({ ...b, done: n + 1 }));
    }
    setBulk(null); clearSel();
    toast(restoring ? `${ok} ideia(s) restaurada(s).` : `${ok} ideia(s) enviada(s) para a lixeira.`);
  }

  async function bulkDeleteForever() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Excluir DEFINITIVAMENTE ${ids.length} ideia(s)? Esta ação não pode ser desfeita.`)) return;
    setBulk({ label: 'Excluindo', done: 0, total: ids.length });
    let ok = 0;
    for (let n = 0; n < ids.length; n++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await api(`/api/admin/ideas/${ids[n]}/`, { method: 'DELETE' });
        ok++;
        setIdeas((cur) => cur.filter((i) => i.id !== ids[n]));
      } catch (e) { toast(e.message, 'err'); }
      setBulk((b) => ({ ...b, done: n + 1 }));
    }
    setBulk(null); clearSel();
    toast(`${ok} ideia(s) excluída(s) definitivamente.`);
  }
  async function saveEdit(e) {
    e.preventDefault();
    try {
      const r = await api(`/api/admin/ideas/${edit.id}/`, { method: 'PATCH', data: edit });
      setIdeas((cur) => cur.map((i) => (i.id === edit.id ? { ...i, ...r.idea } : i))); setEdit(null); toast('Ideia atualizada.');
    } catch (err) { toast(err.message, 'err'); }
  }

  const open = ideas.filter((i) => i.status !== 'written' && i.status !== 'rejected');
  const done = ideas.filter((i) => i.status === 'written');
  const trash = ideas.filter((i) => i.status === 'rejected');
  const list = tab === 'trash' ? trash : open;
  const allSelected = list.length > 0 && list.every((i) => selected.has(i.id));
  const busy = !!writing || gen || !!bulk;

  return (
    <>
      <div className="adm-head" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Ideias & Artigos com IA</h2>
          <p>Gere artigos automáticos completos ou aprove sugestões de pautas baseadas no treinamento da empresa.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isSuperAdmin && tenants.length > 0 && (
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="a-select sm"
              style={{ minWidth: '160px', padding: '0.45rem 0.75rem' }}
              title="Filtrar por Empresa"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  🏢 {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="a-btn primary"
            onClick={() => setInstantOpen(true)}
            disabled={gen || !!writing || !aiOn}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Icon name="spark" size={16} />
            ⚡ Gerar Artigo Automático
          </button>

          <button
            type="button"
            className="a-btn blue"
            onClick={generate}
            disabled={gen || !!writing || !aiOn}
          >
            {gen ? <><Spin />Gerando ideias…</> : <><Icon name="plus" size={16} />Sugerir pautas</>}
          </button>
        </div>
      </div>
      {!aiOn && <div className="a-note warn" style={{ marginBottom: 16 }}>A IA não está configurada. Crie uma chave gratuita no <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>Google AI Studio</a> e coloque em <code>GEMINI_API_KEY</code> no arquivo <code>.env.local</code> (ou nas variáveis da Vercel). Reinicie o servidor.</div>}

      {(writing > 0 || gen) && !bulk && (
        <div className="writing" role="status" aria-live="polite">
          <div className="ai-orb" />
          <div><strong>{writing ? 'A IA está escrevendo o artigo…' : 'A IA está pesquisando boas pautas…'}</strong><br /><span className="muted">Pode levar de 20 a 90 segundos. Não feche esta página.</span></div>
        </div>
      )}

      {bulk && (
        <div className="writing" role="status" aria-live="polite">
          <div className="ai-orb" />
          <div>
            <strong>{bulk.label}: {bulk.done} de {bulk.total}…</strong><br />
            <span className="muted">Não feche esta página até terminar.</span>
            <div style={{ marginTop: 8, height: 6, borderRadius: 4, background: 'var(--line, #1e293b)', overflow: 'hidden', maxWidth: 320 }}>
              <div style={{ width: `${Math.round((bulk.done / bulk.total) * 100)}%`, height: '100%', background: 'var(--accent, #22c55e)', transition: 'width .3s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Abas: Pendentes / Lixeira */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '4px 0 12px' }}>
        <button type="button" className={`a-btn sm ${tab === 'open' ? 'blue' : 'ghost'}`} onClick={() => switchTab('open')} disabled={busy}>
          💡 Pendentes ({open.length})
        </button>
        <button type="button" className={`a-btn sm ${tab === 'trash' ? 'danger' : 'ghost'}`} onClick={() => switchTab('trash')} disabled={busy}>
          <Icon name="trash" size={14} /> Lixeira ({trash.length})
        </button>
      </div>

      {/* Barra de ações em massa */}
      {list.length > 0 && (
        <div className="a-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.7rem 1rem', marginBottom: 12, position: 'sticky', top: 8, zIndex: 5 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? clearSel() : setSelected(new Set(list.map((i) => i.id))))}
              disabled={busy}
              style={{ width: 18, height: 18 }}
            />
            Selecionar todas
          </label>
          <span className="muted">{selected.size} selecionada(s)</span>
          <div style={{ flex: 1 }} />
          {tab === 'open' ? (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }} title="Se desmarcado, os artigos ficam como rascunho para revisão">
                <input type="checkbox" checked={publishDirect} onChange={(e) => setPublishDirect(e.target.checked)} disabled={busy} style={{ width: 16, height: 16 }} />
                Publicar direto
              </label>
              <button type="button" className="a-btn green sm" disabled={!selected.size || busy || !aiOn} onClick={bulkApprove}>
                <Icon name="check" size={15} />{publishDirect ? 'Escrever e publicar' : 'Aprovar e escrever'} ({selected.size})
              </button>
              <button type="button" className="a-btn danger sm" disabled={!selected.size || busy} onClick={() => bulkStatus('rejected')}>
                <Icon name="trash" size={15} />Mover para lixeira ({selected.size})
              </button>
            </>
          ) : (
            <>
              <button type="button" className="a-btn blue sm" disabled={!selected.size || busy} onClick={() => bulkStatus('suggested')}>
                ↩ Restaurar ({selected.size})
              </button>
              <button type="button" className="a-btn danger sm" disabled={!selected.size || busy} onClick={bulkDeleteForever}>
                <Icon name="x" size={15} />Excluir definitivamente ({selected.size})
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'open' && open.length === 0 && !gen && (
        <div className="a-card a-empty"><div className="big">💡</div><p>Nenhuma ideia pendente.<br />Clique em <b>Sugerir pautas</b> para receber sugestões.</p></div>
      )}
      {tab === 'trash' && trash.length === 0 && (
        <div className="a-card a-empty"><div className="big">🗑️</div><p>A lixeira está vazia.</p></div>
      )}

      {tab === 'trash' && trash.map((i) => (
        <article className="idea" key={i.id}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} disabled={busy} style={{ width: 18, height: 18, marginTop: 4, flexShrink: 0 }} aria-label={`Selecionar ${i.title}`} />
            <div>
              <div className="meta"><span className="a-badge off">Na lixeira</span><span className="a-badge scheduled">{catName(i.category_slug)}</span></div>
              <h3>{i.title}</h3>
              {i.angle && <p>{i.angle}</p>}
            </div>
          </div>
          <div className="side">
            <button className="a-btn blue" disabled={busy} onClick={() => bulkStatus('suggested', [i.id])}>↩ Restaurar</button>
          </div>
        </article>
      ))}

      {tab === 'open' && open.map((i, idx) => (
        <article className="idea" key={i.id} style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} disabled={busy || i.status === 'writing'} style={{ width: 18, height: 18, marginTop: 4, flexShrink: 0 }} aria-label={`Selecionar ${i.title}`} />
          <div>
            <div className="meta">
              <span className={`a-badge ${STATUS[i.status]?.[1] || 'draft'}`}>{STATUS[i.status]?.[0] || i.status}</span>
              <span className="a-badge scheduled">{catName(i.category_slug)}</span>
              {i.focus_keyword && <span className="a-badge draft">🔑 {i.focus_keyword}</span>}
            </div>
            <h3>{i.title}</h3>
            {i.angle && <p>{i.angle}</p>}
            {i.search_intent && <p><b>Intenção de busca:</b> {i.search_intent}</p>}
            {i.status === 'failed' && i.error && <div className="a-note err" style={{ margin: '8px 0' }}>{i.error}</div>}
            {(i.outline?.length > 0 || i.reasoning) && (
              <details>
                <summary>Ver estrutura e justificativa</summary>
                {i.outline?.length > 0 && <ul>{i.outline.map((o) => <li key={o}>{o}</li>)}</ul>}
                {i.reasoning && <p style={{ marginTop: 8 }}><b>Por que vale a pena:</b> {i.reasoning}</p>}
              </details>
            )}
          </div>
          </div>
          <div className="side">
            <button className="a-btn green" disabled={busy || !aiOn || i.status === 'writing'} onClick={() => approve(i)}>
              {i.status === 'writing' ? <><Spin />Escrevendo…</> : <><Icon name="check" size={16} />{i.status === 'failed' ? 'Tentar de novo' : 'Aprovar e escrever'}</>}
            </button>
            <button className="a-btn ghost" disabled={busy} onClick={() => setEdit({ id: i.id, title: i.title, focus_keyword: i.focus_keyword || '', angle: i.angle || '', category_slug: i.category_slug || '' })}><Icon name="edit" size={15} />Ajustar ideia</button>
            <button className="a-btn danger" disabled={busy} onClick={() => reject(i)}><Icon name="trash" size={15} />Lixeira</button>
          </div>
        </article>
      ))}

      {done.length > 0 && (
        <section className="a-card" style={{ marginTop: 24 }}>
          <h3>Já viraram artigo</h3>
          {done.map((i) => (
            <div key={i.id} className="a-row between" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <span>{i.title}</span>
              {i.post_id ? <a className="a-btn ghost sm" href={`/admin/posts/${i.post_id}/`}>Abrir artigo</a> : <span className="muted">artigo removido</span>}
            </div>
          ))}
        </section>
      )}

      {edit && (
        <div className="a-modal" role="dialog" aria-modal="true" aria-label="Ajustar ideia" onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <form className="a-card" onSubmit={saveEdit}>
            <h3>Ajustar ideia</h3><p className="sub">Altere o que quiser antes de pedir à IA para escrever.</p>
            <div className="a-field"><label htmlFor="e1">Título</label><input id="e1" className="a-input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required /></div>
            <div className="a-field"><label htmlFor="e2">Palavra-chave principal</label><input id="e2" className="a-input" value={edit.focus_keyword} onChange={(e) => setEdit({ ...edit, focus_keyword: e.target.value })} /></div>
            <div className="a-field"><label htmlFor="e3">Ângulo / instruções para a IA</label><textarea id="e3" className="a-textarea" rows={4} value={edit.angle} onChange={(e) => setEdit({ ...edit, angle: e.target.value })} /></div>
            <div className="a-field"><label htmlFor="e4">Categoria</label>
              <select id="e4" className="a-select" value={edit.category_slug} onChange={(e) => setEdit({ ...edit, category_slug: e.target.value })}>
                <option value="">Sem categoria</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select></div>
            <div className="a-row end"><button type="button" className="a-btn ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="a-btn blue">Salvar</button></div>
          </form>
        </div>
      )}

      {instantOpen && (
        <div
          className="a-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Gerar Artigo Automático"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !generatingInstant) setInstantOpen(false);
          }}
        >
          <form className="a-card" onSubmit={generateInstantArticle} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h3 style={{ margin: 0 }}>Gerador Automático de Artigo</h3>
            </div>
            <p className="sub" style={{ marginBottom: 16 }}>
              A IA vai pesquisar, estruturar e redigir um artigo completo otimizado para SEO baseado na identidade e treinamento da empresa.
            </p>

            {isSuperAdmin && tenants.length > 0 && (
              <div className="a-field">
                <label htmlFor="inst-tenant">Empresa Destino</label>
                <select
                  id="inst-tenant"
                  className="a-select"
                  value={instantForm.tenantId}
                  onChange={(e) => setInstantForm({ ...instantForm, tenantId: e.target.value })}
                  disabled={generatingInstant}
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="a-field">
              <label htmlFor="inst-topic">
                Tema / Pauta do Artigo <span style={{ color: 'var(--red, #e53e3e)' }}>*</span>
              </label>
              <input
                id="inst-topic"
                className="a-input"
                placeholder="Ex: Como a inteligência artificial reduz custos operacionais em 2026"
                value={instantForm.topic}
                onChange={(e) => setInstantForm({ ...instantForm, topic: e.target.value })}
                required
                disabled={generatingInstant}
              />
              <span className="muted" style={{ fontSize: '0.8rem', marginTop: 4, display: 'block' }}>
                Deixe bem específico ou adicione tópicos chave que você gostaria que fossem abordados.
              </span>
            </div>

            <div className="a-field">
              <label htmlFor="inst-cat">Categoria do Blog</label>
              <select
                id="inst-cat"
                className="a-select"
                value={instantForm.category_slug}
                onChange={(e) => setInstantForm({ ...instantForm, category_slug: e.target.value })}
                disabled={generatingInstant}
              >
                <option value="">Automática / Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="a-field">
              <label htmlFor="inst-cover">🎨 Prompt de Contexto da Capa (opcional)</label>
              <textarea
                id="inst-cover"
                rows={2}
                className="a-input"
                placeholder="Ex: Fotografia executiva contemporânea em ambiente de escritório inovador, iluminação suave, pessoas em reunião estratégica, tons azuis..."
                value={instantForm.cover_prompt || ''}
                onChange={(e) => setInstantForm({ ...instantForm, cover_prompt: e.target.value })}
                disabled={generatingInstant}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
              />
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                Personalize o estilo visual da capa para este artigo. Se em branco, usará o treinamento da marca.
              </small>
            </div>

            <div className="a-field" style={{ marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={instantForm.publishImmediate}
                  onChange={(e) => setInstantForm({ ...instantForm, publishImmediate: e.target.checked })}
                  disabled={generatingInstant}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span>
                  <strong>Publicar imediatamente</strong> (se desmarcado, ficará como rascunho para você revisar)
                </span>
              </label>
            </div>

            {generatingInstant && (
              <div className="writing" style={{ margin: '14px 0' }} role="status">
                <div className="ai-orb" />
                <div>
                  <strong>A IA está redigindo o artigo completo…</strong>
                  <br />
                  <span className="muted">Isso pode levar de 30 a 60 segundos. Não recarregue a página.</span>
                </div>
              </div>
            )}

            <div className="a-row end" style={{ gap: '0.5rem', marginTop: 16 }}>
              <button
                type="button"
                className="a-btn ghost"
                onClick={() => setInstantOpen(false)}
                disabled={generatingInstant}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="a-btn primary"
                disabled={generatingInstant || !instantForm.topic.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
              >
                {generatingInstant ? (
                  <>
                    <Spin /> Escrevendo com IA…
                  </>
                ) : (
                  <>
                    <Icon name="spark" size={16} /> Gerar Artigo Agora
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
