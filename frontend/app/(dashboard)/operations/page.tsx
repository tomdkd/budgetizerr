'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  ListOrdered,
  Loader2,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Receipt,
  TrendingDown,
  Wallet,
  X,
} from 'lucide-react';
import { BannerNotification } from '@/components/ui/banner-notification';
import { DatePicker } from '@/components/ui/DatePicker';
import { Switch } from '@/components/ui/Switch';
import { API_URL } from '@/lib/utils';

interface HouseholdItem {
  id: string;
  name: string;
  isDefault: boolean;
}

interface MonthlyOperationsData {
  initialBalance: number;
  realBalance: number;
  plannedExpenses: number;
  availableBalance: number;
  operations: OperationItem[];
}

interface OperationItem {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INITIAL_BALANCE' | string;
  isRecurring: boolean;
  date: string;
  createdAt: string;
  user: { fullName: string; email: string } | null;
}

type ActiveTab = 'summary' | 'details';

function OperationsSummary({
  household,
  metrics,
  monthLabel,
  onEditInitialBalance,
  onAddOperation,
}: {
  household: HouseholdItem;
  metrics: MonthlyOperationsData;
  monthLabel: string;
  onEditInitialBalance: () => void;
  onAddOperation: () => void;
}) {
  const formatAmount = (amount: number) =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Synthèse financière
          </span>
          <h2 className="mt-1 text-lg font-semibold text-white">Résumé de {household.name}</h2>
        </div>
        <div className="flex w-full flex-row gap-2 sm:w-auto sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onAddOperation}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400 sm:flex-none sm:text-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Ajouter une opération
          </button>
          <button
            type="button"
            onClick={onEditInitialBalance}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300 sm:flex-none sm:text-[11px]"
            title={`Modifier le solde initial de ${monthLabel}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier le solde initial
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 pb-16 sm:grid-cols-3 sm:pb-0">
        <div className="flex flex-col rounded-2xl border border-white/5 bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Solde réel</span>
            <span className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Trésorerie actuelle sur les comptes</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-semibold text-white">{formatAmount(metrics.realBalance)}</p>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/5 bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Total des charges prévues</span>
            <span className="rounded-lg bg-rose-400/10 p-2 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Dépenses et prélèvements du mois</p>
          <p className="mt-2 text-2xl font-semibold text-rose-400">
            {formatAmount(metrics.plannedExpenses)}
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Solde disponible</span>
            <span className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
              <PiggyBank className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Reste à vivre estimé après charges</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {formatAmount(metrics.availableBalance)}
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Les statistiques et balances du foyer seront disponibles ici.
      </p>
    </section>
  );
}

function OperationsDetails({
  household,
  operations,
}: {
  household: HouseholdItem;
  operations: OperationItem[];
}) {
  const formatOperationDate = (value: string) =>
    new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const formatAmount = (operation: OperationItem) => {
    const isPositive = operation.type === 'INCOME' || operation.type === 'INITIAL_BALANCE';
    const amount = Math.abs(operation.amount).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
    return { text: `${isPositive ? '+' : '-'}${amount}`, isPositive };
  };
  const now = new Date();

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Transactions
          </span>
          <h2 className="mt-1 text-lg font-semibold text-white">Détails de {household.name}</h2>
        </div>
        <Receipt className="h-5 w-5 text-emerald-400" />
      </div>

      {operations.length === 0 ? (
        <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-950/30 px-4 text-center">
          <ListOrdered className="h-7 w-7 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-300">Aucune opération à afficher</p>
          <p className="mt-1 text-xs text-zinc-500">
            Le tableau des dépenses et transactions de ce foyer apparaîtra ici.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {operations.map((operation) => {
            const isInitialBalance = operation.type === 'INITIAL_BALANCE';
            const isPast = new Date(operation.date) <= now;
            const amount = formatAmount(operation);
            return (
              <div
                key={operation.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-4 py-3 transition-colors hover:border-white/10"
              >
                <div className="w-14 shrink-0 text-xs font-medium text-zinc-400">
                  {formatOperationDate(operation.date)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{operation.title}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {operation.description || operation.user?.fullName || 'Opération du foyer'}
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  {isInitialBalance ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300">
                      Solde initial
                    </span>
                  ) : isPast ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
                      <CheckCircle2 className="h-3 w-3" />
                      Passée
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80">
                      <Clock className="h-3 w-3" />
                      Prévue
                    </span>
                  )}
                  {operation.isRecurring && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                      Récurrent
                    </span>
                  )}
                </div>
                <span className={`shrink-0 text-sm font-semibold ${amount.isPositive ? 'text-emerald-400' : 'text-rose-300'}`}>
                  {amount.text}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
                  title="Actions à venir"
                  aria-label={`Actions pour ${operation.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function OperationsPage() {
  const [households, setHouseholds] = useState<HouseholdItem[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [metrics, setMetrics] = useState<MonthlyOperationsData>({
    initialBalance: 0,
    realBalance: 0,
    plannedExpenses: 0,
    availableBalance: 0,
    operations: [],
  });
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [initialBalanceValue, setInitialBalanceValue] = useState('0.00');
  const [isSavingInitialBalance, setIsSavingInitialBalance] = useState(false);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [operationTitle, setOperationTitle] = useState('');
  const [operationDescription, setOperationDescription] = useState('');
  const [operationAmount, setOperationAmount] = useState('');
  const [operationType, setOperationType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [operationIsRecurring, setOperationIsRecurring] = useState(false);
  const [operationDebitDate, setOperationDebitDate] = useState('');
  const [isSavingOperation, setIsSavingOperation] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHouseholds = async () => {
      try {
        const response = await fetch(`${API_URL}/households`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Impossible de récupérer vos foyers.');
        }

        const data: HouseholdItem[] = await response.json();
        setHouseholds(data);
        setSelectedHouseholdId(data.find((household) => household.isDefault)?.id ?? data[0]?.id ?? null);
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de récupérer vos foyers.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadHouseholds();
  }, []);

  useEffect(() => {
    if (!selectedHouseholdId) return;

    const loadMonthlyOperations = async () => {
      setIsMonthlyLoading(true);
      try {
        const params = new URLSearchParams({
          year: String(currentYear),
          month: String(currentMonth),
        });
        const response = await fetch(
          `${API_URL}/households/${selectedHouseholdId}/operations?${params}`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Impossible de récupérer les opérations du mois.');
        }

        const data: MonthlyOperationsData = await response.json();
        setMetrics(data);
        setInitialBalanceValue(String(data.initialBalance ?? 0));
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de récupérer les opérations du mois.',
        );
      } finally {
        setIsMonthlyLoading(false);
      }
    };

    loadMonthlyOperations();
  }, [currentMonth, currentYear, selectedHouseholdId]);

  const selectedHousehold = households.find((household) => household.id === selectedHouseholdId);
  const monthLabel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(currentYear, currentMonth - 1, 1));
  const formattedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const isCurrentMonth =
    currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear();
  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentMonth(nextDate.getMonth() + 1);
    setCurrentYear(nextDate.getFullYear());
  };

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const handleSaveInitialBalance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHouseholdId) return;

    const amount = Number(initialBalanceValue.replace(',', '.'));
    if (!Number.isFinite(amount)) {
      setNotification({ type: 'error', message: 'Veuillez saisir un montant valide.' });
      return;
    }

    setIsSavingInitialBalance(true);
    try {
      const response = await fetch(
        `${API_URL}/households/${selectedHouseholdId}/operations/initial-balance`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, year: currentYear, month: currentMonth }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de mettre à jour le solde initial.');
      }

      setMetrics({
        initialBalance: data.operation.amount,
        realBalance: data.realBalance,
        plannedExpenses: data.plannedExpenses,
        availableBalance: data.availableBalance,
        operations: metrics.operations.map((operation) =>
          operation.type === 'INITIAL_BALANCE'
            ? { ...operation, amount: data.operation.amount }
            : operation,
        ),
      });
      setInitialBalanceValue(String(data.operation.amount));
      setIsInitialBalanceModalOpen(false);
      setNotification({ type: 'success', message: 'Solde initial mis à jour.' });
    } catch (requestError: unknown) {
      setNotification({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Impossible de mettre à jour le solde initial.',
      });
    } finally {
      setIsSavingInitialBalance(false);
    }
  };

  const resetOperationForm = () => {
    setOperationTitle('');
    setOperationDescription('');
    setOperationAmount('');
    setOperationType('EXPENSE');
    setOperationIsRecurring(false);
    setOperationDebitDate('');
  };

  const handleCreateOperation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHouseholdId) return;

    const amount = Number(operationAmount.replace(',', '.'));
    if (!operationTitle.trim() || !Number.isFinite(amount) || amount < 0) {
      setNotification({ type: 'error', message: 'Veuillez renseigner un titre et un montant valide.' });
      return;
    }

    setIsSavingOperation(true);
    try {
      const response = await fetch(
        `${API_URL}/households/${selectedHouseholdId}/operations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: operationTitle.trim(),
            description: operationDescription.trim() || undefined,
            amount,
            type: operationType,
            isRecurring: operationIsRecurring,
            debitDate: operationIsRecurring && operationDebitDate ? operationDebitDate : undefined,
          }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de créer l’opération.');
      }

      const params = new URLSearchParams({
        year: String(currentYear),
        month: String(currentMonth),
      });
      const metricsResponse = await fetch(
        `${API_URL}/households/${selectedHouseholdId}/operations?${params}`,
        { credentials: 'include' },
      );
      if (metricsResponse.ok) {
        setMetrics(await metricsResponse.json());
      }
      resetOperationForm();
      setIsOperationModalOpen(false);
      setNotification({ type: 'success', message: 'Opération créée avec succès.' });
    } catch (requestError: unknown) {
      setNotification({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Impossible de créer l’opération.',
      });
    } finally {
      setIsSavingOperation(false);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <BannerNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Opérations</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Suivez les revenus, dépenses et transactions de vos foyers.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      ) : households.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 text-center">
          <Home className="h-8 w-8 text-zinc-600" />
          <h2 className="mt-4 text-base font-semibold text-white">Aucun foyer</h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
            Créez votre premier foyer pour commencer à suivre vos opérations.
          </p>
          <a
            href="/household"
            className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Créer un foyer
          </a>
        </div>
      ) : selectedHousehold ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="relative w-full sm:max-w-md">
              <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <select
                value={selectedHousehold.id}
                onChange={(event) => setSelectedHouseholdId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900/70 py-2 pl-10 pr-10 text-sm font-medium text-white outline-none transition-colors focus:border-emerald-500/50 sm:py-3"
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

            <div className="flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-zinc-900/70 p-0.5 sm:gap-2 sm:p-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:p-2"
                title="Mois précédent"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-36 items-center justify-center gap-2 px-2 text-xs font-medium text-white">
                <Calendar className="h-4 w-4 text-emerald-400" />
                {formattedMonthLabel}
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:p-2"
                title="Mois suivant"
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(today.getMonth() + 1);
                    setCurrentYear(today.getFullYear());
                  }}
                  className="border-l border-white/10 px-2 py-1.5 text-[11px] font-medium text-emerald-400 transition-colors hover:text-emerald-300 sm:px-3 sm:py-2"
                >
                  Mois en cours
                </button>
              )}
            </div>
          </div>

          {isMonthlyLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              Mise à jour des données du mois...
            </div>
          )}

          <div className="border-b border-white/10">
            <div className="flex gap-5" role="tablist" aria-label="Vue des opérations">
              {[
                { id: 'summary' as const, label: 'Résumé', icon: BarChart3 },
                { id: 'details' as const, label: 'Détails', icon: ListOrdered },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 pb-3 text-xs font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : ''}`} />
                    {tab.label}
                    {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'summary' ? (
            <OperationsSummary
              household={selectedHousehold}
              metrics={metrics}
              monthLabel={formattedMonthLabel}
              onAddOperation={() => setIsOperationModalOpen(true)}
              onEditInitialBalance={() => {
                setInitialBalanceValue(String(metrics.initialBalance));
                setIsInitialBalanceModalOpen(true);
              }}
            />
          ) : (
            <OperationsDetails household={selectedHousehold} operations={metrics.operations} />
          )}
        </>
      ) : null}

      {isInitialBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Solde initial — {formattedMonthLabel}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Cette opération est obligatoirement fixée au 1er du mois (une seule opération par mois).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInitialBalanceModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInitialBalance} className="mt-5 space-y-5">
              <label className="block text-xs font-medium text-zinc-300">
                Montant reporté
                <div className="relative mt-2">
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalanceValue}
                    onChange={(event) => setInitialBalanceValue(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-3 pr-10 text-sm text-white outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    €
                  </span>
                </div>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInitialBalanceModalOpen(false)}
                  className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingInitialBalance}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSavingInitialBalance && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOperationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Nouvelle opération</h2>
                <p className="mt-1 text-xs text-zinc-400">Ajoutez un revenu ou une dépense au foyer.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOperationModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOperation} className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-zinc-300">
                Titre
                <input
                  type="text"
                  required
                  value={operationTitle}
                  onChange={(event) => setOperationTitle(event.target.value)}
                  placeholder="Courses Leclerc, Abonnement Netflix..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-300">
                Libellé / Description <span className="font-normal text-zinc-500">(optionnel)</span>
                <input
                  type="text"
                  value={operationDescription}
                  onChange={(event) => setOperationDescription(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Montant (€)
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={operationAmount}
                    onChange={(event) => setOperationAmount(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-300">
                  Type
                  <select
                    value={operationType}
                    onChange={(event) => setOperationType(event.target.value as 'EXPENSE' | 'INCOME')}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="EXPENSE">Dépense</option>
                    <option value="INCOME">Revenu</option>
                  </select>
                </label>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-3">
                <Switch
                  checked={operationIsRecurring}
                  onChange={setOperationIsRecurring}
                  label="Dépense récurrente / abonnement"
                />
              </div>
              {operationIsRecurring && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Date de prélèvement prévue
                  </label>
                  <DatePicker
                    value={operationDebitDate}
                    onChange={setOperationDebitDate}
                    placeholder="Choisir une date"
                  />
                </div>
              )}
              <p className="text-[11px] text-zinc-500">
                Si non récurrente, la date retenue sera automatiquement la date du jour.
              </p>
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOperationModalOpen(false)}
                  className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingOperation}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSavingOperation && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enregistrer l&apos;opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
