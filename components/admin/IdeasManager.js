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
    try { await api(`/api/admin/ideas/${idea.id}/`, { method: 'PATCH', data: { status: 'rejected' } }); setIdeas((cur) => cur.filter((i) => i.id !== idea.id)); toast('Ideia descartada. A IA vai evitar temas parecidos.'); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function saveEdit(e) {
    e.preventDefault();
    try {
      const r = await api(`/api/admin/ideas/${edit.id}/`, { method: 'PATCH', data: edit });
      setIdeas((cur) => cur.map((i) => (i.id === edit.id ? { ...i, ...r.idea } : i))); setEdit(null); toast('Ideia atualizada.');
    } catch (err) { toast(err.message, 'err'); }
  }

  const open = ideas.filter((i) => i.status !== 'written');
  const done = ideas.filter((i) => i.status === 'written');

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

      {(writing > 0 || gen) && (
        <div className="writing" role="status" aria-live="polite">
          <div className="ai-orb" />
          <div><strong>{writing ? 'A IA está escrevendo o artigo…' : 'A IA está pesquisando boas pautas…'}</strong><br /><span className="muted">Pode levar de 20 a 90 segundos. Não feche esta página.</span></div>
        </div>
      )}

      {open.length === 0 && !gen && (
        <div className="a-card a-empty"><div className="big">💡</div><p>Nenhuma ideia pendente.<br />Clique em <b>Gerar novas ideias</b> para receber sugestões.</p></div>
      )}

      {open.map((i, idx) => (
        <article className="idea" key={i.id} style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}>
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
          <div className="side">
            <button className="a-btn green" disabled={!!writing || gen || !aiOn || i.status === 'writing'} onClick={() => approve(i)}>
              {i.status === 'writing' ? <><Spin />Escrevendo…</> : <><Icon name="check" size={16} />{i.status === 'failed' ? 'Tentar de novo' : 'Aprovar e escrever'}</>}
            </button>
            <button className="a-btn ghost" disabled={!!writing} onClick={() => setEdit({ id: i.id, title: i.title, focus_keyword: i.focus_keyword || '', angle: i.angle || '', category_slug: i.category_slug || '' })}><Icon name="edit" size={15} />Ajustar ideia</button>
            <button className="a-btn danger" disabled={!!writing} onClick={() => reject(i)}><Icon name="x" size={15} />Descartar</button>
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
