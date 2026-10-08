-- ==============================================================================
-- Migration: 001_refactor_assets_table.sql
-- Description: Refactor Asset Management module schema with acquisition type,
--              finance/cash tracking, maintenance logs, and depreciation audit.
-- Date: 2026-10-08
-- ==============================================================================

-- 1. Create Acquisition Type Enum (PostgreSQL) or domain constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_acquisition_type') THEN
        CREATE TYPE asset_acquisition_type AS ENUM ('EXISTING', 'NEW_PURCHASE');
    END IF;
END$$;

-- 2. Create Asset Status Enum (PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status_type') THEN
        CREATE TYPE asset_status_type AS ENUM (
            'ACTIVE',
            'IN_MAINTENANCE',
            'BROKEN',
            'DISPOSED',
            'SCRAPPED'
        );
    END IF;
END$$;

-- 3. Create or Refactor `assets` table
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,
    asset_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    acquisition_type VARCHAR(32) NOT NULL DEFAULT 'EXISTING',
    acquisition_date DATE NOT NULL,
    acquisition_cost NUMERIC(15, 2) NOT NULL CHECK (acquisition_cost >= 0),
    useful_life_months INT NOT NULL CHECK (useful_life_months > 0),
    salvage_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (salvage_value >= 0),
    current_book_value NUMERIC(15, 2) NOT NULL CHECK (current_book_value >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    cash_account_id VARCHAR(64),
    finance_transaction_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_assets_acquisition_type CHECK (acquisition_type IN ('EXISTING', 'NEW_PURCHASE')),
    CONSTRAINT chk_assets_status CHECK (status IN ('ACTIVE', 'IN_MAINTENANCE', 'BROKEN', 'DISPOSED', 'SCRAPPED', 'AKTIF', 'MAINTENANCE', 'RUSAK', 'AFKIR')),
    CONSTRAINT chk_assets_new_purchase_cash_account CHECK (
        acquisition_type != 'NEW_PURCHASE' OR cash_account_id IS NOT NULL
    )
);

-- Foreign Keys (Safe conditional application)
DO $$
BEGIN
    -- Foreign key to bank/cash accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_accounts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_assets_cash_account'
        ) THEN
            ALTER TABLE assets 
            ADD CONSTRAINT fk_assets_cash_account 
            FOREIGN KEY (cash_account_id) REFERENCES bank_accounts(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;

    -- Foreign key to expenses / cash transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_assets_finance_transaction'
        ) THEN
            ALTER TABLE assets 
            ADD CONSTRAINT fk_assets_finance_transaction 
            FOREIGN KEY (finance_transaction_id) REFERENCES expenses(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END$$;

-- 4. Create `asset_maintenance_logs` table (Audit Servis)
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
    id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    asset_code VARCHAR(100),
    asset_name VARCHAR(255),
    cost NUMERIC(15, 2) NOT NULL CHECK (cost >= 0),
    service_date DATE NOT NULL,
    description TEXT NOT NULL,
    service_provider VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create `asset_depreciations` table (Audit Depresiasi Bulanan)
CREATE TABLE IF NOT EXISTS asset_depreciations (
    id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    period_date DATE NOT NULL,
    journal_entry_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets (asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (category);
CREATE INDEX IF NOT EXISTS idx_assets_acquisition_type ON assets (acquisition_type);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_asset_id ON asset_maintenance_logs (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciations_asset_id ON asset_depreciations (asset_id);

-- 7. Comments for Database Documentation
COMMENT ON TABLE assets IS 'Master data aset perusahaan dengan pemisahan saldo awal (EXISTING) vs pembelian baru (NEW_PURCHASE)';
COMMENT ON COLUMN assets.acquisition_type IS 'Tipe perolehan: EXISTING (saldo awal tanpa kas) atau NEW_PURCHASE (otomatis memotong kas)';
COMMENT ON COLUMN assets.cash_account_id IS 'Akun kas/bank sumber pendanaan (wajib untuk NEW_PURCHASE)';
COMMENT ON COLUMN assets.finance_transaction_id IS 'Relasi transaksi pengeluaran kas di modul keuangan/expense';
COMMENT ON COLUMN assets.current_book_value IS 'Nilai buku aset terkini setelah dikurangi akumulasi depresiasi';
COMMENT ON COLUMN assets.salvage_value IS 'Nilai residu / sisa pada akhir masa manfaat';

COMMENT ON TABLE asset_maintenance_logs IS 'Riwayat biaya servis/perbaikan aset yang menjadi constraint penghapusan';
COMMENT ON TABLE asset_depreciations IS 'Riwayat beban depresiasi periodik yang menjadi constraint penghapusan';

-- ==============================================================================
-- Rollback / Down Migration (For Reference)
-- ==============================================================================
-- DROP TABLE IF EXISTS asset_depreciations CASCADE;
-- DROP TABLE IF EXISTS asset_maintenance_logs CASCADE;
-- DROP TABLE IF EXISTS assets CASCADE;
-- DROP TYPE IF EXISTS asset_status_type CASCADE;
-- DROP TYPE IF EXISTS asset_acquisition_type CASCADE;
