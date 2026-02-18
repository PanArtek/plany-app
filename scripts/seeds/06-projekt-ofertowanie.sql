-- ==============================================================
-- 06-projekt-ofertowanie.sql
-- Seed: Projekt "Fit-out biuro TechHub" w statusie ofertowanie
-- Wymaga: 04-pozycje-stawki.sql (pozycje_biblioteka, biblioteka_skladowe_*)
-- ==============================================================

-- Step 1: Create project, revisions, positions, and components
DO $$
DECLARE
  v_org_id UUID;
  v_projekt_id UUID;
  v_rev0_id UUID;
  v_rev1_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Create project (draft)
  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, notatki)
  VALUES (v_org_id, 'Fit-out biuro TechHub', 'biuro-techhub', 'TechHub S.A.',
          'ul. Puławska 182, 02-670 Warszawa', 300,
          'Open space + 4 salki konferencyjne + recepcja. Wysoki standard.')
  RETURNING id INTO v_projekt_id;

  -- Rev 0: empty (will be locked after creation)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked, locked_at)
  VALUES (v_projekt_id, 0, 'Wycena wstępna', false, NULL)
  RETURNING id INTO v_rev0_id;

  -- Rev 1: will hold 12 positions (unlocked initially for inserts)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked, locked_at)
  VALUES (v_projekt_id, 1, 'Wycena po korektach', false, NULL)
  RETURNING id INTO v_rev1_id;

  -- 12 kosztorys positions on Rev 1
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki, cena_robocizny)
  SELECT v_org_id, v_rev1_id, pb.id, v.lp, pb.nazwa, v.ilosc, pb.jednostka, v.narzut, v.notatki, pb.cena_robocizny
  FROM (VALUES
    (1,  'BUD.01.01.001', 180, 30, 'Ściany g-k open space + salki'),
    (2,  'BUD.01.03.001',  35, 30, 'Ścianki szklane salki'),
    (3,  'BUD.02.01.001', 250, 30, 'Wykładzina open space'),
    (4,  'BUD.03.01.001', 280, 30, 'Sufit podwieszany'),
    (5,  'BUD.04.01.001',  12, 30, 'Drzwi (salki, wc, serwerownia)'),
    (6,  'ELE.01.01.001',  45, 25, 'Punkty elektryczne'),
    (7,  'ELE.01.02.001',   2, 25, 'Rozdzielnie'),
    (8,  'ELE.02.01.001',  40, 25, 'Gniazdka'),
    (9,  'ELE.03.01.001',  35, 25, 'Panele LED'),
    (10, 'ELE.03.02.001',   8, 25, 'Oprawy dekoracyjne recepcja'),
    (11, 'SAN.01.01.001',   6, 28, 'Podejścia wod-kan'),
    (12, 'SAN.02.01.001',   4, 28, 'Umywalki')
  ) AS v(lp, kod, ilosc, narzut, notatki)
  JOIN pozycje_biblioteka pb ON pb.kod = v.kod AND pb.organization_id = v_org_id;

  -- Copy robocizna (labor) components from biblioteka
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, cena, cena_zrodlowa, podwykonawca_id)
  SELECT kp.id, br.lp, br.opis, br.cena, br.cena, br.podwykonawca_id
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_robocizna br ON br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  WHERE kp.rewizja_id = v_rev1_id;

  -- Copy materialy (materials) components from biblioteka with cheapest supplier price
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, norma, cena, jednostka, produkt_id, dostawca_id)
  SELECT kp.id, bm.lp, bm.nazwa, bm.norma_domyslna,
    COALESCE(cheapest.cena_netto, bm.cena_domyslna, 0),
    bm.jednostka, bm.produkt_id, COALESCE(cheapest.dostawca_id, bm.dostawca_id)
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_materialy bm ON bm.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN LATERAL (
    SELECT cena_netto, dostawca_id FROM ceny_dostawcow
    WHERE produkt_id = bm.produkt_id AND aktywny = true
    ORDER BY cena_netto LIMIT 1
  ) cheapest ON true
  WHERE kp.rewizja_id = v_rev1_id;

  -- Lock both revisions (must happen AFTER inserts due to trigger_check_revision_locked)
  UPDATE rewizje SET is_locked = true, locked_at = '2026-02-05T10:00:00Z' WHERE id = v_rev0_id;
  UPDATE rewizje SET is_locked = true, locked_at = '2026-02-10T10:00:00Z' WHERE id = v_rev1_id;

END $$;

-- Step 2: Change status draft -> ofertowanie (requires at least 1 locked rewizja)
SELECT change_project_status(id, 'ofertowanie') FROM projekty WHERE slug = 'biuro-techhub';

-- Step 3: Backdate sent_at to match the Rev 1 lock date
UPDATE projekty SET sent_at = '2026-02-10T10:00:00Z' WHERE slug = 'biuro-techhub';
