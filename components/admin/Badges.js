// Utilitários de apresentação seguros para servidor e cliente.
const LABEL = { draft: 'Rascunho', pending: 'Aguardando aprovação', scheduled: 'Agendado', published: 'Publicado' };

export const dt = (v) => (v ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '—');

export function StatusBadge({ post }) {
  const s = post.display_status || post.status;
  return (
    <span className="a-row" style={{ gap: 6 }}>
      <span className={`a-badge ${s}`}>{LABEL[s] || s}</span>
      {post.ai_generated && <span className="a-badge ai" title="Escrito com IA">IA</span>}
    </span>
  );
}
