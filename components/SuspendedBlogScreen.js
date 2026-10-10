import Link from 'next/link';

export function SuspendedBlogScreen({ tenant = null, isStaff = false }) {
  const brandName = tenant?.name || 'Blog';
  const email = tenant?.contact_email;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(180deg, #090e1f 0%, #030712 100%)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '3rem 2.25rem',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>⏸️</div>
        
        <div style={{
          display: 'inline-block',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0.25rem 0.75rem',
          borderRadius: 9999,
          background: 'rgba(234, 179, 8, 0.15)',
          color: '#facc15',
          marginBottom: '1rem',
          border: '1px solid rgba(234, 179, 8, 0.3)',
        }}>
          Pausa Temporária
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          lineHeight: 1.25,
          marginBottom: '0.75rem',
          color: '#ffffff',
        }}>
          {brandName}
        </h1>

        <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Este blog está temporariamente desativado para manutenção ou atualizações pelo administrador. Retornaremos em breve!
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {email && (
            <a
              href={`mailto:${email}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: '#ffffff',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
              }}
            >
              Falar com o Suporte
            </a>
          )}

          {isStaff ? (
            <Link
              href="/admin/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              Acessar Painel Admin →
            </Link>
          ) : (
            <Link
              href="/admin/login/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#94a3b8',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Área Administrativa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
