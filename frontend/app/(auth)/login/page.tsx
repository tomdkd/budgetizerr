'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // INDISPENSABLE pour que le navigateur accepte et stocke le cookie Set-Cookie
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Identifiants invalides.');
      }

      // Connexion réussie -> redirection vers le dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de joindre le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Halo lumineux en arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -top-10 right-10 w-72 h-72 bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Carte principale */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 mb-4">
              <div className="h-full w-full bg-zinc-950 rounded-[15px] flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Budgetizerr
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Gérez votre foyer et vos comptes en toute clarté
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 pr-11 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 group relative flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 shadow-md shadow-white/5 hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-400">
              Nouveau sur la plateforme ?{' '}
              <Link
                href="/register"
                className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}