-- Rebuild stawki_podwykonawcow to link to pozycje_biblioteka
-- instead of free-form nazwa_stawki/jednostka

-- Drop old columns
ALTER TABLE stawki_podwykonawcow DROP COLUMN IF EXISTS nazwa_stawki;
ALTER TABLE stawki_podwykonawcow DROP COLUMN IF EXISTS jednostka;
ALTER TABLE stawki_podwykonawcow DROP COLUMN IF EXISTS updated_at;

-- Add new column linking to pozycje_biblioteka
ALTER TABLE stawki_podwykonawcow
  ADD COLUMN pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE;

-- Unique constraint: one rate per subcontractor per position
ALTER TABLE stawki_podwykonawcow
  ADD CONSTRAINT stawki_podwykonawcow_unique UNIQUE (podwykonawca_id, pozycja_biblioteka_id);

-- Index for lookups by position
CREATE INDEX idx_stawki_pozycja_bib ON stawki_podwykonawcow(pozycja_biblioteka_id);
