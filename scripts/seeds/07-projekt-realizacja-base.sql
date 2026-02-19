-- ============================================================
-- 07-projekt-realizacja-base.sql
-- Seed: Projekt "Fit-out klinika DentSmile" in REALIZACJA status
-- Depends on: 04-pozycje-stawki.sql (library positions + prices)
-- ============================================================

-- Step 1: Create project, revisions (unlocked), positions, components, then lock
DO $$
DECLARE
  v_org_id UUID;
  v_projekt_id UUID;
  v_rev0_id UUID;
  v_rev1_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Create project
  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, notatki)
  VALUES (v_org_id, 'Fit-out klinika DentSmile', 'klinika-dentsmile', 'DentSmile Sp. z o.o.', 'al. Jerozolimskie 89, 02-001 Warszawa', 200, 'Klinika stomatologiczna. 4 gabinety + rejestracja + poczekalnia. Wymóg ppoż: hydranty.')
  RETURNING id INTO v_projekt_id;

  -- Create revisions UNLOCKED (trigger blocks inserts on locked revisions)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_projekt_id, 0, 'Wycena wstępna', false)
  RETURNING id INTO v_rev0_id;

  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_projekt_id, 1, 'Wycena finalna', false)
  RETURNING id INTO v_rev1_id;

  -- Insert kosztorys positions for rev 1 (joined by kod, not hardcoded UUIDs)
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki)
  SELECT v_org_id, v_rev1_id, pb.id, v.lp, pb.nazwa, v.ilosc, pb.jednostka, v.narzut, v.notatki
  FROM (VALUES
    (1, 'BUD.01.01.001', 120, 30, 'Ściany g-k gabinety + poczekalnia'),
    (2, 'BUD.02.02.001', 160, 30, 'Gres cała klinika'),
    (3, 'BUD.03.01.001', 180, 30, 'Sufit podwieszany'),
    (4, 'BUD.04.01.001', 8, 30, 'Drzwi'),
    (5, 'ELE.01.01.001', 30, 25, 'Punkty elektryczne'),
    (6, 'ELE.03.01.001', 25, 25, 'Panele LED'),
    (7, 'SAN.01.01.001', 10, 28, 'Podejścia wod-kan'),
    (8, 'SAN.02.01.001', 6, 28, 'Umywalki'),
    (9, 'SAN.03.01.001', 4, 28, 'Hydranty wewnętrzne'),
    (10, 'SAN.03.02.001', 25, 28, 'Instalacja zasilająca hydranty')
  ) AS v(lp, kod, ilosc, narzut, notatki)
  JOIN pozycje_biblioteka pb ON pb.kod = v.kod AND pb.organization_id = v_org_id;

  -- Copy robocizna from library
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, typ_robocizny_id, podwykonawca_id, cena)
  SELECT kp.id, br.lp, br.typ_robocizny_id, br.podwykonawca_id,
    COALESCE(sp.stawka, 0)
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_robocizna br ON br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN stawki_podwykonawcow sp ON sp.typ_robocizny_id = br.typ_robocizny_id AND sp.podwykonawca_id = br.podwykonawca_id AND sp.aktywny = true
  WHERE kp.rewizja_id = v_rev1_id;

  -- Copy materialy from library with active supplier price
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, produkt_id, dostawca_id, cena, norma, jednostka)
  SELECT kp.id, bm.lp, bm.produkt_id, bm.dostawca_id,
    COALESCE(cd.cena_netto, 0),
    bm.norma_domyslna, bm.jednostka
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_materialy bm ON bm.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN ceny_dostawcow cd ON cd.produkt_id = bm.produkt_id AND cd.dostawca_id = bm.dostawca_id AND cd.aktywny = true
  WHERE kp.rewizja_id = v_rev1_id;

  -- Lock revisions after all data is inserted
  UPDATE rewizje SET is_locked = true, locked_at = '2026-01-10T10:00:00Z' WHERE id = v_rev0_id;
  UPDATE rewizje SET is_locked = true, locked_at = '2026-01-14T10:00:00Z' WHERE id = v_rev1_id;

END $$;

-- Step 2: Transition draft -> ofertowanie (requires locked revision)
SELECT change_project_status(id, 'ofertowanie') FROM projekty WHERE slug='klinika-dentsmile';

-- Step 3: Transition ofertowanie -> realizacja (accepts rev 1)
SELECT change_project_status(p.id, 'realizacja', r.id)
FROM projekty p
JOIN rewizje r ON r.projekt_id = p.id AND r.numer = 1
WHERE p.slug='klinika-dentsmile';

-- Step 4: Backdate timestamps for realistic seed data
UPDATE projekty SET sent_at='2026-01-15T10:00:00Z' WHERE slug='klinika-dentsmile';
UPDATE rewizje SET accepted_at='2026-01-20T10:00:00Z'
WHERE projekt_id=(SELECT id FROM projekty WHERE slug='klinika-dentsmile') AND numer=1;
