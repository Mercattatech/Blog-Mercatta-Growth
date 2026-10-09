'use client';
import { useState } from 'react';
import { api, toast, useBusy, Icon, Spin } from './ui.js';

export default function SeoTagsManager({ initialData }) {
  const [data, setData] = useState(initialData || {});
  const [busy, run] = useBusy();
  const [indexLog, setIndexLog] = useState(null);

  const handleSave = () => run('save', async () => {
    await api('/api/admin/seo-tags/', { method: 'POST', data });
    toast('Configurações de Tags e Google salvas com sucesso!', 'ok');
  });

  const handleIndexAll = () => run('index_all', async () => {
    if (!data.google_service_account_json) {
      toast('Insira o JSON da Conta de Serviço do Google antes de enviar.', 'err');
      return;
    }
    setIndexLog(null);
    const res = await api('/api/admin/seo-tags/', {
      method: 'POST',
      data: { action: 'index_all' },
    });
    setIndexLog(res);
    toast(`Sucesso! ${res.success_count} páginas notificadas ao Google.`, 'ok');
  });

  return (
    <div className="a-box" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="a-box-h">
        <h2>🔍 SEO, Google Search & Tags de Rastreamento</h2>
        <p className="a-sub">
          Conecte o Google Search Console para indexação orgânica imediata e instale Google Tag Manager, Google Analytics e Pixels.
        </p>
      </div>

      {/* SEÇÃO 1: GOOGLE SEARCH CONSOLE */}
      <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.75rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#60a5fa', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="globe" size={20} /> Google Search Console & Indexing API
            </h3>
            <p className="a-sub" style={{ margin: 0, fontSize: '0.85rem' }}>
              Notifica os robôs do Google automaticamente em tempo real para indexar seus artigos com máxima autoridade orgânica.
            </p>
          </div>
          {data.last_google_indexing_at && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
              Último envio: {new Date(data.last_google_indexing_at).toLocaleDateString('pt-BR')} às {new Date(data.last_google_indexing_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <strong>Passo a passo rápido:</strong>
          <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
            <li>No <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Google Cloud Console</a>, ative a <strong>Web Search Indexing API</strong>.</li>
            <li>Crie uma Conta de Serviço (Service Account), baixe a chave em formato <strong>JSON</strong> e cole o conteúdo abaixo.</li>
            <li>No <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Google Search Console</a>, adicione o e-mail da conta de serviço como <strong>Proprietário (Owner)</strong> da propriedade do blog.</li>
          </ol>
        </div>

        <div className="a-grid a-grid-1" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="a-label">JSON da Conta de Serviço Google (Service Account Key)</label>
            <textarea
              rows={4}
              className="a-input"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
              value={data.google_service_account_json || ''}
              onChange={(e) => setData({ ...data, google_service_account_json: e.target.value })}
            />
          </div>

          <div>
            <label className="a-label">URL da Propriedade no Search Console (opcional)</label>
            <input
              type="text"
              className="a-input"
              placeholder="https://meublog.com.br"
              value={data.google_search_console_property || ''}
              onChange={(e) => setData({ ...data, google_search_console_property: e.target.value })}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#e2e8f0' }}>
            <input
              type="checkbox"
              checked={data.google_auto_index !== false}
              onChange={(e) => setData({ ...data, google_auto_index: e.target.checked })}
            />
            Notificar o Google automaticamente sempre que um artigo for gerado ou publicado
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy === 'index_all'}
            onClick={handleIndexAll}
            style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#93c5fd' }}
          >
            {busy === 'index_all' ? <><Spin /> Enviando Artigos ao Google...</> : '🚀 Enviar Todos os Artigos para o Google Search Console Agora'}
          </button>
        </div>

        {indexLog && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#090d16', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontWeight: 'bold', color: indexLog.fail_count ? '#f59e0b' : '#10b981', marginBottom: '0.5rem' }}>
              Relatório de Indexação: {indexLog.success_count} enviadas com sucesso {indexLog.fail_count > 0 && `(${indexLog.fail_count} erros)`}
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              {(indexLog.details || []).map((d, i) => (
                <div key={i} style={{ color: d.status === 'ok' ? '#a7f3d0' : '#fca5a5', padding: '0.2rem 0' }}>
                  {d.status === 'ok' ? '✓' : '✗'} {d.url} {d.error ? `(${d.error})` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GOOGLE TAG MANAGER & GOOGLE ANALYTICS */}
      <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="tag" size={20} /> Tags de Rastreamento (Analytics & GTM)
        </h3>
        <p className="a-sub" style={{ marginBottom: '1.25rem' }}>
          Insira seus identificadores oficiais para monitorar acessos, conversões e tráfego orgânico do blog.
        </p>

        <div className="a-grid a-grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="a-label">Google Tag Manager (GTM ID)</label>
            <input
              type="text"
              className="a-input"
              placeholder="GTM-XXXXXXX"
              value={data.gtm_id || ''}
              onChange={(e) => setData({ ...data, gtm_id: e.target.value.trim() })}
            />
            <small className="a-sub">Exemplo: <code>GTM-M4K9XYZ</code>. Carregado no &lt;head&gt; e no início do &lt;body&gt;.</small>
          </div>

          <div>
            <label className="a-label">Google Analytics 4 (GA4 ID)</label>
            <input
              type="text"
              className="a-input"
              placeholder="G-XXXXXXXXXX"
              value={data.ga_id || ''}
              onChange={(e) => setData({ ...data, ga_id: e.target.value.trim() })}
            />
            <small className="a-sub">Exemplo: <code>G-ABC123XYZ</code> (Global Site Tag gtag.js oficial).</small>
          </div>
        </div>

        <div className="a-grid a-grid-1" style={{ gap: '1rem' }}>
          <div>
            <label className="a-label">Scripts Customizados no &lt;head&gt; (Pixel da Meta, Clarity, etc.)</label>
            <textarea
              rows={3}
              className="a-input"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              placeholder="<!-- Scripts adicionais injetados antes do fechamento de </head> -->"
              value={data.custom_head_scripts || ''}
              onChange={(e) => setData({ ...data, custom_head_scripts: e.target.value })}
            />
          </div>

          <div>
            <label className="a-label">Scripts Customizados no &lt;body&gt; (Noscript, Chatbots, etc.)</label>
            <textarea
              rows={3}
              className="a-input"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              placeholder="<!-- Scripts injetados logo após a abertura de <body> -->"
              value={data.custom_body_scripts || ''}
              onChange={(e) => setData({ ...data, custom_body_scripts: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minWidth: '180px' }}
          disabled={busy === 'save'}
          onClick={handleSave}
        >
          {busy === 'save' ? <><Spin /> Salvando...</> : 'Salvar Todas as Configurações'}
        </button>
      </div>
    </div>
  );
}
