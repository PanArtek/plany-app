-- ============================================
-- Seed: Prepare Biuro Acme for acceptance flow testing
-- ============================================

-- Reset project to draft status for full flow testing
UPDATE projekty
SET status = 'draft', sent_at = NULL, accepted_rewizja_id = NULL
WHERE slug = 'biuro-acme-marszalkowska-100';

-- Ensure R1 (numer=1) is locked for testing
UPDATE rewizje
SET is_locked = true, is_accepted = false, accepted_at = NULL
WHERE projekt_id = (SELECT id FROM projekty WHERE slug = 'biuro-acme-marszalkowska-100')
  AND numer = 1;

-- Clear any acceptance on other rewizje
UPDATE rewizje
SET is_accepted = false, accepted_at = NULL
WHERE projekt_id = (SELECT id FROM projekty WHERE slug = 'biuro-acme-marszalkowska-100')
  AND is_accepted = true;
