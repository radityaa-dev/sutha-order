-- Opsional: Update token meja yang sudah ada ke format Base62 12 karakter
-- Jalankan ini jika ingin memperbarui token lama. CATATAN: QR lama HARUS dicetak ulang.

-- Hapus constraint unique sementara jika ada duplikat (tidak seharusnya terjadi)
-- ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_token_key;

-- Update token lama
UPDATE tables 
SET token = substring(md5(random()::text || id::text) from 1 for 12)
WHERE length(token) != 12 OR token ~ '[^0-9A-Za-z]';

-- Pastikan unique constraint
-- ALTER TABLE tables ADD CONSTRAINT tables_token_key UNIQUE (token);