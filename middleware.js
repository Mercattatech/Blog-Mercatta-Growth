import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || 'localhost:3100';
  const cleanHost = host.toLowerCase().split(':')[0];

  // Excluir arquivos estáticos, uploads e de sistema
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.startsWith('/uploads') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  // Suporte a URL temporária limpa /b/slug (ex: /b/braziw -> /?tenant=braziw)
  if (url.pathname.startsWith('/b/')) {
    const slug = url.pathname.replace(/^\/b\//, '').split('/')[0];
    if (slug) {
      const redirectUrl = new URL('/', req.url);
      redirectUrl.searchParams.set('tenant', slug);
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set('mercatta_dev_tenant', slug, { path: '/', maxAge: 60 * 60 * 24 });
      return res;
    }
  }

  // Suporte a parâmetro de tenant (?tenant=slug) e persistência de navegação
  const tenantParam = url.searchParams.get('tenant');
  const devCookieTenant = req.cookies.get('mercatta_dev_tenant')?.value;

  const activeOverride = tenantParam || devCookieTenant || null;
  if (activeOverride) {
    requestHeaders.set('x-tenant-override', activeOverride);
  }

  // Verifica se é o domínio hub institucional Mercatta
  const isMercattaHub = (cleanHost === 'grupomercatta.com.br' || cleanHost === 'www.grupomercatta.com.br' || cleanHost === 'hub.grupomercatta.com.br') && !activeOverride;
  requestHeaders.set('x-is-hub', isMercattaHub ? '1' : '0');

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Salva no cookie ao navegar com ?tenant= para não perder o blog ao clicar em links
  if (tenantParam) {
    response.cookies.set('mercatta_dev_tenant', tenantParam, { path: '/', maxAge: 60 * 60 * 24 });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
