-- ============================================================
-- 10-projekt-odrzucony.sql
-- Seed: ODRZUCONY project "Magazyn LogiStore"
-- Scenario: Warehouse fit-out rejected due to budget concerns.
--           1 locked revision, 6 positions, no orders/contracts.
-- ============================================================

-- Step 1: Create project + revision (unlocked) + positions + lock revision
DO $$
DECLARE
  v_org_id UUID;
  v_projekt_id UUID;
  v_rev0_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, notatki)
  VALUES (
    v_org_id,
    'Fit-out magazyn LogiStore',
    'magazyn-logistore',
    'LogiStore Sp. z o.o.',
    'ul. Logistyczna 10, 05-800 Pruszków',
    400,
    'Magazyn z częścią biurową. Klient zrezygnował z powodu budżetu.'
  )
  RETURNING id INTO v_projekt_id;

  -- Create revision UNLOCKED (trigger prevents inserts into locked revisions)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked, locked_at)
  VALUES (v_projekt_id, 0, 'Wycena', false, NULL)
  RETURNING id INTO v_rev0_id;

  -- Insert kosztorys positions from library
  INSERT INTO kosztorys_pozycje (
    organization_id, rewizja_id, pozycja_biblioteka_id,
    lp, nazwa, ilosc, jednostka, narzut_percent, notatki
  )
  SELECT
    v_org_id, v_rev0_id, pb.id,
    v.lp, pb.nazwa, v.ilosc, pb.jednostka, v.narzut, v.notatki
  FROM (VALUES
    (1, 'BUD.02.03.001', 350, 30, 'Posadzka żywiczna (duża powierzchnia magazynowa)'),
    (2, 'BUD.01.01.001',  40, 30, 'Ściany g-k (część biurowa)'),
    (3, 'ELE.01.01.001',  15, 25, 'Punkty elektryczne'),
    (4, 'ELE.03.01.001',  30, 25, 'Panele LED oświetlenie magazynu'),
    (5, 'SAN.03.01.001',   6, 28, 'Hydranty (wymóg ppoż magazyn)'),
    (6, 'SAN.03.02.001',  45, 28, 'Instalacja zasilająca hydranty')
  ) AS v(lp, kod, ilosc, narzut, notatki)
  JOIN pozycje_biblioteka pb ON pb.kod = v.kod AND pb.organization_id = v_org_id;

  -- Copy robocizna from library
  INSERT INTO kosztorys_skladowe_robocizna (
    kosztorys_pozycja_id, lp, typ_robocizny_id, podwykonawca_id, cena
  )
  SELECT kp.id, br.lp, br.typ_robocizny_id, br.podwykonawca_id,
    COALESCE(sp.stawka, 0)
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_robocizna br ON br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN stawki_podwykonawcow sp ON sp.typ_robocizny_id = br.typ_robocizny_id AND sp.podwykonawca_id = br.podwykonawca_id AND sp.aktywny = true
  WHERE kp.rewizja_id = v_rev0_id;

  -- Copy materialy from library (with active supplier price)
  INSERT INTO kosztorys_skladowe_materialy (
    kosztorys_pozycja_id, lp, produkt_id, dostawca_id, cena, norma, jednostka
  )
  SELECT
    kp.id, bm.lp, bm.produkt_id, bm.dostawca_id,
    COALESCE(cd.cena_netto, 0),
    bm.norma_domyslna, bm.jednostka
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_materialy bm ON bm.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN ceny_dostawcow cd ON cd.produkt_id = bm.produkt_id AND cd.dostawca_id = bm.dostawca_id AND cd.aktywny = true
  WHERE kp.rewizja_id = v_rev0_id;

  -- Lock the revision after all inserts
  UPDATE rewizje
  SET is_locked = true, locked_at = '2026-01-05T10:00:00Z'
  WHERE id = v_rev0_id;

END $$;

-- Step 2: Transition draft -> ofertowanie (requires locked revision)
SELECT change_project_status(id, 'ofertowanie')
FROM projekty WHERE slug = 'magazyn-logistore';

-- Step 3: Transition ofertowanie -> odrzucony
SELECT change_project_status(id, 'odrzucony')
FROM projekty WHERE slug = 'magazyn-logistore';

-- Step 4: Backdate sent_at to realistic date
UPDATE projekty
SET sent_at = '2026-01-08T10:00:00Z'
WHERE slug = 'magazyn-logistore';
