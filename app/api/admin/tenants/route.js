import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireUser } from '@/lib/guard.js';
import { listTenants, createTenant } from '@/lib/tenant.js';
import { query, queryOne } from '@/lib/db.js';

export async function GET() {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(req) {
  const user = await requireUser({ superadmin: true });
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    slug,
    custom_domain,
    subdomain,
    plan_name,
    monthly_price,
    primary_color,
    accent_color,
    button_color,
    button_text_color,
    bg_color,
    hero_bg_color,
    logo_url,
    favicon_url,
    site_title,
    site_tagline,
    site_description,
    contact_email,
    whatsapp,
    ai_posts_limit_month,
    has_whatsapp_flow,
    admin_name,
    admin_email,
    admin_password,
  } = body;

  try {
    const tenant = await createTenant({
      name,
      slug,
      custom_domain,
      subdomain,
      plan_name,
      monthly_price,
      primary_color,
      accent_color,
      button_color,
      button_text_color,
      bg_color,
      hero_bg_color,
      logo_url,
      favicon_url,
      site_title,
      site_tagline,
      site_description,
      contact_email,
      whatsapp,
      ai_posts_limit_month,
      has_whatsapp_flow,
    });

    // Se informou dados de administrador para o cliente, cria ou atualiza o usuário
    let clientUser = null;
    if (admin_email && admin_password) {
      const emailClean = admin_email.toLowerCase().trim();
      const existingUser = await queryOne('SELECT id, name, role FROM users WHERE lower(email) = $1', [emailClean]);
      const hash = await bcrypt.hash(admin_password, 10);
      if (existingUser) {
        if (existingUser.role !== 'superadmin') {
          await query(
            "UPDATE users SET tenant_id = $1, role = 'admin', password_hash = $2, name = COALESCE($3, name) WHERE id = $4",
            [tenant.id, hash, admin_name || null, existingUser.id]
          );
        }
        clientUser = { id: existingUser.id, email: emailClean, name: admin_name || existingUser.name };
      } else {
        const res = await queryOne(
          "INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ($1, $2, $3, 'admin', $4) RETURNING id, name, email",
          [admin_name || `Admin ${name}`, emailClean, hash, tenant.id]
        );
        clientUser = res;
      }
    }

    return NextResponse.json({ ok: true, tenant, clientUser });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
