import crypto from 'node:crypto';
import { query, queryOne } from './db.js';
import { getTenantById } from './tenant.js';
import { siteUrl } from './content.js';

/**
 * Gera um access token OAuth2 do Google a partir do JSON de Service Account
 */
async function getGoogleAccessToken(serviceAccountJson) {
  let sa;
  try {
    sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  } catch (e) {
    throw new Error('O JSON da Conta de Serviço do Google é inválido.');
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error('O JSON da Conta de Serviço precisa conter "client_email" e "private_key".');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${b64(header)}.${b64(payload)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(sa.private_key, 'base64url');

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Falha na autenticação com o Google: ${tokenData.error_description || tokenData.error || 'Erro desconhecido'}`);
  }

  return tokenData.access_token;
}

/**
 * Notifica o Google sobre uma URL individual via Google Indexing API
 */
export async function notifyGoogleIndexingUrl({ url, serviceAccountJson, type = 'URL_UPDATED' }) {
  const token = await getGoogleAccessToken(serviceAccountJson);

  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url,
      type, // 'URL_UPDATED' ou 'URL_DELETED'
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google Indexing API erro (${res.status}): ${data?.error?.message || 'Erro ao notificar URL'}`);
  }

  return data;
}

/**
 * Dispara envio em lote de todos os artigos publicados do tenant para o Google Search
 */
export async function submitAllArticlesToGoogle(tenantId) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Empresa cliente não encontrada.');

  if (!tenant.google_service_account_json) {
    throw new Error('Configure o JSON da Conta de Serviço do Google Search nas configurações antes de enviar.');
  }

  // Base URL do tenant
  const baseUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain.replace(/^https?:\/\//, '')}`
    : tenant.subdomain
      ? `https://${tenant.subdomain}.grupomercatta.com.br`
      : 'https://braziw.com.br';

  const rows = await query(`
    SELECT slug, title, publish_at
    FROM posts
    WHERE (tenant_id = $1 OR tenant_id IS NULL)
      AND deleted_at IS NULL
      AND status = 'published'
      AND publish_at <= now()
    ORDER BY publish_at DESC
  `, [tenantId]);

  if (!rows.length) {
    return { success: true, count: 0, message: 'Nenhum artigo publicado encontrado para envio.' };
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Envia a home do blog
  try {
    await notifyGoogleIndexingUrl({
      url: `${baseUrl}/`,
      serviceAccountJson: tenant.google_service_account_json,
    });
    results.push({ url: `${baseUrl}/`, status: 'ok' });
    successCount++;
  } catch (err) {
    results.push({ url: `${baseUrl}/`, status: 'err', error: err.message });
    failCount++;
  }

  // Envia cada artigo publicado
  for (const post of rows) {
    const postUrl = `${baseUrl}/${post.slug}/`;
    try {
      // eslint-disable-next-line no-await-in-loop
      await notifyGoogleIndexingUrl({
        url: postUrl,
        serviceAccountJson: tenant.google_service_account_json,
      });
      results.push({ url: postUrl, title: post.title, status: 'ok' });
      successCount++;
    } catch (err) {
      results.push({ url: postUrl, title: post.title, status: 'err', error: err.message });
      failCount++;
    }
  }

  // Registra data da última indexação no tenant
  await query('UPDATE tenants SET last_google_indexing_at = now() WHERE id = $1', [tenantId]);

  // Ping de sitemap como fallback complementar
  try {
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {});
  } catch {}

  return {
    success: true,
    total: rows.length + 1,
    success_count: successCount,
    fail_count: failCount,
    details: results,
  };
}
