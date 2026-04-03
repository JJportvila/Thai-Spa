ALTER TABLE IF EXISTS account_program_settings
ADD COLUMN IF NOT EXISTS tax_qr_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS account_program_settings
ADD COLUMN IF NOT EXISTS tax_qr_template TEXT;

ALTER TABLE IF EXISTS account_program_settings
ADD COLUMN IF NOT EXISTS tax_merchant_tin TEXT;

ALTER TABLE IF EXISTS account_program_settings
ADD COLUMN IF NOT EXISTS tax_branch_code TEXT;

