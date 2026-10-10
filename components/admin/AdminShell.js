'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, Icon } from './ui.js';

const NAV = [
  { href: '/admin/', label: 'Visão geral', icon: 'dash', exact: true },
  { href: '/admin/posts/', label: 'Artigos', icon: 'doc' },
  { href: '/admin/posts/new/', label: 'Novo artigo', icon: 'plus' },
  { href: '/admin/categories/', label: 'Categorias', icon: 'tag' },
  { href: '/admin/posts/?status=trash', label: 'Lixeira Universal', icon: 'trash' },
  { href: '/admin/schedule/', label: 'Automação & Lotes', icon: 'clock', admin: true },
  { href: '/admin/ideas/', label: 'Ideias com IA', icon: 'spark', admin: true, badge: 'pending_ideas' },
  { href: '/admin/training/', label: 'Treinar a IA', icon: 'brain', admin: true },
  { href: '/admin/appearance/', label: 'Cores & Aparência', icon: 'palette', admin: true },
  { href: '/admin/seo-tags/', label: 'SEO, Google & Tags', icon: 'globe', admin: true },
  { href: '/admin/whatsapp-flow/', label: 'WhatsApp Flow ⭐', icon: 'chat', admin: true },
  { href: '/admin/mcp/', label: 'Conexão MCP (IA)', icon: 'terminal', admin: true },
  { href: '/admin/users/', label: 'Usuários', icon: 'users', admin: true },
  { href: '/admin/profile/', label: 'Meu perfil', icon: 'user' },
];

export default function AdminShell({ user, pending = 0, children }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const toggleTheme = () => {
    const el = document.documentElement;
    const next = el.dataset.theme === 'dark' ? 'light' : 'dark';
    el.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  };
  async function logout() {
    await api('/api/auth/logout/', { method: 'POST' }).catch(() => {});
    window.location.href = '/admin/login/';
  }
  async function exitImpersonation() {
    await api('/api/admin/impersonate/', { method: 'DELETE' }).catch(() => {});
    window.location.href = '/admin/tenants/';
  }
  const isActive = (n) => (n.exact ? path === n.href : n.href === '/admin/posts/' ? (path.startsWith('/admin/posts') && !path.startsWith('/admin/posts/new') && !path.includes('status=trash')) : path.startsWith(n.href));
  const isSuper = user.role === 'superadmin'
    || (user.role === 'admin' && (user.email === 'admin@grupomercatta.com.br' || user.tenant_id === 1 || user.tenant?.slug === 'mercatta'));
  const isAdmin = user.role === 'admin' || isSuper;

  const tenantName = user.tenant?.name || (isSuper ? 'Grupo Mercatta' : 'Blog Corporativo');
  const tenantLogo = user.tenant?.logo_url || null;

  return (
    <div className={`adm${open ? ' open' : ''}`}>
      <aside className="adm-side" aria-label="Menu do painel">
        <div className="adm-brand">
          {tenantLogo ? (
            <img src={tenantLogo} alt="" width="48" height="36" style={{ objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: user.tenant?.primary_color || (isSuper ? '#3b82f6' : '#2563eb'),
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              {tenantName.slice(0, 1)}
            </div>
          )}
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tenantName}
            </strong>
            <small>{isSuper ? 'Mercatta SaaS' : 'Painel do Blog'}</small>
          </div>
        </div>
        <nav>
          {isSuper && (
            <>
              <div className="adm-nav-label" style={{ color: '#60a5fa' }}>⚡ Multi-Tenant SaaS</div>
              <Link
                href="/admin/tenants/"
                className={`adm-link${path.startsWith('/admin/tenants') ? ' is-active' : ''}`}
                style={{ background: path.startsWith('/admin/tenants') ? 'rgba(59, 130, 246, 0.2)' : undefined }}
              >
                <Icon name="globe" />Empresas & Domínios
              </Link>
            </>
          )}

          <div className="adm-nav-label">Conteúdo</div>
          {NAV.filter((n) => !n.admin && n.href !== '/admin/profile/').map((n) => (
            <Link key={n.href} href={n.href} className={`adm-link${isActive(n) ? ' is-active' : ''}`}><Icon name={n.icon} />{n.label}</Link>
          ))}

          {isAdmin && <div className="adm-nav-label">Inteligência & gestão</div>}
          {isAdmin && NAV.filter((n) => n.admin).map((n) => (
            <Link key={n.href} href={n.href} className={`adm-link${isActive(n) ? ' is-active' : ''}`}>
              <Icon name={n.icon} />{n.label}{n.badge && pending > 0 ? <span className="count" title="Artigos aguardando aprovação">{pending}</span> : null}
            </Link>
          ))}

          <div className="adm-nav-label">Conta</div>
          <Link href="/admin/profile/" className={`adm-link${path.startsWith('/admin/profile') ? ' is-active' : ''}`}><Icon name="user" />Meu perfil</Link>
          <a className="adm-link" href={user.tenant?.slug && user.tenant.slug !== 'mercatta' ? `/?tenant=${user.tenant.slug}` : '/'} target="_blank" rel="noopener">
            <Icon name="globe" />Ver o blog
          </a>
        </nav>
        <div className="adm-side-foot">
          <div className="adm-user">
            <div className="adm-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div><b>{user.name}</b><small>{isSuper ? 'Super Admin' : (user.role === 'admin' ? 'Administrador' : 'Autor')}</small></div>
          </div>
          <button className="adm-logout" type="button" onClick={logout}><Icon name="out" size={17} />Sair</button>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <button className="a-btn ghost sm adm-burger" type="button" onClick={() => setOpen(!open)} aria-label="Abrir menu"><Icon name="menu" size={18} /></button>
          <span className="sp" />
          {pending > 0 && isAdmin && <Link className="a-badge pending" href="/admin/posts/?status=pending">{pending} aguardando aprovação</Link>}
          <button className="a-btn ghost sm" type="button" onClick={toggleTheme} aria-label="Alternar tema"><Icon name="moon" size={17} /></button>
          <Link className="a-btn primary sm" href="/admin/posts/new/"><Icon name="plus" size={16} />Novo artigo</Link>
        </header>

        {user.is_impersonating && (
          <div style={{
            background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🏢</span>
              <span>
                <strong>Modo Acesso Direto (Sem Senha):</strong> Você está no painel de <u>{user.tenant?.name || 'Cliente'}</u>.
              </span>
            </div>
            <button
              type="button"
              onClick={exitImpersonation}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s',
              }}
            >
              ← Voltar para Gestão Geral de Empresas
            </button>
          </div>
        )}

        <main className="adm-content">{children}</main>
      </div>
      {open && <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.45)', border: 0 }} />}
    </div>
  );
}
