'use client';
import { useState, useRef, useEffect } from 'react';

export default function WhatsAppFlowWidget({ tenant, flowConfig }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentVal, setCurrentVal] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  if (!flowConfig || !flowConfig.active) return null;

  const questions = flowConfig.questions || [];
  if (!questions.length) return null;

  const currentQ = questions[step] || null;
  const isLast = step === questions.length - 1;

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, step]);

  const handleNext = async (e) => {
    e.preventDefault();
    if (currentQ?.required && !currentVal.trim()) {
      setErrorMsg('Por favor, preencha este campo.');
      return;
    }
    setErrorMsg('');

    const newAnswers = { ...answers, [currentQ.id]: currentVal.trim() };
    setAnswers(newAnswers);
    setCurrentVal('');

    if (!isLast) {
      setStep(step + 1);
    } else {
      // Finaliza e envia
      setSending(true);
      try {
        const payload = {
          tenantId: tenant.id,
          tenant_slug: tenant.slug,
          name: newAnswers.name || Object.values(newAnswers)[0] || 'Leitor',
          phone: newAnswers.phone || newAnswers.whatsapp || '',
          email: newAnswers.email || '',
          answers: newAnswers,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        };

        const res = await fetch('/api/lead-capture/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const out = await res.json();

        if (out.whatsapp_url && out.open_whatsapp) {
          window.open(out.whatsapp_url, '_blank', 'noopener,noreferrer');
        }

        const tQuery = (tenant?.slug && tenant.slug !== 'braziw' && tenant.slug !== 'mercatta') ? `?tenant=${tenant.slug}` : '';
        const targetRedirect = out.redirect_url ? `${out.redirect_url}${tQuery ? `${out.redirect_url.includes('?') ? '&' : '?'}${tQuery.slice(1)}` : ''}` : `/obrigado/${tQuery}`;
        window.location.href = targetRedirect;
      } catch (err) {
        setErrorMsg('Falha ao enviar. Tente novamente.');
        setSending(false);
      }
    }
  };

  const primaryCol = tenant.primary_color || '#2563eb';
  const agentName = flowConfig.agent_name || tenant.name || 'Especialista';

  return (
    <aside aria-label="Atendimento via WhatsApp" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Botão Flutuante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir atendimento WhatsApp"
          style={{
            background: '#25D366',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.907.534 3.693 1.465 5.225L2 22l4.896-1.428A9.97 9.97 0 0 0 12.031 22c5.536 0 10.031-4.495 10.031-10.031C22.062 6.495 17.567 2 12.031 2Zm5.787 14.154c-.244.686-1.22 1.258-1.688 1.341-.453.08-1.042.144-3.385-.826-2.584-1.069-4.223-3.705-4.354-3.877-.129-.172-1.043-1.39-1.043-2.651s.662-1.879.897-2.137c.236-.258.514-.323.686-.323.172 0 .344.002.493.01.157.009.366-.06.574.437.215.515.73 1.782.794 1.91.065.129.108.28.022.453-.086.172-.129.28-.258.43-.129.151-.271.337-.387.452-.129.129-.263.269-.113.527.151.258.67 1.103 1.436 1.786.988.88 1.821 1.153 2.079 1.282.258.129.409.108.56-.065.15-.172.645-.752.817-1.01.172-.258.344-.215.58-.129.237.086 1.505.71 1.763.839.258.129.43.194.495.301.065.108.065.623-.179 1.309Z" />
          </svg>
          <span>{flowConfig.button_text || 'Falar no WhatsApp'}</span>
        </button>
      )}

      {/* Janela do Chat Interativo */}
      {open && (
        <div style={{
          width: '360px',
          maxWidth: 'calc(100vw - 32px)',
          background: '#0f172a',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'a-pop .25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            background: '#075E54',
            padding: '16px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#075E54',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}>
                {agentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>{agentName}</strong>
                <small style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac', display: 'inline-block' }} /> Online agora
                </small>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar atendimento WhatsApp"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Área de Conversa */}
          <div style={{ padding: '16px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
            <div>
              {/* Balão de Boas-vindas */}
              <div style={{
                background: '#1e293b',
                color: '#e2e8f0',
                padding: '12px 14px',
                borderRadius: '12px 12px 12px 2px',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {flowConfig.welcome_message || 'Olá! Como posso ajudar você hoje?'}
              </div>

              {/* Pergunta Atual */}
              {currentQ && (
                <div style={{
                  background: '#25D366',
                  color: '#042f1a',
                  padding: '12px 14px',
                  borderRadius: '12px 12px 2px 12px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  marginLeft: 'auto',
                  maxWidth: '88%',
                  lineHeight: '1.4',
                  boxShadow: '0 4px 12px rgba(37,211,102,0.2)',
                }}>
                  {currentQ.label}
                  <div style={{ fontSize: '0.72rem', color: '#064e3b', textAlign: 'right', marginTop: '4px' }}>
                    Pergunta {step + 1} de {questions.length}
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleNext} style={{ marginTop: '16px' }}>
              {errorMsg && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '6px' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={inputRef}
                  type={currentQ?.type || 'text'}
                  disabled={sending}
                  placeholder={currentQ?.placeholder || 'Digite sua resposta...'}
                  value={currentVal}
                  onChange={(e) => setCurrentVal(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    background: '#25D366',
                    color: '#042f1a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {sending ? '...' : (isLast ? 'Enviar' : '→')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
