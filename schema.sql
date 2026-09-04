-- ==============================================================================
-- GÀ Ủ MUỐI SMART - AUTOMATED POS & ORDER MANAGEMENT DATABASE SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'RECEIVED', 
        'PREPARING', 
        'SHIPPING', 
        'DELIVERED', 
        'PAID', 
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE voucher_discount_type AS ENUM ('fixed', 'percent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Bảng Branches
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Hồ Chí Minh',
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bảng Vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type voucher_discount_type NOT NULL DEFAULT 'fixed',
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    min_order_value NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bảng Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Hồ Chí Minh',
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    voucher_code TEXT,
    note TEXT,
    status order_status NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes & Triggers
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Kích hoạt Supabase Realtime cho bảng Orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 8. Seed Data Mẫu cho Gà Ủ Muối Smart
INSERT INTO public.branches (id, name, address, district, city, phone) VALUES
('b1111111-1111-1111-1111-111111111111', 'Chi Nhánh Gà Ủ Muối Quận 1', '123 Lê Lợi, Phường Bến Thành', 'Quận 1', 'Hồ Chí Minh', '02838111111'),
('b2222222-2222-2222-2222-222222222222', 'Chi Nhánh Gà Ủ Muối Quận 3', '456 Điện Biên Phủ, Phường 3', 'Quận 3', 'Hồ Chí Minh', '02838222222'),
('b3333333-3333-3333-3333-333333333333', 'Chi Nhánh Gà Ủ Muối Bình Thạnh', '789 Xô Viết Nghệ Tĩnh, Phường 25', 'Quận Bình Thạnh', 'Hồ Chí Minh', '02838333333'),
('b4444444-4444-4444-4444-444444444444', 'Chi Nhánh Gà Ủ Muối Thủ Đức', '102 Võ Văn Ngân, Phường Linh Chiểu', 'Thành phố Thủ Đức', 'Hồ Chí Minh', '02838444444')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, name, price, cost_price, is_available) VALUES
('m1111111-1111-1111-1111-111111111111', 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', 190000, 110000, true),
('m2222222-2222-2222-2222-222222222222', 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', 100000, 58000, true),
('m3333333-3333-3333-3333-333333333333', 'Chân Gà Rút Xương Sốt Thái', 65000, 32000, true),
('m4444444-4444-4444-4444-444444444444', 'Cánh Gà Ủ Muối (Phần 4 Cánh)', 85000, 45000, true),
('m5555555-5555-5555-5555-555555555555', 'Nước Chấm Thần Thánh Extra', 15000, 4000, true),
('m6666666-6666-6666-6666-666666666666', 'Trà Tắc Khổng Lồ', 20000, 6000, true),
('m7777777-7777-7777-7777-777777777777', 'Trà Đào Cam Sả', 30000, 10000, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vouchers (id, code, discount_type, discount_value, min_order_value) VALUES
('v1111111-1111-1111-1111-111111111111', 'CHAO2026', 'fixed', 30000, 100000),
('v2222222-2222-2222-2222-222222222222', 'VIP10', 'percent', 10, 200000)
ON CONFLICT (id) DO NOTHING;
