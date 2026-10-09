'use client';
import { useEffect, useState } from 'react';
import { api, Icon, Spin, toast } from './ui.js';

const FIELDS = [
  ['objective', 'Objetivo do blog', 'Qual o propósito do blog e o que ele deve gerar para o negócio?', 4],
  ['audience', 'Público-alvo', 'Quem é o leitor? Idade, interesses, nível de conhecimento…', 3],
  ['tone', 'Tom de voz', 'Como a IA deve escrever? Formal, descontraído, didático…', 3],
  ['themes', 'Temas do blog', 'Assuntos sobre os quais o blog escreve.', 3],
  ['keywords', 'Palavras-chave prioritárias', 'Termos que importam para o negócio (separados por vírgula).', 3],
  ['forbidden', 'O que NÃO fazer / temas proibidos', 'Assuntos e práticas que a IA nunca deve usar.', 3],
  ['style_rules', 'Regras de estilo e estrutura', 'Tamanho de parágrafos, uso de listas, exemplos, etc.', 4],
  ['cta', 'Chamada para ação (CTA)', 'Como encerrar os artigos e para onde levar o leitor.', 3],
  ['brand_facts', 'Fatos da marca', 'Informações verdadeiras sobre a empresa que a IA pode citar.', 3],
  ['extra', 'Instruções extras (opcional)', 'Qualquer outra orientação para ideias e artigos.', 3],
];

export default function TrainingForm({ initial, refs: initialRefs, aiOn, model }) {
  const [t, setT] = useState(initial);
  const [refs, setRefs] = useState(initialRefs);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [refiningField, setRefiningField] = useState('');
  const set = (k, v) => { setT((s) => ({ ...s, [k]: v })); setDirty(true); };

  const handleRefineField = async (k, label) => {
    if (!aiOn) return toast('A chave GEMINI_API_KEY não está configurada.', 'err');
    setRefiningField(k);
    try {
      const res = await api('/api/admin/training/refine/', {
        method: 'POST',
        data: {
          fieldKey: k,
          fieldLabel: label,
          currentValue: t[k] || '',
          currentTraining: t,
        },
      });
      if (res.refined) {
        set(k, res.refined);
        toast(`✨ Campo "${label}" aprimorado com sucesso!`);
      }
    } catch (err) {
      toast(err.message || 'Erro ao aprimorar campo.', 'err');
    } finally {
      setRefiningField('');
    }
  };

  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return undefined; }
    const h = setTimeout(() => api(`/api/admin/training/posts/?q=${encodeURIComponent(q.trim())}`).then((r) => setFound(r.posts)).catch(() => {}), 250);
    return () => clearTimeout(h);
  }, [q]);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try { await api('/api/admin/training/', { method: 'PUT', data: { ...t, reference_post_ids: refs.map((r) => r.id) } }); setDirty(false); toast('Treinamento salvo! As próximas ideias e artigos já usam estas regras.'); }
    catch (err) { toast(err.message, 'err'); } finally { setSaving(false); }
  }
  const addRef = (p) => { if (refs.length < 5 && !refs.some((r) => r.id === p.id)) { setRefs([...refs, p]); setDirty(true); } setQ(''); setFound([]); };

  return (
    <form onSubmit={save}>
      <div className="adm-head">
        <div>
          <h2>Treinar a IA</h2>
          <p>Ensine a IA sobre o seu blog. Use a 🪄 <b>Varinha Mágica</b> nos campos para a IA refinar e aprimorar suas ideias automaticamente!</p>
        </div>
        <button className="a-btn primary" disabled={saving}>{saving ? <Spin /> : <><Icon name="check" size={17} />Salvar treinamento</>}</button>
      </div>

      <div className={`a-note ${aiOn ? 'ok' : 'warn'}`} style={{ marginBottom: 18 }}>
        {aiOn ? <>✦ IA conectada (modelo <code>{model}</code>). Os artigos seguem as diretrizes do Google (conteúdo útil, E-E-A-T), SEO on-page completo e estrutura otimizada para buscadores com IA.</>
          : <>A chave da IA ainda não foi configurada. Você já pode preencher o treinamento; defina <code>GEMINI_API_KEY</code> para ativar a geração.</>}
      </div>

      <div className="a-grid c2" style={{ alignItems: 'start' }}>
        {FIELDS.map(([k, label, hint, rows]) => (
          <div className="a-card" key={k} style={{ margin: 0, position: 'relative' }}>
            <div className="a-field" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor={`t-${k}`} style={{ margin: 0, fontWeight: 700 }}>{label}</label>
                <button
                  type="button"
                  onClick={() => handleRefineField(k, label)}
                  disabled={refiningField === k || !aiOn}
                  title="A IA lê o que você escreveu e reformula de forma profissional e estratégica"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: refiningField === k ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#60a5fa',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: refiningField === k ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {refiningField === k ? <Spin /> : <span>🪄</span>}
                  <span>{refiningField === k ? 'Reformulando…' : 'Varinha Mágica'}</span>
                </button>
              </div>
              <textarea id={`t-${k}`} className="a-textarea" rows={rows} value={t[k] || ''} onChange={(e) => set(k, e.target.value)} maxLength={4000} />
              <span className="a-hint">{hint}</span>
            </div>
          </div>
        ))}

        <div className="a-card" style={{ margin: 0 }}>
          <h3>Parâmetros</h3>
          <div className="a-field" style={{ marginTop: 12 }}><label htmlFor="t-lang">Idioma</label><input id="t-lang" className="a-input" value={t.language} onChange={(e) => set('language', e.target.value)} maxLength={10} /></div>
          <div className="a-field"><label htmlFor="t-len">Tamanho do artigo (palavras)</label><input id="t-len" className="a-input" type="number" min={500} max={3000} step={100} value={t.article_length} onChange={(e) => set('article_length', e.target.value)} />
            <span className="a-hint">Entre 500 e 3.000. Artigos entre 1.000 e 1.800 palavras costumam equilibrar profundidade e leitura.</span></div>
          <div className="a-field" style={{ marginBottom: 0 }}><label htmlFor="t-n">Ideias por geração</label><input id="t-n" className="a-input" type="number" min={3} max={15} value={t.ideas_count} onChange={(e) => set('ideas_count', e.target.value)} /></div>
        </div>

        <div className="a-card" style={{ margin: 0 }}>
          <h3>Artigos de referência de estilo</h3>
          <p className="sub">Escolha até 5 artigos seus que representam bem a voz do blog. A IA imita o estilo, sem copiar trechos.</p>
          <div className="ref-list">
            {refs.map((r) => <div className="ref-opt" key={r.id}><span>{r.title}</span><button type="button" className="a-btn danger sm" onClick={() => { setRefs(refs.filter((x) => x.id !== r.id)); setDirty(true); }}>Remover</button></div>)}
          </div>
          {refs.length < 5 && (
            <div className="a-field" style={{ marginTop: 12, marginBottom: 0 }}>
              <input className="a-input" type="search" placeholder="Buscar artigo pelo título…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar artigo de referência" />
              <div className="ref-list">{found.map((p) => <button type="button" className="ref-opt" key={p.id} onClick={() => addRef(p)} style={{ border: 0, textAlign: 'left' }}><span>{p.title}</span><Icon name="plus" size={16} /></button>)}</div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
