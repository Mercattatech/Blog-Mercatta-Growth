'use client';
import { useState, useEffect } from 'react';
import { api, toast, useBusy, Icon, Spin } from './ui.js';

export default function ScheduleManager({ user, tenant: initialTenant, initialConfig, initialScheduled = [] }) {
  const [tenantInfo, setTenantInfo] = useState(initialTenant || null);
  const [config, setConfig] = useState(initialConfig || {
    articles_total: 4,
    frequency_days: 3,
    start_date: new Date().toISOString().slice(0, 10),
    preferred_time: '09:00',
    category_slug: '',
    status: 'active',
    is_continuous: false,
    cover_prompt: '',
  });
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [busy, run] = useBusy();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [refiningPrompt, setRefiningPrompt] = useState(false);

  // Estado da Barrinha de Progresso em Tempo Real
  const [progress, setProgress] = useState(null);

  const isEnterprise = tenantInfo?.plan_name === 'Enterprise' || user?.role === 'superadmin';
  const isContinuous = !!config.is_continuous;

  const loadData = async () => {
    try {
      const res = await api('/api/admin/schedule/');
      if (res.config) setConfig(res.config);
      if (res.scheduled) setScheduled(res.scheduled);
      if (res.tenant) setTenantInfo(res.tenant);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const handleSave = () => run('save', async () => {
    const res = await api('/api/admin/schedule/', { method: 'POST', data: config });
    toast('Configurações de agendamento salvas com sucesso!', 'ok');
    if (res.config) setConfig(res.config);
  });

  const handleRefineCoverPrompt = async () => {
    if (refiningPrompt) return;
    setRefiningPrompt(true);
    try {
      const res = await api('/api/admin/training/refine/', {
        method: 'POST',
        data: {
          fieldKey: 'cover_prompt',
          fieldLabel: 'Prompt e Estilo Visual para Capas de Artigos',
          currentValue: config.cover_prompt || 'Fotografia corporativa profissional e sofisticada com foco no contexto do negócio, iluminação natural, moderna e sem textos',
        },
      });
      if (res.refined) {
        setConfig((prev) => ({ ...prev, cover_prompt: res.refined }));
        toast('Prompt de capas aprimorado com sucesso pela IA!', 'ok');
      }
    } catch (err) {
      toast(err.message || 'Falha ao aprimorar prompt com IA', 'err');
    } finally {
      setRefiningPrompt(false);
    }
  };

  const handleSimulateEnterprise = async () => {
    try {
      const res = await api('/api/admin/schedule/', {
        method: 'POST',
        data: { action: 'upgrade_plan', plan_name: 'Enterprise' },
      });
      if (res.tenant) {
        setTenantInfo(res.tenant);
        setConfig((prev) => ({ ...prev, is_continuous: true }));
        setShowUpgradeModal(false);
        toast('Plano Enterprise ativado com sucesso! Modo Sem Término liberado.', 'ok');
      }
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  // GERAÇÃO COM BARRINHA DE PROGRESSO EM TEMPO REAL E ESTIMATIVA DE TÉRMINO
  const handleGenerateBatch = async () => {
    const totalToGen = isContinuous ? 8 : (Number(config.articles_total) || 4);
    const msg = isContinuous
      ? `Confirma a geração do lote contínuo de ${totalToGen} artigos inéditos com publicação a cada ${config.frequency_days} dias em Piloto Automático perpétuo?`
      : `Confirma a geração de um lote com ${totalToGen} artigos inéditos com capa e agendamento a cada ${config.frequency_days} dias?`;

    if (!confirm(msg)) return;

    // Estimativa inicial: ~7.5s por artigo + 3s de preparação
    const estimatedTotalSeconds = totalToGen * 8 + 3;
    setProgress({
      active: true,
      current: 0,
      total: totalToGen,
      percent: 6,
      currentTitle: 'Consultando voz da marca e pesquisando tendências inéditas...',
      step: 'init',
      secondsLeft: estimatedTotalSeconds,
      items: [],
      error: null,
    });

    // Cronômetro regressivo da barrinha de tempo restante
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!prev || !prev.active) return prev;
        return {
          ...prev,
          secondsLeft: Math.max(1, prev.secondsLeft - 1),
        };
      });
    }, 1000);

    try {
      // 1. Preparação das ideias inéditas
      const prepRes = await api('/api/admin/schedule/', {
        method: 'POST',
        data: {
          action: 'prepare_batch',
          articles_total: totalToGen,
          frequency_days: config.frequency_days,
          start_date: config.start_date,
          preferred_time: config.preferred_time,
          category_slug: config.category_slug || null,
          cover_prompt: config.cover_prompt || null,
        },
      });

      if (!prepRes.items || !prepRes.items.length) {
        throw new Error('A IA não conseguiu gerar ideias no momento. Verifique o treinamento da marca.');
      }

      const itemsToProcess = prepRes.items;
      const createdList = [];

      setProgress((prev) => ({
        ...prev,
        percent: 15,
        currentTitle: `Temas selecionados! Iniciando redação e design do 1º artigo...`,
      }));

      // 2. Processa cada artigo passo a passo com atualização em tempo real da barra
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        const stepNum = i + 1;
        const currentPercent = 15 + Math.round((i / itemsToProcess.length) * 80);

        setProgress((prev) => ({
          ...prev,
          current: stepNum,
          percent: currentPercent,
          currentTitle: item.title,
          step: 'writing',
          secondsLeft: Math.max(2, (itemsToProcess.length - i) * 8),
        }));

        const genRes = await api('/api/admin/schedule/', {
          method: 'POST',
          data: {
            action: 'generate_single',
            idea: item.idea,
            pubDate: item.pubDate,
            category_slug: config.category_slug || null,
            cover_prompt: config.cover_prompt || null,
            index: stepNum,
            total: itemsToProcess.length,
          },
        });

        if (genRes.article) {
          createdList.push(genRes.article);
          // Adiciona ao vivo na tabela de agendados
          setScheduled((prev) => [genRes.article, ...prev.filter((p) => p.id !== genRes.article.id)]);
          setProgress((prev) => ({
            ...prev,
            items: [...(prev?.items || []), genRes.article],
            percent: 15 + Math.round(((i + 1) / itemsToProcess.length) * 80),
          }));
        }
      }

      // 3. Finalização
      setProgress((prev) => ({
        ...prev,
        percent: 100,
        current: itemsToProcess.length,
        secondsLeft: 0,
        step: 'done',
        currentTitle: 'Todos os artigos foram gerados com capa e agendados no calendário!',
      }));

      toast(`Sucesso! ${createdList.length} artigos foram criados e agendados.`, 'ok');
      await loadData();
    } catch (err) {
      toast(err.message, 'err');
      setProgress((prev) => prev ? { ...prev, error: err.message, active: false } : null);
    } finally {
      clearInterval(timer);
    }
  };

  // Cálculo da data final estimada
  const startDateObj = config.start_date ? new Date(config.start_date) : new Date();
  const estimatedEnd = new Date(startDateObj);
  estimatedEnd.setDate(estimatedEnd.getDate() + ((Number(config.articles_total || 4) - 1) * Number(config.frequency_days || 3)));

  return (
    <div className="a-box" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* CABEÇALHO */}
      <div className="a-box-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📅 Agendamento Automático de Artigos com IA</h2>
          <p className="a-sub">
            Gere lotes de conteúdos estratégicos 100% inéditos baseados no treinamento da sua marca, com capas personalizadas e publicação escalonada.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.8125rem',
            padding: '6px 14px',
            borderRadius: '999px',
            fontWeight: 700,
            background: isEnterprise ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.35))' : 'rgba(59, 130, 246, 0.15)',
            border: isEnterprise ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(59, 130, 246, 0.3)',
            color: isEnterprise ? '#fde047' : '#93c5fd',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}>
            {isEnterprise ? '👑 Plano Enterprise (Sem Término Liberado)' : `Plano: ${tenantInfo?.plan_name || 'Pro Growth'}`}
          </span>
        </div>
      </div>

      {/* BLOCO DE BENEFÍCIOS */}
      <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="spark" size={18} /> Como funciona a automação inteligente:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--a-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <li><strong>Treinamento Ativo:</strong> A IA consulta a voz, público-alvo e nicho configurados no seu menu <em>Treinar a IA</em>.</li>
          <li><strong>Anti-Repetição Rigorosa:</strong> O sistema checa todos os artigos já publicados e agendados para nunca gerar temas repetidos ou semelhantes.</li>
          <li><strong>Capas Automáticas com Sua Marca:</strong> Cada artigo recebe uma imagem de capa de alta resolução com o logotipo e paleta oficial da empresa.</li>
          <li><strong>Publicação Pontual:</strong> Os artigos entram no ar automaticamente na data e hora definidas.</li>
        </ul>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO */}
      <div className="a-grid a-grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* CARD 1: VOLUME E MODO CONTÍNUO */}
        <div className="a-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--a-card, #131c38)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="doc" size={18} /> Volume do Plano & Ciclo
            </h3>
            {isEnterprise && (
              <span style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 600 }}>
                👑 Enterprise
              </span>
            )}
          </div>

          <label className="a-label">Quantidade de artigos no lote</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[4, 8, 12, 16].map((num) => {
              const active = !isContinuous && Number(config.articles_total) === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConfig({ ...config, articles_total: num, is_continuous: false })}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '999px',
                    fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: active ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#1e293b',
                    color: active ? '#ffffff' : '#94a3b8',
                    boxShadow: active ? '0 4px 14px rgba(37, 99, 235, 0.45)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#27354f';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#1e293b';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  {num} artigos
                </button>
              );
            })}

            {/* BOTÃO SEM TÉRMINO (PLANO MAIS CARO / ENTERPRISE) */}
            <button
              type="button"
              onClick={() => {
                if (isEnterprise) {
                  setConfig({ ...config, is_continuous: true, articles_total: 8 });
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '0.875rem',
                fontWeight: isContinuous ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isContinuous ? '1px solid #eab308' : '1px solid rgba(234, 179, 8, 0.4)',
                background: isContinuous
                  ? 'linear-gradient(135deg, #ca8a04, #eab308)'
                  : '#1e293b',
                color: isContinuous ? '#1e1b4b' : '#fde047',
                boxShadow: isContinuous ? '0 4px 18px rgba(234, 179, 8, 0.5)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              onMouseEnter={(e) => {
                if (!isContinuous) {
                  e.currentTarget.style.background = '#27354f';
                  e.currentTarget.style.color = '#fef08a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isContinuous) {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.color = '#fde047';
                }
              }}
              title={isEnterprise ? 'Modo Contínuo Sem Término' : 'Exclusivo Plano Enterprise'}
            >
              <span>♾️ Sem Término</span>
              {!isEnterprise && (
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(234,179,8,0.2)', borderRadius: '4px' }}>
                  👑 Enterprise
                </span>
              )}
            </button>
          </div>

          {isContinuous ? (
            <div style={{ padding: '0.85rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', marginBottom: '0.75rem' }}>
              <div style={{ color: '#fde047', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                <span>🔥 Piloto Automático Perpétuo Ativo</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                O sistema gerará artigos continuamente sem data de término, mantendo a frequência definida sem necessidade de renovação manual.
              </p>
            </div>
          ) : (
            <div>
              <input
                type="number"
                min="1"
                max="30"
                className="a-input"
                value={config.articles_total || 4}
                onChange={(e) => setConfig({ ...config, articles_total: Math.max(1, parseInt(e.target.value, 10) || 1), is_continuous: false })}
              />
              <small className="a-sub">Total de artigos a serem criados neste ciclo de automação.</small>
            </div>
          )}

          <label className="a-label" style={{ marginTop: '1rem' }}>Categoria Alvo</label>
          <select
            className="a-input"
            value={config.category_slug || ''}
            onChange={(e) => setConfig({ ...config, category_slug: e.target.value })}
          >
            <option value="">Alternar automaticamente entre todas as categorias</option>
            <option value="destaques">Destaques</option>
            <option value="noticias">Notícias</option>
            <option value="novidades">Novidades</option>
            <option value="lancamentos">Lançamentos</option>
          </select>
        </div>

        {/* CARD 2: FREQUÊNCIA E CALENDÁRIO */}
        <div className="a-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--a-card, #131c38)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="clock" size={18} /> Frequência & Calendário
          </h3>

          <label className="a-label">Frequência de postagem</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Diário (1 dia)', val: 1 },
              { label: 'A cada 2 dias', val: 2 },
              { label: 'A cada 3 dias', val: 3 },
              { label: 'Semanal (7 dias)', val: 7 },
            ].map((f) => {
              const active = Number(config.frequency_days) === f.val;
              return (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => setConfig({ ...config, frequency_days: f.val })}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '999px',
                    fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: active ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#1e293b',
                    color: active ? '#ffffff' : '#94a3b8',
                    boxShadow: active ? '0 4px 14px rgba(37, 99, 235, 0.45)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#27354f';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#1e293b';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="a-grid a-grid-2" style={{ gap: '1rem' }}>
            <div>
              <label className="a-label">Data do primeiro post</label>
              <input
                type="date"
                className="a-input"
                value={(config.start_date || '').slice(0, 10)}
                onChange={(e) => setConfig({ ...config, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="a-label">Horário preferencial</label>
              <input
                type="time"
                className="a-input"
                value={config.preferred_time || '09:00'}
                onChange={(e) => setConfig({ ...config, preferred_time: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8' }}>Cronograma estimado:</span><br />
            {isContinuous ? (
              <div style={{ marginTop: '0.25rem' }}>
                <strong style={{ color: '#fde047' }}>♾️ Publicação Contínua Sem Término</strong>
                <span style={{ color: '#93c5fd', marginLeft: '0.5rem' }}>
                  (Início: {startDateObj.toLocaleDateString('pt-BR')} • Post a cada {config.frequency_days} dias indefinidamente)
                </span>
              </div>
            ) : (
              <div style={{ marginTop: '0.25rem' }}>
                <strong>De {startDateObj.toLocaleDateString('pt-BR')} até {estimatedEnd.toLocaleDateString('pt-BR')}</strong>
                <span style={{ color: '#60a5fa', marginLeft: '0.5rem' }}>({config.articles_total} postagens distribuídas)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARD 3: PROMPT DE GERAÇÃO DAS CAPAS */}
      <div className="a-card" style={{
        padding: '1.5rem',
        borderRadius: '14px',
        background: 'linear-gradient(145deg, #101a36, #142145)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
              <span>🎨</span> Diretrizes & Prompt de Capas para Geração Automática
            </h3>
            <p className="a-sub" style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Cole aqui o prompt ou orientações de estilo para que as capas dos artigos gerados automaticamente fiquem sempre no contexto e estética desejados.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefineCoverPrompt}
            disabled={refiningPrompt || busy === 'save'}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.3))',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#c4b5fd',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: refiningPrompt ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
            title="Aprimorar suas diretrizes com Inteligência Artificial para gerar as melhores imagens"
          >
            {refiningPrompt ? <Spin /> : <Icon name="spark" size={15} />}
            <span>{refiningPrompt ? 'Aprimorando...' : 'Aprimorar Prompt com IA'}</span>
          </button>
        </div>

        <div style={{ position: 'relative', marginTop: '0.75rem' }}>
          <textarea
            rows={4}
            className="a-input"
            style={{
              width: '100%',
              lineHeight: '1.5',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f1f5f9',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
            value={config.cover_prompt || ''}
            onChange={(e) => setConfig({ ...config, cover_prompt: e.target.value })}
            placeholder="Ex: Fotografia profissional e sofisticada em alta resolução 8k, estilo editorial moderno corporativo, ambiente de inovação e negócios, iluminação suave natural, pessoas reais trabalhando em equipe com dashboards analíticos, paleta elegante em tons azul-marinho e grafite, sem textos na imagem..."
          />
        </div>

        {/* CHIPS DE SUGESTÃO RÁPIDA */}
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Sugestões rápidas de estilo:</span>
          {[
            {
              label: '💼 Executivo & Negócios',
              prompt: 'Fotografia executiva corporativa de alto padrão, profissionais em reuniões estratégicas e ambiente de escritório moderno, iluminação suave natural, atmosfera de liderança e crescimento, estética editorial, sem textos.',
            },
            {
              label: '🚀 Tecnologia & Inovação',
              prompt: 'Fotografia contemporânea de tecnologia e inovação, ambientes modernos com dados e interfaces digitais conceituais, iluminação sutil de estúdio, estética de alta tecnologia e crescimento, sem textos.',
            },
            {
              label: '📊 Finanças & Gestão',
              prompt: 'Ambiente financeiro sofisticado e contemporâneo, executivos analisando métricas e relatórios em salas corporativas de alto padrão, atmosfera sóbria e moderna, sem textos.',
            },
            {
              label: '✨ Minimalista Editorial',
              prompt: 'Fotografia editorial minimalista, paleta suave e neutra com espaços arejados, design contemporâneo sofisticado, foco na simplicidade elegante e arquitetura corporativa, sem textos.',
            },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setConfig({ ...config, cover_prompt: s.prompt })}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                e.currentTarget.style.color = '#93c5fd';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {s.label}
            </button>
          ))}
          {config.cover_prompt && (
            <button
              type="button"
              onClick={() => setConfig({ ...config, cover_prompt: '' })}
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '999px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpar
            </button>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>💡</span>
          <span>
            Caso deixe em branco, a IA aplicará as diretrizes de capa configuradas no menu <em>Treinar a IA</em> ou selecionará os presets fotográficos temáticos oficiais da sua empresa.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRINHA DE PROGRESSO EM TEMPO REAL COM ESTIMATIVA DE TÉRMINO             */}
      {/* ========================================================================= */}
      {progress && (
        <div style={{
          background: 'linear-gradient(145deg, #0e172a, #131c38)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* TOPO: STATUS E CONTAGEM REGRESSIVA DO TÉRMINO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {progress.step !== 'done' && <Spin />}
              <span style={{ fontWeight: 700, fontSize: '1rem', color: progress.step === 'done' ? '#4ade80' : '#60a5fa' }}>
                {progress.step === 'done'
                  ? '🎉 Lote Criado com Sucesso!'
                  : `Criando Artigos com IA (${progress.current} de ${progress.total})`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {progress.step !== 'done' && progress.secondsLeft > 0 && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8125rem',
                  color: '#fde047',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span>⏱️ Termina em aprox.:</span>
                  <strong>~{progress.secondsLeft} segundos</strong>
                </div>
              )}
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                {progress.percent}%
              </span>
            </div>
          </div>

          {/* BARRINHA DE PROGRESSO (VISUAL ANIMADO) */}
          <div style={{
            height: '14px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative',
            marginBottom: '0.85rem',
          }}>
            <div style={{
              height: '100%',
              width: `${progress.percent}%`,
              background: progress.step === 'done'
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #2563eb, #8b5cf6, #ec4899)',
              borderRadius: '999px',
              transition: 'width 0.4s ease-out',
              boxShadow: '0 0 14px rgba(139, 92, 246, 0.65)',
            }} />
          </div>

          {/* DETALHE DO ARTIGO ATUAL EM REDAÇÃO / DESIGN */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              <strong>Atividade atual:</strong> {progress.currentTitle}
            </span>
            {progress.step === 'done' && (
              <button
                type="button"
                onClick={() => setProgress(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.8rem',
                }}
              >
                Dispensar
              </button>
            )}
          </div>

          {/* LISTA AO VIVO DE ARTIGOS CONCLUÍDOS */}
          {progress.items && progress.items.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                Artigos concluídos neste lote ({progress.items.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                {progress.items.map((art) => {
                  const d = new Date(art.publish_at);
                  return (
                    <div key={art.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      {art.cover_thumb && (
                        <img src={art.cover_thumb} alt="" width="36" height="20" style={{ borderRadius: '3px', objectFit: 'cover' }} />
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#f1f5f9', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {art.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                        {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTÕES DE AÇÃO PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
        <button
          type="button"
          disabled={!!busy || (progress && progress.active && progress.step !== 'done')}
          onClick={handleSave}
          style={{
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#27354f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; }}
        >
          {busy === 'save' ? <Spin /> : 'Salvar Regras'}
        </button>

        <button
          type="button"
          disabled={!!busy || (progress && progress.active && progress.step !== 'done')}
          onClick={handleGenerateBatch}
          style={{
            background: isContinuous
              ? 'linear-gradient(135deg, #eab308, #ca8a04)'
              : 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: isContinuous ? '#1e1b4b' : '#ffffff',
            border: 'none',
            fontWeight: 700,
            padding: '10px 22px',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: isContinuous ? '0 4px 18px rgba(234, 179, 8, 0.45)' : '0 4px 16px rgba(37, 99, 235, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {progress && progress.active && progress.step !== 'done' ? (
            <><Spin /> Gerando Lote ({progress.current}/{progress.total})...</>
          ) : (
            <>
              <Icon name="spark" />
              {isContinuous
                ? `Iniciar Piloto Automático Contínuo (${config.frequency_days} em ${config.frequency_days} dias)`
                : `Gerar e Agendar Lote Agora (${config.articles_total} Artigos)`}
            </>
          )}
        </button>
      </div>

      {/* TABELA DE ARTIGOS AGENDADOS NO CALENDÁRIO */}
      <div className="a-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="clock" size={18} /> Artigos Agendados no Calendário ({scheduled.length})
          </h3>
          <button
            type="button"
            onClick={loadData}
            disabled={!!busy}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Atualizar
          </button>
        </div>

        {scheduled.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗓️</div>
            <p>Nenhum artigo agendado no momento. Use o botão acima para gerar seu primeiro lote de posts!</p>
          </div>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Título do Artigo</th>
                  <th>Data de Publicação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((p) => {
                  const d = new Date(p.publish_at);
                  return (
                    <tr key={p.id}>
                      <td style={{ width: '60px' }}>
                        {p.cover_thumb || p.cover_url ? (
                          <img src={p.cover_thumb || p.cover_url} alt="" width="54" height="30" style={{ borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 54, height: 30, background: '#1e293b', borderRadius: 4 }} />
                        )}
                      </td>
                      <td>
                        <strong>{p.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/{p.slug}/</div>
                      </td>
                      <td>
                        <strong>{d.toLocaleDateString('pt-BR')}</strong> às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className="badge badge-scheduled" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          ⏰ Agendado
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/admin/posts/${p.id}/`}
                          style={{
                            background: '#1e293b',
                            color: '#93c5fd',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          Editar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE UPGRADE / EXCLUSIVIDADE DO PLANO ENTERPRISE */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            position: 'relative',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👑</div>
              <h3 style={{ fontSize: '1.3rem', margin: 0, color: '#fde047' }}>
                Modo Sem Término (Piloto Contínuo)
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Exclusivo para empresas no <strong>Plano Enterprise (R$ 997/mês)</strong>
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#ffffff' }}>
                Benefícios do Piloto Automático Perpétuo:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Geração contínua sem limite de término de ciclo.</li>
                <li>Artigos inéditos publicados pontualmente a cada X dias.</li>
                <li>Capas automáticas com logotipo e identidade visual oficial.</li>
                <li>Monitoramento e indexação imediata no Google Search Console.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSimulateEnterprise}
                style={{
                  background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                  color: '#1e1b4b',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(234, 179, 8, 0.4)',
                }}
              >
                Ativar Plano Enterprise Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
