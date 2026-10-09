import { query, queryOne } from './db.js';
import { getTenantById } from './tenant.js';

export const DEFAULT_FLOW_CONFIG = {
  active: false,
  agent_name: 'Especialista',
  agent_avatar: '',
  welcome_message: 'Olá! Seja muito bem-vindo. Preencha os campos abaixo para receber nosso contato personalizado.',
  button_text: 'Falar com Especialista',
  redirect_url: '/obrigado/',
  open_whatsapp_after: true,
  questions: [
    { id: 'name', label: 'Qual é o seu nome completo?', type: 'text', required: true, placeholder: 'Digite seu nome' },
    { id: 'phone', label: 'Qual é o seu WhatsApp com DDD?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
    { id: 'email', label: 'Qual é o seu melhor e-mail corporativo?', type: 'email', required: false, placeholder: 'seu@email.com' },
    { id: 'need', label: 'Como podemos te ajudar hoje?', type: 'text', required: true, placeholder: 'Descreva resumidamente seu objetivo' },
  ],
};

/**
 * Retorna as configurações do WhatsApp Flow para um tenant
 */
export async function getTenantFlowConfig(tenantId) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return DEFAULT_FLOW_CONFIG;

  let cfg = {};
  if (tenant.whatsapp_flow_config) {
    try {
      cfg = typeof tenant.whatsapp_flow_config === 'string'
        ? JSON.parse(tenant.whatsapp_flow_config)
        : tenant.whatsapp_flow_config;
    } catch {
      cfg = {};
    }
  }

  return {
    has_access: Boolean(tenant.has_whatsapp_flow),
    webhook_url: tenant.webhook_url || '',
    whatsapp_number: tenant.whatsapp || '',
    ...DEFAULT_FLOW_CONFIG,
    ...cfg,
  };
}

/**
 * Processa a captura de um lead vindo do WhatsApp Flow
 */
export async function processLeadCapture({ tenantId, name, phone, email, answers = {}, sourceUrl = '' }) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Empresa cliente não encontrada.');

  const flowConfig = await getTenantFlowConfig(tenantId);
  const webhookUrl = tenant.webhook_url || flowConfig.webhook_url;

  let webhookSent = false;
  let webhookResponse = '';

  const leadPayload = {
    event: 'lead_captured',
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    lead: {
      name: name || answers.name || 'Lead Anônimo',
      phone: phone || answers.phone || '',
      email: email || answers.email || '',
      answers,
      source_url: sourceUrl,
      captured_at: new Date().toISOString(),
    },
  };

  // Dispara webhook se configurado
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mercatta-WhatsApp-Flow/1.0',
        },
        body: JSON.stringify(leadPayload),
      });
      webhookSent = res.ok;
      webhookResponse = `HTTP ${res.status}`;
    } catch (err) {
      webhookSent = false;
      webhookResponse = `Erro: ${err.message}`;
    }
  }

  // Grava lead na tabela do banco de dados
  const savedLead = await queryOne(`
    INSERT INTO leads (
      tenant_id, name, phone, email, answers, source_url, webhook_sent, webhook_response
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [
    tenantId,
    leadPayload.lead.name,
    leadPayload.lead.phone,
    leadPayload.lead.email,
    JSON.stringify(answers),
    sourceUrl,
    webhookSent,
    webhookResponse,
  ]);

  // Monta link do WhatsApp com os dados estruturados
  let whatsappUrl = null;
  if (tenant.whatsapp) {
    const cleanPhone = tenant.whatsapp.replace(/\D/g, '');
    const msgLines = [
      `*Olá! Preenchi o formulário no blog ${tenant.name}:*`,
      `*Nome:* ${leadPayload.lead.name}`,
      `*Telefone:* ${leadPayload.lead.phone}`,
    ];
    if (leadPayload.lead.email) msgLines.push(`*E-mail:* ${leadPayload.lead.email}`);
    for (const [k, v] of Object.entries(answers)) {
      if (k !== 'name' && k !== 'phone' && k !== 'email' && v) {
        msgLines.push(`*${k}:* ${v}`);
      }
    }
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgLines.join('\n'))}`;
  }

  return {
    success: true,
    lead_id: savedLead.id,
    webhook_sent: webhookSent,
    redirect_url: flowConfig.redirect_url || '/obrigado/',
    open_whatsapp: flowConfig.open_whatsapp_after,
    whatsapp_url: whatsappUrl,
  };
}

/**
 * Envia um teste de Webhook para validação pelo cliente
 */
export async function testWebhook(webhookUrl, tenant) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Informe uma URL de Webhook válida iniciando com http:// ou https://');
  }

  const samplePayload = {
    event: 'test_webhook',
    timestamp: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    sample_lead: {
      name: 'João Silva (Teste)',
      phone: '(11) 98765-4321',
      email: 'joao.teste@exemplo.com.br',
      answers: {
        need: 'Consultoria e Soluções Empresariais',
        urgency: 'Imediato',
      },
      source_url: 'https://exemplo.com.br/blog/artigo-exemplo/',
    },
  };

  const start = Date.now();
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mercatta-WhatsApp-Flow/1.0' },
    body: JSON.stringify(samplePayload),
  });
  const latency = Date.now() - start;

  if (!res.ok) {
    throw new Error(`Webhook respondeu com erro HTTP ${res.status}. Verifique seu endpoint.`);
  }

  return { ok: true, status: res.status, latency_ms: latency };
}
