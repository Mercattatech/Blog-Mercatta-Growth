'use client';
import { useState } from 'react';
import { api, toast, useBusy, Icon, Spin } from './ui.js';

export default function McpManager({ tenant }) {
  const [key, setKey] = useState(tenant?.mcp_api_key || '');
  const [copied, setCopied] = useState('');
  const [busy, run] = useBusy();

  const handleCopy = (text, tag) => {
    navigator.clipboard.writeText(text);
    setCopied(tag);
    toast('Copiado para a área de transferência!', 'ok');
    setTimeout(() => setCopied(''), 2500);
  };

  const handleRegenerate = () => run('regen', async () => {
    if (!confirm('Deseja realmente gerar uma nova chave MCP? As IAs conectadas anteriormente precisarão ser atualizadas.')) return;
    const res = await api('/api/admin/mcp/regenerate/', { method: 'POST' });
    setKey(res.mcp_api_key);
    toast('Nova chave MCP gerada com sucesso!', 'ok');
  });

  const cursorJson = JSON.stringify({
    mcpServers: {
      [`mercatta_${tenant?.slug || 'blog'}`]: {
        url: typeof window !== 'undefined' ? `${window.location.origin}/api/mcp?key=${key}` : `http://localhost:3100/api/mcp?key=${key}`,
      },
    },
  }, null, 2);

  const claudeDesktopJson = JSON.stringify({
    mcpServers: {
      [`mercatta_${tenant?.slug || 'blog'}`]: {
        command: 'npx',
        args: ['-y', 'mcp-remote-client', typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : `http://localhost:3100/api/mcp`, key],
      },
    },
  }, null, 2);

  return (
    <div className="a-box" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="a-box-h">
        <h2>⚡ Conexão MCP (Model Context Protocol)</h2>
        <p className="a-sub">
          Conecte sua IA externa favorita (Claude Desktop, Cursor, ChatGPT, Antigravity) para comandar todo o seu blog via linguagem natural.
        </p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="brain" size={18} /> O que sua IA Externa pode fazer pelo blog:
        </h4>
        <div className="a-grid a-grid-2" style={{ gap: '0.75rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
          <div>✍️ <strong>Criar artigos completos</strong> com capas temáticas e logotipo</div>
          <div>✏️ <strong>Editar e revisar</strong> publicações e rascunhos existentes</div>
          <div>🗑️ <strong>Excluir ou restaurar</strong> artigos da lixeira</div>
          <div>🏆 <strong>Saber qual artigo foi mais lido</strong> e ranking de audiência</div>
          <div>📈 <strong>Curva de crescimento e analíticos</strong> dos últimos 30 dias</div>
          <div>💡 <strong>Pensar como gestor:</strong> sugerir pautas para gaps de conteúdo</div>
          <div>🔍 <strong>Auditar a saúde de SEO</strong> de todos os artigos</div>
          <div>📅 <strong>Disparar lotes automáticos</strong> agendados com 1 comando</div>
        </div>
      </div>

      <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <label className="a-label">Sua Chave de API MCP (Privada do Blog {tenant?.name})</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value={key}
            className="a-input"
            style={{ fontFamily: 'monospace', fontWeight: 'bold', background: 'rgba(0,0,0,0.25)', color: '#38bdf8' }}
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleCopy(key, 'key')}
          >
            {copied === 'key' ? '✓ Copiado' : 'Copiar Chave'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy === 'regen'}
            onClick={handleRegenerate}
            title="Gera um novo token e invalida o anterior"
          >
            {busy === 'regen' ? <Spin /> : 'Regenerar'}
          </button>
        </div>
        <small className="a-sub">Esta chave dá acesso de administração via MCP apenas ao blog da sua empresa.</small>
      </div>

      <div className="a-grid a-grid-2" style={{ gap: '1.5rem' }}>
        <div className="a-card" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="link" size={18} /> Configuração no Cursor IDE
          </h3>
          <p className="a-sub" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            No Cursor, abra <strong>Settings &gt; Features &gt; MCP</strong> ou adicione no arquivo <code>.cursor/mcp.json</code>:
          </p>
          <pre style={{ background: '#090d16', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto', color: '#93c5fd' }}>
            {cursorJson}
          </pre>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginTop: '0.5rem', width: '100%' }}
            onClick={() => handleCopy(cursorJson, 'cursor')}
          >
            {copied === 'cursor' ? '✓ Configuração Copiada!' : 'Copiar JSON para o Cursor'}
          </button>
        </div>

        <div className="a-card" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="terminal" size={18} /> Configuração no Claude Desktop
          </h3>
          <p className="a-sub" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Adicione ao seu arquivo <code>claude_desktop_config.json</code>:
          </p>
          <pre style={{ background: '#090d16', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto', color: '#a7f3d0' }}>
            {claudeDesktopJson}
          </pre>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginTop: '0.5rem', width: '100%' }}
            onClick={() => handleCopy(claudeDesktopJson, 'claude')}
          >
            {copied === 'claude' ? '✓ Configuração Copiada!' : 'Copiar JSON para Claude Desktop'}
          </button>
        </div>
      </div>
    </div>
  );
}
