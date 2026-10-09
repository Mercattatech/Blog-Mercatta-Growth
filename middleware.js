import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || 'localhost:3100';
  const cleanHost = host.toLowerCase().split(':')[0];

  // Excluir arquivos estáticos e de sistema
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-host', host);

  // Suporte a parâmetro de tenant (dev local: ?tenant=wisemadness) e persistência de navegação
  const tenantParam = url.searchParams.get('tenant');
  const isLocal = cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1');
  const devCookieTenant = req.cookies.get('mercatta_dev_tenant')?.value;

  const activeOverride = tenantParam || (isLocal && devCookieTenant ? devCookieTenant : null);
  if (activeOverride) {
    requestHeaders.set('x-tenant-override', activeOverride);
  }

  // Verifica se é o domínio hub Mercatta
  const isMercattaHub = cleanHost === 'grupomercatta.com.br' || cleanHost === 'www.grupomercatta.com.br';
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
