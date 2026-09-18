import { OrderStatus, InventoryCategory, PaymentMethod } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uk-UA', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' ₴';
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatShortDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; step: number }
> = {
  new: {
    label: 'Нове',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    step: 1,
  },
  preparation: {
    label: 'Підготовка / Рихтування',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    step: 2,
  },
  painting: {
    label: 'Фарбування',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    step: 3,
  },
  polishing: {
    label: 'Сушка / Полірування',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    step: 4,
  },
  ready: {
    label: 'Готове до видачі',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    step: 5,
  },
  delivered: {
    label: 'Видано клієнту',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    step: 6,
  },
  cancelled: {
    label: 'Скасовано',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    step: 0,
  },
};

export const INVENTORY_CATEGORIES: Record<InventoryCategory, string> = {
  paints: 'ЛФМ (Базові емалі та пігменти)',
  clearcoats: 'Лаки та затверджувачі',
  primers: 'Ґрунти (акрилові, епоксидні)',
  putties: 'Шпаклівки та волокна',
  abrasives: 'Абразиви та шліфкруги',
  masking: 'Маскування (скотч, плівка)',
  chemicals: 'Знежирювачі та розчинники',
  tools: 'Інструменти та ЗІЗ',
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Готівка',
  card: 'На картку',
  iban: 'Безготівка (IBAN / ФОП)',
};
