/*
# AutoPaint CRM — Primary Schema Migration

## Overview
Migrates the AutoPaint CRM backend from Firebase Firestore to Supabase PostgreSQL.
Creates 5 core tables matching the existing Firestore collections, with owner-scoped
Row Level Security for authenticated users.

## New Tables

### 1. clients
- id (text, PK) — client-generated string ID (e.g., "client-123")
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — owner scope
- name (text, NOT NULL) — customer full name
- phone (text, NOT NULL) — phone number
- notes (text) — additional notes
- created_at (timestamptz, DEFAULT now())

### 2. vehicles
- id (text, PK) — client-generated string ID
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — owner scope
- client_id (text, NOT NULL, FK → clients.id ON DELETE CASCADE)
- make (text, NOT NULL) — vehicle make
- model (text, NOT NULL) — vehicle model
- license_plate (text, NOT NULL) — license plate
- vin (text, NOT NULL) — VIN code
- year (int) — production year
- color_name (text) — color name
- color_code (text) — OEM paint code
- notes (text) — vehicle notes
- created_at (timestamptz, DEFAULT now())

### 3. orders
- id (text, PK) — client-generated string ID
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — owner scope
- order_number (text, NOT NULL) — human-readable order number
- client_id (text, NOT NULL, FK → clients.id)
- vehicle_id (text, NOT NULL, FK → vehicles.id)
- date (text) — order creation date (string format preserved from frontend)
- deadline_date (text) — target completion date
- status (text, NOT NULL, DEFAULT 'new') — one of: new, preparation, painting, polishing, ready, delivered, cancelled
- works (jsonb, NOT NULL, DEFAULT '[]') — array of OrderWorkItem objects
- materials (jsonb, DEFAULT '[]') — array of OrderMaterialItem objects
- parts (jsonb, DEFAULT '[]') — array of OrderPartItem objects
- total_amount (numeric, NOT NULL, DEFAULT 0) — total order price
- paid_amount (numeric, NOT NULL, DEFAULT 0) — total paid amount
- remaining_amount (numeric, NOT NULL, DEFAULT 0) — remaining debt
- notes (text) — order notes
- created_at (timestamptz, DEFAULT now())

### 4. inventory
- id (text, PK) — client-generated string ID
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — owner scope
- name (text, NOT NULL) — material name
- sku (text) — product code
- image_url (text) — image URL (Supabase Storage or external)
- category (text, NOT NULL) — one of: paints, clearcoats, primers, putties, abrasives, masking, chemicals, tools
- unit (text, NOT NULL) — unit of measurement
- quantity (numeric, NOT NULL, DEFAULT 0) — current stock
- min_quantity (numeric, NOT NULL, DEFAULT 0) — low-stock threshold
- price (numeric, NOT NULL, DEFAULT 0) — purchase cost per unit
- retail_price (numeric) — retail price
- service_price (numeric) — service price
- warranty_months (int) — warranty period
- expiration_date (text) — expiry date
- supplier (text) — supplier name
- notes (text) — notes
- updated_at (timestamptz, DEFAULT now())

### 5. finances
- id (text, PK) — client-generated string ID
- user_id (uuid, NOT NULL, DEFAULT auth.uid()) — owner scope
- type (text, NOT NULL) — 'income' or 'expense'
- category (text, NOT NULL) — transaction category
- amount (numeric, NOT NULL) — transaction amount
- date (text, NOT NULL) — transaction date (string format preserved)
- order_id (text, FK → orders.id ON DELETE SET NULL) — related order
- client_id (text, FK → clients.id ON DELETE SET NULL) — related client
- description (text, NOT NULL) — description
- payment_method (text, NOT NULL) — 'cash', 'card', or 'iban'
- created_at (timestamptz, DEFAULT now())

## Security
- RLS enabled on all 5 tables.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), scoped TO authenticated.
- Ownership check: auth.uid() = user_id on all policies.
- user_id defaults to auth.uid() so frontend inserts without user_id still work.

## Indexes
- vehicles(client_id) — frequent lookup by owner
- orders(client_id), orders(vehicle_id), orders(status) — dashboard/list filters
- finances(order_id), finances(client_id), finances(type) — finance filtering
- inventory(category), inventory(quantity) — stock category/low-stock queries
- All tables: user_id index for RLS policy performance

## Important Notes
1. String IDs preserved (text PK) — frontend generates IDs like "client-123", "ord-456"
2. Date fields use text type (not date) to preserve the frontend's string format
3. works/materials/parts stored as JSONB arrays — matches current embedded array structure
4. No ON DELETE CASCADE on orders.client_id/vehicle_id — preserving current behavior where
   deleting a client/vehicle does not auto-delete orders (frontend handles this)
5. finances.order_id and finances.client_id use ON DELETE SET NULL to preserve transaction history
*/

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- ============================================================
-- TABLE: vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  license_plate text NOT NULL,
  vin text NOT NULL,
  year int,
  color_name text,
  color_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vehicles" ON vehicles;
CREATE POLICY "select_own_vehicles" ON vehicles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_vehicles" ON vehicles;
CREATE POLICY "insert_own_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vehicles" ON vehicles;
CREATE POLICY "update_own_vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_vehicles" ON vehicles;
CREATE POLICY "delete_own_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  client_id text NOT NULL REFERENCES clients(id),
  vehicle_id text NOT NULL REFERENCES vehicles(id),
  date text,
  deadline_date text,
  status text NOT NULL DEFAULT 'new',
  works jsonb NOT NULL DEFAULT '[]',
  materials jsonb DEFAULT '[]',
  parts jsonb DEFAULT '[]',
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle_id ON orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============================================================
-- TABLE: inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  image_url text,
  category text NOT NULL,
  unit text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  retail_price numeric,
  service_price numeric,
  warranty_months int,
  expiration_date text,
  supplier text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inventory" ON inventory;
CREATE POLICY "select_own_inventory" ON inventory FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_inventory" ON inventory;
CREATE POLICY "insert_own_inventory" ON inventory FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_inventory" ON inventory;
CREATE POLICY "update_own_inventory" ON inventory FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_inventory" ON inventory;
CREATE POLICY "delete_own_inventory" ON inventory FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

-- ============================================================
-- TABLE: finances
-- ============================================================
CREATE TABLE IF NOT EXISTS finances (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  date text NOT NULL,
  order_id text REFERENCES orders(id) ON DELETE SET NULL,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  description text NOT NULL,
  payment_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_finances" ON finances;
CREATE POLICY "select_own_finances" ON finances FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_finances" ON finances;
CREATE POLICY "insert_own_finances" ON finances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_finances" ON finances;
CREATE POLICY "update_own_finances" ON finances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_finances" ON finances;
CREATE POLICY "delete_own_finances" ON finances FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finances_user_id ON finances(user_id);
CREATE INDEX IF NOT EXISTS idx_finances_order_id ON finances(order_id);
CREATE INDEX IF NOT EXISTS idx_finances_client_id ON finances(client_id);
CREATE INDEX IF NOT EXISTS idx_finances_type ON finances(type);

-- ============================================================
-- STORAGE BUCKET: inventory-images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can manage their own inventory images
DROP POLICY IF EXISTS "Authenticated users can upload inventory images" ON storage.objects;
CREATE POLICY "Authenticated users can upload inventory images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Authenticated users can read inventory images" ON storage.objects;
CREATE POLICY "Authenticated users can read inventory images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Authenticated users can update inventory images" ON storage.objects;
CREATE POLICY "Authenticated users can update inventory images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Authenticated users can delete inventory images" ON storage.objects;
CREATE POLICY "Authenticated users can delete inventory images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-images');
