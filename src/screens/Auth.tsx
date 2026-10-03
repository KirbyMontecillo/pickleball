import { useState } from 'react';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabase';

const input = 'min-h-14 w-full rounded-2xl border border-pink-100 px-5 text-lg outline-none focus:border-pink-300';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const toEmail = (u: string) => `pq.${u}@gmail.com`;

export default function Auth() {
  const [signUp, setSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const name = username.trim().toLowerCase();
  const validName = USERNAME_RE.test(name);

  const submit = async () => {
    if (!validName) return setError('Username: 3-20 letters, numbers, or underscores.');
    setBusy(true);
    setError(null);
    setNotice(null);
    const creds = { email: toEmail(name), password };
    const { data, error: err } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (err) {
      if (/already registered/i.test(err.message)) return setError('Username already taken.');
      if (/invalid login/i.test(err.message)) return setError('Wrong username or password.');
      return setError(err.message);
    }
    if (signUp && !data.session) setNotice('Account created, but email confirmation is still on in Supabase. Turn it off, then sign in.');
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-md space-y-6 px-5 pt-24">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Pickleball Queue</h1>
          <p className="mt-1 text-gray-400">{signUp ? 'Create an account to save your players and games.' : 'Sign in to continue.'}</p>
        </header>
        <div className="space-y-3">
          <input
            className={input}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className={input}
            type="password"
            autoComplete={signUp ? 'new-password' : 'current-password'}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <p className="text-pink-500">{error}</p>}
        {notice && <p className="text-gray-900">{notice}</p>}
        <Button onClick={submit} disabled={busy || !name || password.length < 6}>
          {busy ? 'Please wait...' : signUp ? 'Create account' : 'Sign in'}
        </Button>
        <button className="min-h-11 w-full text-pink-500" onClick={() => { setSignUp(!signUp); setError(null); setNotice(null); }}>
          {signUp ? 'Have an account? Sign in' : 'New here? Create an account'}
        </button>
      </main>
    </div>
  );
}