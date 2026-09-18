import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (...args) => (typeof window !== 'undefined' && window.fetch ? window.fetch(...args) : fetch(...args)),
      },
    })
  : null;

/**
 * Готовий SQL-скрипт для створення таблиць у Supabase SQL Editor.
 * Користувач може скопіювати цей код для швидкого налаштування бази даних.
 */
export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- СХЕМА ТАБЛИЦЬ ДЛЯ AUTOPAINT CRM (Supabase / PostgreSQL)
-- =========================================================

-- 1. Таблиця Клієнтів
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Таблиця Автомобілів
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    vin TEXT NOT NULL,
    year INT,
    color_name TEXT,
    color_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Таблиця Замовлень
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline_date DATE,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'preparation', 'painting', 'polishing', 'ready', 'delivered', 'cancelled'
    works JSONB NOT NULL DEFAULT '[]'::jsonb,
    materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Таблиця Складу Матеріалів
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'paints', 'clearcoats', 'primers', 'putties', 'abrasives', 'masking', 'chemicals', 'tools'
    unit TEXT NOT NULL DEFAULT 'шт',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Таблиця Фінансів (Доходи та Витрати)
CREATE TABLE IF NOT EXISTS public.finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'card', 'iban'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_license ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_finances_date ON public.finances(date);

-- Увімкнення Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

-- Публічні політики для швидкого старту (за потреби обмежте auth.uid())
CREATE POLICY "Public full access for clients" ON public.clients FOR ALL USING (true);
CREATE POLICY "Public full access for vehicles" ON public.vehicles FOR ALL USING (true);
CREATE POLICY "Public full access for orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public full access for inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Public full access for finances" ON public.finances FOR ALL USING (true);
`;
