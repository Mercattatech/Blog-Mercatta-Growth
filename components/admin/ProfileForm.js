'use client';
import { useState } from 'react';
import { api, Spin, toast, useBusy } from './ui.js';

export function ProfileForm({ user }) {
  const [name, setName] = useState(user.name);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, run] = useBusy();

  const saveName = (e) => { e.preventDefault(); run('name', async () => { await api('/api/admin/me/', { method: 'PUT', data: { name } }); toast('Nome atualizado.'); }); };
  const savePw = (e) => {
    e.preventDefault();
    if (next !== again) { toast('As senhas não conferem.', 'err'); return; }
    run('pw', async () => {
      await api('/api/admin/me/', { method: 'PUT', data: { name, current_password: cur, new_password: next } });
      toast('Senha alterada. Outros dispositivos foram desconectados.'); setCur(''); setNext(''); setAgain('');
    });
  };
  return (
    <div className="a-grid c2" style={{ alignItems: 'start' }}>
      <form className="a-card" onSubmit={saveName}>
        <h3>Dados da conta</h3><p className="sub">{user.email} · {user.role === 'admin' ? 'Administrador' : 'Autor'}</p>
        <div className="a-field"><label htmlFor="pn">Nome (aparece como autor nos artigos)</label><input id="pn" className="a-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></div>
        <button className="a-btn blue" disabled={busy === 'name'}>{busy === 'name' ? <Spin /> : 'Salvar nome'}</button>
      </form>
      <form className="a-card" onSubmit={savePw}>
        <h3>Alterar senha</h3><p className="sub">Mínimo de 10 caracteres, com letras e números.</p>
        <div className="a-field"><label htmlFor="cp">Senha atual</label><input id="cp" className="a-input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></div>
        <div className="a-field"><label htmlFor="np">Nova senha</label><input id="np" className="a-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required /></div>
        <div className="a-field"><label htmlFor="rp">Repita a nova senha</label><input id="rp" className="a-input" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required /></div>
        <button className="a-btn primary" disabled={busy === 'pw'}>{busy === 'pw' ? <Spin /> : 'Alterar senha'}</button>
      </form>
    </div>
  );
}
