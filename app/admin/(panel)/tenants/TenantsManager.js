'use client';
import { useState, useRef } from 'react';
import { api, toast, useBusy, Icon } from '@/components/admin/ui.js';

export function TenantsManager({ initialTenants = [], initialMainTenantId = null }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [mainTenantId, setMainTenantId] = useState(
    initialMainTenantId ||
    (initialTenants.find((t) => t.custom_domain === 'news.grupomercatta.com.br')?.id) ||
    initialTenants[0]?.id
  );
  const [savingMainDomain, setSavingMainDomain] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [dnsResult, setDnsResult] = useState(null);
  const [busy, run] = useBusy();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconFileRef = useRef(null);

  const handleSetMainTenant = async (targetId) => {
    const target = tenants.find((t) => t.id === Number(targetId));
    if (!target) return;
    if (target.id === mainTenantId) {
      toast(`A empresa "${target.name}" já está ativa no news.grupomercatta.com.br.`);
      return;
    }
    if (!window.confirm(`Deseja ativar a empresa "${target.name}" no domínio principal (news.grupomercatta.com.br)?\n\nTodos os acessos a news.grupomercatta.com.br passarão a carregar os artigos e a marca desta empresa.`)) {
      return;
    }
    setSavingMainDomain(true);
    try {
      await api('/api/admin/tenants/main-domain/', {
        method: 'POST',
        data: { tenant_id: target.id },
      });
      setMainTenantId(target.id);
      toast(`Empresa "${target.name}" agora está ATIVA no news.grupomercatta.com.br!`);
    } catch (err) {
      toast(err.message || 'Erro ao definir empresa principal.', 'err');
    } finally {
      setSavingMainDomain(false);
    }
  };

  // Formulário de Nova Empresa / Edição
  const [form, setForm] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    subdomain: '',
    plan_name: 'Pro',
    monthly_price: '497.00',
    primary_color: '#2563eb',
    accent_color: '#1d4ed8',
    button_color: '#ffc92b',
    bg_color: '#060d24',
    logo_url: '',
    favicon_url: '',
    site_title: '',
    site_tagline: '',
    site_description: '',
    contact_email: '',
    whatsapp: '',
    ai_posts_limit_month: '30',
    has_whatsapp_flow: false,
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  const handleUploadLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/admin/upload/', {
        method: 'POST',
        form: formData,
      });
      if (res.url) {
        setForm((prev) => ({ ...prev, logo_url: res.url }));
        toast('Logotipo enviado com sucesso!');
      }
    } catch (err) {
      toast(err.message || 'Erro ao carregar arquivo de logo.', 'err');
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadFaviconFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/admin/upload/', {
        method: 'POST',
        form: formData,
      });
      if (res.url) {
        setForm((prev) => ({ ...prev, favicon_url: res.url }));
        toast('Favicon enviado com sucesso!');
      }
    } catch (err) {
      toast(err.message || 'Erro ao carregar arquivo de favicon.', 'err');
    } finally {
      setUploadingFavicon(false);
      if (e.target) e.target.value = '';
    }
  };

  const totalMRR = tenants
    .filter((t) => t.status === 'active' && t.slug !== 'mercatta')
    .reduce((sum, t) => sum + Number(t.monthly_price || 0), 0);

  const totalPosts = tenants.reduce((sum, t) => sum + Number(t.posts_count || 0), 0);
  const totalAiPosts = tenants.reduce((sum, t) => sum + Number(t.ai_posts_count || 0), 0);
  const activeCount = tenants.filter((t) => t.status === 'active' && t.slug !== 'mercatta').length;

  const openNewModal = () => {
    setEditingTenant(null);
    setForm({
      name: '',
      slug: '',
      custom_domain: '',
      subdomain: '',
      plan_name: 'Pro',
      monthly_price: '497.00',
      primary_color: '#2563eb',
      accent_color: '#1d4ed8',
      button_color: '#ffc92b',
      bg_color: '#060d24',
      logo_url: '',
      favicon_url: '',
      site_title: '',
      site_tagline: 'Blog Oficial',
      site_description: '',
      contact_email: '',
      whatsapp: '',
      ai_posts_limit_month: '30',
      has_whatsapp_flow: false,
      status: 'active',
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTenant(t);
    setForm({
      name: t.name,
      slug: t.slug,
      custom_domain: t.custom_domain || '',
      subdomain: t.subdomain || '',
      plan_name: t.plan_name || 'Pro',
      status: t.status || 'active',
      monthly_price: String(t.monthly_price || 497),
      primary_color: t.primary_color || '#2563eb',
      accent_color: t.accent_color || '#1d4ed8',
      button_color: t.button_color || '#ffc92b',
      bg_color: t.bg_color || '#060d24',
      logo_url: t.logo_url || '',
      favicon_url: t.favicon_url || '',
      site_title: t.site_title || '',
      site_tagline: t.site_tagline || '',
      site_description: t.site_description || '',
      contact_email: t.contact_email || '',
      whatsapp: t.whatsapp || '',
      ai_posts_limit_month: String(t.ai_posts_limit_month || 30),
      has_whatsapp_flow: Boolean(t.has_whatsapp_flow),
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (!editingTenant) {
      const autoSlug = val
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setForm((prev) => ({
        ...prev,
        name: val,
        slug: autoSlug,
        subdomain: autoSlug,
        site_title: `Blog ${val}`,
      }));
    } else {
      setForm((prev) => ({ ...prev, name: val }));
    }
  };

  const saveTenant = async (e) => {
    e.preventDefault();
    if (!form.name) return toast('Informe o nome da empresa', 'err');

    await run('save', async () => {
      if (editingTenant) {
        const res = await api(`/api/admin/tenants/${editingTenant.id}/`, {
          method: 'PATCH',
          data: form,
        });
        setTenants((prev) => prev.map((t) => (t.id === editingTenant.id ? { ...t, ...res.tenant } : t)));
        toast('Empresa atualizada com sucesso!');
      } else {
        const res = await api('/api/admin/tenants/', {
          method: 'POST',
          data: form,
        });
        setTenants((prev) => {
          const exists = prev.some((t) => t.id === res.tenant.id);
          if (exists) {
            return prev.map((t) => (t.id === res.tenant.id ? { ...t, ...res.tenant } : t));
          }
          return [res.tenant, ...prev];
        });
        toast('Empresa cadastrada com sucesso!');
      }
      setModalOpen(false);
    });
  };

  const toggleStatus = async (t) => {
    const nextStatus = t.status === 'active' ? 'suspended' : 'active';
    const msg = nextStatus === 'suspended'
      ? `Deseja pausar o blog de "${t.name}"? Visitantes verão uma tela amigável avisando sobre a pausa temporária.`
      : `Deseja reativar o blog de "${t.name}"?`;
    if (!confirm(msg)) return;

    await run(`status-${t.id}`, async () => {
      const res = await api(`/api/admin/tenants/${t.id}/`, {
        method: 'PATCH',
        data: { status: nextStatus },
      });
      setTenants((prev) => prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item)));
      toast(`Status alterado para ${nextStatus === 'active' ? 'Ativo' : 'Suspenso'}`);
    });
  };

  const checkDNS = async (t) => {
    const domain = t.custom_domain;
    if (!domain) return toast('Esta empresa ainda não possui domínio personalizado cadastrado.', 'err');

    await run(`dns-${t.id}`, async () => {
      const res = await api('/api/admin/tenants/verify-dns/', {
        method: 'POST',
        data: { domain, tenantId: t.id },
      });
      setDnsResult({ tenant: t, result: res });
      if (res.verified) {
        setTenants((prev) => prev.map((item) => (item.id === t.id ? { ...item, domain_verified: true } : item)));
        toast('DNS CNAME verificado com sucesso!', 'ok');
      } else {
        toast('CNAME ainda não detectado ou apontando para outro destino.', 'err');
      }
    });
  };

  const deleteCompany = async (t) => {
    if (!confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a empresa "${t.name}" e todos os seus artigos? Esta ação é irreversível.`)) return;

    await run(`del-${t.id}`, async () => {
      await api(`/api/admin/tenants/${t.id}/`, { method: 'DELETE' });
      setTenants((prev) => prev.filter((item) => item.id !== t.id));
      toast('Empresa removida.');
    });
  };

  const impersonate = async (t) => {
    await run(`impersonate-${t.id}`, async () => {
      const res = await api('/api/admin/impersonate/', {
        method: 'POST',
        data: { tenantId: t.id },
      });
      toast(`Acessando painel de "${t.name}" sem senha...`);
      window.location.href = res.redirect || '/admin/';
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
            🏢 Gestão de Empresas e Domínios (Multi-Tenant)
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0 0', fontSize: '0.9375rem' }}>
            Cadastre seus clientes, publique no domínio próprio de cada um e gerencie mensalidades e assinaturas.
          </p>
        </div>
        <button
          type="button"
          className="a-btn primary"
          onClick={openNewModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.65rem 1.25rem' }}
        >
          <Icon name="plus" size={18} />
          Cadastrar Nova Empresa
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Empresas Ativas</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#3b82f6' }}>{activeCount}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>clientes pagantes</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>MRR Estimado</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#10b981' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMRR)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>receita recorrente / mês</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Artigos no Ar</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{totalPosts}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>em todos os blogs</div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gerados por IA</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#a855f7' }}>{totalAiPosts}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>com Google Gemini</div>
        </div>
      </div>

      {/* DNS Instructions Card */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: '1.5rem' }}>💡</div>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <strong style={{ fontSize: '1rem', color: '#60a5fa', display: 'block', marginBottom: '0.25rem' }}>
            Como publicar o blog no domínio próprio do seu cliente:
          </strong>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
            Solicite ao cliente (ou ao suporte do domínio dele) para criar um apontamento de <strong>CNAME</strong> no DNS (Registro.br, Cloudflare, GoDaddy, Hostgator, etc.):
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.5rem',
            background: 'var(--bg)',
            padding: '0.65rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}>
            <span>Tipo: <b>CNAME</b></span>
            <span>Nome/Host: <b>blog</b></span>
            <span>Destino: <b style={{ color: '#3b82f6' }}>cname.grupomercatta.com.br</b></span>
          </div>
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
            ✓ O certificado de segurança HTTPS (SSL) é emitido automaticamente e gratuitamente pelo sistema.
          </span>
        </div>
      </div>

      {/* Banner de Controle do Domínio Principal news.grupomercatta.com.br */}
      {(() => {
        const activeMainTenant = tenants.find((t) => t.id === mainTenantId) || tenants[0];
        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.22) 0%, rgba(15, 23, 42, 0.65) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.35rem' }}>⭐</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    Empresa Ativa no Domínio Principal
                  </h3>
                  <code style={{
                    background: 'rgba(59, 130, 246, 0.25)',
                    color: '#60a5fa',
                    padding: '2px 10px',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}>
                    news.grupomercatta.com.br
                  </code>
                </div>
                <p style={{ margin: 0, fontSize: '0.8375rem', color: 'var(--muted)', maxWidth: 640 }}>
                  Como Super Administrador, escolha qual empresa deve ser aberta ao acessar o link principal. Você pode alternar entre as empresas a qualquer momento.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Ativar:</span>
                  <select
                    className="a-input"
                    style={{ width: 'auto', minWidth: 220, padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
                    value={mainTenantId || ''}
                    onChange={(e) => handleSetMainTenant(Number(e.target.value))}
                    disabled={savingMainDomain}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug}) {t.id === mainTenantId ? '★ Ativa' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {activeMainTenant && (
                  <a
                    href={activeMainTenant.id === mainTenantId ? '/' : `/?tenant=${activeMainTenant.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="a-btn ghost sm"
                    style={{ borderColor: '#3b82f6', color: '#60a5fa' }}
                  >
                    <Icon name="globe" size={15} /> Ver no ar
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tenants Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Empresas Cadastradas ({tenants.length})</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--muted)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Empresa</th>
                <th style={{ padding: '0.85rem 1rem' }}>Domínio / DNS</th>
                <th style={{ padding: '0.85rem 1rem' }}>Plano & Mensalidade</th>
                <th style={{ padding: '0.85rem 1rem' }}>Artigos</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const isMercatta = t.slug === 'mercatta';
                const isBraziw = t.slug === 'braziw';
                const isMainTenant = t.id === mainTenantId;

                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Empresa */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {t.logo_url ? (
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              objectFit: 'contain',
                              background: '#ffffff',
                              padding: 2,
                              border: '1px solid var(--border)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: t.primary_color || '#2563eb',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.9375rem',
                            flexShrink: 0,
                          }}>
                            {t.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: '0.9375rem', display: 'block' }}>{t.name}</strong>
                          <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>slug: <code>{t.slug}</code></span>
                        </div>
                      </div>
                    </td>

                    {/* Domínio & DNS */}
                    <td style={{ padding: '1rem' }}>
                      {isMainTenant ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, color: '#60a5fa' }}>news.grupomercatta.com.br</span>
                          </div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            marginTop: '0.2rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 4,
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            fontWeight: 700,
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                          }}>
                            ★ Ativo no news.grupomercatta.com.br
                          </span>
                          {t.custom_domain && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                              Domínio próprio: <span style={{ color: '#93c5fd' }}>{t.custom_domain}</span>
                            </div>
                          )}
                        </div>
                      ) : hasCustomDomain ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 600, color: '#60a5fa' }}>{t.custom_domain}</span>
                            <button
                              type="button"
                              onClick={() => checkDNS(t)}
                              title="Testar apontamento CNAME agora"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
                            >
                              🔍
                            </button>
                          </div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            marginTop: '0.2rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4,
                            background: t.domain_verified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: t.domain_verified ? '#10b981' : '#eab308',
                            fontWeight: 600
                          }}>
                            {t.domain_verified ? '✓ CNAME Ativo' : '⚠ CNAME Pendente'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: '#93c5fd', fontSize: '0.8125rem', fontWeight: 600 }}>
                            {t.subdomain ? `${t.subdomain}.grupomercatta.com.br` : `${t.slug}.grupomercatta.com.br`}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>
                            Domínio provisório ({`/?tenant=${t.slug}`})
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Plano & Mensalidade */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>
                        {t.plan_name || 'Pro'}
                        {t.has_whatsapp_flow && (
                          <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: 4 }}>
                            ⭐ Flow
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#10b981', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.monthly_price || 0))}/mês
                      </div>
                    </td>

                    {/* Artigos */}
                    <td style={{ padding: '1rem' }}>
                      <div><b>{t.posts_count || 0}</b> total</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Limite IA: <b>{t.ai_posts_limit_month || 30}</b>/mês
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 9999,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: t.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.status === 'active' ? '#10b981' : '#ef4444'
                      }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: t.status === 'active' ? '#10b981' : '#ef4444'
                        }} />
                        {t.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="a-btn primary sm"
                          onClick={() => impersonate(t)}
                          title="Entrar diretamente no painel do cliente sem pedir senha"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontWeight: 600,
                            background: '#2563eb',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Icon name="key" size={14} /> Entrar no Painel
                        </button>

                        <a
                          href={isMainTenant ? '/' : (t.custom_domain && t.domain_verified ? `https://${t.custom_domain}/` : `/?tenant=${t.slug}`)}
                          target="_blank"
                          rel="noopener"
                          className="a-btn ghost sm"
                          title="Abrir Blog ao Vivo sem restrição"
                          style={{ padding: '0.35rem 0.65rem' }}
                        >
                          <Icon name="globe" size={15} /> Ver Blog
                        </a>

                        {isMainTenant ? (
                          <span
                            title="Esta empresa está ativa no domínio news.grupomercatta.com.br"
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#34d399',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              padding: '0.3rem 0.55rem',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ✓ Ativo no news
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="a-btn ghost sm"
                            onClick={() => handleSetMainTenant(t.id)}
                            disabled={savingMainDomain}
                            title="Ativar esta empresa no domínio principal news.grupomercatta.com.br"
                            style={{
                              padding: '0.3rem 0.6rem',
                              color: '#60a5fa',
                              borderColor: 'rgba(59, 130, 246, 0.4)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            🎯 Ativar no news
                          </button>
                        )}

                        <a
                          href={`/admin/whatsapp-flow/?tenant_id=${t.id}`}
                          className="a-btn ghost sm"
                          title="Configurar e Implantar WhatsApp Lead Flow neste cliente"
                          style={{ padding: '0.35rem 0.65rem', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        >
                          <Icon name="chat" size={15} /> WhatsApp Flow
                        </a>

                        <button
                          type="button"
                          className="a-btn ghost sm"
                          onClick={() => openEditModal(t)}
                          title="Editar Configurações da Empresa"
                          style={{ padding: '0.3rem 0.6rem' }}
                        >
                          <Icon name="edit" size={15} /> Editar
                        </button>

                        <button
                          type="button"
                          className="a-btn ghost sm"
                          onClick={() => toggleStatus(t)}
                          title={t.status === 'active' ? 'Pausar/Suspender Blog' : 'Reativar Blog'}
                          style={{ padding: '0.3rem 0.6rem', color: t.status === 'active' ? '#eab308' : '#10b981' }}
                        >
                          {t.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>

                        {!isMercatta && (
                          <button
                            type="button"
                            className="a-btn ghost sm"
                            onClick={() => deleteCompany(t)}
                            title="Remover Empresa"
                            style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DNS Result Modal/Banner */}
      {dnsResult && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Diagnóstico de DNS CNAME</h3>
            <p><strong>Empresa:</strong> {dnsResult.tenant.name}</p>
            <p><strong>Domínio Verificado:</strong> <code>{dnsResult.tenant.custom_domain}</code></p>
            <p><strong>Destino Esperado:</strong> <code>{dnsResult.result.targetExpected}</code></p>

            <div style={{
              padding: '1rem',
              borderRadius: 8,
              background: dnsResult.result.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${dnsResult.result.verified ? '#10b981' : '#ef4444'}`,
              color: dnsResult.result.verified ? '#10b981' : '#ef4444',
              marginTop: '1rem',
              fontWeight: 600
            }}>
              {dnsResult.result.verified
                ? '✓ Parabéns! O registro CNAME já está apontando corretamente para o servidor Mercatta.'
                : `⚠ Não foi detectado o CNAME: ${dnsResult.result.error || 'Aguarde a propagação de DNS (até 24h).'}`}
            </div>

            {dnsResult.result.cnames && dnsResult.result.cnames.length > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                CNAME atual retornado pelo DNS: <code>{dnsResult.result.cnames.join(', ')}</code>
              </div>
            )}

            <button
              type="button"
              className="a-btn primary"
              style={{ marginTop: '1.5rem', width: '100%' }}
              onClick={() => setDnsResult(null)}
            >
              Fechar Diagnóstico
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--border)',
            padding: '2rem',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {editingTenant ? `Editar Empresa: ${editingTenant.name}` : 'Cadastrar Nova Empresa Cliente'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {editingTenant && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 10,
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.65rem',
              }}>
                <div style={{ fontSize: '0.875rem' }}>
                  <strong style={{ display: 'block', color: '#60a5fa' }}>⚡ Acesso Direto Super Admin (Sem Senha)</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Entre no painel administrativo deste cliente ou abra o blog ao vivo.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="a-btn primary sm"
                    onClick={() => impersonate(editingTenant)}
                    style={{ background: '#2563eb', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Icon name="key" size={14} /> Entrar no Painel do Cliente
                  </button>
                  <a
                    href={`/?tenant=${editingTenant.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="a-btn ghost sm"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Icon name="globe" size={14} /> Abrir Blog ao Vivo
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={saveTenant}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="Ex: Mercatta Odonto, Braziw..."
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Slug Identificador *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    disabled={Boolean(editingTenant)}
                    placeholder="ex: mercatta-odonto"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Domínio Personalizado do Cliente
                  </label>
                  <input
                    type="text"
                    value={form.custom_domain}
                    onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                    placeholder="ex: blog.cliente.com.br"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.75rem', display: 'block' }}>O cliente aponta CNAME para seu servidor</small>
                  {editingTenant && (
                    <div style={{ marginTop: '0.35rem' }}>
                      {editingTenant.id === mainTenantId ? (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                          ★ Esta empresa está ATIVA em news.grupomercatta.com.br
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetMainTenant(editingTenant.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#3b82f6',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 600,
                          }}
                        >
                          🎯 Ativar esta empresa em news.grupomercatta.com.br
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Subdomínio Provisório na Mercatta
                  </label>
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                    placeholder="ex: cliente"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>.grupomercatta.com.br</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Plano Contratado
                  </label>
                  <select
                    value={form.plan_name}
                    onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  >
                    <option value="Starter">Starter (R$ 297/mês)</option>
                    <option value="Pro">Pro Growth (R$ 497/mês)</option>
                    <option value="Enterprise">Enterprise (R$ 997/mês)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Status do Blog
                  </label>
                  <select
                    value={form.status || 'active'}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  >
                    <option value="active">🟢 Ativo (No Ar)</option>
                    <option value="suspended">⏸️ Pausado / Suspenso</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.monthly_price}
                    onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Limite Artigos IA / Mês
                  </label>
                  <input
                    type="number"
                    value={form.ai_posts_limit_month}
                    onChange={(e) => setForm({ ...form, ai_posts_limit_month: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, color: '#34d399' }}>
                    <input
                      type="checkbox"
                      checked={!!form.has_whatsapp_flow}
                      onChange={(e) => setForm({ ...form, has_whatsapp_flow: e.target.checked })}
                    />
                    <span>⭐ Liberar Recurso Premium: WhatsApp Lead Flow (Captura de Leads & Webhooks)</span>
                  </label>
                  <small style={{ color: '#94a3b8', display: 'block', marginTop: '0.25rem', fontSize: '0.78rem' }}>
                    Permite que esta empresa configure formulários interativos no blog com envio automático para CRM via Webhook.
                  </small>
                </div>
              </div>

              {/* Seção Identidade Visual & Logotipo */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Icon name="spark" size={18} />
                  <strong style={{ fontSize: '0.9375rem' }}>Identidade Visual & Logotipo da Empresa</strong>
                </div>

                {/* Upload de Logo */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Logotipo do Cliente
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Visualização da Logo */}
                    <div style={{
                      width: 80,
                      height: 56,
                      borderRadius: 8,
                      border: '1px dashed var(--border)',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: 4,
                      flexShrink: 0
                    }}>
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>Sem logo</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <input
                        ref={logoFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: 'none' }}
                        onChange={handleUploadLogoFile}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="a-btn ghost sm"
                          onClick={() => logoFileRef.current?.click()}
                          disabled={uploadingLogo}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Icon name="upload" size={15} />
                          {uploadingLogo ? 'Enviando...' : 'Fazer Upload de Logo'}
                        </button>
                        {form.logo_url && (
                          <button
                            type="button"
                            className="a-btn ghost sm"
                            onClick={() => setForm({ ...form, logo_url: '' })}
                            style={{ color: '#ef4444' }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Ou cole a URL direta do logotipo (https://...)"
                        value={form.logo_url}
                        onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Favicon (Ícone da Aba do Navegador) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Favicon da Empresa (Ícone da Aba do Navegador)
                  </label>
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 8,
                      border: '1px dashed var(--border)',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--surface-2)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {form.favicon_url ? (
                        <img src={form.favicon_url} alt="Favicon" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '1.1rem' }}>🌐</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <input
                        ref={faviconFileRef}
                        type="file"
                        accept="image/*,.ico"
                        style={{ display: 'none' }}
                        onChange={handleUploadFaviconFile}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="a-btn ghost sm"
                          onClick={() => faviconFileRef.current?.click()}
                          disabled={uploadingFavicon}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Icon name="upload" size={15} />
                          {uploadingFavicon ? 'Enviando...' : 'Fazer Upload de Favicon'}
                        </button>
                        {form.logo_url && !form.favicon_url && (
                          <button
                            type="button"
                            className="a-btn ghost sm"
                            onClick={() => setForm({ ...form, favicon_url: form.logo_url })}
                          >
                            Usar Logo
                          </button>
                        )}
                        {form.favicon_url && (
                          <button
                            type="button"
                            className="a-btn ghost sm"
                            onClick={() => setForm({ ...form, favicon_url: '' })}
                            style={{ color: '#ef4444' }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Ou cole a URL direta do favicon (https://.../favicon.ico)"
                        value={form.favicon_url}
                        onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cores da Marca, Botão e Fundo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Cor Primária
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                        style={{ width: '38px', height: '38px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                        style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Cor de Destaque / Accent
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={form.accent_color}
                        onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                        style={{ width: '38px', height: '38px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={form.accent_color}
                        onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                        style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Cor dos Botões (CTA)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={form.button_color || '#ffc92b'}
                        onChange={(e) => setForm({ ...form, button_color: e.target.value })}
                        style={{ width: '38px', height: '38px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={form.button_color || '#ffc92b'}
                        onChange={(e) => setForm({ ...form, button_color: e.target.value })}
                        style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Cor de Fundo do Blog (Background)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={form.bg_color || '#060d24'}
                        onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                        style={{ width: '38px', height: '38px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={form.bg_color || '#060d24'}
                        onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                        style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Título & Slogan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Título do Blog
                    </label>
                    <input
                      type="text"
                      value={form.site_title}
                      onChange={(e) => setForm({ ...form, site_title: e.target.value })}
                      placeholder="Ex: Blog Wisemadness"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Slogan / Subtítulo
                    </label>
                    <input
                      type="text"
                      value={form.site_tagline}
                      onChange={(e) => setForm({ ...form, site_tagline: e.target.value })}
                      placeholder="Ex: Transformando vidas e comunidades"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                    />
                  </div>
                </div>

                {/* WhatsApp de Contato */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    WhatsApp do Cliente (para botão de contato no blog)
                  </label>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="Ex: 11987654321"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                  />
                </div>

                {/* Live Preview Box */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  borderRadius: 10,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: '0.6rem' }}>
                    👁 Pré-visualização do Topo e Botão do Blog:
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 8,
                    background: form.bg_color || 'var(--surface)',
                    color: form.bg_color && form.bg_color.startsWith('#') && (parseInt(form.bg_color.slice(1,3), 16)*299 + parseInt(form.bg_color.slice(3,5), 16)*587 + parseInt(form.bg_color.slice(5,7), 16)*114)/1000 >= 145 ? '#0f172a' : '#ffffff',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="" style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} />
                      ) : (
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: form.primary_color || '#2563eb',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          {(form.name || 'C').slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <strong style={{ fontSize: '0.875rem', display: 'block', lineHeight: 1.2 }}>
                          {form.site_title || form.name || 'Título do Blog'}
                        </strong>
                        <small style={{ opacity: 0.75, fontSize: '0.72rem' }}>
                          {form.site_tagline || 'Blog Oficial'}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: form.button_color || '#ffc92b',
                        color: form.button_color && form.button_color.startsWith('#') && (parseInt(form.button_color.slice(1,3), 16)*299 + parseInt(form.button_color.slice(3,5), 16)*587 + parseInt(form.button_color.slice(5,7), 16)*114)/1000 >= 145 ? '#111827' : '#ffffff',
                        border: 'none',
                        padding: '0.45rem 0.9rem',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'default',
                        boxShadow: `0 4px 14px -3px ${form.button_color || '#ffc92b'}aa`,
                      }}
                    >
                      Fale Conosco
                    </button>
                  </div>
                </div>
              </div>

              {!editingTenant && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '1.25rem',
                  marginTop: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                    🔑 Criar Administrador Inicial para o Cliente
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>E-mail de Acesso</label>
                      <input
                        type="email"
                        value={form.admin_email}
                        onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                        placeholder="contato@cliente.com.br"
                        style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Senha Temporária</label>
                      <input
                        type="text"
                        value={form.admin_password}
                        onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        placeholder="ex: SenhaCliente2026!"
                        style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="a-btn ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="a-btn primary"
                  disabled={busy === 'save'}
                >
                  {busy === 'save' ? 'Salvando...' : (editingTenant ? 'Salvar Alterações' : 'Criar Empresa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
