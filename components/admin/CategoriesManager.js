'use client';

import { useState } from 'react';
import { api, toast, useBusy, Icon } from './ui.js';

export default function CategoriesManager({ initialCategories = [], tenant = null }) {
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activeCat, setActiveCat] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '' });
  const [busy, run] = useBusy();

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );

  const openCreate = () => {
    setForm({ name: '', slug: '' });
    setActiveCat(null);
    setModalMode('create');
  };

  const openEdit = (cat) => {
    setActiveCat(cat);
    setForm({ name: cat.name, slug: cat.slug });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveCat(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Nome da categoria é obrigatório.', 'err');
      return;
    }

    await run('save', async () => {
      if (modalMode === 'create') {
        const res = await api('/api/admin/categories/', {
          method: 'POST',
          data: form,
        });
        if (res.category) {
          setCategories((prev) => [...prev, { ...res.category, posts_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
          toast('Categoria criada com sucesso!', 'ok');
          closeModal();
        }
      } else if (modalMode === 'edit' && activeCat) {
        const res = await api(`/api/admin/categories/${activeCat.id}/`, {
          method: 'PATCH',
          data: form,
        });
        if (res.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === activeCat.id ? { ...c, ...res.category } : c))
          );
          toast('Categoria atualizada com sucesso!', 'ok');
          closeModal();
        }
      }
    });
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"? Ela será desvinculada dos artigos associados.`)) {
      return;
    }

    await run(`del-${cat.id}`, async () => {
      await api(`/api/admin/categories/${cat.id}/`, {
        method: 'DELETE',
      });
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast('Categoria excluída com sucesso!', 'ok');
    });
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>🏷️ Gerenciador de Categorias</h1>
          <p style={{ color: 'var(--muted)', margin: '0.35rem 0 0 0', fontSize: '0.95rem' }}>
            Organize o conteúdo do seu blog. Cada empresa possui suas próprias categorias personalizadas.
          </p>
        </div>
        <button
          type="button"
          className="a-btn primary"
          onClick={openCreate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Icon name="plus" size={16} /> Nova Categoria
        </button>
      </div>

      {/* Barra de Pesquisa & Contadores */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <input
            type="text"
            className="a-input"
            placeholder="Buscar categorias por nome ou slug..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          {filtered.length} {filtered.length === 1 ? 'categoria' : 'categorias'} cadastradas
        </span>
      </div>

      {/* Lista de Categorias */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Nome da Categoria</th>
              <th>Endereço (Slug)</th>
              <th style={{ textAlign: 'center' }}>Artigos</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{cat.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8125rem', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 6, color: 'var(--muted)' }}>
                      /categoria/{cat.slug}/
                    </code>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="a-badge" style={{ background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700 }}>
                      {cat.posts_count || 0} {cat.posts_count === 1 ? 'artigo' : 'artigos'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="a-btn ghost sm"
                        onClick={() => openEdit(cat)}
                        title="Editar categoria"
                      >
                        <Icon name="edit" size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        className="a-btn ghost sm"
                        style={{ color: 'var(--red, #ef4444)' }}
                        disabled={busy === `del-${cat.id}`}
                        onClick={() => handleDelete(cat)}
                        title="Excluir categoria"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                  Nenhuma categoria encontrada com o termo &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação / Edição */}
      {modalMode && (
        <div className="a-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="a-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="a-modal-header">
              <h2>{modalMode === 'create' ? '✨ Nova Categoria' : '✏️ Editar Categoria'}</h2>
              <button type="button" className="a-btn ghost sm" onClick={closeModal} aria-label="Fechar">✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="a-field">
                  <label htmlFor="cat-name">Nome da Categoria</label>
                  <input
                    id="cat-name"
                    className="a-input"
                    placeholder="Ex.: Notícias, Tendências, Casos de Sucesso"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>

                <div className="a-field">
                  <label htmlFor="cat-slug">
                    Slug (Identificador na URL)
                    <span className="a-hint" style={{ display: 'inline', marginLeft: 6 }}>Deixe em branco para gerar automaticamente</span>
                  </label>
                  <input
                    id="cat-slug"
                    className="a-input"
                    placeholder="ex: noticias-do-setor"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  />
                </div>
              </div>

              <div className="a-modal-footer">
                <button type="button" className="a-btn ghost" onClick={closeModal} disabled={busy === 'save'}>
                  Cancelar
                </button>
                <button type="submit" className="a-btn primary" disabled={busy === 'save'}>
                  {busy === 'save' ? 'Salvando...' : modalMode === 'create' ? 'Criar Categoria' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
