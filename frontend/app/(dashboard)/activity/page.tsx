'use client';

import { useEffect, useState } from 'react';
import {
  Activity as ActivityIcon,
  ArrowRight,
  Calendar,
  ChevronDown,
  Edit3,
  Home,
  Loader2,
  PlusCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { API_URL } from '@/lib/utils';

interface HouseholdItem {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ActivityItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  targetEntity: string;
  createdAt: string;
  user: { fullName: string; email: string } | null;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
}

const actionStyles = {
  CREATE: {
    border: 'border-l-4 border-l-emerald-500',
    icon: PlusCircle,
    iconColor: 'text-emerald-400',
  },
  UPDATE: {
    border: 'border-l-4 border-l-amber-500',
    icon: Edit3,
    iconColor: 'text-amber-400',
  },
  DELETE: {
    border: 'border-l-4 border-l-rose-500',
    icon: Trash2,
    iconColor: 'text-rose-400',
  },
} as const;

function getActivityDescription(activity: ActivityItem) {
  if (activity.action === 'CREATE' && activity.targetEntity === 'Household') {
    return 'Création du foyer';
  }
  if (activity.action === 'UPDATE' && activity.targetEntity === 'Transaction') {
    return 'Modification du solde initial';
  }
  if (activity.action === 'DELETE' && activity.targetEntity === 'Household') {
    return 'Suppression du foyer';
  }

  const actionLabels: Record<string, string> = {
    CREATE: 'Création',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
  };
  return `${actionLabels[activity.action] ?? activity.action} ${activity.targetEntity.toLowerCase()}`;
}

function formatPayloadValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'amount' && typeof value === 'number') {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }
  if (key === 'date' || key === 'debitDate') {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }
  if (key === 'isRecurring') return value ? 'Récurrent' : 'Ponctuel';
  if (key === 'debitDay') return `Prélèvement le ${String(value)}`;
  return String(value);
}

function formatPayloadLabel(key: string) {
  const labels: Record<string, string> = {
    amount: 'Montant',
    title: 'Titre',
    description: 'Description',
    date: 'Date',
    debitDate: 'Date',
    debitDay: 'Jour',
    isRecurring: 'Type',
  };
  return labels[key] ?? key;
}

function ActivityPayloadDetails({ activity }: { activity: ActivityItem }) {
  const before = activity.payloadBefore ?? {};
  const after = activity.payloadAfter ?? {};
  const ignoredKeys = new Set(['householdId', 'month', 'year', 'subscriptionId', 'operationId', 'type']);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
    (key) => !ignoredKeys.has(key),
  );

  if (activity.action === 'UPDATE') {
    const changedKeys = keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (changedKeys.length === 0) return null;
    return (
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-400">
        {changedKeys.map((key) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className="text-zinc-500">{formatPayloadLabel(key)} :</span>
            <span className="line-through text-zinc-500">{formatPayloadValue(key, before[key])}</span>
            <span className="text-zinc-600">→</span>
            <span className="font-medium text-amber-300">{formatPayloadValue(key, after[key])}</span>
          </span>
        ))}
      </div>
    );
  }

  if (activity.action === 'CREATE') {
    const details = ['title', 'amount', 'date', 'debitDate', 'debitDay', 'isRecurring']
      .filter((key) => after[key] !== undefined)
      .map((key) => `${formatPayloadLabel(key)} : ${formatPayloadValue(key, after[key])}`);
    return details.length > 0 ? (
      <p className="mt-1 break-words whitespace-normal text-[11px] text-emerald-400/80">+ {details.join(' • ')}</p>
    ) : null;
  }

  if (activity.action === 'DELETE') {
    const title = after.title ?? before.title;
    const amount = after.amount ?? before.amount;
    const details = [
      title ? `"${formatPayloadValue('title', title)}"` : null,
      amount !== undefined ? formatPayloadValue('amount', amount) : null,
    ].filter(Boolean);
    return details.length > 0 ? (
      <p className="mt-1 break-words whitespace-normal text-[11px] text-rose-400/80 line-through">{details.join(' • ')}</p>
    ) : null;
  }

  return null;
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityTile({ activity }: { activity: ActivityItem }) {
  const style = actionStyles[activity.action as keyof typeof actionStyles] ?? actionStyles.UPDATE;
  const Icon = style.icon;

  return (
    <article
      className={`flex flex-col gap-1 rounded-xl border border-white/5 bg-zinc-900/40 px-4 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${style.border}`}
    >
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 sm:mt-0 ${style.iconColor}`} />
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-zinc-100">
            {getActivityDescription(activity)}
          </p>
          <p className="mt-0.5 break-words text-[11px] text-zinc-500">
            {activity.user?.fullName ?? 'Utilisateur inconnu'}
            <span className="sm:hidden"> · {formatActivityDate(activity.createdAt)}</span>
          </p>
          <ActivityPayloadDetails activity={activity} />
        </div>
      </div>
      <time
        className="hidden shrink-0 text-right text-[11px] text-zinc-500 sm:block"
        dateTime={activity.createdAt}
      >
        {formatActivityDate(activity.createdAt)}
      </time>
    </article>
  );
}

export default function ActivityPage() {
  const [households, setHouseholds] = useState<HouseholdItem[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHouseholds = async () => {
      try {
        const response = await fetch(`${API_URL}/households`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Impossible de récupérer vos foyers.');

        const data: HouseholdItem[] = await response.json();
        setHouseholds(data);
        setSelectedHouseholdId(
          data.find((household) => household.isDefault)?.id ?? data[0]?.id ?? null,
        );
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de récupérer vos foyers.',
        );
      } finally {
        setIsLoadingHouseholds(false);
      }
    };

    loadHouseholds();
  }, []);

  useEffect(() => {
    if (!selectedHouseholdId) return;

    const loadActivities = async () => {
      setIsLoadingActivities(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const queryString = params.toString();
        const response = await fetch(
          `${API_URL}/households/${selectedHouseholdId}/activities${queryString ? `?${queryString}` : ''}`,
          { credentials: 'include' },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || 'Impossible de récupérer les activités.');
        }
        setActivities(data);
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de récupérer les activités.',
        );
        setActivities([]);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, [endDate, selectedHouseholdId, startDate]);

  const selectedHousehold = households.find((household) => household.id === selectedHouseholdId);
  const isLoading = isLoadingHouseholds || (Boolean(selectedHouseholdId) && isLoadingActivities);

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col overflow-hidden">
      <header className="flex-none space-y-4 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-emerald-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-white">Activités</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Historique des actions effectuées sur le foyer sélectionné.
          </p>
        </div>

        {households.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <select
                value={selectedHouseholdId ?? ''}
                onChange={(event) => setSelectedHouseholdId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900/70 py-3 pl-10 pr-10 text-sm font-medium text-white outline-none transition-colors focus:border-emerald-500/50"
                aria-label="Sélectionner un foyer"
              >
                {households.map((household) => (
                  <option key={household.id} value={household.id} className="bg-zinc-900">
                    {household.name}{household.isDefault ? ' · Défaut' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="w-full sm:w-44">
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Date de début" />
              </div>
              <ArrowRight className="hidden h-3.5 w-3.5 text-zinc-600 sm:block" aria-hidden="true" />
              <div className="w-full sm:w-44">
                <DatePicker value={endDate} onChange={setEndDate} placeholder="Date de fin" />
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                title="Effacer le filtre de dates"
                aria-label="Effacer le filtre de dates"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {isLoadingActivities && (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-label="Chargement" />
            )}
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {isLoadingHouseholds ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
            {error}
          </div>
        ) : households.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Home className="h-8 w-8 text-zinc-600" />
            <p className="mt-4 text-sm font-medium text-zinc-300">Aucun foyer disponible</p>
            <p className="mt-1 text-xs text-zinc-500">Créez un foyer pour consulter son historique.</p>
          </div>
        ) : activities.length === 0 && !isLoadingActivities ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <Calendar className="mx-auto h-7 w-7 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">Aucune activité récente sur ce foyer.</p>
            </div>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 space-y-2 overflow-y-auto pr-2 [scrollbar-width:thin]">
            {isLoadingActivities && (
              <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-full border border-white/10 bg-zinc-950/80 p-2 backdrop-blur-sm">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              </div>
            )}
            {activities.map((activity) => (
              <ActivityTile key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </main>

      {selectedHousehold && !isLoading && !error && (
        <span className="sr-only">Foyer sélectionné : {selectedHousehold.name}</span>
      )}
    </div>
  );
}
