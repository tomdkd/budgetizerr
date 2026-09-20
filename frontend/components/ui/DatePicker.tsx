'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string | Date | undefined;
  onChange: (date: string) => void;
  placeholder?: string;
}

const weekDays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function parseDate(value: string | Date | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function formatValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

export function DatePicker({ value, onChange, placeholder = 'Choisir une date' }: DatePickerProps) {
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const days = useMemo(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const mondayOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Array.from({ length: Math.ceil((mondayOffset + daysInMonth) / 7) * 7 }, (_, index) => {
      const dayNumber = index - mondayOffset + 1;
      return {
        date: new Date(Date.UTC(year, month, dayNumber)),
        isCurrentMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
      };
    });
  }, [visibleMonth]);

  const displayValue = selectedDate ? dateFormatter.format(selectedDate) : placeholder;
  const monthLabel = monthFormatter.format(visibleMonth);
  const today = new Date();
  const todayValue = formatValue(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (selectedDate) {
            setVisibleMonth(
              new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)),
            );
          }
          setIsOpen((open) => !open);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-2.5 py-2 text-left text-xs transition-colors hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
          selectedDate ? 'text-white' : 'text-zinc-500'
        }`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="truncate">{displayValue}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Sélectionner une date"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-zinc-900 p-3 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold capitalize text-white">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayValue = formatValue(day.date);
              const isSelected = dayValue === (selectedDate ? formatValue(selectedDate) : '');
              const isToday = dayValue === todayValue;
              return (
                <button
                  key={dayValue}
                  type="button"
                  onClick={() => {
                    onChange(dayValue);
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 font-bold text-zinc-950'
                      : isToday
                        ? 'bg-white/10 text-emerald-300'
                        : day.isCurrentMonth
                          ? 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          : 'text-zinc-600 hover:bg-white/5 hover:text-zinc-400'
                  }`}
                >
                  {day.date.getUTCDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
