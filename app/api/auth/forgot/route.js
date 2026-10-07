import { queryOne } from '@/lib/db.js';
import { createResetToken } from '@/lib/auth.js';
import { emailLayout, sendMail, siteUrl } from '@/lib/mail.js';
import { body, isEmail, json, route } from '@/lib/api.js';

export const POST = route(async ({ req }) => {
  const { email } = await body(req);
  // Resposta idêntica exista ou não o e-mail (evita descobrir quem tem conta).
  const reply = () => json({ ok: true, message: 'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Ele vale por 1 hora.' });
  if (!isEmail(email)) return reply();

  const user = await queryOne('SELECT id, name, email, active FROM users WHERE lower(email) = lower($1)', [email.trim()]);
  if (!user || !user.active) return reply();

  // intervalo mínimo de 60 s entre pedidos
  const recent = await queryOne(`SELECT 1 AS x FROM password_resets WHERE user_id = $1 AND created_at > now() - interval '60 seconds'`, [user.id]);
  if (recent) return reply();

  const token = await createResetToken(user.id, 1);
  const link = `${siteUrl(req)}/admin/reset/?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Redefinição de senha — Blog Braziw',
    text: `Olá, ${user.name}!\n\nRecebemos um pedido para redefinir a sua senha. Acesse o link abaixo (vale por 1 hora):\n\n${link}\n\nSe não foi você, ignore este e-mail — nada será alterado.`,
    html: emailLayout('Redefinir sua senha',
      `<p>Olá, ${user.name.replace(/[<>&]/g, '')}!</p><p>Recebemos um pedido para redefinir a sua senha. O link vale por <strong>1 hora</strong>.</p><p style="color:#5b6788">Se não foi você, ignore este e-mail — nada será alterado.</p>`,
      link, 'Criar nova senha'),
  }).catch((e) => console.error('[forgot] falha ao enviar e-mail', e.message));
  return reply();
}, { auth: false });
