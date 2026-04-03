ALTER TABLE IF EXISTS account_program_settings
ADD COLUMN IF NOT EXISTS retail_receipt_paper TEXT DEFAULT '58MM';

