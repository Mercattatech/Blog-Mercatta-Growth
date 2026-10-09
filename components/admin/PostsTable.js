'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Icon, Spin, toast } from './ui.js';
import { StatusBadge, dt } from './Badges.js';

export function PostsTable({ rows, isTrash = false, totalTrash = 0 }) {
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const [loadingAction, setLoadingAction] = useState('');
  const [busyRow, setBusyRow] = useState(0);

  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(rows.map((r) => r.id));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /* Ações individuais */
  async function moveToTrash(p) {
    if (!window.confirm(`Mover "${p.title}" para a lixeira? O artigo ficará salvo por 30 dias antes de ser removido definitivamente.`)) return;
    setBusyRow(p.id);
    try {
      await api(`/api/admin/posts/${p.id}/`, { method: 'DELETE' });
      toast('Artigo movido para a lixeira (guardado por 30 dias).');
      setSelected((prev) => prev.filter((id) => id !== p.id));
      router.refresh();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusyRow(0);
    }
  }

  async function restoreSingle(p) {
    setBusyRow(p.id);
    try {
      await api(`/api/admin/posts/${p.id}/restore/`, { method: 'POST' });
      toast(`Artigo "${p.title}" restaurado com sucesso!`);
      setSelected((prev) => prev.filter((id) => id !== p.id));
      router.refresh();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusyRow(0);
    }
  }

  async function permanentDeleteSingle(p) {
    if (!window.confirm(`ATENÇÃO: Deseja excluir definitivamente "${p.title}"? Esta ação é irreversível e o artigo não poderá ser recuperado.`)) return;
    setBusyRow(p.id);
    try {
      await api(`/api/admin/posts/${p.id}/permanent/`, { method: 'DELETE' });
      toast('Artigo excluído permanentemente.');
      setSelected((prev) => prev.filter((id) => id !== p.id));
      router.refresh();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusyRow(0);
    }
  }

  /* Ações em massa */
  async function handleBulkAction(action) {
    if (!selected.length) return;
    const count = selected.length;

    let confirmMsg = '';
    if (action === 'trash') {
      confirmMsg = `Mover ${count} ${count === 1 ? 'artigo selecionado' : 'artigos selecionados'} para a lixeira?`;
    } else if (action === 'restore') {
      confirmMsg = `Restaurar ${count} ${count === 1 ? 'artigo' : 'artigos'} da lixeira?`;
    } else if (action === 'permanent') {
      confirmMsg = `ATENÇÃO: Deseja excluir DEFINITIVAMENTE ${count} ${count === 1 ? 'artigo selecionado' : 'artigos selecionados'}? Esta ação NÃO pode ser desfeita.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setLoadingAction(action);
    try {
      const res = await api('/api/admin/posts/bulk/', {
        method: 'POST',
        data: { ids: selected, action },
      });
      if (action === 'trash') toast(`${res.count} artigos movidos para a lixeira.`);
      else if (action === 'restore') toast(`${res.count} artigos restaurados.`);
      else if (action === 'permanent') toast(`${res.count} artigos excluídos permanentemente.`);
      setSelected([]);
      router.refresh();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setLoadingAction('');
    }
  }

  /* Esvaziar lixeira */
  async function handleEmptyTrash() {
    if (!window.confirm('ATENÇÃO: Deseja esvaziar toda a lixeira? Todos os artigos na lixeira serão excluídos DEFINITIVAMENTE e não poderão ser recuperados.')) return;
    setLoadingAction('empty');
    try {
      const res = await api('/api/admin/trash/empty/', { method: 'DELETE' });
      toast(`Lixeira esvaziada! ${res.count} artigos excluídos permanentemente.`);
      setSelected([]);
      router.refresh();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setLoadingAction('');
    }
  }

  function getDaysRemaining(deletedAt) {
    if (!deletedAt) return 30;
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  return (
    <div className="a-wrap">
      {/* Barra de ações em massa e esvaziamento da lixeira */}
      <div style={{
        padding: '0.75rem 1rem',
        background: selected.length > 0 ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        transition: 'background 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={{ width: 17, height: 17, cursor: 'pointer' }}
            />
            <span>{selected.length > 0 ? <b>{selected.length} selecionado(s)</b> : 'Selecionar todos'}</span>
          </label>

          {selected.length > 0 && (
            <button
              type="button"
              className="a-btn ghost sm"
              onClick={() => setSelected([])}
              style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
            >
              Desmarcar
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {selected.length > 0 && (
            <>
              {!isTrash ? (
                <button
                  type="button"
                  className="a-btn danger sm"
                  onClick={() => handleBulkAction('trash')}
                  disabled={!!loadingAction}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                >
                  {loadingAction === 'trash' ? <Spin /> : <Icon name="trash" size={15} />}
                  Mover para a Lixeira ({selected.length})
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="a-btn blue sm"
                    onClick={() => handleBulkAction('restore')}
                    disabled={!!loadingAction}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                  >
                    {loadingAction === 'restore' ? <Spin /> : <span>♻️</span>}
                    Restaurar ({selected.length})
                  </button>
                  <button
                    type="button"
                    className="a-btn danger sm"
                    onClick={() => handleBulkAction('permanent')}
                    disabled={!!loadingAction}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                  >
                    {loadingAction === 'permanent' ? <Spin /> : <Icon name="trash" size={15} />}
                    Excluir Definitivamente ({selected.length})
                  </button>
                </>
              )}
            </>
          )}

          {isTrash && totalTrash > 0 && (
            <button
              type="button"
              className="a-btn ghost sm"
              onClick={handleEmptyTrash}
              disabled={!!loadingAction}
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {loadingAction === 'empty' ? <Spin /> : <span>🔥</span>}
              Esvaziar Lixeira
            </button>
          )}
        </div>
      </div>

      <table className="a-table">
        <thead>
          <tr>
            <th style={{ width: 38, paddingRight: 0 }}>
              <span className="sr-only">Seleção</span>
            </th>
            <th>Artigo</th>
            <th>Status</th>
            <th>{isTrash ? 'Exclusão Automática' : 'Publicação'}</th>
            <th aria-label="Ações" style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const img = p.cover_thumb || p.cover_url;
            const isChecked = selected.includes(p.id);
            const daysLeft = isTrash ? getDaysRemaining(p.deleted_at) : null;

            return (
              <tr
                key={p.id}
                style={{
                  opacity: busyRow === p.id ? 0.35 : 1,
                  background: isChecked ? 'rgba(37, 99, 235, 0.04)' : undefined,
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ width: 38, paddingRight: 0 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(p.id)}
                    style={{ width: 17, height: 17, cursor: 'pointer', display: 'block' }}
                    aria-label={`Selecionar ${p.title}`}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!isTrash ? (
                      <Link href={`/admin/posts/${p.id}/`} className="ttl" style={{ margin: 0 }}>
                        {img ? <img src={img} alt="" loading="lazy" /> : <span className="ph" />}
                        <span>
                          <b>{p.title}</b>
                          <small>
                            {p.cats?.map((c) => c.name).join(', ') || 'Sem categoria'}
                            {p.author_name ? ` · ${p.author_name}` : ''}
                            {p.tenant_name ? ` · 🏢 ${p.tenant_name}` : ''}
                          </small>
                        </span>
                      </Link>
                    ) : (
                      <div className="ttl" style={{ margin: 0 }}>
                        {img ? <img src={img} alt="" loading="lazy" /> : <span className="ph" />}
                        <span>
                          <b style={{ color: 'var(--muted)' }}>{p.title}</b>
                          <small>
                            Na lixeira desde {dt(p.deleted_at)}
                            {p.author_name ? ` · ${p.author_name}` : ''}
                          </small>
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td><StatusBadge post={p} /></td>
                <td>
                  {isTrash ? (
                    <div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.55rem',
                        borderRadius: 6,
                        background: daysLeft <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: daysLeft <= 5 ? '#ef4444' : '#eab308',
                      }}>
                        ⏳ {daysLeft === 0 ? 'Expira hoje' : `Expira em ${daysLeft} dias`}
                      </span>
                    </div>
                  ) : (
                    <small className="muted">{p.status === 'published' ? dt(p.publish_at) : `Editado ${dt(p.updated_at)}`}</small>
                  )}
                </td>
                <td>
                  <div className="acts" style={{ justifyContent: 'flex-end' }}>
                    {!isTrash ? (
                      <>
                        {p.status === 'published' && (
                          <a className="a-btn ghost sm" href={`/${p.slug}/`} target="_blank" rel="noopener" title="Ver no blog">
                            <Icon name="eye" size={15} />
                          </a>
                        )}
                        <Link className="a-btn ghost sm" href={`/admin/posts/${p.id}/`} title="Editar">
                          <Icon name="edit" size={15} />
                        </Link>
                        <button
                          className="a-btn danger sm"
                          type="button"
                          onClick={() => moveToTrash(p)}
                          title="Mover para a Lixeira (30 dias)"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="a-btn ghost sm"
                          type="button"
                          onClick={() => restoreSingle(p)}
                          title="Restaurar artigo"
                          style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <span>♻️</span> Restaurar
                        </button>
                        <button
                          className="a-btn danger sm"
                          type="button"
                          onClick={() => permanentDeleteSingle(p)}
                          title="Excluir Definitivamente"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
