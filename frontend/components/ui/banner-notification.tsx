import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BannerNotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose?: () => void;
  className?: string;
}

export function BannerNotification({
  type,
  message,
  onClose,
  className,
}: BannerNotificationProps) {
  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-xl p-3.5 text-xs transition-all duration-200 border shadow-lg backdrop-blur-md',
        isSuccess
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-950/20'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-300 shadow-rose-950/20',
        className,
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
      )}

      <div className="flex-1 font-medium leading-relaxed">{message}</div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'p-0.5 rounded-md transition-colors hover:bg-white/10',
            isSuccess ? 'text-emerald-400' : 'text-rose-400',
          )}
          aria-label="Fermer la notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}