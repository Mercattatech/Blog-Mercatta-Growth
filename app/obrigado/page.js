import { Shell } from '@/components/Shell';
import { getCurrentTenant } from '@/lib/currentTenant.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensagem Recebida com Sucesso' };

export default async function ObrigadoPage() {
  const { tenant } = await getCurrentTenant();
  const tenantSlug = tenant?.slug;
  const isCustomTenant = tenantSlug && tenantSlug !== 'braziw' && tenantSlug !== 'mercatta';
  const homeHref = isCustomTenant ? `/?tenant=${tenantSlug}` : '/';
  const contactHref = tenant?.whatsapp ? `https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}` : homeHref;

  return (
    <Shell tenant={tenant}>
      <section className="page-hero" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <span className="eyebrow" style={{ color: '#10b981' }}>✓ Solicitação Enviada</span>
          <h1 style={{ fontSize: '2.4rem', margin: '0.75rem 0' }}>Obrigado pelo seu contato!</h1>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Recebemos seus dados com sucesso. A equipe da <strong>{tenant?.name || 'nossa empresa'}</strong> já está analisando suas informações e entrará em contato o mais breve possível.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={homeHref} className="btn btn-outline btn-lg">
              Voltar ao Início do Blog
            </a>
            {tenant?.whatsapp && (
              <a
                href={contactHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent btn-lg"
                style={{ background: '#25D366', color: '#042f1a', border: 'none', fontWeight: 'bold' }}
              >
                Falar Agora no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
