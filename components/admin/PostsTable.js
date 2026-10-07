'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Icon, toast } from './ui.js';
import { StatusBadge, dt } from './Badges.js';

export function PostsTable({ rows }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(0);
  async function remove(p) {
    if (!window.confirm(`Excluir "${p.title}"? Esta ação não pode ser desfeita.`)) return;
    setRemoving(p.id);
    try { await api(`/api/admin/posts/${p.id}/`, { method: 'DELETE' }); toast('Artigo excluído.'); router.refresh(); }
    catch (e) { toast(e.message, 'err'); } finally { setRemoving(0); }
  }
  return (
    <div className="a-wrap">
      <table className="a-table">
        <thead><tr><th>Artigo</th><th>Status</th><th>Publicação</th><th aria-label="Ações" /></tr></thead>
        <tbody>
          {rows.map((p) => {
            const img = p.cover_thumb || p.cover_url;
            return (
              <tr key={p.id} style={removing === p.id ? { opacity: .4 } : undefined}>
                <td>
                  <Link href={`/admin/posts/${p.id}/`} className="ttl">
                    {img ? <img src={img} alt="" loading="lazy" /> : <span className="ph" />}
                    <span><b>{p.title}</b><small>{p.cats?.map((c) => c.name).join(', ') || 'Sem categoria'}{p.author_name ? ` · ${p.author_name}` : ''}</small></span>
                  </Link>
                </td>
                <td><StatusBadge post={p} /></td>
                <td><small className="muted">{p.status === 'published' ? dt(p.publish_at) : `Editado ${dt(p.updated_at)}`}</small></td>
                <td>
                  <div className="acts">
                    {p.status === 'published' && <a className="a-btn ghost sm" href={`/${p.slug}/`} target="_blank" rel="noopener" title="Ver no blog"><Icon name="eye" size={15} /></a>}
                    <Link className="a-btn ghost sm" href={`/admin/posts/${p.id}/`} title="Editar"><Icon name="edit" size={15} /></Link>
                    <button className="a-btn danger sm" type="button" onClick={() => remove(p)} title="Excluir"><Icon name="trash" size={15} /></button>
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
