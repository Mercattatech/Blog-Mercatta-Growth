import nodemailer from 'nodemailer';

export const mailConfigured = () => Boolean(process.env.SMTP_HOST);

/** Envia e-mail via SMTP. Sem SMTP configurado, imprime no terminal (modo teste). */
export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) {
    console.log(`\n──────── E-MAIL (modo teste, SMTP não configurado) ────────\nPara: ${to}\nAssunto: ${subject}\n\n${text}\n────────────────────────────────────────────────────────────\n`);
    return { simulated: true };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to, subject, text, html,
  });
  return { simulated: false };
}

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (req) {
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${req.headers.get('host')}`;
  }
  return 'http://localhost:3100';
}

export function emailLayout(title, bodyHtml, buttonUrl, buttonLabel) {
  return `<!doctype html><html><body style="margin:0;background:#f3f6fc;font-family:Arial,sans-serif;color:#0f1b3d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:100%">
<tr><td style="background:#0a1a44;padding:24px 32px;color:#fff;font-size:20px;font-weight:bold">Blog Braziw <span style="color:#ffc92b">•</span> Painel</td></tr>
<tr><td style="padding:32px"><h1 style="font-size:22px;margin:0 0 16px">${title}</h1>${bodyHtml}
${buttonUrl ? `<p style="margin:28px 0"><a href="${buttonUrl}" style="background:#ffc92b;color:#1a1400;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;display:inline-block">${buttonLabel}</a></p>
<p style="font-size:13px;color:#5b6788">Se o botão não funcionar, copie este link:<br><span style="word-break:break-all">${buttonUrl}</span></p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}
