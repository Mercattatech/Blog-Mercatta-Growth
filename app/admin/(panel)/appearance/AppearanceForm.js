'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, toast, useBusy, Icon } from '@/components/admin/ui.js';

const PALETTES = [
  {
    name: 'Wise Madness Original',
    desc: 'Mesh verde-esmeralda e azul profundo, botão coral vibrante e amarelo solar',
    colors: {
      header_bg: '#ffffff',
      header_border: '#e2e8f0',
      header_text: '#0055ff',
      header_subtext: '#64748b',
      header_nav_color: '#475569',
      header_nav_active: '#0055ff',
      header_icon_color: '#0f172a',
      btn_header_bg: '#ff3d3d',
      btn_header_text: '#ffffff',

      hero_bg: 'linear-gradient(135deg, #093425 0%, #0d284a 55%, #081d3a 100%)',
      hero_blob_1: '#00e599',
      hero_blob_2: '#0066ff',
      hero_blob_3: '#ff0a23',
      hero_tag_bg: 'rgba(255, 255, 255, 0.14)',
      hero_tag_text: '#ffffff',
      hero_tag_border: 'rgba(255, 255, 255, 0.25)',
      hero_title: '#ffffff',
      hero_highlight: '#ffc92b',
      hero_highlight_2: '#ffe58a',
      hero_subtitle: '#cbd5e1',
      hero_stats_number: '#ffc92b',
      hero_stats_label: 'rgba(255, 255, 255, 0.75)',

      btn_primary_bg: '#ff3d3d',
      btn_primary_text: '#ffffff',
      btn_secondary_bg: 'rgba(255, 255, 255, 0.12)',
      btn_secondary_text: '#ffffff',
      btn_secondary_border: 'rgba(255, 255, 255, 0.3)',

      feature_card_bg: '#081229',
      feature_card_border: 'rgba(255, 255, 255, 0.12)',
      feature_title: '#ffffff',
      feature_text: '#cbd5e1',
      feature_meta: '#94a3b8',
      feature_cover_1: '#1e3a8a',
      feature_cover_2: '#dc2626',
      badge_bg: '#ffc92b',
      badge_text: '#000000',

      hero_mini_bg: 'rgba(255, 255, 255, 0.08)',
      hero_mini_border: 'rgba(255, 255, 255, 0.16)',
      hero_mini_title: '#ffffff',
      hero_mini_meta: '#cbd5e1',

      chips_bar_bg: '#ffffff',
      chips_bar_border: '#e2e8f0',
      chip_bg: '#eef2fa',
      chip_text: '#0f172a',
      chip_count_bg: '#ffffff',
      chip_count_text: '#64748b',

      section_title_color: '#0f172a',
      card_bg: '#ffffff',
      card_border: '#e2e8f0',
      card_title: '#0f172a',
      card_text: '#475569',
      card_meta: '#64748b',
      card_pill_bg: 'rgba(0, 85, 255, 0.1)',
      card_pill_text: '#0055ff',

      body_bg: '#f8fafc',
      body_text: '#0f172a',
      footer_bg: '#08112c',
      footer_text: '#94a3b8',
      footer_title: '#ffffff',

      primary_color: '#0055ff',
      accent_color: '#ff3d3d',
    },
  },
  {
    name: 'Dark Tech & Neon',
    desc: 'Grafite profundo com azul elétrico, acentos ciano e roxo luminoso',
    colors: {
      header_bg: '#090d16',
      header_border: '#1e293b',
      header_text: '#38bdf8',
      header_subtext: '#94a3b8',
      header_nav_color: '#94a3b8',
      header_nav_active: '#38bdf8',
      header_icon_color: '#38bdf8',
      btn_header_bg: '#2563eb',
      btn_header_text: '#ffffff',

      hero_bg: '#050811',
      hero_blob_1: '#2563eb',
      hero_blob_2: '#8b5cf6',
      hero_blob_3: '#06b6d4',
      hero_tag_bg: 'rgba(56, 189, 248, 0.15)',
      hero_tag_text: '#38bdf8',
      hero_tag_border: 'rgba(56, 189, 248, 0.35)',
      hero_title: '#f8fafc',
      hero_highlight: '#38bdf8',
      hero_highlight_2: '#a5f3fc',
      hero_subtitle: '#94a3b8',
      hero_stats_number: '#38bdf8',
      hero_stats_label: '#64748b',

      btn_primary_bg: '#3b82f6',
      btn_primary_text: '#ffffff',
      btn_secondary_bg: 'rgba(255, 255, 255, 0.08)',
      btn_secondary_text: '#ffffff',
      btn_secondary_border: 'rgba(56, 189, 248, 0.35)',

      feature_card_bg: '#0d1322',
      feature_card_border: 'rgba(56, 189, 248, 0.2)',
      feature_title: '#f8fafc',
      feature_text: '#94a3b8',
      feature_meta: '#64748b',
      feature_cover_1: '#2563eb',
      feature_cover_2: '#8b5cf6',
      badge_bg: '#38bdf8',
      badge_text: '#030712',

      hero_mini_bg: 'rgba(13, 19, 34, 0.75)',
      hero_mini_border: 'rgba(56, 189, 248, 0.2)',
      hero_mini_title: '#f8fafc',
      hero_mini_meta: '#64748b',

      chips_bar_bg: '#090d16',
      chips_bar_border: '#1e293b',
      chip_bg: '#111827',
      chip_text: '#f1f5f9',
      chip_count_bg: '#1e293b',
      chip_count_text: '#94a3b8',

      section_title_color: '#f8fafc',
      card_bg: '#0d1322',
      card_border: '#1e293b',
      card_title: '#f8fafc',
      card_text: '#94a3b8',
      card_meta: '#64748b',
      card_pill_bg: 'rgba(56, 189, 248, 0.15)',
      card_pill_text: '#38bdf8',

      body_bg: '#050811',
      body_text: '#f1f5f9',
      footer_bg: '#030712',
      footer_text: '#64748b',
      footer_title: '#f8fafc',

      primary_color: '#2563eb',
      accent_color: '#38bdf8',
    },
  },
  {
    name: 'Clean Corporativo',
    desc: 'Branco elegante com azul marinho institucional e detalhes em dourado nobre',
    colors: {
      header_bg: '#ffffff',
      header_border: '#e2e8f0',
      header_text: '#0f172a',
      header_subtext: '#64748b',
      header_nav_color: '#475569',
      header_nav_active: '#1e3a8a',
      header_icon_color: '#0f172a',
      btn_header_bg: '#1e3a8a',
      btn_header_text: '#ffffff',

      hero_bg: '#0f172a',
      hero_blob_1: '#1e3a8a',
      hero_blob_2: '#eab308',
      hero_blob_3: '#3b82f6',
      hero_tag_bg: 'rgba(255, 255, 255, 0.12)',
      hero_tag_text: '#ffffff',
      hero_tag_border: 'rgba(255, 255, 255, 0.25)',
      hero_title: '#ffffff',
      hero_highlight: '#eab308',
      hero_highlight_2: '#fef08a',
      hero_subtitle: '#cbd5e1',
      hero_stats_number: '#eab308',
      hero_stats_label: 'rgba(255, 255, 255, 0.7)',

      btn_primary_bg: '#1e3a8a',
      btn_primary_text: '#ffffff',
      btn_secondary_bg: 'rgba(255, 255, 255, 0.12)',
      btn_secondary_text: '#ffffff',
      btn_secondary_border: 'rgba(255, 255, 255, 0.25)',

      feature_card_bg: '#1e293b',
      feature_card_border: 'rgba(255, 255, 255, 0.15)',
      feature_title: '#ffffff',
      feature_text: '#cbd5e1',
      feature_meta: '#94a3b8',
      feature_cover_1: '#1e3a8a',
      feature_cover_2: '#eab308',
      badge_bg: '#eab308',
      badge_text: '#000000',

      hero_mini_bg: 'rgba(255, 255, 255, 0.08)',
      hero_mini_border: 'rgba(255, 255, 255, 0.15)',
      hero_mini_title: '#ffffff',
      hero_mini_meta: '#94a3b8',

      chips_bar_bg: '#ffffff',
      chips_bar_border: '#e2e8f0',
      chip_bg: '#f1f5f9',
      chip_text: '#0f172a',
      chip_count_bg: '#ffffff',
      chip_count_text: '#64748b',

      section_title_color: '#0f172a',
      card_bg: '#ffffff',
      card_border: '#e2e8f0',
      card_title: '#0f172a',
      card_text: '#475569',
      card_meta: '#64748b',
      card_pill_bg: 'rgba(30, 58, 138, 0.1)',
      card_pill_text: '#1e3a8a',

      body_bg: '#f8fafc',
      body_text: '#0f172a',
      footer_bg: '#0f172a',
      footer_text: '#94a3b8',
      footer_title: '#ffffff',

      primary_color: '#1e3a8a',
      accent_color: '#eab308',
    },
  },
  {
    name: 'Growth & Esmeralda',
    desc: 'Verde esmeralda moderno com menta luminosa e fundo ultra clean',
    colors: {
      header_bg: '#ffffff',
      header_border: '#d1fae5',
      header_text: '#065f46',
      header_subtext: '#059669',
      header_nav_color: '#374151',
      header_nav_active: '#059669',
      header_icon_color: '#065f46',
      btn_header_bg: '#10b981',
      btn_header_text: '#ffffff',

      hero_bg: '#064e3b',
      hero_blob_1: '#059669',
      hero_blob_2: '#10b981',
      hero_blob_3: '#fbbf24',
      hero_tag_bg: 'rgba(255, 255, 255, 0.15)',
      hero_tag_text: '#ffffff',
      hero_tag_border: 'rgba(255, 255, 255, 0.25)',
      hero_title: '#ffffff',
      hero_highlight: '#fbbf24',
      hero_highlight_2: '#fde68a',
      hero_subtitle: '#d1fae5',
      hero_stats_number: '#fbbf24',
      hero_stats_label: 'rgba(255, 255, 255, 0.8)',

      btn_primary_bg: '#10b981',
      btn_primary_text: '#ffffff',
      btn_secondary_bg: 'rgba(255, 255, 255, 0.12)',
      btn_secondary_text: '#ffffff',
      btn_secondary_border: 'rgba(255, 255, 255, 0.3)',

      feature_card_bg: '#042f2e',
      feature_card_border: 'rgba(255, 255, 255, 0.15)',
      feature_title: '#ffffff',
      feature_text: '#ccfbf1',
      feature_meta: '#a7f3d0',
      feature_cover_1: '#059669',
      feature_cover_2: '#10b981',
      badge_bg: '#10b981',
      badge_text: '#ffffff',

      hero_mini_bg: 'rgba(255, 255, 255, 0.08)',
      hero_mini_border: 'rgba(255, 255, 255, 0.15)',
      hero_mini_title: '#ffffff',
      hero_mini_meta: '#a7f3d0',

      chips_bar_bg: '#ffffff',
      chips_bar_border: '#d1fae5',
      chip_bg: '#ecfdf5',
      chip_text: '#065f46',
      chip_count_bg: '#ffffff',
      chip_count_text: '#059669',

      section_title_color: '#064e3b',
      card_bg: '#ffffff',
      card_border: '#d1fae5',
      card_title: '#064e3b',
      card_text: '#374151',
      card_meta: '#6b7280',
      card_pill_bg: '#ecfdf5',
      card_pill_text: '#059669',

      body_bg: '#f0fdf4',
      body_text: '#064e3b',
      footer_bg: '#064e3b',
      footer_text: '#a7f3d0',
      footer_title: '#ffffff',

      primary_color: '#065f46',
      accent_color: '#10b981',
    },
  },
];

function ColorField({ label, hint, value, onChange }) {
  const isHex = typeof value === 'string' && value.startsWith('#');
  const pickerVal = isHex ? (value.length === 7 ? value : value.slice(0, 7)) : '#2563eb';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>{hint}</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          position: 'relative',
          width: 38,
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: value,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          cursor: 'pointer'
        }}>
          <input
            type="color"
            value={pickerVal}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: '-8px',
              width: '160%',
              height: '160%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </div>
        <input
          type="text"
          className="a-input sm"
          style={{ fontFamily: 'monospace', fontSize: '0.8125rem', height: 36, flex: 1 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 ou rgba(...)"
        />
      </div>
    </div>
  );
}

export function AppearanceForm({ initialTenant, allTenants = [], isSuperAdmin = false }) {
  const router = useRouter();

  const parseTheme = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
  };

  const initialTheme = parseTheme(initialTenant?.theme_config);

  const [activeTab, setActiveTab] = useState('hero');
  const [hoveredSection, setHoveredSection] = useState(null);

  const [generalForm, setGeneralForm] = useState({
    site_title: initialTenant?.site_title || initialTenant?.name || '',
    site_tagline: initialTenant?.site_tagline || '',
    site_description: initialTenant?.site_description || '',
    logo_url: initialTenant?.logo_url || '',
    favicon_url: initialTenant?.favicon_url || '',
    whatsapp: initialTenant?.whatsapp || '',
    contact_email: initialTenant?.contact_email || '',
  });

  const [theme, setTheme] = useState({
    // Textos Editáveis do Cabeçalho
    header_title_text: initialTheme.header_title_text !== undefined ? initialTheme.header_title_text : (initialTenant?.site_title || initialTenant?.name || ''),
    header_tagline_text: initialTheme.header_tagline_text !== undefined ? initialTheme.header_tagline_text : (initialTenant?.site_tagline || ''),
    header_contact_text: initialTheme.header_contact_text || 'Fale Conosco',

    // Textos Editáveis do Banner Principal (Hero)
    hero_eyebrow_text: initialTheme.hero_eyebrow_text !== undefined ? initialTheme.hero_eyebrow_text : (initialTheme.hero_eyebrow || `✦ ${initialTenant?.name || ''}`),
    hero_title_text: initialTheme.hero_title_text !== undefined ? initialTheme.hero_title_text : (initialTenant?.site_title || 'Juntos, transformamos vidas e construímos um futuro melhor'),
    hero_highlight_text: initialTheme.hero_highlight_text !== undefined ? initialTheme.hero_highlight_text : (initialTenant?.site_tagline || 'Aqui o amor acontece'),
    hero_subtitle_text: initialTheme.hero_subtitle_text !== undefined ? initialTheme.hero_subtitle_text : (initialTenant?.site_description || 'Blog inteligente da ' + (initialTenant?.name || '')),
    hero_btn_text: initialTheme.hero_btn_text || 'Explorar artigos',
    hero_btn_search_text: initialTheme.hero_btn_search_text || 'Buscar no blog',

    // Header Colors
    header_bg: initialTheme.header_bg || '#ffffff',
    header_border: initialTheme.header_border || '#e2e8f0',
    header_text: initialTheme.header_text || initialTenant?.primary_color || '#0055ff',
    header_subtext: initialTheme.header_subtext || '#64748b',
    header_nav_color: initialTheme.header_nav_color || '#475569',
    header_nav_active: initialTheme.header_nav_active || initialTenant?.primary_color || '#0055ff',
    header_icon_color: initialTheme.header_icon_color || '#0f172a',
    btn_header_bg: initialTheme.btn_header_bg || initialTenant?.button_color || '#ff3d3d',
    btn_header_text: initialTheme.btn_header_text || initialTenant?.button_text_color || '#ffffff',

    // Hero Colors
    hero_bg: initialTheme.hero_bg || initialTenant?.hero_bg_color || 'linear-gradient(135deg, #093425 0%, #0d284a 55%, #081d3a 100%)',
    hero_blob_1: initialTheme.hero_blob_1 || '#00e599',
    hero_blob_2: initialTheme.hero_blob_2 || '#0066ff',
    hero_blob_3: initialTheme.hero_blob_3 || '#ff0a23',
    hero_tag_bg: initialTheme.hero_tag_bg || 'rgba(255, 255, 255, 0.14)',
    hero_tag_text: initialTheme.hero_tag_text || '#ffffff',
    hero_tag_border: initialTheme.hero_tag_border || 'rgba(255, 255, 255, 0.25)',
    hero_title: initialTheme.hero_title || '#ffffff',
    hero_highlight: initialTheme.hero_highlight || '#ffc92b',
    hero_highlight_2: initialTheme.hero_highlight_2 || '#ffe58a',
    hero_subtitle: initialTheme.hero_subtitle || '#cbd5e1',
    hero_stats_number: initialTheme.hero_stats_number || '#ffc92b',
    hero_stats_label: initialTheme.hero_stats_label || 'rgba(255, 255, 255, 0.75)',

    // Buttons
    btn_primary_bg: initialTheme.btn_primary_bg || initialTenant?.button_color || '#ff3d3d',
    btn_primary_text: initialTheme.btn_primary_text || initialTenant?.button_text_color || '#ffffff',
    btn_secondary_bg: initialTheme.btn_secondary_bg || 'rgba(255, 255, 255, 0.12)',
    btn_secondary_text: initialTheme.btn_secondary_text || '#ffffff',
    btn_secondary_border: initialTheme.btn_secondary_border || 'rgba(255, 255, 255, 0.3)',

    // Feature Card in Hero
    feature_card_bg: initialTheme.feature_card_bg || '#081229',
    feature_card_border: initialTheme.feature_card_border || 'rgba(255, 255, 255, 0.12)',
    feature_title: initialTheme.feature_title || '#ffffff',
    feature_text: initialTheme.feature_text || '#cbd5e1',
    feature_meta: initialTheme.feature_meta || '#94a3b8',
    feature_cover_1: initialTheme.feature_cover_1 || initialTenant?.primary_color || '#1e3a8a',
    feature_cover_2: initialTheme.feature_cover_2 || initialTenant?.accent_color || '#dc2626',
    badge_bg: initialTheme.badge_bg || '#ffc92b',
    badge_text: initialTheme.badge_text || '#000000',

    // Hero Mini Cards
    hero_mini_bg: initialTheme.hero_mini_bg || 'rgba(255, 255, 255, 0.08)',
    hero_mini_border: initialTheme.hero_mini_border || 'rgba(255, 255, 255, 0.16)',
    hero_mini_title: initialTheme.hero_mini_title || '#ffffff',
    hero_mini_meta: initialTheme.hero_mini_meta || '#cbd5e1',

    // Chips / Categories
    chips_bar_bg: initialTheme.chips_bar_bg || '#ffffff',
    chips_bar_border: initialTheme.chips_bar_border || '#e2e8f0',
    chip_bg: initialTheme.chip_bg || '#eef2fa',
    chip_text: initialTheme.chip_text || '#0f172a',
    chip_count_bg: initialTheme.chip_count_bg || '#ffffff',
    chip_count_text: initialTheme.chip_count_text || '#64748b',

    // Grid Post Cards
    section_title_color: initialTheme.section_title_color || '#0f172a',
    card_bg: initialTheme.card_bg || '#ffffff',
    card_border: initialTheme.card_border || '#e2e8f0',
    card_title: initialTheme.card_title || '#0f172a',
    card_text: initialTheme.card_text || '#475569',
    card_meta: initialTheme.card_meta || '#64748b',
    card_pill_bg: initialTheme.card_pill_bg || 'rgba(0, 85, 255, 0.1)',
    card_pill_text: initialTheme.card_pill_text || '#0055ff',

    // Body & Footer
    body_bg: initialTheme.body_bg || initialTenant?.bg_color || '#f8fafc',
    body_text: initialTheme.body_text || '#0f172a',
    footer_bg: initialTheme.footer_bg || '#08112c',
    footer_text: initialTheme.footer_text || '#94a3b8',
    footer_title: initialTheme.footer_title || '#ffffff',

    primary_color: initialTheme.primary_color || initialTenant?.primary_color || '#0055ff',
    accent_color: initialTheme.accent_color || initialTenant?.accent_color || '#ff3d3d',
  });

  const [busy, run] = useBusy();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconFileRef = useRef(null);

  const updateColor = (key, val) => {
    setTheme((prev) => ({ ...prev, [key]: val }));
  };

  const applyPalette = (palette) => {
    setTheme((prev) => ({ ...prev, ...palette.colors }));
    toast(`Paleta "${palette.name}" aplicada na visualização!`);
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/admin/upload/', { method: 'POST', form: formData });
      if (res.url) {
        setGeneralForm((prev) => ({ ...prev, logo_url: res.url }));
        toast('Logotipo atualizado!');
      }
    } catch (err) {
      toast(err.message || 'Erro ao carregar logotipo', 'err');
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadFavicon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/api/admin/upload/', { method: 'POST', form: formData });
      if (res.url) {
        setGeneralForm((prev) => ({ ...prev, favicon_url: res.url }));
        toast('Favicon (ícone da aba) atualizado!');
      }
    } catch (err) {
      toast(err.message || 'Erro ao carregar favicon', 'err');
    } finally {
      setUploadingFavicon(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    await run('save', async () => {
      const payload = {
        tenant_id: initialTenant.id,
        ...generalForm,
        primary_color: theme.primary_color,
        accent_color: theme.accent_color,
        button_color: theme.btn_primary_bg,
        button_text_color: theme.btn_primary_text,
        bg_color: theme.body_bg,
        hero_bg_color: theme.hero_bg,
        theme_config: theme,
      };

      await api('/api/admin/appearance/', {
        method: 'PATCH',
        data: payload,
      });
      toast('Todas as cores e configurações do blog foram salvas com sucesso!', 'ok');
    });
  };

  const brandName = generalForm.site_title || initialTenant?.name || 'Wise Madness';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '6rem' }}>
      {/* HEADER DO PAINEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>🎨 Personalização Completa de Cores da Tela</h1>
            {isSuperAdmin && allTenants.length > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: '#fff', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                SUPER ADMIN
              </span>
            )}
          </div>
          <p style={{ color: 'var(--muted)', margin: '0.35rem 0 0 0', fontSize: '0.925rem' }}>
            Controle separado para cada elemento visível do seu blog: cabeçalho, banner principal, botões, cards, chips e rodapé.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Seletor de Tenant para Superadmin */}
          {isSuperAdmin && allTenants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Empresa:</span>
              <select
                value={initialTenant?.id || ''}
                onChange={(e) => {
                  router.push(`/admin/appearance/?tenant_id=${e.target.value}`);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {allTenants.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          <a
            href={initialTenant?.slug ? `/?tenant=${initialTenant.slug}` : '/'}
            target="_blank"
            rel="noopener"
            className="a-btn ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Icon name="globe" size={16} /> Ver Blog ao Vivo
          </a>

          <button
            type="button"
            className="a-btn primary"
            onClick={handleSave}
            disabled={busy === 'save'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.65rem 1.4rem' }}
          >
            <Icon name="check" size={16} />
            {busy === 'save' ? 'Salvando...' : 'Salvar Todas as Cores'}
          </button>
        </div>
      </div>

      {/* MINIATURA DA TELA REAL DO BLOG (PREVIEW INTERATIVO AO VIVO) */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Barra superior de janela estilo browser */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--line)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
            </div>

            {/* Simulação da Aba Ativa com o Favicon Real */}
            <div
              onClick={() => setActiveTab('global')}
              title="Clique para editar o Favicon (Ícone da Aba)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface)',
                padding: '4px 12px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--line)',
                borderBottom: 'none',
                cursor: 'pointer',
                boxShadow: '0 -2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {generalForm.favicon_url || generalForm.logo_url ? (
                <img
                  src={generalForm.favicon_url || generalForm.logo_url}
                  alt="Favicon"
                  style={{ width: 15, height: 15, objectFit: 'contain', borderRadius: 3 }}
                />
              ) : (
                <span style={{ fontSize: 13 }}>🌐</span>
              )}
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {generalForm.site_title || brandName}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>✕</span>
            </div>

            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
              https://{initialTenant?.custom_domain || `${initialTenant?.slug || 'blog'}.mercatta.com.br`}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            💡 Dica: Clique em qualquer parte da tela para editar suas cores
          </span>
        </div>

        {/* CONTAINER DO BLOG REAL SIMULADO */}
        <div style={{
          background: theme.body_bg,
          color: theme.body_text,
          transition: 'all 0.25s ease',
          fontFamily: 'Outfit, Inter, sans-serif'
        }}>
          {/* 1. HEADER DO BLOG */}
          <div
            onClick={() => setActiveTab('header')}
            onMouseEnter={() => setHoveredSection('header')}
            onMouseLeave={() => setHoveredSection(null)}
            title="Clique para editar as cores do Header"
            style={{
              background: theme.header_bg,
              color: theme.header_text,
              borderBottom: `1px solid ${theme.header_border}`,
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              position: 'relative',
              outline: hoveredSection === 'header' || activeTab === 'header' ? '2px dashed #3b82f6' : 'none',
              outlineOffset: -2,
              transition: 'background 0.25s ease'
            }}
          >
            {hoveredSection === 'header' && (
              <span style={{ position: 'absolute', top: 4, right: 12, fontSize: 10, background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                ✏️ Editar Topo & Cabeçalho
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {generalForm.logo_url ? (
                <img
                  src={generalForm.logo_url}
                  alt={brandName}
                  style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }}
                />
              ) : (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: theme.primary_color,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 13
                }}>
                  {brandName.slice(0, 12).toUpperCase()}
                </div>
              )}
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: theme.header_text, lineHeight: 1.2 }}>
                  {theme.header_title_text !== undefined ? theme.header_title_text : (generalForm.site_title || brandName)}
                </strong>
                <small style={{ fontSize: '0.72rem', color: theme.header_subtext }}>
                  {theme.header_tagline_text !== undefined ? theme.header_tagline_text : (generalForm.site_tagline || 'Aqui o amor acontece')}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.header_nav_active }}>Início</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: theme.header_nav_color }}>Notícias</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: theme.header_nav_color }}>Novidades</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.header_icon_color }}>
                <Icon name="globe" size={16} />
                <Icon name="moon" size={16} />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveTab('header'); }}
                style={{
                  background: theme.btn_header_bg,
                  color: theme.btn_header_text,
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 16px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {theme.header_contact_text || 'Fale Conosco'}
              </button>
            </div>
          </div>

          {/* 2. HERO PRINCIPAL DO BLOG */}
          <div
            onClick={() => setActiveTab('hero')}
            onMouseEnter={() => setHoveredSection('hero')}
            onMouseLeave={() => setHoveredSection(null)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: theme.hero_bg,
              padding: '36px 28px 42px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 28,
              alignItems: 'center',
              isolation: 'isolate',
              cursor: 'pointer',
              outline: hoveredSection === 'hero' || activeTab === 'hero' ? '2px dashed #3b82f6' : 'none',
              outlineOffset: -2,
            }}
          >
            {/* LUZES / BLOBS DE FUNDO */}
            <div style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: theme.hero_blob_1,
              filter: 'blur(60px)',
              opacity: 0.55,
              top: -80,
              left: -40,
              zIndex: -1
            }} />
            <div style={{
              position: 'absolute',
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: theme.hero_blob_2,
              filter: 'blur(55px)',
              opacity: 0.45,
              right: '25%',
              top: '10%',
              zIndex: -1
            }} />
            <div style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: theme.hero_blob_3,
              filter: 'blur(60px)',
              opacity: 0.35,
              bottom: -60,
              left: '30%',
              zIndex: -1
            }} />

            {/* COLUNA ESQUERDA: TEXTO DO HERO */}
            <div>
              <span
                onClick={(e) => { e.stopPropagation(); setActiveTab('hero'); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: theme.hero_tag_bg,
                  color: theme.hero_tag_text,
                  border: `1px solid ${theme.hero_tag_border}`,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 14,
                }}
              >
                {theme.hero_eyebrow_text || `✦ ${brandName.toUpperCase()}`}
              </span>

              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                lineHeight: 1.25,
                margin: '0 0 14px 0',
                color: theme.hero_title
              }}>
                {theme.hero_title_text || 'Juntos, transformamos vidas e construímos um futuro melhor'}
                {theme.hero_highlight_text ? (
                  <>
                    {' '}—{' '}
                    <span style={{
                      background: `linear-gradient(100deg, ${theme.hero_highlight}, ${theme.hero_highlight_2 || '#ffe58a'} 50%, ${theme.hero_highlight})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      {theme.hero_highlight_text}
                    </span>
                  </>
                ) : null}
              </h2>

              <p style={{
                fontSize: '0.875rem',
                color: theme.hero_subtitle,
                margin: '0 0 20px 0',
                lineHeight: 1.5,
                maxWidth: 460
              }}>
                {theme.hero_subtitle_text || generalForm.site_description || 'Blog inteligente da ' + brandName}
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('hero'); }}
                  style={{
                    background: theme.btn_primary_bg,
                    color: theme.btn_primary_text,
                    border: 'none',
                    borderRadius: 9,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: `0 6px 18px ${theme.btn_primary_bg}66`,
                    cursor: 'pointer'
                  }}
                >
                  {theme.hero_btn_text || 'Explorar artigos'}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('hero'); }}
                  style={{
                    background: theme.btn_secondary_bg,
                    color: theme.btn_secondary_text,
                    border: `1px solid ${theme.btn_secondary_border}`,
                    borderRadius: 9,
                    padding: '8px 18px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {theme.hero_btn_search_text || 'Buscar no blog'}
                </button>
              </div>

              {/* STATS DO HERO */}
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <strong style={{ fontSize: '1.25rem', color: theme.hero_stats_number, display: 'block', lineHeight: 1 }}>3</strong>
                  <span style={{ fontSize: '0.72rem', color: theme.hero_stats_label }}>artigos</span>
                </div>
                <div>
                  <strong style={{ fontSize: '1.25rem', color: theme.hero_stats_number, display: 'block', lineHeight: 1 }}>4</strong>
                  <span style={{ fontSize: '0.72rem', color: theme.hero_stats_label }}>categorias</span>
                </div>
                <div>
                  <strong style={{ fontSize: '1.25rem', color: theme.hero_stats_number, display: 'block', lineHeight: 1 }}>2026</strong>
                  <span style={{ fontSize: '0.72rem', color: theme.hero_stats_label }}>no ar desde</span>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: CARD DE DESTAQUE + MINI CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* CARD DE DESTAQUE */}
              <div
                onClick={(e) => { e.stopPropagation(); setActiveTab('feature'); }}
                title="Clique para editar as cores do Card de Destaque"
                style={{
                  background: theme.feature_card_bg,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                  border: `1px solid ${theme.feature_card_border}`,
                  outline: activeTab === 'feature' ? '2px dashed #3b82f6' : 'none',
                }}
              >
                <div style={{
                  height: 120,
                  background: `linear-gradient(135deg, ${theme.feature_cover_1}, ${theme.feature_cover_2})`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: '#fff',
                  textAlign: 'center',
                  padding: 10
                }}>
                  {generalForm.logo_url ? (
                    <img
                      src={generalForm.logo_url}
                      alt=""
                      style={{ maxHeight: 30, maxWidth: 90, background: '#fff', padding: '3px 8px', borderRadius: 6 }}
                    />
                  ) : (
                    <span style={{ background: '#fff', color: '#0f172a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                      {brandName.slice(0, 12)}
                    </span>
                  )}
                  <strong style={{ fontSize: 11, maxWidth: '85%' }}>Voluntariado Estratégico: Guia para Líderes</strong>
                </div>

                <div style={{ padding: '12px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    background: theme.badge_bg,
                    color: theme.badge_text,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: 4,
                    marginBottom: 8
                  }}>
                    DESTAQUE
                  </span>

                  <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: theme.feature_title,
                    margin: '0 0 6px 0',
                    lineHeight: 1.3
                  }}>
                    Voluntariado Estratégico: Guia para Líderes
                  </h3>

                  <p style={{
                    fontSize: '0.78rem',
                    color: theme.feature_text,
                    margin: '0 0 10px 0',
                    lineHeight: 1.4
                  }}>
                    Aprenda a estruturar programas de voluntariado estratégico em sua empresa. Conecte equipes a causas sociais e gere impacto real no Brasil.
                  </p>

                  <small style={{ fontSize: '0.72rem', color: theme.feature_meta }}>
                    8 de outubro de 2026 • 3 min de leitura
                  </small>
                </div>
              </div>

              {/* MINI CARDS DO HERO */}
              <div
                onClick={(e) => { e.stopPropagation(); setActiveTab('mini'); }}
                title="Clique para editar as cores dos Mini Cards"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  outline: activeTab === 'mini' ? '2px dashed #3b82f6' : 'none',
                }}
              >
                <div style={{
                  background: theme.hero_mini_bg,
                  border: `1px solid ${theme.hero_mini_border}`,
                  borderRadius: 12,
                  padding: 10
                }}>
                  <div style={{ height: 46, borderRadius: 8, background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.accent_color})`, marginBottom: 6 }} />
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: theme.hero_mini_title, lineHeight: 1.2, marginBottom: 4 }}>
                    Apoio a Crianças Carentes: Impacto Real no Brasil
                  </strong>
                  <small style={{ fontSize: '0.68rem', color: theme.hero_mini_meta }}>08 out 2026 • 4 min</small>
                </div>

                <div style={{
                  background: theme.hero_mini_bg,
                  border: `1px solid ${theme.hero_mini_border}`,
                  borderRadius: 12,
                  padding: 10
                }}>
                  <div style={{ height: 46, borderRadius: 8, background: `linear-gradient(135deg, ${theme.accent_color}, ${theme.primary_color})`, marginBottom: 6 }} />
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: theme.hero_mini_title, lineHeight: 1.2, marginBottom: 4 }}>
                    Doações Corporativas: Guia para Empresas Solidárias
                  </strong>
                  <small style={{ fontSize: '0.68rem', color: theme.hero_mini_meta }}>Curiosidade • 3 min</small>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BARRA DE CATEGORIAS (CHIPS) */}
          <div
            onClick={() => setActiveTab('chips')}
            title="Clique para editar a barra de categorias"
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              outline: activeTab === 'chips' ? '2px dashed #3b82f6' : 'none',
            }}
          >
            <div style={{
              background: theme.chips_bar_bg,
              border: `1px solid ${theme.chips_bar_border}`,
              borderRadius: 16,
              padding: '10px 16px',
              display: 'flex',
              gap: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.chip_text, marginRight: 4 }}>Categorias:</span>
              {['Notícias', 'Novidades', 'Lançamento', 'Destaques'].map((c, i) => (
                <span
                  key={c}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: theme.chip_bg,
                    color: theme.chip_text,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  ✦ {c} <b style={{ background: theme.chip_count_bg, color: theme.chip_count_text, fontSize: 10, padding: '1px 5px', borderRadius: 99 }}>1</b>
                </span>
              ))}
            </div>
          </div>

          {/* 4. GRADE DE ARTIGOS (FEED) */}
          <div
            onClick={() => setActiveTab('cards')}
            title="Clique para editar as cores dos Cards da Grade"
            style={{
              padding: '16px 24px 28px',
              cursor: 'pointer',
              outline: activeTab === 'cards' ? '2px dashed #3b82f6' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '2px solid rgba(0,0,0,0.06)', paddingBottom: 8 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: theme.section_title_color }}>
                Últimos artigos
              </h3>
              <span style={{ fontSize: '0.75rem', color: theme.card_meta }}>3 publicações</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{
                background: theme.card_bg,
                border: `1px solid ${theme.card_border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 80, background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.accent_color})` }} />
                <div style={{ padding: 12 }}>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: theme.card_pill_bg, color: theme.card_pill_text, marginBottom: 6 }}>
                    Notícias
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: theme.card_title, marginBottom: 4 }}>
                    Transformando Realidades Através da Educação
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: theme.card_text, margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    Conheça as iniciativas e metodologias que estão mudando o cenário social.
                  </p>
                  <small style={{ fontSize: '0.7rem', color: theme.card_meta }}>08 out 2026 • 5 min de leitura</small>
                </div>
              </div>

              <div style={{
                background: theme.card_bg,
                border: `1px solid ${theme.card_border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 80, background: `linear-gradient(135deg, ${theme.accent_color}, ${theme.hero_blob_1})` }} />
                <div style={{ padding: 12 }}>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: theme.card_pill_bg, color: theme.card_pill_text, marginBottom: 6 }}>
                    Destaques
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: theme.card_title, marginBottom: 4 }}>
                    Como Empresas Podem Praticar ESG com Ações Reais
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: theme.card_text, margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    Guia prático para pequenas e médias empresas gerarem impacto mensurável.
                  </p>
                  <small style={{ fontSize: '0.7rem', color: theme.card_meta }}>08 out 2026 • 4 min de leitura</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PALETAS RÁPIDAS (TEMAS PRONTOS) */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            🎨 Paletas Prontas de 1-Clique (Carrega todas as cores harmonicamente):
          </strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Você pode personalizar qualquer campo separadamente depois</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {PALETTES.map((pal) => (
            <button
              key={pal.name}
              type="button"
              onClick={() => applyPalette(pal)}
              className="a-btn ghost"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: 12,
                textAlign: 'left',
                border: '1px solid var(--line)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 4 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: pal.colors.primary_color }} />
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: pal.colors.accent_color }} />
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: pal.colors.btn_primary_bg }} />
                <strong style={{ fontSize: '0.85rem', marginLeft: 4 }}>{pal.name}</strong>
              </div>
              <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{pal.desc}</small>
            </button>
          ))}
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS COMPLETAMENTE SEPARADAS */}
      <div style={{
        display: 'flex',
        gap: 6,
        borderBottom: '1px solid var(--line)',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        <button
          type="button"
          className={`a-btn ${activeTab === 'hero' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('hero')}
        >
          🌟 1. Banner Principal (Textos & Cores)
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'header' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('header')}
        >
          📌 2. Topo & Cabeçalho (Textos & Cores)
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'buttons' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('buttons')}
        >
          🔘 3. Botões de Ação (CTAs)
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'feature' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('feature')}
        >
          🏆 4. Card de Destaque
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'mini' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('mini')}
        >
          📱 5. Mini Cards no Hero
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'chips' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('chips')}
        >
          🏷️ 6. Barra de Categorias
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'cards' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('cards')}
        >
          📰 7. Grade de Artigos (Feed)
        </button>
        <button
          type="button"
          className={`a-btn ${activeTab === 'global' ? 'primary' : 'ghost'} sm`}
          onClick={() => setActiveTab('global')}
        >
          🌐 8. Fundo Geral & Logo
        </button>
      </div>

      {/* FORMULÁRIO COM TODAS AS CORES SEPARADAS */}
      <form onSubmit={handleSave}>
        {/* ABA 1: BANNER PRINCIPAL (HERO) */}
        {activeTab === 'hero' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🌟 Banner Principal (Hero)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Edite aqui todos os textos do banner principal (título, destaque, subtítulo e botões) e personalize suas cores separadamente.
              </p>
            </div>

            {/* BLOCO DE TEXTOS DO HERO */}
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                  ✍️ Textos do Banner Principal
                </strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Altere o que está escrito no topo do blog em tempo real (veja o preview acima).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Selo do Topo (Eyebrow / Tag)</label>
                  <input
                    className="a-input"
                    value={theme.hero_eyebrow_text || ''}
                    onChange={(e) => updateColor('hero_eyebrow_text', e.target.value)}
                    placeholder="ex: ✦ WISEMADNESS ou Novidades 2026"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Pequena pílula de destaque acima do título</small>
                </div>

                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Texto Destacado (Gradiente / Dourado)</label>
                  <input
                    className="a-input"
                    value={theme.hero_highlight_text || ''}
                    onChange={(e) => updateColor('hero_highlight_text', e.target.value)}
                    placeholder="ex: Aqui o amor acontece"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Parte do título com destaque colorido especial</small>
                </div>

                <div className="a-field" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Título Principal do Banner (H1)</label>
                  <input
                    className="a-input"
                    value={theme.hero_title_text || ''}
                    onChange={(e) => updateColor('hero_title_text', e.target.value)}
                    placeholder="ex: Juntos, transformamos vidas e construímos um futuro melhor"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Frase principal de abertura do seu blog</small>
                </div>

                <div className="a-field" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Subtítulo / Descrição do Banner</label>
                  <textarea
                    className="a-input"
                    rows={2}
                    value={theme.hero_subtitle_text || ''}
                    onChange={(e) => updateColor('hero_subtitle_text', e.target.value)}
                    placeholder="ex: Projetos sociais, histórias reais e como você pode transformar o Brasil..."
                    style={{ resize: 'vertical' }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Texto explicativo que fica logo abaixo do título principal</small>
                </div>

                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Texto do Botão Principal</label>
                  <input
                    className="a-input"
                    value={theme.hero_btn_text || ''}
                    onChange={(e) => updateColor('hero_btn_text', e.target.value)}
                    placeholder="ex: Explorar artigos"
                  />
                </div>

                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Texto do Botão de Busca</label>
                  <input
                    className="a-input"
                    value={theme.hero_btn_search_text || ''}
                    onChange={(e) => updateColor('hero_btn_search_text', e.target.value)}
                    placeholder="ex: Buscar no blog"
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: 12, color: 'var(--text)' }}>
                🎨 Cores do Banner Principal:
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo do Banner Hero"
                hint="Cor sólida ou gradiente CSS"
                value={theme.hero_bg}
                onChange={(v) => updateColor('hero_bg', v)}
              />
              <ColorField
                label="Título Principal H1"
                hint="Cor do texto principal do título"
                value={theme.hero_title}
                onChange={(v) => updateColor('hero_title', v)}
              />
              <ColorField
                label="Palavra em Destaque no H1"
                hint="ex: 'Aqui o amor acontece'"
                value={theme.hero_highlight}
                onChange={(v) => updateColor('hero_highlight', v)}
              />
              <ColorField
                label="2ª Cor do Destaque (Gradiente)"
                hint="Tom de transição do gradiente"
                value={theme.hero_highlight_2}
                onChange={(v) => updateColor('hero_highlight_2', v)}
              />
              <ColorField
                label="Subtítulo / Descrição"
                hint="Texto de apoio abaixo do título"
                value={theme.hero_subtitle}
                onChange={(v) => updateColor('hero_subtitle', v)}
              />
              <ColorField
                label="Fundo da Tag da Empresa"
                hint="ex: '+ WISEMADNESS'"
                value={theme.hero_tag_bg}
                onChange={(v) => updateColor('hero_tag_bg', v)}
              />
              <ColorField
                label="Texto da Tag da Empresa"
                hint="Cor da letra da pílula"
                value={theme.hero_tag_text}
                onChange={(v) => updateColor('hero_tag_text', v)}
              />
              <ColorField
                label="Borda da Tag da Empresa"
                hint="Contorno sutil da pílula"
                value={theme.hero_tag_border}
                onChange={(v) => updateColor('hero_tag_border', v)}
              />
              <ColorField
                label="Números das Estatísticas"
                hint="ex: '3 artigos', '4 categorias'"
                value={theme.hero_stats_number}
                onChange={(v) => updateColor('hero_stats_number', v)}
              />
              <ColorField
                label="Rótulos das Estatísticas"
                hint="Palavras explicativas dos números"
                value={theme.hero_stats_label}
                onChange={(v) => updateColor('hero_stats_label', v)}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 12 }}>
                Luzes de Orbe / Blobs Decorativos de Fundo:
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <ColorField
                  label="Luz Esquerda (Orbe 1)"
                  hint="Foco de luz superior esquerdo"
                  value={theme.hero_blob_1}
                  onChange={(v) => updateColor('hero_blob_1', v)}
                />
                <ColorField
                  label="Luz Direita (Orbe 2)"
                  hint="Foco de luz lateral direito"
                  value={theme.hero_blob_2}
                  onChange={(v) => updateColor('hero_blob_2', v)}
                />
                <ColorField
                  label="Luz Inferior (Orbe 3)"
                  hint="Foco de luz central inferior"
                  value={theme.hero_blob_3}
                  onChange={(v) => updateColor('hero_blob_3', v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: TOPO & CABEÇALHO */}
        {activeTab === 'header' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>📌 Topo & Cabeçalho (Header)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Defina o nome da empresa ao lado da logo, o slogan ou frase curta e todas as cores do cabeçalho.
              </p>
            </div>

            {/* BLOCO DE TEXTOS DO HEADER */}
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                  ✍️ Textos do Cabeçalho
                </strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Nome da sua marca e slogan que acompanham o logotipo na barra de navegação superior.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Nome / Título no Cabeçalho</label>
                  <input
                    className="a-input"
                    value={theme.header_title_text !== undefined ? theme.header_title_text : ''}
                    onChange={(e) => updateColor('header_title_text', e.target.value)}
                    placeholder="ex: WiseMadness ou Blog Oficial"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Nome em destaque exibido ao lado do logo</small>
                </div>

                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Slogan / Subtítulo no Cabeçalho</label>
                  <input
                    className="a-input"
                    value={theme.header_tagline_text !== undefined ? theme.header_tagline_text : ''}
                    onChange={(e) => updateColor('header_tagline_text', e.target.value)}
                    placeholder="ex: Aqui o amor acontece"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Pequeno texto ou slogan exibido logo abaixo do nome</small>
                </div>

                <div className="a-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700 }}>Texto do Botão de Ação / Contato</label>
                  <input
                    className="a-input"
                    value={theme.header_contact_text || ''}
                    onChange={(e) => updateColor('header_contact_text', e.target.value)}
                    placeholder="ex: Fale Conosco"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Botão de contato localizado no canto direito do topo</small>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: 12, color: 'var(--text)' }}>
                🎨 Cores do Cabeçalho:
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo do Cabeçalho"
                hint="Branco, escuro ou translúcido"
                value={theme.header_bg}
                onChange={(v) => updateColor('header_bg', v)}
              />
              <ColorField
                label="Linha / Borda Inferior do Topo"
                hint="Linha separadora discreta"
                value={theme.header_border}
                onChange={(v) => updateColor('header_border', v)}
              />
              <ColorField
                label="Título do Blog no Topo"
                hint="Nome da empresa ao lado do logo"
                value={theme.header_text}
                onChange={(v) => updateColor('header_text', v)}
              />
              <ColorField
                label="Slogan / Subtítulo no Topo"
                hint="ex: 'Aqui o amor acontece'"
                value={theme.header_subtext}
                onChange={(v) => updateColor('header_subtext', v)}
              />
              <ColorField
                label="Links do Menu de Navegação"
                hint="'Início', 'Notícias', etc."
                value={theme.header_nav_color}
                onChange={(v) => updateColor('header_nav_color', v)}
              />
              <ColorField
                label="Link Ativo no Menu"
                hint="Página que está selecionada"
                value={theme.header_nav_active}
                onChange={(v) => updateColor('header_nav_active', v)}
              />
              <ColorField
                label="Ícones do Topo (Busca & Tema)"
                hint="Lupa e botão claro/escuro"
                value={theme.header_icon_color}
                onChange={(v) => updateColor('header_icon_color', v)}
              />
              <ColorField
                label="Fundo do Botão 'Fale Conosco'"
                hint="Botão de contato do topo"
                value={theme.btn_header_bg}
                onChange={(v) => updateColor('btn_header_bg', v)}
              />
              <ColorField
                label="Texto do Botão 'Fale Conosco'"
                hint="Cor da letra no botão do topo"
                value={theme.btn_header_text}
                onChange={(v) => updateColor('btn_header_text', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 3: BOTÕES DE AÇÃO (CTAS) */}
        {activeTab === 'buttons' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🔘 Botões de Ação (CTAs)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Cores separadas para o botão primário ('Explorar artigos') e secundário ('Buscar no blog').
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo do Botão Primário"
                hint="'Explorar artigos'"
                value={theme.btn_primary_bg}
                onChange={(v) => updateColor('btn_primary_bg', v)}
              />
              <ColorField
                label="Texto do Botão Primário"
                hint="Cor da letra do botão principal"
                value={theme.btn_primary_text}
                onChange={(v) => updateColor('btn_primary_text', v)}
              />
              <ColorField
                label="Fundo do Botão Secundário"
                hint="'Buscar no blog'"
                value={theme.btn_secondary_bg}
                onChange={(v) => updateColor('btn_secondary_bg', v)}
              />
              <ColorField
                label="Texto do Botão Secundário"
                hint="Cor da letra no botão secundário"
                value={theme.btn_secondary_text}
                onChange={(v) => updateColor('btn_secondary_text', v)}
              />
              <ColorField
                label="Borda do Botão Secundário"
                hint="Linha de contorno do botão"
                value={theme.btn_secondary_border}
                onChange={(v) => updateColor('btn_secondary_border', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 4: CARD DE DESTAQUE */}
        {activeTab === 'feature' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🏆 Card de Destaque no Hero</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                O artigo principal em destaque na parte direita do banner superior.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo do Card de Destaque"
                hint="Cor do bloco inferior de texto"
                value={theme.feature_card_bg}
                onChange={(v) => updateColor('feature_card_bg', v)}
              />
              <ColorField
                label="Borda do Card de Destaque"
                hint="Contorno sutil do card"
                value={theme.feature_card_border}
                onChange={(v) => updateColor('feature_card_border', v)}
              />
              <ColorField
                label="Fundo do Selo 'DESTAQUE'"
                hint="Etiqueta dourada/amarela"
                value={theme.badge_bg}
                onChange={(v) => updateColor('badge_bg', v)}
              />
              <ColorField
                label="Texto do Selo 'DESTAQUE'"
                hint="Cor da palavra DESTAQUE"
                value={theme.badge_text}
                onChange={(v) => updateColor('badge_text', v)}
              />
              <ColorField
                label="Título do Artigo em Destaque"
                hint="Cor do H2 principal"
                value={theme.feature_title}
                onChange={(v) => updateColor('feature_title', v)}
              />
              <ColorField
                label="Resumo / Trecho do Destaque"
                hint="Texto de 2 a 3 linhas"
                value={theme.feature_text}
                onChange={(v) => updateColor('feature_text', v)}
              />
              <ColorField
                label="Metadados (Data e Minutos)"
                hint="ex: '8 de outubro • 3 min'"
                value={theme.feature_meta}
                onChange={(v) => updateColor('feature_meta', v)}
              />
              <ColorField
                label="Capa: Cor Inicial do Gradiente"
                hint="Fundo da imagem onde fica o logo"
                value={theme.feature_cover_1}
                onChange={(v) => updateColor('feature_cover_1', v)}
              />
              <ColorField
                label="Capa: Cor Final do Gradiente"
                hint="Final da transição de cor"
                value={theme.feature_cover_2}
                onChange={(v) => updateColor('feature_cover_2', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 5: MINI CARDS NO HERO */}
        {activeTab === 'mini' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>📱 Mini Cards no Hero (Abaixo do Destaque)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Os 2 cards menores que aparecem logo abaixo do artigo principal na lateral direita.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo dos Mini Cards"
                hint="Geralmente translúcido ou escuro"
                value={theme.hero_mini_bg}
                onChange={(v) => updateColor('hero_mini_bg', v)}
              />
              <ColorField
                label="Borda dos Mini Cards"
                hint="Contorno dos pequenos cards"
                value={theme.hero_mini_border}
                onChange={(v) => updateColor('hero_mini_border', v)}
              />
              <ColorField
                label="Título nos Mini Cards"
                hint="Texto do artigo menor"
                value={theme.hero_mini_title}
                onChange={(v) => updateColor('hero_mini_title', v)}
              />
              <ColorField
                label="Metadados dos Mini Cards"
                hint="Data e tempo de leitura"
                value={theme.hero_mini_meta}
                onChange={(v) => updateColor('hero_mini_meta', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 6: BARRA DE CATEGORIAS (CHIPS) */}
        {activeTab === 'chips' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🏷️ Barra de Categorias (Chips)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                A barra flutuante com as categorias do blog logo após o banner principal.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo da Barra Flutuante"
                hint="Geralmente branco ou escuro"
                value={theme.chips_bar_bg}
                onChange={(v) => updateColor('chips_bar_bg', v)}
              />
              <ColorField
                label="Borda da Barra Flutuante"
                hint="Contorno da barra de categorias"
                value={theme.chips_bar_border}
                onChange={(v) => updateColor('chips_bar_border', v)}
              />
              <ColorField
                label="Fundo do Chip Individual"
                hint="Pílula de cada categoria"
                value={theme.chip_bg}
                onChange={(v) => updateColor('chip_bg', v)}
              />
              <ColorField
                label="Texto do Chip"
                hint="Nome da categoria"
                value={theme.chip_text}
                onChange={(v) => updateColor('chip_text', v)}
              />
              <ColorField
                label="Fundo do Contador de Artigos"
                hint="Pequena badge com o número"
                value={theme.chip_count_bg}
                onChange={(v) => updateColor('chip_count_bg', v)}
              />
              <ColorField
                label="Texto do Contador"
                hint="Cor do número de posts"
                value={theme.chip_count_text}
                onChange={(v) => updateColor('chip_count_text', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 7: GRADE DE ARTIGOS (FEED) */}
        {activeTab === 'cards' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>📰 Grade de Artigos (Feed Principal)</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Configuração visual de todos os cards de artigos regulares da página inicial e categorias.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Título 'Últimos artigos'"
                hint="H2 da seção de postagens"
                value={theme.section_title_color}
                onChange={(v) => updateColor('section_title_color', v)}
              />
              <ColorField
                label="Fundo dos Cards da Grade"
                hint="Cor de fundo do cartão"
                value={theme.card_bg}
                onChange={(v) => updateColor('card_bg', v)}
              />
              <ColorField
                label="Borda dos Cards"
                hint="Linha sutil em volta do card"
                value={theme.card_border}
                onChange={(v) => updateColor('card_border', v)}
              />
              <ColorField
                label="Título do Artigo no Card"
                hint="Texto do título do post"
                value={theme.card_title}
                onChange={(v) => updateColor('card_title', v)}
              />
              <ColorField
                label="Resumo / Trecho do Artigo"
                hint="Texto introdutório de 3 linhas"
                value={theme.card_text}
                onChange={(v) => updateColor('card_text', v)}
              />
              <ColorField
                label="Data & Tempo de Leitura"
                hint="Metadados na base do card"
                value={theme.card_meta}
                onChange={(v) => updateColor('card_meta', v)}
              />
              <ColorField
                label="Fundo da Pílula de Categoria"
                hint="Tag de categoria no card"
                value={theme.card_pill_bg}
                onChange={(v) => updateColor('card_pill_bg', v)}
              />
              <ColorField
                label="Texto da Pílula de Categoria"
                hint="Letra da categoria no card"
                value={theme.card_pill_text}
                onChange={(v) => updateColor('card_pill_text', v)}
              />
            </div>
          </div>
        )}

        {/* ABA 8: GERAL, LOGO & RODAPÉ */}
        {activeTab === 'global' && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🌐 Fundo Geral do Site, Logotipo & Rodapé</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Gerencie o logotipo oficial cadastrado, textos do site e as cores do rodapé.
              </p>
            </div>

            {/* Upload de Logotipo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 12,
              border: '1px solid var(--line)'
            }}>
              <div style={{
                width: 110,
                height: 70,
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid var(--line)',
                display: 'grid',
                placeItems: 'center',
                padding: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {generalForm.logo_url ? (
                  <img src={generalForm.logo_url} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Sem logo</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 4 }}>Logotipo Oficial do Cliente</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 10px 0' }}>
                  Este logotipo é exibido no topo do blog, nos cards sem imagem de capa e no gerador de capas por IA.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="a-btn ghost sm"
                    disabled={uploadingLogo}
                    onClick={() => logoFileRef.current?.click()}
                  >
                    <Icon name="upload" size={14} />
                    {uploadingLogo ? 'Enviando...' : 'Carregar Imagem de Logo'}
                  </button>
                  <input
                    type="file"
                    ref={logoFileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleUploadLogo}
                  />
                  {generalForm.logo_url && (
                    <button
                      type="button"
                      className="a-btn ghost sm"
                      onClick={() => setGeneralForm((p) => ({ ...p, logo_url: '' }))}
                    >
                      Remover Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload de Favicon (Five Ico / Ícone da Aba do Navegador) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: 18,
              background: 'var(--surface-2)',
              borderRadius: 14,
              border: '1px solid var(--line)',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {generalForm.favicon_url ? (
                    <img src={generalForm.favicon_url} alt="Favicon" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (generalForm.logo_url ? (
                    <img src={generalForm.logo_url} alt="Favicon" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', opacity: 0.6 }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>🌐</span>
                  ))}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Favicon</span>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.95rem' }}>Ícone da Aba do Navegador (Favicon / Five Ico)</strong>
                  <span style={{ fontSize: 11, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    ABAS & FAVORITOS
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Este é o ícone oficial que aparece na aba do navegador ao lado do título do seu blog, nos favoritos e atalhos de celular.
                  Formatos aceitos: <code>.ico</code>, <code>.png</code>, <code>.svg</code> ou <code>.webp</code>.
                </p>

                {/* Pré-visualização da Aba Real */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                }}>
                  {generalForm.favicon_url || generalForm.logo_url ? (
                    <img
                      src={generalForm.favicon_url || generalForm.logo_url}
                      alt=""
                      style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 2 }}
                    />
                  ) : (
                    <span style={{ fontSize: 14 }}>🌐</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                    {generalForm.site_title || brandName}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>✕</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="a-btn primary sm"
                    disabled={uploadingFavicon}
                    onClick={() => faviconFileRef.current?.click()}
                  >
                    <Icon name="upload" size={14} />
                    {uploadingFavicon ? 'Enviando...' : 'Carregar Imagem de Favicon'}
                  </button>
                  <input
                    type="file"
                    ref={faviconFileRef}
                    accept="image/*,.ico"
                    style={{ display: 'none' }}
                    onChange={handleUploadFavicon}
                  />

                  {generalForm.logo_url && !generalForm.favicon_url && (
                    <button
                      type="button"
                      className="a-btn ghost sm"
                      onClick={() => setGeneralForm((p) => ({ ...p, favicon_url: p.logo_url }))}
                    >
                      Usar Logotipo como Favicon
                    </button>
                  )}

                  {generalForm.favicon_url && (
                    <button
                      type="button"
                      className="a-btn ghost sm"
                      onClick={() => setGeneralForm((p) => ({ ...p, favicon_url: '' }))}
                    >
                      Remover Favicon
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    className="a-input sm"
                    style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                    placeholder="Ou cole a URL direta do favicon (ex: https://.../favicon.ico)"
                    value={generalForm.favicon_url}
                    onChange={(e) => setGeneralForm((p) => ({ ...p, favicon_url: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <ColorField
                label="Fundo Geral do Site"
                hint="Cor do corpo da página (body)"
                value={theme.body_bg}
                onChange={(v) => updateColor('body_bg', v)}
              />
              <ColorField
                label="Texto Geral do Site"
                hint="Cor do texto comum"
                value={theme.body_text}
                onChange={(v) => updateColor('body_text', v)}
              />
              <ColorField
                label="Fundo do Rodapé (Footer)"
                hint="Cor da base do site"
                value={theme.footer_bg}
                onChange={(v) => updateColor('footer_bg', v)}
              />
              <ColorField
                label="Texto do Rodapé"
                hint="Links e parágrafos do rodapé"
                value={theme.footer_text}
                onChange={(v) => updateColor('footer_text', v)}
              />
              <ColorField
                label="Títulos das Colunas do Rodapé"
                hint="H3 das seções do rodapé"
                value={theme.footer_title}
                onChange={(v) => updateColor('footer_title', v)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
              <div className="a-field">
                <label>Título do Blog</label>
                <input
                  className="a-input"
                  value={generalForm.site_title}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, site_title: e.target.value }))}
                />
              </div>
              <div className="a-field">
                <label>Slogan ou Subtítulo</label>
                <input
                  className="a-input"
                  value={generalForm.site_tagline}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, site_tagline: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÃO INFERIOR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
          padding: '16px 20px',
          background: 'var(--surface-2)',
          borderRadius: 14,
          border: '1px solid var(--line)'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Lembre-se de clicar em salvar para atualizar todas as cores e personalizações no blog ao vivo.
          </span>
          <button
            type="submit"
            className="a-btn primary"
            disabled={busy === 'save'}
            style={{ fontWeight: 700, padding: '0.75rem 1.75rem' }}
          >
            <Icon name="check" size={16} />
            {busy === 'save' ? 'Salvando Alterações...' : 'Salvar Todas as Cores do Blog'}
          </button>
        </div>
      </form>
    </div>
  );
}
