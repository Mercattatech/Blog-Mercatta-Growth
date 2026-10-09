import Link from 'next/link';
import { requireUser } from '@/lib/guard.js';
import { adminCounts, adminListPosts } from '@/lib/posts.js';
import { aiConfigured } from '@/lib/ai.js';
import { mailConfigured } from '@/lib/mail.js';
import { dbKind } from '@/lib/db.js';
import { Icon } from '@/components/admin/ui.js';
import { StatusBadge, dt } from '@/components/admin/Badges.js';

export const metadata = { title: 'Visão geral' };

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const [counts, pending, recent] = await Promise.all([
    adminCounts(user),
    isAdmin ? adminListPosts({ user, status: 'pending', limit: 5 }) : { rows: [] },
    adminListPosts({ user, limit: 6 }),
  ]);
  const stats = [
    { n: counts.draft, label: 'Rascunhos', icon: 'edit', tone: '#6b7a9e', href: '?status=draft' },
    { n: counts.pending, label: 'Aguardando aprovação', icon: 'clock', tone: '#e6a800', href: '?status=pending' },
    { n: counts.scheduled, label: 'Agendados', icon: 'send', tone: '#1b56b5', href: '?status=scheduled' },
    { n: counts.published, label: 'Publicados', icon: 'check', tone: '#3b9c46', href: '?status=published' },
  ];
  const warnings = [];
  if (isAdmin && !aiConfigured()) warnings.push('A IA ainda não está ativa: defina GEMINI_API_KEY no arquivo .env.local (ou nas variáveis da Vercel) para gerar ideias e artigos.');
  if (isAdmin && !mailConfigured()) warnings.push('E-mail (SMTP) não configurado: os links de redefinição de senha aparecem no terminal do servidor (modo de teste).');
  if (isAdmin && (await dbKind()) === 'pglite') warnings.push('Usando o banco local de desenvolvimento. Em produção, configure DATABASE_URL (Postgres).');

  return (
    <>
      <div className="adm-head">
        <div><h2>Olá, {user.name.split(' ')[0]} 👋</h2><p>{isAdmin ? 'Resumo do blog e do que precisa da sua atenção.' : 'Seus artigos e o status de cada um.'}</p></div>
        <div className="a-row">
          {isAdmin && <Link className="a-btn blue" href="/admin/ideas/"><Icon name="spark" size={17} />Gerar ideias com IA</Link>}
          <Link className="a-btn primary" href="/admin/posts/new/"><Icon name="plus" size={17} />Escrever artigo</Link>
        </div>
      </div>

      {user.role === 'superadmin' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <strong style={{ fontSize: '1.05rem', color: '#60a5fa', display: 'block' }}>
              ⚡ Plataforma SaaS Grupo Mercatta — Modo Super Administrador
            </strong>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              Você tem acesso total para cadastrar novas empresas clientes, configurar domínios próprios e monitorar assinaturas.
            </span>
          </div>
          <Link href="/admin/tenants/" className="a-btn primary sm" style={{ textDecoration: 'none' }}>
            🏢 Gerenciar Empresas & Domínios →
          </Link>
        </div>
      )}

      {warnings.map((w) => <div key={w} className="a-note warn" style={{ marginBottom: 12 }}>⚠️ {w}</div>)}

      <div className="a-grid c4" style={{ margin: '18px 0 24px' }}>
        {stats.map((s) => (
          <Link key={s.label} href={`/admin/posts/${s.href}`} className="a-stat" style={{ '--tone': s.tone }}>
            <span className="ico"><Icon name={s.icon} size={22} /></span>
            <div><b>{s.n}</b><span>{s.label}</span></div>
          </Link>
        ))}
      </div>

      <div className="a-grid c2" style={{ alignItems: 'start' }}>
        {isAdmin && (
          <section className="a-card">
            <h3>Aguardando sua aprovação</h3>
            <p className="sub">Artigos enviados pelos autores para revisão.</p>
            {pending.rows.length === 0 ? <div className="a-empty" style={{ padding: 24 }}>Nada pendente. 🎉</div> : pending.rows.map((p) => (
              <Link key={p.id} href={`/admin/posts/${p.id}/`} className="a-row between nw" style={{ gap: 16, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                <span><b>{p.title}</b><br /><small className="muted">por {p.author_name || '—'} · {dt(p.updated_at)}</small></span>
                <StatusBadge post={p} />
              </Link>
            ))}
          </section>
        )}
        <section className="a-card" style={isAdmin ? undefined : { gridColumn: '1 / -1' }}>
          <h3>Atividade recente</h3>
          <p className="sub">Últimos artigos editados.</p>
          {recent.rows.length === 0 ? <div className="a-empty" style={{ padding: 24 }}>Nenhum artigo ainda. Comece escrevendo o primeiro!</div> : recent.rows.map((p) => (
            <Link key={p.id} href={`/admin/posts/${p.id}/`} className="a-row between nw" style={{ gap: 16, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <span><b>{p.title}</b><br /><small className="muted">{dt(p.updated_at)}</small></span>
              <StatusBadge post={p} />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
