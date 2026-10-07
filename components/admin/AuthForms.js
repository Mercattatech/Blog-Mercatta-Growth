'use client';
import { useEffect, useState } from 'react';
import { api, Icon, Spin, toast } from './ui.js';

function PasswordField({ id, label, value, onChange, autoComplete, hint, meter }) {
  const [show, setShow] = useState(false);
  const score = (() => {
    let s = 0;
    if (value.length >= 10) s++; if (value.length >= 14) s++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++; if (/[^a-zA-Z0-9]/.test(value)) s++;
    return Math.min(s, 5);
  })();
  const colors = ['#d94c4c', '#d94c4c', '#e6a800', '#9bbd2a', '#3b9c46', '#3b9c46'];
  return (
    <div className="a-field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input id={id} className="a-input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
        <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}><Icon name={show ? 'eyeoff' : 'eye'} size={18} /></button>
      </div>
      {meter && value && <div className="pw-meter" aria-hidden="true"><i style={{ width: `${score * 20}%`, background: colors[score] }} /></div>}
      {hint && <span className="a-hint">{hint}</span>}
    </div>
  );
}

function Logo() {
  return <div className="a-auth-logo"><img src="/img/logo.png" alt="bra'ziw — Idiomas e Intercâmbios" width="88" height="65" /></div>;
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api('/api/auth/login/', { method: 'POST', data: { email, password } }); window.location.href = '/admin/'; }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <main className="a-auth">
      <form className="a-auth-card" onSubmit={submit} noValidate>
        <Logo />
        <h1>Painel do Blog</h1>
        <p className="lead">Entre para criar, agendar e publicar artigos.</p>
        {error && <div className="a-note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="a-field"><label htmlFor="email">E-mail</label>
          <input id="email" className="a-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required /></div>
        <PasswordField id="password" label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
        <button className="a-btn primary block" style={{ padding: 14 }} disabled={busy}>{busy ? <Spin /> : 'Entrar'}</button>
        <div className="a-auth-links"><a href="/admin/forgot/">Esqueci minha senha</a><a href="/">← Voltar ao blog</a></div>
      </form>
    </main>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { const r = await api('/api/auth/forgot/', { method: 'POST', data: { email } }); setDone(r.message); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <main className="a-auth">
      <form className="a-auth-card" onSubmit={submit} noValidate>
        <Logo />
        <h1>Esqueceu a senha?</h1>
        <p className="lead">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        {done ? <div className="a-note ok" role="status">{done}</div> : (
          <>
            {error && <div className="a-note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
            <div className="a-field"><label htmlFor="email">E-mail</label>
              <input id="email" className="a-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required /></div>
            <button className="a-btn primary block" style={{ padding: 14 }} disabled={busy}>{busy ? <Spin /> : 'Enviar link de redefinição'}</button>
          </>
        )}
        <div className="a-auth-links"><a href="/admin/login/">← Voltar ao login</a></div>
      </form>
    </main>
  );
}

export function ResetForm({ token }) {
  const [state, setState] = useState({ loading: true, valid: false });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`/api/auth/reset/?token=${encodeURIComponent(token || '')}`).then((r) => setState({ loading: false, ...r })).catch(() => setState({ loading: false, valid: false }));
  }, [token]);
  async function submit(e) {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('As senhas não conferem.'); return; }
    setBusy(true);
    try { await api('/api/auth/reset/', { method: 'POST', data: { token, password } }); toast('Senha definida! Entrando…'); window.location.href = '/admin/'; }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <main className="a-auth">
      <form className="a-auth-card" onSubmit={submit} noValidate>
        <Logo />
        {state.loading ? <p className="lead">Verificando link…</p> : !state.valid ? (
          <>
            <h1>Link inválido</h1>
            <p className="lead">Este link expirou ou já foi usado. Peça um novo para continuar.</p>
            <a className="a-btn primary block" style={{ padding: 14 }} href="/admin/forgot/">Pedir novo link</a>
          </>
        ) : (
          <>
            <h1>Criar nova senha</h1>
            <p className="lead">Conta: <strong>{state.email}</strong></p>
            {error && <div className="a-note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
            <PasswordField id="np" label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" meter hint="Mínimo de 10 caracteres, com letras e números." />
            <PasswordField id="cp" label="Repita a nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <button className="a-btn primary block" style={{ padding: 14 }} disabled={busy}>{busy ? <Spin /> : 'Salvar senha e entrar'}</button>
          </>
        )}
        <div className="a-auth-links"><a href="/admin/login/">← Ir para o login</a></div>
      </form>
    </main>
  );
}
