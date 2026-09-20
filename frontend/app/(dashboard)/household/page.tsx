'use client';

import { useEffect, useState } from 'react';
import { Home, Shield, Loader2, Plus, X, Search, Trash2, Star } from 'lucide-react';
import { BannerNotification } from '@/components/ui/banner-notification';
import { Switch } from '@/components/ui/Switch';
import { API_URL } from '@/lib/utils';

interface Member {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  contributionPercentage: number;
  contributionRate: number;
}

interface HouseholdItem {
  id: string;
  name: string;
  role: string;
  contributionPercentage: number;
  isDefault: boolean;
  members: Member[];
}

interface SelectedMember {
  userId: string;
  fullName: string;
  email: string;
  isCurrentUser: boolean;
  contributionPercentage: number;
}

export default function HouseholdPage() {
  const [households, setHouseholds] = useState<HouseholdItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [deletingHouseholdId, setDeletingHouseholdId] = useState<string | null>(null);
  const [settingDefaultHouseholdId, setSettingDefaultHouseholdId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // État de la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  // 1. Récupération des infos de l'utilisateur connecté et de ses foyers
  useEffect(() => {
    const initData = async () => {
      try {
        const [meRes, houseRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { credentials: 'include' }),
          fetch(`${API_URL}/households`, { credentials: 'include' }),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUserId(meData.id);
          setCurrentUserName(meData.fullName);
        }

        if (houseRes.ok) {
          const houseData = await houseRes.json();
          setHouseholds(houseData);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  useEffect(() => {
    if (!notification) return;

    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const handleDeleteHousehold = async (household: HouseholdItem) => {
    if (pendingDeletionId !== household.id) {
      setPendingDeletionId(household.id);
      return;
    }

    setDeletingHouseholdId(household.id);

    try {
      const res = await fetch(`${API_URL}/households/${household.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Erreur lors de la suppression du foyer.');
      }

      setHouseholds((prev) => prev.filter((item) => item.id !== household.id));
      setPendingDeletionId(null);
      setNotification({ type: 'success', message: 'Le foyer a bien été supprimé.' });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erreur lors de la suppression du foyer.',
      });
    } finally {
      setDeletingHouseholdId(null);
    }
  };

  const handleSetDefaultHousehold = async (household: HouseholdItem) => {
    setSettingDefaultHouseholdId(household.id);

    try {
      const res = await fetch(`${API_URL}/households/${household.id}/default`, {
        method: 'PATCH',
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Erreur lors de la mise à jour du foyer par défaut.');
      }

      setHouseholds((prev) =>
        prev.map((item) => ({ ...item, isDefault: item.id === household.id })),
      );
      setNotification({ type: 'success', message: 'Le foyer par défaut a été mis à jour.' });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Erreur lors de la mise à jour du foyer par défaut.',
      });
    } finally {
      setSettingDefaultHouseholdId(null);
    }
  };

  const handleUpdateContributionRate = async (householdId: string, member: Member, value: string) => {
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return;
    setSavingRateId(member.id);
    try {
      const response = await fetch(
        `${API_URL}/households/${householdId}/members/${member.id}/rate`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rate }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible de mettre à jour la quote-part.');
      setHouseholds((current) =>
        current.map((item) =>
          item.id === householdId
            ? {
                ...item,
                members: item.members.map((currentMember) =>
                  currentMember.id === member.id
                    ? { ...currentMember, contributionRate: data.rate }
                    : currentMember,
                ),
              }
            : item,
        ),
      );
      setNotification({ type: 'success', message: 'Quote-part mise à jour.' });
    } catch (requestError: unknown) {
      setNotification({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Erreur de mise à jour.',
      });
    } finally {
      setSavingRateId(null);
    }
  };

  const handleTestMonthlyReminder = async (householdId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/households/${householdId}/test-monthly-reminder`,
        { method: 'POST', credentials: 'include' },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible de simuler le rappel.');
      setNotification({
        type: 'success',
        message: `Rappel simulé pour ${data.notifiedMembers} membre(s).`,
      });
    } catch (requestError: unknown) {
      setNotification({
        type: 'error',
        message: requestError instanceof Error ? requestError.message : 'Erreur lors de la simulation.',
      });
    }
  };

  // Initialisation de la modale quand on l'ouvre
  const handleOpenModal = () => {
    setName('');
    setIsShared(false);
    setSearchQuery('');
    setSearchResults([]);
    setModalError(null);

    // L'utilisateur connecté est toujours présent avec 100% au départ
    if (currentUserId) {
      setSelectedMembers([
        {
          userId: currentUserId,
          fullName: `${currentUserName} (Moi)`,
          email: '',
          isCurrentUser: true,
          contributionPercentage: 100,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  // 2. Recherche d'utilisateurs avec debounce simple
  // Recherche d'utilisateurs avec debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!isShared || trimmed.length < 2) {
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/households/search-users?q=${encodeURIComponent(trimmed)}`,
          { credentials: 'include' },
        );
        if (res.ok && isSubscribed) {
          const users = (await res.json()) as { id: string; fullName: string; email: string }[];
          const filtered = users.filter(
            (u) => !selectedMembers.some((m) => m.userId === u.id),
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isSubscribed) setIsSearching(false);
      }
    }, 250);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isShared, selectedMembers]);

  // Ajouter un utilisateur invité
  const handleAddMember = (user: { id: string; fullName: string; email: string }) => {
    const updated = [
      ...selectedMembers,
      {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        isCurrentUser: false,
        contributionPercentage: 0,
      },
    ];

    // Répartition équitable par défaut (ex: 50/50 à deux)
    const share = Math.floor(100 / updated.length);
    const remainder = 100 % updated.length;

    const balanced = updated.map((m, idx) => ({
      ...m,
      contributionPercentage: idx === 0 ? share + remainder : share,
    }));

    setSelectedMembers(balanced);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Retirer un membre invité
  const handleRemoveMember = (userId: string) => {
    const updated = selectedMembers.filter((m) => m.userId !== userId);
    if (updated.length === 0) return;

    const share = Math.floor(100 / updated.length);
    const remainder = 100 % updated.length;

    const balanced = updated.map((m, idx) => ({
      ...m,
      contributionPercentage: idx === 0 ? share + remainder : share,
    }));

    setSelectedMembers(balanced);
  };

  // Mettre à jour manuellement la quote-part
  const handlePercentageChange = (userId: string, val: number) => {
    setSelectedMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, contributionPercentage: val } : m)),
    );
  };

  const totalPercentage = selectedMembers.reduce(
    (sum, m) => sum + (Number(m.contributionPercentage) || 0),
    0,
  );

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isShared && totalPercentage !== 100) {
      setModalError(`La somme des quotes-parts doit faire 100 % (actuel : ${totalPercentage} %).`);
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const payload = {
        name: name.trim(),
        isShared,
        members: isShared
          ? selectedMembers.map((m) => ({
              userId: m.userId,
              contributionPercentage: Number(m.contributionPercentage),
            }))
          : undefined,
      };

      const res = await fetch(`${API_URL}/households`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la création.');
      }

      setHouseholds((prev) => [...prev, data]);
      setIsModalOpen(false);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setIsSubmitting(false);
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Foyer</h1>
          <p className="text-xs text-zinc-400 mt-1">Espaces de vie et gestion des quotes-parts</p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau foyer</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {households.map((household) => (
            <div
              key={household.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm transition-all hover:border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Home className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-white">{household.name}</h2>
                  <span className="text-[11px] text-zinc-400">
                    Ma quote-part : {household.contributionPercentage}%
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {household.isDefault ? (
                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    Défaut
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultHousehold(household)}
                    disabled={settingDefaultHouseholdId === household.id}
                    className="rounded-full border border-white/10 p-1 text-zinc-500 transition-colors hover:text-amber-400 disabled:opacity-50"
                    title="Définir comme foyer par défaut"
                    aria-label={`Définir ${household.name} comme foyer par défaut`}
                  >
                    {settingDefaultHouseholdId === household.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </button>
                )}
                {household.role === 'OWNER' && (
                  <>
                    {pendingDeletionId === household.id && (
                      <button
                        type="button"
                        onClick={() => setPendingDeletionId(null)}
                        disabled={deletingHouseholdId === household.id}
                        className="text-[11px] text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteHousehold(household)}
                      disabled={deletingHouseholdId === household.id}
                      className={`rounded-full border border-white/10 p-1 text-zinc-500 transition-colors hover:text-rose-400 disabled:opacity-50 ${
                        pendingDeletionId === household.id ? 'text-rose-400' : ''
                      }`}
                      title={
                        pendingDeletionId === household.id
                          ? 'Confirmer la suppression'
                          : 'Supprimer le foyer'
                      }
                      aria-label={
                        pendingDeletionId === household.id
                          ? `Confirmer la suppression de ${household.name}`
                          : `Supprimer ${household.name}`
                      }
                    >
                      {deletingHouseholdId === household.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleTestMonthlyReminder(household.id)}
                  className="ml-auto rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
                >
                  Simuler le rappel du 28
                </button>
              </div>

              <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                  Membres ({household.members.length})
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {household.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-1 rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>{member.fullName}</span>
                        <span className="text-[10px] text-zinc-400">({member.contributionPercentage}%)</span>
                        {member.role === 'OWNER' && (
                          <span title="Propriétaire" className="ml-0.5">
                            <Shield className="h-3 w-3 text-amber-400" />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-zinc-800/50 pt-2">
                        <span className="text-[10px] text-zinc-500">Part :</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={member.contributionRate}
                            onChange={(event) =>
                              setHouseholds((current) =>
                                current.map((item) =>
                                  item.id === household.id
                                    ? {
                                        ...item,
                                        members: item.members.map((currentMember) =>
                                          currentMember.id === member.id
                                            ? { ...currentMember, contributionRate: Number(event.target.value) }
                                            : currentMember,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(event) =>
                              void handleUpdateContributionRate(household.id, member, event.target.value)
                            }
                            disabled={savingRateId === member.id}
                            className="w-[60px] rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-center text-[10px] text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                            aria-label={`Quote-part de ${member.fullName}`}
                          />
                          <span className="text-[10px] text-zinc-500">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale avec recherche et tableau de répartition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">Créer un foyer</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              {modalError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {modalError}
                </div>
              )}

              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nom du foyer
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maison principale, Appartement..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-3">
                <Switch
                  checked={isShared}
                  onChange={setIsShared}
                  label="Foyer partagé"
                  description="Inviter un partenaire ou colocataire et définir les quotes-parts."
                />
              </div>

              {/* Section partagée active */}
              {isShared && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* Barre de recherche */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Inviter un utilisateur
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/60 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
                      )}
                    </div>

                    {/* Résultats dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1.5 left-0 w-full z-10 rounded-xl border border-white/10 bg-zinc-950 shadow-xl overflow-hidden">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleAddMember(user)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs hover:bg-white/5 transition-colors"
                          >
                            <span className="font-medium text-white">{user.fullName}</span>
                            <span className="text-[11px] text-zinc-400">{user.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tableau des quotes-parts */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-300">
                        Répartition des quotes-parts
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          totalPercentage === 100 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        Total : {totalPercentage} %
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-zinc-950/60 divide-y divide-white/5">
                      {selectedMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium text-white truncate">
                              {member.fullName}
                            </span>
                            {member.isCurrentUser && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                Propriétaire
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={member.contributionPercentage}
                              onChange={(e) =>
                                handlePercentageChange(member.userId, parseInt(e.target.value) || 0)
                              }
                              className="w-16 text-center rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="text-zinc-400 text-xs">%</span>

                            {!member.isCurrentUser && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.userId)}
                                className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Retirer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 bg-zinc-800/40 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isShared && totalPercentage !== 100)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Créer le foyer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}