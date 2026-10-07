import { createResetToken } from './auth.js';
import { emailLayout, sendMail, siteUrl } from './mail.js';

/** Gera um link de definição de senha (48 h) e envia o convite por e-mail (ou imprime no terminal em modo teste). */
export async function sendInvite(req, user) {
  const token = await createResetToken(user.id, 48);
  const link = `${siteUrl(req)}/admin/reset/?token=${token}`;
  const role = user.role === 'admin' ? 'administrador' : 'autor';
  await sendMail({
    to: user.email,
    subject: 'Você foi convidado para o painel do Blog Braziw',
    text: `Olá, ${user.name}!\n\nSua conta (${role}) foi criada. Defina sua senha pelo link abaixo (vale por 48 horas):\n\n${link}`,
    html: emailLayout('Bem-vindo(a) ao painel',
      `<p>Olá, ${user.name.replace(/[<>&]/g, '')}!</p><p>Sua conta de <strong>${role}</strong> foi criada. Defina a sua senha — o link vale por <strong>48 horas</strong>.</p>`,
      link, 'Definir minha senha'),
  });
  return link;
}
