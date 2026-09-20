'use client';

import { useEffect, useState } from 'react';
import { Calendar, CalendarClock, ChevronDown, Home, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { API_URL } from '@/lib/utils';

interface HouseholdItem {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SubscriptionItem {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  debitDay: number;
  isActive: boolean;
}

interface SubscriptionResponse {
  subscriptions: SubscriptionItem[];
  totalMonthlyCost: number;
}

function formatAmount(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function SubscriptionsPage() {
  const [households, setHouseholds] = useState<HouseholdItem[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(true);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SubscriptionItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [debitDay, setDebitDay] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

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
        setError(requestError instanceof Error ? requestError.message : 'Impossible de récupérer vos foyers.');
      } finally {
        setIsLoadingHouseholds(false);
      }
    };

    loadHouseholds();
  }, []);

  useEffect(() => {
    if (!selectedHouseholdId) return;
    const loadSubscriptions = async () => {
      setIsLoadingSubscriptions(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/households/${selectedHouseholdId}/subscriptions`,
          { credentials: 'include' },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'Impossible de récupérer les abonnements.');
        const result = data as SubscriptionResponse;
        setSubscriptions(result.subscriptions);
        setTotalMonthlyCost(result.totalMonthlyCost);
      } catch (requestError: unknown) {
        setError(requestError instanceof Error ? requestError.message : 'Impossible de récupérer les abonnements.');
        setSubscriptions([]);
        setTotalMonthlyCost(0);
      } finally {
        setIsLoadingSubscriptions(false);
      }
    };

    loadSubscriptions();
  }, [selectedHouseholdId]);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setDebitDay('1');
  };

  const handleSubmitSubscription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHouseholdId) return;
    const numericAmount = Number(amount.replace(',', '.'));
    const numericDay = Number(debitDay);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericDay < 1 || numericDay > 31) {
      setError('Veuillez renseigner un titre, un montant positif et un jour entre 1 et 31.');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = editingSubscription !== null;
      const response = await fetch(
        `${API_URL}/households/${selectedHouseholdId}/subscriptions${isEditing ? `/${editingSubscription.id}` : ''}`,
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            amount: numericAmount,
            debitDay: numericDay,
          }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible d’enregistrer l’abonnement.');
      if (isEditing) {
        setSubscriptions((current) =>
          current.map((item) => (item.id === data.id ? data : item)).sort((left, right) => left.debitDay - right.debitDay),
        );
        setTotalMonthlyCost((current) => current - Number(editingSubscription.amount) + Number(data.amount));
      } else {
        setSubscriptions((current) => [...current, data].sort((left, right) => left.debitDay - right.debitDay));
        setTotalMonthlyCost((current) => current + Number(data.amount));
      }
      resetForm();
      setEditingSubscription(null);
      setIsModalOpen(false);
      setNotification(isEditing ? 'Abonnement mis à jour.' : 'Abonnement ajouté avec succès.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de créer l’abonnement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subscription: SubscriptionItem) => {
    if (!selectedHouseholdId) return;
    setDeletingId(subscription.id);
    try {
      const response = await fetch(
        `${API_URL}/households/${selectedHouseholdId}/subscriptions/${subscription.id}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible de supprimer l’abonnement.');
      setSubscriptions((current) => current.filter((item) => item.id !== subscription.id));
      setTotalMonthlyCost((current) => current - Number(subscription.amount));
      setNotification('Abonnement supprimé.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de supprimer l’abonnement.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (subscription: SubscriptionItem) => {
    setEditingSubscription(subscription);
    setTitle(subscription.title);
    setDescription(subscription.description ?? '');
    setAmount(String(subscription.amount));
    setDebitDay(String(subscription.debitDay));
    setIsModalOpen(true);
  };

  const selectedHousehold = households.find((household) => household.id === selectedHouseholdId);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {notification}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-white">Abonnements</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Gérez les charges fixes mensuelles de votre foyer.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setEditingSubscription(null);
            setIsModalOpen(true);
          }}
          disabled={!selectedHouseholdId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Nouvel abonnement
        </button>
      </div>

      {isLoadingHouseholds ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
      ) : households.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 p-10 text-center text-sm text-zinc-400">
          Créez un foyer pour gérer ses abonnements.
        </div>
      ) : selectedHousehold ? (
        <>
          <div className="relative max-w-md">
            <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <select
              value={selectedHousehold.id}
              onChange={(event) => setSelectedHouseholdId(event.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900/70 py-3 pl-10 pr-10 text-sm font-medium text-white outline-none focus:border-emerald-500/50"
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

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Synthèse</span>
                <h2 className="mt-1 text-base font-semibold text-white">Total des abonnements mensuels</h2>
              </div>
              <CalendarClock className="h-5 w-5 text-rose-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-400">- {formatAmount(totalMonthlyCost)}</p>
            <p className="mt-1 text-xs text-zinc-500">{subscriptions.length} abonnement{subscriptions.length > 1 ? 's' : ''} actif{subscriptions.length > 1 ? 's' : ''} ce mois-ci</p>
          </section>

          {isLoadingSubscriptions ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
          ) : subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 p-10 text-center">
              <Calendar className="mx-auto h-7 w-7 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">Aucun abonnement enregistré</p>
              <p className="mt-1 text-xs text-zinc-500">Ajoutez votre première charge fixe mensuelle.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3">
                  <div className="flex w-24 shrink-0 items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    Le {subscription.debitDay} du mois
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{subscription.title}</p>
                    {subscription.description && <p className="truncate text-xs text-zinc-500">{subscription.description}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-rose-300">- {formatAmount(subscription.amount)}<span className="text-[11px] font-normal text-zinc-500">/mois</span></p>
                  <button
                    type="button"
                    onClick={() => openEditModal(subscription)}
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-amber-400/10 hover:text-amber-400"
                    title="Modifier l’abonnement"
                    aria-label={`Modifier ${subscription.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(subscription)}
                    disabled={deletingId === subscription.id}
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                    title="Supprimer l’abonnement"
                    aria-label={`Supprimer ${subscription.title}`}
                  >
                    {deletingId === subscription.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-semibold text-white">
                {editingSubscription ? 'Modifier l’abonnement' : 'Ajouter un abonnement'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmitSubscription} className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-zinc-300">Titre
                <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Spotify, Netflix, Assurance auto" className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-medium text-zinc-300">Description <span className="font-normal text-zinc-500">(optionnel)</span>
                <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-zinc-300">Montant (€)
                  <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-medium text-zinc-300">Jour de prélèvement
                  <input required type="number" min="1" max="31" value={debitDay} onChange={(event) => setDebitDay(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-white/10 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5">Annuler</button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {editingSubscription ? 'Enregistrer les modifications' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-white">Supprimer cet abonnement ?</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              L’abonnement « {pendingDelete.title} » ne sera plus comptabilisé dans les charges mensuelles.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-white/10 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete(pendingDelete);
                  setPendingDelete(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
