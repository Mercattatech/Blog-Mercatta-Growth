'use client';
import { useState, useEffect } from 'react';
import { api, toast, useBusy, Icon, Spin } from './ui.js';

// MODELOS PRONTOS DE ALTA CONVERSÃO PARA VENDA RÁPIDA
const QUICK_TEMPLATES = [
  {
    id: 'b2b',
    name: '💼 B2B / Consultoria & Serviços',
    desc: 'Ideal para empresas de serviços, software, consultorias e agências B2B.',
    agent_name: 'Consultor Comercial',
    welcome_message: 'Olá! Seja bem-vindo. Preencha os campos abaixo para receber uma análise personalizada da nossa equipe.',
    button_text: 'Solicitar Consultoria',
    questions: [
      { id: 'name', label: 'Qual é o seu nome completo?', type: 'text', required: true, placeholder: 'Ex: Carlos Silva' },
      { id: 'phone', label: 'Qual é o seu WhatsApp com DDD?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
      { id: 'email', label: 'Qual é o seu melhor e-mail corporativo?', type: 'email', required: false, placeholder: 'carlos@empresa.com' },
      { id: 'company_size', label: 'Qual é o tamanho atual da sua empresa?', type: 'text', required: true, placeholder: 'Ex: 5 a 20 funcionários' },
      { id: 'need', label: 'Qual é o principal desafio que deseja resolver?', type: 'text', required: true, placeholder: 'Descreva resumidamente' },
    ],
  },
  {
    id: 'health',
    name: '🏥 Clínica, Saúde & Estética',
    desc: 'Agendamento rápido de consultas, procedimentos estéticos e tratamentos.',
    agent_name: 'Atendimento & Triagem',
    welcome_message: 'Olá! Que bom ter você aqui. Quer saber mais sobre nossos tratamentos ou agendar uma avaliação?',
    button_text: 'Agendar Avaliação',
    questions: [
      { id: 'name', label: 'Como podemos te chamar?', type: 'text', required: true, placeholder: 'Seu nome' },
      { id: 'phone', label: 'Qual o seu WhatsApp para contato e confirmação?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
      { id: 'procedure', label: 'Qual procedimento ou especialidade você procura?', type: 'text', required: true, placeholder: 'Ex: Avaliação facial / Consulta' },
      { id: 'preference', label: 'Qual o melhor período para o seu atendimento?', type: 'text', required: false, placeholder: 'Manhã / Tarde' },
    ],
  },
  {
    id: 'realestate',
    name: '🏠 Imobiliária & Corretores',
    desc: 'Qualificação de compradores e investidores interessados em imóveis.',
    agent_name: 'Especialista Imobiliário',
    welcome_message: 'Olá! Encontre o imóvel ideal com as melhores condições da nossa carteira.',
    button_text: 'Buscar Imóveis Exclusivos',
    questions: [
      { id: 'name', label: 'Qual o seu nome?', type: 'text', required: true, placeholder: 'Seu nome completo' },
      { id: 'phone', label: 'Qual seu WhatsApp para receber as opções e fotos?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
      { id: 'objective', label: 'Qual o seu objetivo principal?', type: 'text', required: true, placeholder: 'Comprar ou Alugar' },
      { id: 'budget', label: 'Qual a faixa média de investimento pretendida?', type: 'text', required: false, placeholder: 'Ex: até R$ 800 mil' },
      { id: 'location', label: 'Qual bairro ou região você tem preferência?', type: 'text', required: false, placeholder: 'Ex: Região central' },
    ],
  },
  {
    id: 'retail',
    name: '🛒 Orçamento Rápido / Varejo',
    desc: 'Cotação expressa de produtos, atacado e orçamentos comerciais.',
    agent_name: 'Equipe de Vendas',
    welcome_message: 'Olá! Receba um orçamento rápido com preços especiais e condições de entrega.',
    button_text: 'Pedir Orçamento Rápido',
    questions: [
      { id: 'name', label: 'Qual o seu nome?', type: 'text', required: true, placeholder: 'Seu nome' },
      { id: 'phone', label: 'Qual o seu WhatsApp para envio do orçamento?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
      { id: 'product', label: 'Qual produto ou serviço você tem interesse?', type: 'text', required: true, placeholder: 'Ex: Lote de produtos / Peças' },
      { id: 'urgency', label: 'Quando você precisa dessa entrega?', type: 'text', required: false, placeholder: 'Urgente / Próxima semana' },
    ],
  },
  {
    id: 'fast',
    name: '⚡ Lead Flash (1 Minuto)',
    desc: 'Foco em conversão máxima com o menor atrito possível.',
    agent_name: 'Suporte Direto',
    welcome_message: 'Olá! Preencha rapidamente para falar diretamente com nosso especialista no WhatsApp.',
    button_text: 'Falar no WhatsApp Agora',
    questions: [
      { id: 'name', label: 'Qual o seu nome?', type: 'text', required: true, placeholder: 'Digite seu nome' },
      { id: 'phone', label: 'Qual o seu WhatsApp com DDD?', type: 'tel', required: true, placeholder: '(11) 99999-9999' },
      { id: 'message', label: 'Como podemos te ajudar?', type: 'text', required: true, placeholder: 'Dúvida ou solicitação' },
    ],
  },
];

export default function WhatsAppFlowManager({ initialData, user, isSuper = false, tenants = [], currentTenant: initialCurrentTenant }) {
  const [selectedTenantId, setSelectedTenantId] = useState(initialData?.tenant_id || initialCurrentTenant?.id || (tenants[0]?.id || 1));
  const [currentTenant, setCurrentTenant] = useState(initialCurrentTenant || tenants.find((t) => t.id === selectedTenantId) || null);
  const [hasAccess, setHasAccess] = useState(initialData?.has_access ?? isSuper);
  const [config, setConfig] = useState(initialData?.config || {});
  const [webhookUrl, setWebhookUrl] = useState(initialData?.config?.webhook_url || '');
  const [whatsappNumber, setWhatsappNumber] = useState(currentTenant?.whatsapp || initialData?.config?.whatsapp_number || '');
  const [leads, setLeads] = useState(initialData?.leads || []);
  const [busy, run] = useBusy();
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'templates' | 'leads'

  const questions = config.questions || [];

  // Recarrega os dados ao trocar de cliente (Superadmin)
  const handleSelectTenant = async (tenantId) => {
    setSelectedTenantId(Number(tenantId));
    try {
      const res = await api(`/api/admin/whatsapp-flow/?tenant_id=${tenantId}`);
      if (res.tenant) setCurrentTenant(res.tenant);
      if (res.config) {
        setConfig(res.config);
        setWebhookUrl(res.config.webhook_url || '');
        setWhatsappNumber(res.tenant?.whatsapp || res.config.whatsapp_number || '');
      }
      if (res.leads) setLeads(res.leads);
      setHasAccess(res.has_access || isSuper);
      toast(`Dados do cliente "${res.tenant?.name}" carregados.`, 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  // Aplica um modelo pronto com 1 clique
  const handleApplyTemplate = (tpl) => {
    setConfig({
      ...config,
      agent_name: tpl.agent_name,
      welcome_message: tpl.welcome_message,
      button_text: tpl.button_text,
      questions: tpl.questions,
    });
    setActiveTab('config');
    toast(`Modelo "${tpl.name}" aplicado! Não se esqueça de salvar ou implantar.`, 'ok');
  };

  const handleAddQuestion = () => {
    const newId = `q_${Date.now()}`;
    const updated = [
      ...questions,
      { id: newId, label: 'Nova pergunta', type: 'text', required: true, placeholder: '' },
    ];
    setConfig({ ...config, questions: updated });
  };

  const handleRemoveQuestion = (idx) => {
    const updated = questions.filter((_, i) => i !== idx);
    setConfig({ ...config, questions: updated });
  };

  const handleQuestionChange = (idx, field, val) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: val };
    setConfig({ ...config, questions: updated });
  };

  // Salvar configurações
  const handleSave = () => run('save', async () => {
    const res = await api('/api/admin/whatsapp-flow/', {
      method: 'POST',
      data: {
        tenant_id: selectedTenantId,
        ...config,
        webhook_url: webhookUrl,
        whatsapp: whatsappNumber,
        has_whatsapp_flow: hasAccess,
      },
    });
    if (res.tenant) setCurrentTenant(res.tenant);
    toast('Configurações do WhatsApp Flow salvas com sucesso!', 'ok');
  });

  // Implantação Imediata com 1 Clique no Blog do Cliente
  const handleImplantTenant = () => run('implant', async () => {
    if (!whatsappNumber) {
      toast('Informe o número de WhatsApp do cliente para direcionar os contatos.', 'err');
      return;
    }
    const res = await api('/api/admin/whatsapp-flow/', {
      method: 'POST',
      data: {
        action: 'implant_tenant',
        tenant_id: selectedTenantId,
        ...config,
        webhook_url: webhookUrl,
        whatsapp: whatsappNumber,
      },
    });
    if (res.tenant) setCurrentTenant(res.tenant);
    if (res.config) setConfig(res.config);
    setHasAccess(true);
    toast(`Sucesso! WhatsApp Flow implantado e ativado no blog de ${currentTenant?.name || 'cliente'}.`, 'ok');
  });

  // Testar Webhook com lead simulado
  const handleTestWebhook = () => run('test_webhook', async () => {
    if (!webhookUrl) {
      toast('Informe uma URL de webhook para testar.', 'err');
      return;
    }
    setTestResult(null);
    try {
      const res = await api('/api/admin/whatsapp-flow/', {
        method: 'POST',
        data: {
          action: 'test_webhook',
          tenant_id: selectedTenantId,
          webhook_url: webhookUrl,
        },
      });
      setTestResult({ ok: true, latency: res.latency_ms });
      toast(`Webhook testado com sucesso! Resposta HTTP ${res.status} recebida em ${res.latency_ms}ms.`, 'ok');
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
      toast(e.message, 'err');
    }
  });

  // Determina URL pública do blog do cliente
  const blogUrl = currentTenant?.custom_domain
    ? `https://${currentTenant.custom_domain}`
    : `/?tenant=${currentTenant?.slug || 'braziw'}`;

  const thankYouUrl = `/obrigado/${currentTenant?.slug ? `?tenant=${currentTenant.slug}` : ''}`;

  return (
    <div className="a-box" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* ========================================================================= */}
      {/* BARRA DO SUPERADMIN / SELETOR DE CLIENTE & IMPLANTAÇÃO RÁPIDA             */}
      {/* ========================================================================= */}
      {isSuper && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(139, 92, 246, 0.2))',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.25rem' }}>👑</span>
              <strong style={{ color: '#93c5fd', fontSize: '1rem' }}>
                Gerenciador Global — Dono do Aplicativo & Super Admin
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#cbd5e1' }}>
              Crie, personalize e implante o WhatsApp Lead Flow no blog de qualquer empresa cadastrada na plataforma.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px', fontWeight: 600 }}>
                Empresa Cliente:
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleSelectTenant(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: '220px',
                }}
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug}) {t.has_whatsapp_flow ? '🟢' : '⚪'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!!busy}
              onClick={handleImplantTenant}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '18px',
              }}
            >
              {busy === 'implant' ? <Spin /> : '🚀 Implantar no Blog deste Cliente'}
            </button>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="a-box-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>💬 WhatsApp Lead Flow — Captura & Conversão</h2>
          <p className="a-sub">
            Formulário gamificado inteligente estilo WhatsApp para qualificação de leads, integração com Webhook e Página de Obrigado.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.8125rem',
            padding: '5px 12px',
            borderRadius: '999px',
            fontWeight: 700,
            background: (currentTenant?.has_whatsapp_flow && config.active) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: (currentTenant?.has_whatsapp_flow && config.active) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: (currentTenant?.has_whatsapp_flow && config.active) ? '#4ade80' : '#f87171',
          }}>
            {currentTenant?.has_whatsapp_flow && config.active ? '● Ativo no Blog' : '○ Desativado no Blog'}
          </span>

          <a
            href={blogUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#1e293b',
              color: '#93c5fd',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>↗ Ver no Blog Público</span>
          </a>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS: CONFIGURAÇÃO / MODELOS DE VENDA RÁPIDA / LEADS CAPTURADOS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          style={{
            background: activeTab === 'config' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#1e293b',
            color: activeTab === 'config' ? '#ffffff' : '#94a3b8',
            border: activeTab === 'config' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ⚙️ Configuração do Fluxo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          style={{
            background: activeTab === 'templates' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : '#1e293b',
            color: activeTab === 'templates' ? '#ffffff' : '#fde047',
            border: activeTab === 'templates' ? '1px solid #a855f7' : '1px solid rgba(234, 179, 8, 0.3)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>⚡ Modelos Prontos para Venda Rápida</span>
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(234,179,8,0.25)', borderRadius: '4px', color: '#fde047' }}>
            5 Nichos
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          style={{
            background: activeTab === 'leads' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#1e293b',
            color: activeTab === 'leads' ? '#ffffff' : '#94a3b8',
            border: activeTab === 'leads' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          📋 Leads Capturados ({leads.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MODELOS PRONTOS DE ALTA CONVERSÃO PARA VENDA RÁPIDA                 */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.25rem', color: '#fde047' }}>
              ⚡ Modelos Prontos de Alta Conversão (1-Clique)
            </h3>
            <p className="a-sub" style={{ fontSize: '0.85rem' }}>
              Aplique formulários testados e validados para fechar contratos e implantar em clientes em menos de 1 minuto.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {QUICK_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'border-color 0.2s',
                }}
              >
                <div>
                  <strong style={{ fontSize: '1.05rem', color: '#f1f5f9', display: 'block', marginBottom: '0.35rem' }}>
                    {tpl.name}
                  </strong>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '0 0 0.75rem', lineHeight: '1.45' }}>
                    {tpl.desc}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <strong>Perguntas ({tpl.questions.length}):</strong>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1rem' }}>
                      {tpl.questions.slice(0, 3).map((q) => (
                        <li key={q.id}>{q.label}</li>
                      ))}
                      {tpl.questions.length > 3 && <li>...e mais {tpl.questions.length - 3} campos</li>}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  ⚡ Aplicar Este Modelo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONFIGURAÇÃO DO FLUXO, WHATSAPP, OBRIGADO E WEBHOOK                */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <>
          {/* SEÇÃO 1: STATUS, ATENDENTE E WHATSAPP */}
          <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="phone" size={18} /> Dados do Atendente & Destino no WhatsApp
            </h3>

            <div className="a-grid a-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="a-label">WhatsApp da Empresa (com DDD)</label>
                <input
                  type="tel"
                  className="a-input"
                  placeholder="(11) 99999-9999"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
                <small className="a-sub">Número que receberá a mensagem direta do lead já preenchida.</small>
              </div>

              <div>
                <label className="a-label">Nome do Atendente / Especialista</label>
                <input
                  type="text"
                  className="a-input"
                  placeholder="Ex: Consultor Especialista"
                  value={config.agent_name || ''}
                  onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                />
                <small className="a-sub">Nome exibido no topo da janela do chat interativo.</small>
              </div>
            </div>

            <div className="a-grid a-grid-2" style={{ gap: '1rem' }}>
              <div>
                <label className="a-label">Texto do Botão Flutuante</label>
                <input
                  type="text"
                  className="a-input"
                  placeholder="Ex: Falar com Especialista"
                  value={config.button_text || 'Falar com Especialista'}
                  onChange={(e) => setConfig({ ...config, button_text: e.target.value })}
                />
              </div>

              <div>
                <label className="a-label">URL do Avatar / Logotipo do Atendente</label>
                <input
                  type="url"
                  className="a-input"
                  placeholder="https://sua-empresa.com/avatar.png"
                  value={config.agent_avatar || ''}
                  onChange={(e) => setConfig({ ...config, agent_avatar: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label className="a-label">Mensagem de Boas-Vindas</label>
              <textarea
                className="a-textarea"
                rows="2"
                placeholder="Olá! Preencha as etapas a seguir para receber nosso atendimento personalizado."
                value={config.welcome_message || ''}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
              />
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label className="a-check" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!config.active}
                  onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                />
                <strong>Ativar widget flutuante no blog público da empresa</strong>
              </label>

              <label className="a-check" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.open_whatsapp_after !== false}
                  onChange={(e) => setConfig({ ...config, open_whatsapp_after: e.target.checked })}
                />
                <span>Abrir conversa no WhatsApp automaticamente após envio</span>
              </label>
            </div>
          </div>

          {/* SEÇÃO 2: PERGUNTAS DO FLUXO */}
          <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="chat" size={18} /> Perguntas do Fluxo Interativo ({questions.length})
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Adicionar Pergunta
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 100px 36px',
                    gap: '0.75rem',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <input
                      type="text"
                      className="a-input"
                      placeholder="Enunciado da pergunta"
                      value={q.label || ''}
                      onChange={(e) => handleQuestionChange(idx, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <select
                      className="a-input"
                      value={q.type || 'text'}
                      onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                    >
                      <option value="text">Texto livre</option>
                      <option value="tel">Telefone / WhatsApp</option>
                      <option value="email">E-mail</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!q.required}
                      onChange={(e) => handleQuestionChange(idx, 'required', e.target.checked)}
                    />
                    Obrigatório
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Remover pergunta"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 3: PÁGINA DE OBRIGADO & RASTREAMENTO */}
          <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="check" size={18} /> Página de Obrigado & Confirmação
              </h3>
              <a
                href={thankYouUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#1e293b',
                  color: '#93c5fd',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                ↗ Abrir Página de Obrigado do Cliente
              </a>
            </div>

            <p className="a-sub" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Para onde o lead é direcionado imediatamente após preencher o fluxo. Permite mensuração de conversões no Google Analytics, GTM e Meta Ads.
            </p>

            <div className="a-grid a-grid-1" style={{ gap: '1rem' }}>
              <div>
                <label className="a-label">URL de Redirecionamento (Página de Obrigado)</label>
                <input
                  type="text"
                  className="a-input"
                  placeholder="/obrigado/ ou https://seusite.com.br/obrigado"
                  value={config.redirect_url || '/obrigado/'}
                  onChange={(e) => setConfig({ ...config, redirect_url: e.target.value })}
                />
                <small className="a-sub">
                  O valor padrão <code>/obrigado/</code> utiliza a página institucional integrada com o logotipo e mensagem oficial do cliente.
                </small>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: LINK DE WEBHOOK (INTEGRAÇÃO DE DADOS) */}
          <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="link" size={18} /> Link de Webhook (Envio Instantâneo POST JSON)
            </h3>
            <p className="a-sub" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Envie automaticamente os leads capturados para sistemas externos: n8n, Make, Zapier, RD Station, HubSpot, ActiveCampaign ou seu CRM interno.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="a-label">URL do Webhook do Cliente (Endpoint de Destino)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  className="a-input"
                  placeholder="https://seu-webhook.com/api/lead ou n8n webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value.trim())}
                />
                <button
                  type="button"
                  disabled={busy === 'test_webhook'}
                  onClick={handleTestWebhook}
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {busy === 'test_webhook' ? <Spin /> : '⚡ Testar Webhook Agora'}
                </button>
              </div>
            </div>

            {testResult && (
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: testResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: testResult.ok ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                color: testResult.ok ? '#34d399' : '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {testResult.ok ? (
                  <span>✓ Sucesso! Webhook recebeu o payload e respondeu em {testResult.latency}ms.</span>
                ) : (
                  <span>✗ Falha ao testar webhook: {testResult.error}</span>
                )}
              </div>
            )}

            <div style={{ background: '#090d16', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#93c5fd' }}>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                Estrutura do Payload POST JSON enviado a cada lead:
              </strong>
              <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'monospace' }}>
{JSON.stringify({
  event: 'lead_captured',
  tenant: {
    id: currentTenant?.id || 1,
    name: currentTenant?.name || 'Cliente',
    slug: currentTenant?.slug || 'slug',
  },
  lead: {
    name: 'Nome do Lead',
    phone: '(11) 99999-9999',
    email: 'lead@empresa.com',
    answers: { need: 'Serviços de Marketing com IA', urgency: 'Imediato' },
    source_url: 'https://cliente.com.br/artigo-estrategico/',
    captured_at: '2026-10-11T12:00:00.000Z',
  },
}, null, 2)}
              </pre>
            </div>
          </div>

          {/* BOTÕES DE SALVAMENTO */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
            <button
              type="button"
              disabled={!!busy}
              onClick={handleSave}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {busy === 'save' ? <Spin /> : 'Salvar Alterações'}
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={handleImplantTenant}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {busy === 'implant' ? <Spin /> : `🚀 Implantar Imediatamente no Blog de ${currentTenant?.name || 'Cliente'}`}
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: TABELA DE LEADS CAPTURADOS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="users" size={18} /> Leads Capturados no Blog de {currentTenant?.name || 'Cliente'} ({leads.length})
          </h3>

          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📥</div>
              <p>Nenhum lead capturado ainda. Assim que um visitante preencher o fluxo, os dados aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>E-mail</th>
                    <th>Respostas</th>
                    <th>Webhook</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const d = new Date(lead.created_at);
                    let ans = {};
                    try {
                      ans = typeof lead.answers === 'string' ? JSON.parse(lead.answers) : (lead.answers || {});
                    } catch {}

                    return (
                      <tr key={lead.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#94a3b8' }}>
                          {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <strong>{lead.name || 'Sem nome'}</strong>
                        </td>
                        <td>
                          {lead.phone ? (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {lead.phone} ↗
                            </a>
                          ) : (
                            <span style={{ color: '#64748b' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{lead.email || '-'}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '240px' }}>
                            {Object.entries(ans).map(([k, v]) => (
                              <div key={k}>
                                <strong style={{ color: '#cbd5e1' }}>{k}:</strong> {String(v)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: lead.webhook_sent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: lead.webhook_sent ? '#34d399' : '#f87171',
                          }}>
                            {lead.webhook_sent ? '✓ Enviado' : '✗ Não enviado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
