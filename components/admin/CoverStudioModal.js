'use client';

import { useState, useEffect } from 'react';
import { COVER_PRESETS } from '@/lib/coverPresets.js';
import { Icon } from './ui.js';

export default function CoverStudioModal({
  isOpen,
  onClose,
  onApply,
  postTitle = '',
  postExcerpt = '',
  categoryName = '',
}) {
  const [highlightText, setHighlightText] = useState('');
  const [mainText, setMainText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(COVER_PRESETS[0].id);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [badgePos, setBadgePos] = useState('bottom-right');
  const [altText, setAltText] = useState('');

  const [busy, setBusy] = useState(''); // 'suggest' | 'render'
  const [error, setError] = useState('');

  // Carrega sugestão da IA ao abrir pela primeira vez se o título existir
  useEffect(() => {
    if (!isOpen) return;
    if (postTitle && !highlightText && !mainText) {
      handleSuggest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBg = customBgUrl.trim() || COVER_PRESETS.find((p) => p.id === selectedPreset)?.url || COVER_PRESETS[0].url;

  async function handleSuggest() {
    setBusy('suggest');
    setError('');
    try {
      const res = await fetch('/api/admin/covers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest',
          title: postTitle,
          excerpt: postExcerpt,
          category_name: categoryName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao sugerir com IA.');
      if (data.suggestion) {
        setHighlightText(data.suggestion.highlight_text || '');
        setMainText(data.suggestion.main_text || '');
        if (data.suggestion.preset_id) setSelectedPreset(data.suggestion.preset_id);
        if (data.suggestion.cover_alt) setAltText(data.suggestion.cover_alt);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleRenderAndApply() {
    setBusy('render');
    setError('');
    try {
      const res = await fetch('/api/admin/covers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'render',
          bgSource: customBgUrl.trim() || selectedPreset,
          highlightText: highlightText.trim(),
          mainText: mainText.trim(),
          template: 'classic_torn',
          badgePos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao renderizar capa.');
      if (data.cover) {
        onApply({
          cover_url: data.cover.url,
          cover_thumb: data.cover.thumb,
          cover_alt: altText || `${highlightText} ${mainText}`.trim(),
        });
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="a-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="a-modal-box cover-studio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="a-modal-header">
          <div>
            <h2>🎨 Estúdio de Capas Braziw</h2>
            <p className="a-hint" style={{ margin: 0 }}>Gere capas profissionais no padrão oficial do blog com assistência de IA.</p>
          </div>
          <button type="button" className="a-btn ghost sm" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {error && <div className="a-note error" style={{ margin: '16px 20px 0' }}>{error}</div>}

        <div className="cover-studio-body">
          {/* LADO ESQUERDO: PREVIEW DINÂMICO */}
          <div className="cover-preview-col">
            <div className="cover-canvas-container">
              {/* Imagem de fundo */}
              <img src={currentBg} alt="Fundo da Capa" className="cover-bg-layer" />

              {/* Vinheta de contraste */}
              <div className="cover-vignette-layer" />

              {/* Rasgo azul superior */}
              <svg className="cover-torn-top" viewBox="0 0 1200 65" preserveAspectRatio="none">
                <path d="M 0,0 L 1200,0 L 1200,52 L 1150,44 L 1100,56 L 1050,42 L 1000,54 L 950,46 L 900,58 L 850,45 L 800,55 L 750,43 L 700,56 L 650,45 L 600,57 L 550,44 L 500,56 L 450,42 L 400,55 L 350,43 L 300,56 L 250,44 L 200,54 L 150,42 L 100,55 L 50,43 L 0,54 Z" fill="#ffffff" opacity="0.9" />
                <path d="M 0,0 L 1200,0 L 1200,48 L 1150,40 L 1100,52 L 1050,38 L 1000,50 L 950,42 L 900,54 L 850,41 L 800,51 L 750,39 L 700,52 L 650,41 L 600,53 L 550,40 L 500,52 L 450,38 L 400,51 L 350,39 L 300,52 L 250,40 L 200,50 L 150,38 L 100,51 L 50,39 L 0,50 Z" fill="#0055a5" />
              </svg>

              {/* Rasgo vermelho inferior */}
              <svg className="cover-torn-bottom" viewBox="0 0 1200 65" preserveAspectRatio="none">
                <path d="M 0,65 L 1200,65 L 1200,12 L 1150,20 L 1100,10 L 1050,22 L 1000,11 L 950,24 L 900,10 L 850,22 L 800,11 L 750,23 L 700,10 L 650,22 L 600,11 L 550,23 L 500,10 L 450,22 L 400,11 L 350,24 L 300,10 L 250,22 L 200,12 L 150,24 L 100,10 L 50,22 L 0,12 Z" fill="#ffffff" opacity="0.9" />
                <path d="M 0,65 L 1200,65 L 1200,16 L 1150,24 L 1100,14 L 1050,26 L 1000,15 L 950,28 L 900,14 L 850,26 L 800,15 L 750,27 L 700,14 L 650,26 L 600,15 L 550,27 L 500,14 L 450,26 L 400,15 L 350,28 L 300,14 L 250,26 L 200,16 L 150,28 L 100,14 L 50,26 L 0,16 Z" fill="#ed2939" />
              </svg>

              {/* Selo oficial com logotipo Braziw */}
              <div className={`cover-badge ${badgePos}`}>
                <img src="/img/logo.png" alt="Braziw" />
              </div>

              {/* Tipografia em tempo real */}
              <div className="cover-text-content">
                {highlightText && <div className="cover-text-highlight">{highlightText}</div>}
                {mainText && <div className="cover-text-main">{mainText}</div>}
                {!highlightText && !mainText && (
                  <div className="cover-text-empty">Digite o texto ou clique em &ldquo;Sugerir com IA&rdquo;</div>
                )}
              </div>
            </div>

            <div className="cover-preview-footer">
              <span className="cover-ratio-tag">16:9 • 1200 × 675 px</span>
              <button
                type="button"
                className="a-btn ghost sm"
                disabled={busy === 'suggest'}
                onClick={handleSuggest}
              >
                <Icon name="sparkles" size={14} />
                {busy === 'suggest' ? 'Analisando artigo...' : 'Sugerir com IA (Gemini)'}
              </button>
            </div>
          </div>

          {/* LADO DIREITO: CONTROLES */}
          <div className="cover-controls-col">
            <div className="a-field">
              <label htmlFor="cov-hl">
                Texto em Amarelo (Destaque)
                <span className="a-hint" style={{ display: 'inline', marginLeft: 6 }}>2 a 4 palavras chamativas</span>
              </label>
              <input
                id="cov-hl"
                className="a-input"
                placeholder="EX.: O RESPEITO AO PADEIRO"
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value.toUpperCase())}
              />
            </div>

            <div className="a-field">
              <label htmlFor="cov-main">
                Texto em Branco (Complemento)
                <span className="a-hint" style={{ display: 'inline', marginLeft: 6 }}>Frase principal em maiúsculas</span>
              </label>
              <textarea
                id="cov-main"
                className="a-textarea"
                rows={2}
                placeholder="EX.: A PADARIA COMO CENTRO DOS BAIRROS FRANCESES"
                value={mainText}
                onChange={(e) => setMainText(e.target.value.toUpperCase())}
              />
            </div>

            <div className="a-field">
              <label>Escolher Foto Francesa de Fundo</label>
              <div className="cover-presets-grid">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`preset-thumb-btn${selectedPreset === p.id && !customBgUrl ? ' active' : ''}`}
                    onClick={() => { setSelectedPreset(p.id); setCustomBgUrl(''); }}
                    title={p.name}
                  >
                    <img src={p.thumb} alt={p.name} />
                    <span className="preset-name">{p.name.split('&')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="a-field" style={{ marginTop: 10 }}>
              <label htmlFor="cov-custom-url">Ou colar URL de imagem personalizada</label>
              <input
                id="cov-custom-url"
                className="a-input"
                placeholder="https://exemplo.com/foto.jpg"
                value={customBgUrl}
                onChange={(e) => setCustomBgUrl(e.target.value)}
              />
            </div>

            <div className="a-field">
              <label htmlFor="cov-alt">Texto Alternativo da Imagem (SEO Google)</label>
              <input
                id="cov-alt"
                className="a-input"
                placeholder="Descrição acessível da foto"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="a-modal-footer">
          <button type="button" className="a-btn ghost" onClick={onClose} disabled={!!busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="a-btn primary"
            disabled={!highlightText && !mainText || busy === 'render'}
            onClick={handleRenderAndApply}
          >
            {busy === 'render' ? 'Renderizando em Alta Resolução...' : '✨ Gerar e Aplicar no Artigo'}
          </button>
        </div>
      </div>
    </div>
  );
}
