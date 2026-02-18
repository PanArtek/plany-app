-- 08-projekt-realizacja-workflow.sql
-- Add zamówienia, umowy, and realizacja_wpisy for Klinika DentSmile (REALIZACJA project)
-- Depends on: 07-projekt-realizacja-base.sql

-- ===== FIX: Set podwykonawca_id on kosztorys_pozycje from robocizna skladowe =====
-- The seed base script didn't set podwykonawca_id, but generate_umowy_draft needs it.
-- Must temporarily disable triggers since revision is locked+accepted.

ALTER TABLE rewizje DISABLE TRIGGER rewizje_prevent_unlock_accepted;
ALTER TABLE kosztorys_pozycje DISABLE TRIGGER kosztorys_pozycje_check_locked;

UPDATE rewizje SET is_locked = false
WHERE projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile')
AND numer = 1;

UPDATE kosztorys_pozycje
SET podwykonawca_id = sub.podwykonawca_id
FROM (
  SELECT ksr.kosztorys_pozycja_id, ksr.podwykonawca_id
  FROM kosztorys_skladowe_robocizna ksr
  JOIN kosztorys_pozycje kp ON kp.id = ksr.kosztorys_pozycja_id
  JOIN rewizje r ON r.id = kp.rewizja_id
  JOIN projekty p ON p.id = r.projekt_id
  WHERE p.slug = 'klinika-dentsmile'
  AND r.numer = 1
  AND ksr.podwykonawca_id IS NOT NULL
) sub
WHERE kosztorys_pozycje.id = sub.kosztorys_pozycja_id;

UPDATE rewizje SET is_locked = true, locked_at = '2026-01-14T10:00:00Z'
WHERE projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile')
AND numer = 1;

ALTER TABLE kosztorys_pozycje ENABLE TRIGGER kosztorys_pozycje_check_locked;
ALTER TABLE rewizje ENABLE TRIGGER rewizje_prevent_unlock_accepted;

-- ===== GENERATE ZAMÓWIENIA + UMOWY VIA RPC =====
SELECT generate_zamowienia_draft(
  (SELECT id FROM projekty WHERE slug='klinika-dentsmile'),
  (SELECT id FROM rewizje WHERE projekt_id=(SELECT id FROM projekty WHERE slug='klinika-dentsmile') AND numer=1)
);

SELECT generate_umowy_draft(
  (SELECT id FROM projekty WHERE slug='klinika-dentsmile'),
  (SELECT id FROM rewizje WHERE projekt_id=(SELECT id FROM projekty WHERE slug='klinika-dentsmile') AND numer=1)
);

-- ===== PROCESS ZAMÓWIENIE MAT-BUD → czesciowo =====
UPDATE zamowienia
SET status = 'czesciowo',
    data_zamowienia = '2026-01-25',
    data_dostawy_planowana = '2026-02-08'
FROM dostawcy d
WHERE zamowienia.dostawca_id = d.id
AND d.kod = 'MAT-BUD'
AND zamowienia.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- Create delivery
INSERT INTO zamowienie_dostawy (zamowienie_id, data_dostawy, numer_wz)
SELECT z.id, '2026-02-05', 'WZ/005/2026'
FROM zamowienia z
JOIN dostawcy d ON d.id = z.dostawca_id AND d.kod = 'MAT-BUD'
WHERE z.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- Deliver wall materials fully (g-k, profiles, wkręty, masa), skip ceiling items
INSERT INTO zamowienie_dostawy_pozycje (zamowienie_dostawa_id, zamowienie_pozycja_id, ilosc_dostarczona)
SELECT zd.id, zp.id, zp.ilosc_zamowiona
FROM zamowienie_dostawy zd
JOIN zamowienia z ON z.id = zd.zamowienie_id
JOIN zamowienie_pozycje zp ON zp.zamowienie_id = z.id
JOIN dostawcy d ON d.id = z.dostawca_id AND d.kod = 'MAT-BUD'
JOIN produkty p ON p.id = zp.produkt_id
WHERE z.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile')
AND p.sku IN ('BUD-GK-125', 'BUD-CW75', 'BUD-WKR', 'BUD-MASA');

-- Update ilosc_dostarczona on pozycje
UPDATE zamowienie_pozycje zp
SET ilosc_dostarczona = zp.ilosc_zamowiona
FROM zamowienia z
JOIN dostawcy d ON d.id = z.dostawca_id AND d.kod = 'MAT-BUD'
JOIN produkty p ON p.id = zp.produkt_id
WHERE zp.zamowienie_id = z.id
AND z.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile')
AND p.sku IN ('BUD-GK-125', 'BUD-CW75', 'BUD-WKR', 'BUD-MASA');

-- ===== PROCESS ZAMÓWIENIE SANTECH → wyslane =====
UPDATE zamowienia
SET status = 'wyslane',
    data_zamowienia = '2026-01-28',
    data_dostawy_planowana = '2026-02-15'
FROM dostawcy d
WHERE zamowienia.dostawca_id = d.id
AND d.kod = 'SANTECH'
AND zamowienia.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- ===== PROCESS UMOWA BudMont Ekipa → podpisana, ~40% execution =====
UPDATE umowy
SET status = 'podpisana',
    data_podpisania = '2026-01-22'
FROM podwykonawcy pod
WHERE umowy.podwykonawca_id = pod.id
AND pod.nazwa = 'BudMont Ekipa'
AND umowy.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- Update execution (~40% of each position)
UPDATE umowa_pozycje up
SET ilosc_wykonana = ROUND(up.ilosc * 0.4, 0)
FROM umowy u
JOIN podwykonawcy pod ON pod.id = u.podwykonawca_id AND pod.nazwa = 'BudMont Ekipa'
WHERE up.umowa_id = u.id
AND u.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- Add execution records
INSERT INTO umowa_wykonanie (umowa_pozycja_id, data_wpisu, ilosc_wykonana, uwagi)
SELECT up.id, '2026-02-10', ROUND(up.ilosc * 0.4, 0),
  CASE
    WHEN up.nazwa LIKE '%cian%' THEN 'I etap - ściany g-k gabinety'
    WHEN up.nazwa LIKE '%Sufit%' THEN 'I etap - sufit poczekalnia i rejestracja'
    WHEN up.nazwa LIKE '%Drzwi%' THEN 'I etap - drzwi gabinety 1-3'
    ELSE 'I etap prac'
  END
FROM umowa_pozycje up
JOIN umowy u ON u.id = up.umowa_id
JOIN podwykonawcy pod ON pod.id = u.podwykonawca_id AND pod.nazwa = 'BudMont Ekipa'
WHERE u.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- ===== PROCESS UMOWA AquaInstal → wyslana =====
UPDATE umowy
SET status = 'wyslana'
FROM podwykonawcy pod
WHERE umowy.podwykonawca_id = pod.id
AND pod.nazwa = 'AquaInstal'
AND umowy.projekt_id = (SELECT id FROM projekty WHERE slug = 'klinika-dentsmile');

-- ===== REALIZACJA WPISY (3 entries) =====
-- 1. Material invoice linked to MAT-BUD zamówienie
INSERT INTO realizacja_wpisy (organization_id, projekt_id, zamowienie_id, typ, opis, kwota_netto, numer_faktury, data_faktury, oplacone)
SELECT p.organization_id, p.id, z.id, 'material',
  'Faktura materiałowa MAT-BUD (I dostawa)', 12500, 'FV/2026/101', '2026-02-06', true
FROM projekty p
JOIN zamowienia z ON z.projekt_id = p.id
JOIN dostawcy d ON d.id = z.dostawca_id AND d.kod = 'MAT-BUD'
WHERE p.slug = 'klinika-dentsmile';

-- 2. Labor invoice linked to BudMont umowa
INSERT INTO realizacja_wpisy (organization_id, projekt_id, umowa_id, typ, opis, kwota_netto, numer_faktury, data_faktury, oplacone)
SELECT p.organization_id, p.id, u.id, 'robocizna',
  'Faktura BudMont — I etap prace budowlane', 8000, 'FV/2026/201', '2026-02-12', false
FROM projekty p
JOIN umowy u ON u.projekt_id = p.id
JOIN podwykonawcy pod ON pod.id = u.podwykonawca_id AND pod.nazwa = 'BudMont Ekipa'
WHERE p.slug = 'klinika-dentsmile';

-- 3. Other cost (no linked zamówienie/umowa)
INSERT INTO realizacja_wpisy (organization_id, projekt_id, typ, opis, kwota_netto, numer_faktury, data_faktury, oplacone)
SELECT p.organization_id, p.id, 'inny',
  'Wywóz gruzu i odpady budowlane', 1200, 'FV/2026/301', '2026-02-08', true
FROM projekty p
WHERE p.slug = 'klinika-dentsmile';
