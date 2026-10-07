'use client';
import { useState } from 'react';
import { api, Icon, Spin, toast } from './ui.js';
import { dt } from './Badges.js';

function generateSecurePassword() {
  const lettersUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lettersLower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const all = lettersUpper + lettersLower + numbers + symbols;

  let pass = [
    lettersUpper[Math.floor(Math.random() * lettersUpper.length)],
    lettersLower[Math.floor(Math.random() * lettersLower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  for (let i = 0; i < 8; i++) {
    pass.push(all[Math.floor(Math.random() * all.length)]);
  }

  return pass.sort(() => 0.5 - Math.random()).join('');
}

export default function UsersManager({ initial, me, smtp }) {
  const [users, setUsers] = useState(initial);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'author' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState('');
  const [link, setLink] = useState('');

  // Estado do modal de alteração de senha
  const [changePwUser, setChangePwUser] = useState(null);
  const [changePwValue, setChangePwValue] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);

  const reload = async () => setUsers((await api('/api/admin/users/')).users);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy('create');
    setLink('');
    try {
      const r = await api('/api/admin/users/', { method: 'POST', data: form });
      if (r.created_with_password) {
        toast(`Usuário ${r.user.name} cadastrado com sucesso!`);
      } else {
        toast(smtp ? 'Convite enviado por e-mail!' : 'Usuário criado com link de acesso.');
        if (r.link) setLink(r.link);
      }
      setForm({ name: '', email: '', password: '', role: 'author' });
      await reload();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy('');
    }
  }

  function fillGeneratedPassword() {
    const pw = generateSecurePassword();
    setForm((prev) => ({ ...prev, password: pw }));
    setShowPassword(true);
    navigator.clipboard?.writeText(pw);
    toast('Senha gerada e copiada para a área de transferência!');
  }

  function fillGeneratedPasswordForModal() {
    const pw = generateSecurePassword();
    setChangePwValue(pw);
    setShowChangePw(true);
    navigator.clipboard?.writeText(pw);
    toast('Nova senha gerada e copiada!');
  }

  async function handleSaveNewPassword(e) {
    e.preventDefault();
    if (!changePwUser) return;
    setBusy('save-pw');
    try {
      await api(`/api/admin/users/${changePwUser.id}/`, {
        method: 'PATCH',
        data: { password: changePwValue },
      });
      toast(`Senha de ${changePwUser.name} atualizada com sucesso!`);
      setChangePwUser(null);
      setChangePwValue('');
      await reload();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy('');
    }
  }

  async function patch(u, data, msg) {
    setBusy(`u${u.id}`);
    try {
      const r = await api(`/api/admin/users/${u.id}/`, { method: 'PATCH', data });
      if (msg) toast(msg);
      if (r.link) setLink(r.link);
      await reload();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy('');
    }
  }

  async function del(u) {
    if (!window.confirm(`Excluir ${u.name}? Os artigos dele continuam no blog.`)) return;
    setBusy(`u${u.id}`);
    try {
      await api(`/api/admin/users/${u.id}/`, { method: 'DELETE' });
      toast('Usuário excluído.');
      await reload();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h2>Usuários</h2>
          <p>Cadastre autores e administradores com usuário e senha para acesso imediato ao painel.</p>
        </div>
      </div>

      {link && (
        <div className="a-note info" style={{ marginBottom: 16 }} role="status">
          <b>Link de acesso gerado:</b> envie para o usuário definir a senha:<br />
          <code>{link}</code>{' '}
          <button className="a-btn ghost sm" type="button" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copiado!'); }}>Copiar</button>
        </div>
      )}

      {/* Formulário de Cadastro Manual */}
      <form className="a-card" onSubmit={handleCreate} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Cadastrar novo usuário</h3>
          <span className="a-badge author">Cadastro manual</span>
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>
          Preencha nome, e-mail e senha para criar a conta imediatamente. (Se deixar a senha em branco, um link de convite será gerado).
        </p>

        <div className="a-grid c2" style={{ gap: 14 }}>
          <div className="a-field" style={{ margin: 0 }}>
            <label htmlFor="un">Nome completo</label>
            <input
              id="un"
              className="a-input"
              placeholder="Ex: Carlos Silva"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="a-field" style={{ margin: 0 }}>
            <label htmlFor="ue">E-mail de acesso</label>
            <input
              id="ue"
              className="a-input"
              type="email"
              placeholder="exemplo@braziw.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="a-field" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="up" style={{ margin: 0 }}>Senha de acesso</label>
              <button
                type="button"
                className="a-btn ghost sm"
                style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                onClick={fillGeneratedPassword}
                title="Gera uma senha forte e copia automaticamente"
              >
                <Icon name="spark" size={12} /> Gerar senha forte
              </button>
            </div>
            <div className="pw-wrap" style={{ position: 'relative' }}>
              <input
                id="up"
                className="a-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 10 caracteres (letras e números)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="pw-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Icon name={showPassword ? 'eyeoff' : 'eye'} size={18} />
              </button>
            </div>
          </div>

          <div className="a-field" style={{ margin: 0 }}>
            <label htmlFor="ur">Função / Papel</label>
            <select
              id="ur"
              className="a-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="author">Autor (Cria e envia artigos)</option>
              <option value="admin">Administrador (Acesso total)</option>
            </select>
          </div>
        </div>

        <div className="a-row end" style={{ marginTop: 18 }}>
          <button className="a-btn primary" disabled={busy === 'create'}>
            {busy === 'create' ? <Spin /> : <><Icon name="plus" size={16} />Cadastrar usuário</>}
          </button>
        </div>
      </form>

      {/* Lista de Usuários */}
      <div className="a-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="a-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Status da Senha</th>
                <th>Último acesso</th>
                <th>Artigos</th>
                <th aria-label="Ações" style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me;
                return (
                  <tr key={u.id} style={busy === `u${u.id}` ? { opacity: 0.5 } : undefined}>
                    <td>
                      <b>{u.name}</b>
                      {self && <span className="a-badge draft" style={{ marginLeft: 8 }}>você</span>}
                      <br />
                      <small className="muted">{u.email}</small>
                      {!u.active && <> <span className="a-badge off">desativado</span></>}
                    </td>
                    <td>
                      <select
                        className="a-select"
                        style={{ width: 145, padding: '6px 10px', fontSize: 13.5 }}
                        value={u.role}
                        disabled={self}
                        aria-label={`Papel de ${u.name}`}
                        onChange={(e) => patch(u, { role: e.target.value }, 'Papel atualizado.')}
                      >
                        <option value="author">Autor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td>
                      {u.has_password ? (
                        <span className="a-badge published" title="Usuário possui senha ativa para login">Senha ativa</span>
                      ) : (
                        <span className="a-badge pending" title="Aguardando definição de senha">Sem senha</span>
                      )}
                    </td>
                    <td><small className="muted">{u.last_login ? dt(u.last_login) : 'Nunca'}</small></td>
                    <td><b>{u.posts}</b></td>
                    <td>
                      <div className="acts" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="a-btn ghost sm"
                          type="button"
                          title="Alterar a senha deste usuário manualmente"
                          onClick={() => {
                            setChangePwUser(u);
                            setChangePwValue('');
                            setShowChangePw(false);
                          }}
                        >
                          <Icon name="key" size={14} /> Alterar senha
                        </button>
                        <button
                          className="a-btn ghost sm"
                          type="button"
                          title="Enviar ou gerar link para o usuário definir a própria senha"
                          onClick={() => patch(u, { action: 'invite' }, smtp ? 'Link enviado por e-mail.' : 'Link de senha gerado!')}
                        >
                          <Icon name="mail" size={14} /> Link
                        </button>
                        {!self && (
                          <button
                            className="a-btn ghost sm"
                            type="button"
                            onClick={() => patch(u, { active: !u.active }, u.active ? 'Usuário desativado.' : 'Usuário reativado.')}
                          >
                            {u.active ? 'Desativar' : 'Reativar'}
                          </button>
                        )}
                        {!self && (
                          <button
                            className="a-btn danger sm"
                            type="button"
                            aria-label={`Excluir ${u.name}`}
                            onClick={() => del(u)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Alterar Senha Manualmente */}
      {changePwUser && (
        <div className="a-modal" role="dialog" aria-modal="true">
          <form className="a-card" onSubmit={handleSaveNewPassword} style={{ width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Alterar Senha</h3>
              <button
                type="button"
                className="a-btn ghost sm"
                style={{ padding: 4 }}
                onClick={() => setChangePwUser(null)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <p className="sub" style={{ marginBottom: 16 }}>
              Defina a nova senha para <strong>{changePwUser.name}</strong> ({changePwUser.email}).
            </p>

            <div className="a-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="cpw" style={{ margin: 0 }}>Nova Senha</label>
                <button
                  type="button"
                  className="a-btn ghost sm"
                  style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                  onClick={fillGeneratedPasswordForModal}
                >
                  <Icon name="spark" size={12} /> Gerar senha forte
                </button>
              </div>
              <div className="pw-wrap" style={{ position: 'relative' }}>
                <input
                  id="cpw"
                  className="a-input"
                  type={showChangePw ? 'text' : 'password'}
                  placeholder="Mínimo 10 caracteres (letras e números)"
                  value={changePwValue}
                  onChange={(e) => setChangePwValue(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowChangePw(!showChangePw)}
                  aria-label={showChangePw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <Icon name={showChangePw ? 'eyeoff' : 'eye'} size={18} />
                </button>
              </div>
              <span className="a-hint">Ao salvar, a nova senha entrará em vigor imediatamente.</span>
            </div>

            <div className="a-row end" style={{ gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="a-btn ghost"
                onClick={() => setChangePwUser(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="a-btn primary"
                disabled={busy === 'save-pw' || !changePwValue}
              >
                {busy === 'save-pw' ? <Spin /> : 'Salvar nova senha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
