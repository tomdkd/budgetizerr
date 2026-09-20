'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  History,
  Repeat,
  Users,
  LogOut,
  Loader2,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { API_URL, cn } from '@/lib/utils';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Opérations', href: '/operations', icon: Receipt },
  { label: 'Activités', href: '/activity', icon: History },
  { label: 'Abonnements', href: '/subscriptions', icon: Repeat },
  { label: 'Foyer', href: '/household', icon: Users },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [households, setHouseholds] = useState<
    { id: string; name: string; role: string; reminderDay: number; isDefault?: boolean }[]
  >([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reminderDay, setReminderDay] = useState('28');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/households`, { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((data) => {
        setHouseholds(data);
        const selected = data.find((household: { isDefault?: boolean }) => household.isDefault) ?? data[0];
        if (selected) {
          setSelectedHouseholdId(selected.id);
          setReminderDay(String(selected.reminderDay ?? 28));
        }
      })
      .catch(() => undefined);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Erreur déconnexion :', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const selectedHousehold = households.find((household) => household.id === selectedHouseholdId);

  const openSettings = () => {
    if (selectedHousehold) {
      setReminderDay(String(selectedHousehold.reminderDay ?? 28));
    }
    setSettingsMessage(null);
    setIsSettingsOpen(true);
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHousehold) return;
    const value = Number(reminderDay);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      setSettingsMessage('Le jour doit être compris entre 1 et 31.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const response = await fetch(
        `${API_URL}/households/${selectedHousehold.id}/settings`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderDay: value }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible d’enregistrer les paramètres.');
      setHouseholds((current) =>
        current.map((household) =>
          household.id === selectedHousehold.id
            ? { ...household, reminderDay: data.reminderDay }
            : household,
        ),
      );
      setIsSettingsOpen(false);
      setSettingsMessage('Jour du rappel mis à jour.');
      window.setTimeout(() => setSettingsMessage(null), 4000);
    } catch (error: unknown) {
      setSettingsMessage(error instanceof Error ? error.message : 'Erreur de mise à jour.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo & Marque */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-sm shadow-emerald-500/20">
            <div className="h-full w-full bg-zinc-950 rounded-[11px] flex items-center justify-center group-hover:bg-zinc-900 transition-colors">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Budgetizerr
          </span>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-zinc-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <PushNotificationToggle />
          <button
            type="button"
            onClick={openSettings}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Paramètres du foyer"
            aria-label="Paramètres du foyer"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-rose-400 hover:border-rose-500/30 transition-all duration-150 disabled:opacity-50"
            title="Se déconnecter"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Bouton Menu Mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menu Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl px-4 py-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-zinc-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/5">
            <div className="mb-2 flex items-center justify-center gap-2">
              <PushNotificationToggle />
              <button
                type="button"
                onClick={openSettings}
                className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Paramètres du foyer"
                aria-label="Paramètres du foyer"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/60 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}

      {settingsMessage && !isSettingsOpen && (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-emerald-500/20 bg-zinc-900 px-3.5 py-3 text-xs text-emerald-300 shadow-xl">
          {settingsMessage}
        </div>
      )}

      {isSettingsOpen && selectedHousehold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Paramètres du foyer</h2>
                <p className="mt-1 text-xs text-zinc-500">{selectedHousehold.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveSettings} className="mt-5 space-y-5">
              <label className="block text-xs font-medium text-zinc-300">
                Jour du rappel de virement mensuel
                <span className="mt-1.5 block text-[11px] font-normal leading-relaxed text-zinc-500">
                  Définit le jour du mois où la notification push de calcul des quotes-parts sera envoyée.
                </span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={reminderDay}
                  onChange={(event) => setReminderDay(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </label>
              {settingsMessage && <p className="text-xs text-rose-300">{settingsMessage}</p>}
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-xl border border-white/10 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSavingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}