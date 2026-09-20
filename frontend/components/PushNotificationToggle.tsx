'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { API_URL } from '@/lib/utils';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function PushNotificationToggle() {
  // null tant que le support des notifications n'est pas encore déterminé côté client, pour éviter un mismatch d'hydratation SSR.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valeur uniquement disponible côté client, nécessaire pour éviter un mismatch d'hydratation
    setPermission(
      typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
    );
  }, []);

  useEffect(() => {
    if (
      !permission ||
      permission === 'unsupported' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return;
    }

    navigator.serviceWorker.getRegistration('/sw.js').then((registration) => {
      registration?.pushManager
        .getSubscription()
        .then((subscription) => setIsSubscribed(Boolean(subscription)));
    });
  }, [permission]);

  const enableNotifications = async () => {
    if (!permission || permission === 'unsupported') return;
    setIsLoading(true);
    setMessage(null);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        throw new Error('La permission de notification a été refusée.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const keyResponse = await fetch(`${API_URL}/notifications/vapid-public-key`, {
        credentials: 'include',
      });
      if (!keyResponse.ok) throw new Error('Impossible de récupérer la clé de notifications.');
      const { publicKey } = await keyResponse.json();
      let subscription = await registration.pushManager.getSubscription();
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const response = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error('Impossible d’activer les notifications.');

      setIsSubscribed(true);
      setMessage('Notifications activées.');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’activer les notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Impossible d’envoyer la notification de test.');
      setMessage('Notifications activées sur cet appareil.');
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : 'Impossible d’envoyer la notification de test.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission || permission === 'unsupported') return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={isLoading || isSubscribed || permission === 'denied'}
        className={`rounded-xl p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isSubscribed
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'
        }`}
        title={isSubscribed ? 'Notifications activées' : 'Activer les notifications push'}
        aria-label={isSubscribed ? 'Notifications actives' : 'Activer les notifications'}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </button>
      {isSubscribed && (
        <button
          type="button"
          onClick={sendTestNotification}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-emerald-400/30 hover:text-emerald-300 disabled:opacity-60"
          title="Envoyer une notification push de test"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Envoyer un test
        </button>
      )}
      {message && <span className="text-[11px] text-zinc-500">{message}</span>}
    </div>
  );
}
