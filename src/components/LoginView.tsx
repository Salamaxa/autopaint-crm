import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential') {
        setError('Невірний email або пароль.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Забагато спроб. Спробуйте трохи пізніше.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Вхід через Email/Password ще не увімкнено у Firebase.');
      } else {
        setError('Не вдалося виконати вхід. Перевірте email і пароль.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="text-2xl font-bold">AutoPaint CRM</div>
            <div className="text-sm text-slate-400 mt-2">
              Увійдіть до системи
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl bg-[#0b1018] border border-slate-700 px-4 py-3 outline-none focus:border-slate-500"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Пароль
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl bg-[#0b1018] border border-slate-700 px-4 py-3 outline-none focus:border-slate-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-100 text-slate-900 font-semibold py-3 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
