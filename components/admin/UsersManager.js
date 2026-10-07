'use client';
import { useState } from 'react';
import { api, Icon, Spin, toast } from './ui.js';
import { dt } from './Badges.js';

export default function UsersManager({ initial, me, smtp }) {
  const [users, setUsers] = useState(initial);
  const [form, setForm] = useState({ name: '', email: '', role: 'author' });
  const [busy, setBusy] = useState('');
  const [link, setLink] = useState('');

  const reload = async () => setUsers((await api('/api/admin/users/')).users);
  async function invite(e) {
    e.preventDefault(); setBusy('invite'); setLink('');
    try {
      const r = await api('/api/admin/users/', { method: 'POST', data: form });
      toast(smtp ? 'Convite enviado por e-mail!' : 'Usuário criado.'); if (r.link) setLink(r.link);
      setForm({ name: '', email: '', role: 'author' }); await reload();
    } catch (err) { toast(err.message, 'err'); } finally { setBusy(''); }
  }
  async function patch(u, data, msg) {
    setBusy(`u${u.id}`);
    try { const r = await api(`/api/admin/users/${u.id}/`, { method: 'PATCH', data }); if (msg) toast(msg); if (r.link) setLink(r.link); await reload(); }
    catch (err) { toast(err.message, 'err'); } finally { setBusy(''); }
  }
  async function del(u) {
    if (!window.confirm(`Excluir ${u.name}? Os artigos dele continuam no blog.`)) return;
    setBusy(`u${u.id}`);
    try { await api(`/api/admin/users/${u.id}/`, { method: 'DELETE' }); toast('Usuário excluído.'); await reload(); }
    catch (err) { toast(err.message, 'err'); } finally { setBusy(''); }
  }

  return (
    <>
      <div className="adm-head"><div><h2>Usuários</h2><p>Administradores fazem tudo. Autores escrevem e enviam artigos para aprovação.</p></div></div>

      {link && (
        <div className="a-note info" style={{ marginBottom: 16 }} role="status">
          <b>Modo de teste (SMTP não configurado):</b> envie este link para a pessoa definir a senha:<br /><code>{link}</code>{' '}
          <button className="a-btn ghost sm" type="button" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado!'); }}>Copiar</button>
        </div>
      )}

      <form className="a-card" onSubmit={invite} style={{ marginBottom: 18 }}>
        <h3>Convidar usuário</h3><p className="sub">A pessoa recebe um e-mail com um link para criar a própria senha (vale 48 horas).</p>
        <div className="a-grid c3" style={{ alignItems: 'end' }}>
          <div className="a-field" style={{ margin: 0 }}><label htmlFor="un">Nome</label><input id="un" className="a-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="a-field" style={{ margin: 0 }}><label htmlFor="ue">E-mail</label><input id="ue" className="a-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="a-row" style={{ flexWrap: 'nowrap' }}>
            <div className="a-field" style={{ margin: 0, flex: 1 }}><label htmlFor="ur">Papel</label>
              <select id="ur" className="a-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="author">Autor</option><option value="admin">Administrador</option></select></div>
            <button className="a-btn primary" disabled={busy === 'invite'} style={{ alignSelf: 'flex-end' }}>{busy === 'invite' ? <Spin /> : <><Icon name="mail" size={16} />Convidar</>}</button>
          </div>
        </div>
      </form>

      <div className="a-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="a-wrap">
          <table className="a-table">
            <thead><tr><th>Usuário</th><th>Papel</th><th>Último acesso</th><th>Artigos</th><th aria-label="Ações" /></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me;
                return (
                  <tr key={u.id} style={busy === `u${u.id}` ? { opacity: .5 } : undefined}>
                    <td><b>{u.name}</b>{self && <span className="a-badge draft" style={{ marginLeft: 8 }}>você</span>}<br /><small className="muted">{u.email}</small>
                      {!u.active && <> <span className="a-badge off">desativado</span></>}{!u.has_password && <> <span className="a-badge pending">convite pendente</span></>}</td>
                    <td>
                      <select className="a-select" style={{ width: 150, padding: '7px 10px' }} value={u.role} disabled={self} aria-label={`Papel de ${u.name}`}
                        onChange={(e) => patch(u, { role: e.target.value }, 'Papel atualizado.')}><option value="author">Autor</option><option value="admin">Administrador</option></select>
                    </td>
                    <td><small className="muted">{u.last_login ? dt(u.last_login) : 'Nunca'}</small></td>
                    <td>{u.posts}</td>
                    <td>
                      <div className="acts">
                        <button className="a-btn ghost sm" type="button" title="Enviar link para definir/redefinir senha" onClick={() => patch(u, { action: 'invite' }, smtp ? 'Link enviado por e-mail.' : 'Link gerado.')}><Icon name="key" size={14} />Link de senha</button>
                        {!self && <button className="a-btn ghost sm" type="button" onClick={() => patch(u, { active: !u.active }, u.active ? 'Usuário desativado.' : 'Usuário reativado.')}>{u.active ? 'Desativar' : 'Reativar'}</button>}
                        {!self && <button className="a-btn danger sm" type="button" aria-label={`Excluir ${u.name}`} onClick={() => del(u)}><Icon name="trash" size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
