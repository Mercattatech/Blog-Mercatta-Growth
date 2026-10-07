'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, Icon } from './ui.js';

const NAV = [
  { href: '/admin/', label: 'Visão geral', icon: 'dash', exact: true },
  { href: '/admin/posts/', label: 'Artigos', icon: 'doc' },
  { href: '/admin/posts/new/', label: 'Novo artigo', icon: 'plus' },
  { href: '/admin/ideas/', label: 'Ideias com IA', icon: 'spark', admin: true, badge: 'pending_ideas' },
  { href: '/admin/training/', label: 'Treinar a IA', icon: 'brain', admin: true },
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
  const isActive = (n) => (n.exact ? path === n.href : n.href === '/admin/posts/' ? path.startsWith('/admin/posts') && !path.startsWith('/admin/posts/new') : path.startsWith(n.href));
  const isAdmin = user.role === 'admin';

  return (
    <div className={`adm${open ? ' open' : ''}`}>
      <aside className="adm-side" aria-label="Menu do painel">
        <div className="adm-brand">
          <img src="/img/logo.png" alt="" width="52" height="38" />
          <div><strong>Blog Braziw</strong><small>Painel</small></div>
        </div>
        <nav>
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
          <a className="adm-link" href="/" target="_blank" rel="noopener"><Icon name="globe" />Ver o blog</a>
        </nav>
        <div className="adm-side-foot">
          <div className="adm-user">
            <div className="adm-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div><b>{user.name}</b><small>{isAdmin ? 'Administrador' : 'Autor'}</small></div>
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
        <main className="adm-content">{children}</main>
      </div>
      {open && <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.45)', border: 0 }} />}
    </div>
  );
}
