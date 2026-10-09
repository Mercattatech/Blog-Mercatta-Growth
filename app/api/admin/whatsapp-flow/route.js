import { requireAdmin } from '@/lib/guard.js';
import { getTenantById, updateTenant } from '@/lib/tenant.js';
import { getTenantFlowConfig, testWebhook } from '@/lib/whatsappFlow.js';
import { query } from '@/lib/db.js';

export async function GET(req) {
  try {
    const user = await requireAdmin();
    const isSuper = user.role === 'superadmin';
    const url = new URL(req.url);
    const paramTenantId = url.searchParams.get('tenant_id');

    const tenantId = (isSuper && paramTenantId)
      ? Number(paramTenantId)
      : (user.tenant_id || 1);

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return Response.json({ error: 'Empresa cliente não encontrada.' }, { status: 404 });
    }

    const config = await getTenantFlowConfig(tenantId);

    // Superadmin sempre tem acesso a configurar e gerenciar
    if (isSuper) {
      config.has_access = true;
    }

    // Busca os últimos leads capturados desta empresa
    const leads = await query(`
      SELECT id, name, phone, email, answers, source_url, webhook_sent, webhook_response, created_at
      FROM leads
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [tenantId]);

    return Response.json({
      has_access: config.has_access,
      is_superadmin: isSuper,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        custom_domain: tenant.custom_domain,
        subdomain: tenant.subdomain,
        whatsapp: tenant.whatsapp,
        has_whatsapp_flow: Boolean(tenant.has_whatsapp_flow),
      },
      config,
      leads,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireAdmin();
    const isSuper = user.role === 'superadmin';
    const body = await req.json().catch(() => ({}));

    const tenantId = (isSuper && body.tenant_id)
      ? Number(body.tenant_id)
      : (user.tenant_id || 1);

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return Response.json({ error: 'Empresa cliente não encontrada.' }, { status: 404 });
    }

    // 1. Teste de Webhook
    if (body.action === 'test_webhook') {
      const res = await testWebhook(body.webhook_url, tenant);
      return Response.json(res);
    }

    // 2. Implantação Rápida no Blog de Qualquer Cliente (Superadmin)
    if (body.action === 'implant_tenant') {
      const flowConfig = {
        active: true,
        agent_name: body.agent_name || tenant.name || 'Especialista',
        agent_avatar: body.agent_avatar || tenant.logo_url || '',
        welcome_message: body.welcome_message || `Olá! Bem-vindo ao blog da ${tenant.name}. Preencha rapidamente para falar com nossa equipe no WhatsApp.`,
        button_text: body.button_text || 'Falar no WhatsApp',
        redirect_url: body.redirect_url || '/obrigado/',
        open_whatsapp_after: body.open_whatsapp_after !== false,
        questions: Array.isArray(body.questions) && body.questions.length ? body.questions : [
          { id: 'name', label: 'Qual é o seu nome completo?', type: 'text', required: true, placeholder: 'Digite seu nome' },
          { id: 'phone', label: 'Qual é o seu WhatsApp com DDD?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
          { id: 'email', label: 'Qual é o seu e-mail?', type: 'email', required: false, placeholder: 'seu@email.com' },
          { id: 'need', label: 'Como podemos te ajudar hoje?', type: 'text', required: true, placeholder: 'Descreva seu interesse' },
        ],
      };

      const updated = await updateTenant(tenantId, {
        has_whatsapp_flow: true,
        whatsapp_flow_config: flowConfig,
        webhook_url: body.webhook_url || tenant.webhook_url || null,
        whatsapp: body.whatsapp || tenant.whatsapp || null,
      });

      return Response.json({
        ok: true,
        message: `WhatsApp Flow implantado com sucesso no blog de ${tenant.name}!`,
        tenant: updated,
        config: flowConfig,
      });
    }

    // 3. Ativação / Desativação do Recurso no Plano do Cliente
    if (body.action === 'toggle_feature') {
      if (!isSuper) {
        return Response.json({ error: 'Apenas administradores gerais podem alterar permissões de plano.' }, { status: 403 });
      }
      const updated = await updateTenant(tenantId, {
        has_whatsapp_flow: Boolean(body.has_whatsapp_flow),
      });
      return Response.json({ ok: true, tenant: updated });
    }

    // Checagem de permissão do plano se não for superadmin
    if (!tenant.has_whatsapp_flow && !isSuper) {
      return Response.json({
        error: 'Este recurso faz parte do plano Premium de WhatsApp. Solicite a liberação ao administrador.',
      }, { status: 403 });
    }

    // 4. Salva configuração completa do fluxo, webhook e página de obrigado
    const flowConfig = {
      active: Boolean(body.active),
      agent_name: body.agent_name || 'Especialista',
      agent_avatar: body.agent_avatar || '',
      welcome_message: body.welcome_message || '',
      button_text: body.button_text || 'Falar com Especialista',
      redirect_url: body.redirect_url || '/obrigado/',
      open_whatsapp_after: body.open_whatsapp_after !== false,
      questions: Array.isArray(body.questions) ? body.questions : [],
    };

    const tenantUpdates = {
      whatsapp_flow_config: flowConfig,
      webhook_url: body.webhook_url || null,
    };

    if (body.whatsapp !== undefined) {
      tenantUpdates.whatsapp = body.whatsapp.trim();
    }

    if (isSuper && body.has_whatsapp_flow !== undefined) {
      tenantUpdates.has_whatsapp_flow = Boolean(body.has_whatsapp_flow);
    }

    const updated = await updateTenant(tenantId, tenantUpdates);

    return Response.json({ ok: true, tenant: updated, config: flowConfig });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 });
  }
}
