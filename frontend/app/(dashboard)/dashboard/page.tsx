'use client';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Tableau de bord</h1>
        <p className="text-xs text-zinc-400 mt-1">Vue d&apos;ensemble du foyer et des opérations en cours</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm p-5 shadow-sm">
          <span className="text-xs font-medium text-zinc-400">Solde disponible</span>
          <div className="mt-2 text-2xl font-semibold text-white">0,00 €</div>
        </div>
      </div>
    </div>
  );
}