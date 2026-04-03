-- Stret POS PostgreSQL Schema
-- Localized for Vanuatu (VAT 15%, VNPF 12%)

-- 1. Accounts & Roles
CREATE TYPE user_role AS ENUM ('PLATFORM_ADMIN', 'WHOLESALER', 'RETAILER', 'DRIVER');
CREATE TYPE retailer_type AS ENUM ('MANAGED', 'EXTERNAL'); -- MANAGED = 直营, EXTERNAL = 其他

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role user_role NOT NULL,
    sub_type retailer_type DEFAULT NULL, -- Only for RETAILER role
    balance DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    vat_id TEXT,
    vnpf_id TEXT,
    location_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouse & Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL,
    title_bi TEXT,
    category TEXT,
    zone_color TEXT CHECK (zone_color IN ('Green', 'Red', 'Blue', 'Yellow')),
    shelf_id TEXT,
    row_num INT,
    col_num INT,
    stock INT DEFAULT 0,
    image_url TEXT,
    wholesaler_id UUID REFERENCES accounts(id),
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Supply Chain (Orders)
CREATE TYPE order_status AS ENUM ('REQUESTED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS supply_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wholesaler_id UUID REFERENCES accounts(id),
    retailer_id UUID REFERENCES accounts(id), -- If direct order
    status order_status DEFAULT 'REQUESTED',
    total_amount DECIMAL(15, 2),
    vat_amount DECIMAL(15, 2), -- 15% VAT
    driver_id UUID REFERENCES accounts(id),
    current_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES supply_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    quantity INT NOT NULL,
    price_at_time DECIMAL(10, 2)
);

-- 5. Exceptions (RMA / Damaged)
CREATE TYPE rma_type AS ENUM ('DAMAGED', 'RETURN', 'DISPUTE');
CREATE TYPE rma_status AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type rma_type NOT NULL,
    order_id UUID REFERENCES supply_orders(id),
    product_id TEXT REFERENCES products(id),
    quantity INT NOT NULL,
    reason TEXT,
    reporter_id UUID REFERENCES accounts(id),
    status rma_status DEFAULT 'PENDING',
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Financial Ledger (Double Entry)
CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT, -- e.g., 'SALE', 'REFUND', 'VAT_PAYMENT'
    reference_id UUID, -- Reference to order_id or exception_id
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Retail store scoped inventory (per account)
CREATE TABLE IF NOT EXISTS retail_inventory (
    account_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, product_id)
);

-- 8. Account-scoped program settings (UI + POS preferences)
CREATE TABLE IF NOT EXISTS account_program_settings (
    account_id TEXT PRIMARY KEY,
    language TEXT,
    retail_pos_search TEXT,
    retail_pos_category TEXT,
    retail_pos_payment TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
