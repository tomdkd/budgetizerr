'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight, UserPlus } from 'lucide-react';
import { BannerNotification } from '@/components/ui/banner-notification';
import { API_URL } from '@/lib/utils';

interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        monthlySalary: monthlySalary ? parseFloat(monthlySalary) : null,
      };

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Gère les retours d'erreur NestJS (tableau de messages ou string unique)
        const errorMessage = Array.isArray(data.message)
          ? data.message[0]
          : data.message || "Erreur lors de l'inscription.";
        throw new Error(errorMessage);
      }

      // Succès
      setNotification({
        type: 'success',
        message: 'Compte créé avec succès ! Redirection vers la page de connexion...',
      });

      // Redirection après 1,5 seconde
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de joindre le serveur.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Halos lumineux */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md my-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 mb-4">
              <div className="h-full w-full bg-zinc-950 rounded-[15px] flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Créer un compte
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Rejoignez Budgetizerr et automatisez vos finances
            </p>
          </div>

          {/* Bandeau de notification */}
          {notification && (
            <BannerNotification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
              className="mb-6"
            />
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                required
                disabled={isLoading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alexandre Martin"
                className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
            </div>

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
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexandre@exemple.com"
                className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 pr-11 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="monthlySalary"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Salaire net mensuel
                </label>
                <span className="text-[11px] text-zinc-500">Optionnel</span>
              </div>
              <div className="relative">
                <input
                  id="monthlySalary"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isLoading}
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="2500"
                  className="w-full rounded-xl bg-zinc-950/60 border border-white/10 px-4 py-3 pr-9 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">
                  €
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 group relative flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 shadow-md shadow-white/5 hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <span>Créer mon compte</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-400">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}