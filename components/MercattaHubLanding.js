import Link from 'next/link';
import './MercattaHub.css';

export function MercattaHubLanding({ tenants = [], user = null }) {
  const activeTenants = tenants.filter((t) => t.slug !== 'mercatta' && t.status === 'active');
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="mercatta-hub">
      {/* Top Navbar */}
      <header className="hub-header">
        <div className="hub-container hub-nav-inner">
          <div className="hub-brand">
            <span className="hub-logo-symbol">✦</span>
            <div className="hub-brand-text">
              <strong>Grupo Mercatta</strong>
              <small>Smart Blogs SaaS</small>
            </div>
          </div>
          <nav className="hub-nav">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como Funciona</a>
            <a href="#planos">Planos</a>
            <a href="#clientes">Empresas</a>
          </nav>
          <div className="hub-actions">
            {user ? (
              <Link href={isSuperAdmin ? '/admin/super/' : '/admin/'} className="hub-btn hub-btn-primary">
                {isSuperAdmin ? '⚡ Painel Super Admin' : 'Meu Painel'}
              </Link>
            ) : (
              <Link href="/admin/login/" className="hub-btn hub-btn-outline">
                Entrar no Painel
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hub-hero">
        <div className="hub-container">
          <div className="hub-badge">
            <span className="hub-badge-dot" />
            Tecnologia de Blogs Multi-Tenant com Inteligência Artificial
          </div>
          <h1 className="hub-title">
            Transforme seu domínio em uma máquina de <span className="hub-gradient-text">tráfego e autoridade</span>
          </h1>
          <p className="hub-subtitle">
            Crie e publique blogs inteligentes no domínio próprio de cada empresa. Artigos com redação humana por IA (Google Gemini), otimizados para SEO Google e mecanismos de IA generativa.
          </p>
          <div className="hub-hero-cta">
            <Link href="/admin/super/" className="hub-btn hub-btn-lg hub-btn-primary">
              Cadastrar Nova Empresa →
            </Link>
            <a href="#clientes" className="hub-btn hub-btn-lg hub-btn-secondary">
              Ver Blogs em Produção
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hub-stats-bar">
            <div className="hub-stat-item">
              <strong>100%</strong>
              <span>White-Label no seu domínio</span>
            </div>
            <div className="hub-stat-item">
              <strong>Gemini 3.5</strong>
              <span>IA treinada com a voz da sua marca</span>
            </div>
            <div className="hub-stat-item">
              <strong>SSL Automático</strong>
              <span>Certificado HTTPS com 1 registro DNS CNAME</span>
            </div>
            <div className="hub-stat-item">
              <strong>Google E-E-A-T</strong>
              <span>Estrutura focada em buscas do Google</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="como-funciona" className="hub-section">
        <div className="hub-container">
          <div className="hub-section-header">
            <span className="hub-tag">Fluxo Simples</span>
            <h2>Como o Sistema Multi-Tenant Funciona</h2>
            <p>Em apenas 4 passos sua empresa cliente tem um blog profissional e inteligente no ar.</p>
          </div>

          <div className="hub-steps-grid">
            <div className="hub-step-card">
              <div className="hub-step-number">01</div>
              <h3>Cadastro da Empresa</h3>
              <p>Cadastre o cliente no seu painel Super Admin da Mercatta, definindo o nome, plano contratado e valor mensal.</p>
            </div>
            <div className="hub-step-card">
              <div className="hub-step-number">02</div>
              <h3>Domínio Próprio (CNAME)</h3>
              <p>O cliente adiciona um simples apontamento CNAME (ex: <code>blog.empresa.com.br</code>) no DNS dele. O SSL é emitido automaticamente.</p>
            </div>
            <div className="hub-step-card">
              <div className="hub-step-number">03</div>
              <h3>Treinamento da IA</h3>
              <p>A IA é alimentada com a persona, tom de voz, regras e links daquela marca para nunca gerar conteúdo genérico.</p>
            </div>
            <div className="hub-step-card">
              <div className="hub-step-number">04</div>
              <h3>Geração e Publicação</h3>
              <p>Sugestão automática de pautas com alto volume de busca orgânica e redação completa pronta para revisão e agendamento.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Client Blogs in Production */}
      <section id="clientes" className="hub-section hub-section-dark">
        <div className="hub-container">
          <div className="hub-section-header">
            <span className="hub-tag">Clientes Ativos</span>
            <h2>Empresas na Plataforma</h2>
            <p>Exemplos de blogs inteligentes rodando com seus domínios e identidades visuais exclusivas.</p>
          </div>

          <div className="hub-clients-grid">
            {activeTenants.map((tenant) => (
              <div key={tenant.id} className="hub-client-card">
                <div className="hub-client-top">
                  <div className="hub-client-avatar" style={{ background: tenant.primary_color || '#2563eb' }}>
                    {tenant.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{tenant.name}</h3>
                    <span className="hub-client-domain">
                      {tenant.custom_domain || `${tenant.subdomain}.grupomercatta.com.br`}
                    </span>
                  </div>
                </div>
                <p className="hub-client-desc">{tenant.site_description || 'Blog corporativo inteligente em produção.'}</p>
                <div className="hub-client-footer">
                  <span className="hub-badge-status">{tenant.posts_count || 184} artigos</span>
                  <a
                    href={`/?tenant=${tenant.slug}`}
                    className="hub-btn hub-btn-sm hub-btn-outline"
                  >
                    Visitar Blog ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="planos" className="hub-section">
        <div className="hub-container">
          <div className="hub-section-header">
            <span className="hub-tag">Monetização Recorrente</span>
            <h2>Planos e Preços Mensais</h2>
            <p>Seus clientes pagam por mês para manter o blog inteligente ativo no ar.</p>
          </div>

          <div className="hub-pricing-grid">
            <div className="hub-plan-card">
              <h3>Starter</h3>
              <p className="hub-plan-desc">Para profissionais autônomos e pequenos negócios.</p>
              <div className="hub-plan-price">
                <span className="currency">R$</span>
                <strong>297</strong>
                <span className="period">/mês</span>
              </div>
              <ul className="hub-plan-features">
                <li>✓ Domínio próprio do cliente</li>
                <li>✓ Até 10 artigos por IA / mês</li>
                <li>✓ Painel administrativo com SEO</li>
                <li>✓ Certificado SSL incluso</li>
                <li>✓ Suporte por e-mail</li>
              </ul>
              <Link href="/admin/super/" className="hub-btn hub-btn-outline hub-btn-block">
                Cadastrar Empresa
              </Link>
            </div>

            <div className="hub-plan-card hub-plan-featured">
              <div className="hub-plan-pill">Mais Popular</div>
              <h3>Pro Growth</h3>
              <p className="hub-plan-desc">Para empresas que querem dominar a busca orgânica do seu nicho.</p>
              <div className="hub-plan-price">
                <span className="currency">R$</span>
                <strong>497</strong>
                <span className="period">/mês</span>
              </div>
              <ul className="hub-plan-features">
                <li>✓ Domínio próprio do cliente</li>
                <li>✓ Até 30 artigos por IA / mês</li>
                <li>✓ Treinamento avançado de persona</li>
                <li>✓ Gerador de capas personalizadas</li>
                <li>✓ Agendamento automático de postagens</li>
                <li>✓ Suporte prioritário via WhatsApp</li>
              </ul>
              <Link href="/admin/super/" className="hub-btn hub-btn-primary hub-btn-block">
                Cadastrar Empresa
              </Link>
            </div>

            <div className="hub-plan-card">
              <h3>Enterprise</h3>
              <p className="hub-plan-desc">Para redes, franquias ou empresas de alto volume.</p>
              <div className="hub-plan-price">
                <span className="currency">R$</span>
                <strong>997</strong>
                <span className="period">/mês</span>
              </div>
              <ul className="hub-plan-features">
                <li>✓ Múltiplos domínios e categorias</li>
                <li>✓ Artigos ilimitados com IA</li>
                <li>✓ Treinamento com artigos de referência</li>
                <li>✓ Usuários ilimitados para a equipe</li>
                <li>✓ Consultoria estratégica mensal</li>
              </ul>
              <Link href="/admin/super/" className="hub-btn hub-btn-outline hub-btn-block">
                Cadastrar Empresa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hub-footer">
        <div className="hub-container hub-footer-inner">
          <p>© {new Date().getFullYear()} Grupo Mercatta. Todos os direitos reservados. Plataforma SaaS Multi-Tenant White-Label.</p>
          <div className="hub-footer-links">
            <Link href="/admin/login/">Acesso ao Painel</Link>
            <Link href="/admin/super/">Painel Super Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
