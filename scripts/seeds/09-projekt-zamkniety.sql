-- ==============================================================
-- 09-projekt-zamkniety.sql
-- Seed: Projekt "Lokal Fashion Box" in ZAMKNIETY status
-- Full lifecycle: draft -> ofertowanie -> realizacja -> zamkniety
-- All zamowienia rozliczone, all umowy rozliczona, 100% delivered/executed
-- Depends on: 04-pozycje-stawki.sql (library positions + prices)
-- ==============================================================

-- Step 1: Create project, revision, positions, components, then lock
DO $$
DECLARE
  v_org_id UUID;
  v_projekt_id UUID;
  v_rewizja_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Create project
  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, notatki)
  VALUES (v_org_id, 'Lokal Fashion Box', 'lokal-fashion-box', 'Fashion Box Sp. z o.o.',
          'ul. Chmielna 20, 00-020 Warszawa', 120,
          'Lokal handlowy w galerii. Wykończenie pod klucz.')
  RETURNING id INTO v_projekt_id;

  -- Create revision 0 (unlocked initially for inserts)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_projekt_id, 0, 'Wycena wstępna', false)
  RETURNING id INTO v_rewizja_id;

  -- Insert 8 kosztorys positions (joined by kod, not hardcoded UUIDs)
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki, cena_robocizny)
  SELECT v_org_id, v_rewizja_id, pb.id, v.lp, pb.nazwa, v.ilosc, pb.jednostka, v.narzut, v.notatki, pb.cena_robocizny
  FROM (VALUES
    (1, 'BUD.01.01.001', 65,  30, 'Ściany g-k'),
    (2, 'BUD.02.01.001', 100, 30, 'Wykładzina'),
    (3, 'BUD.03.01.001', 110, 30, 'Sufit podwieszany'),
    (4, 'BUD.04.01.001', 4,   30, 'Drzwi'),
    (5, 'ELE.01.01.001', 20,  25, 'Punkty elektryczne'),
    (6, 'ELE.02.01.001', 18,  25, 'Gniazdka'),
    (7, 'ELE.03.01.001', 15,  25, 'Panele LED'),
    (8, 'ELE.03.02.001', 12,  25, 'Oprawy dekoracyjne')
  ) AS v(lp, kod, ilosc, narzut, notatki)
  JOIN pozycje_biblioteka pb ON pb.kod = v.kod AND pb.organization_id = v_org_id;

  -- Set podwykonawca_id on kosztorys_pozycje from library robocizna
  UPDATE kosztorys_pozycje kp
  SET podwykonawca_id = br.podwykonawca_id
  FROM biblioteka_skladowe_robocizna br
  WHERE br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
    AND br.podwykonawca_id IS NOT NULL
    AND kp.rewizja_id = v_rewizja_id;

  -- Copy robocizna from library
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, cena, cena_zrodlowa, podwykonawca_id)
  SELECT kp.id, br.lp, br.opis, br.cena, br.cena, br.podwykonawca_id
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_robocizna br ON br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  WHERE kp.rewizja_id = v_rewizja_id;

  -- Copy materialy from library with cheapest active supplier price
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
  WHERE kp.rewizja_id = v_rewizja_id;

  -- Lock revision 0
  UPDATE rewizje SET is_locked = true, locked_at = '2025-10-01T10:00:00Z' WHERE id = v_rewizja_id;

END $$;

-- Step 2: Transition draft -> ofertowanie
SELECT change_project_status(id, 'ofertowanie') FROM projekty WHERE slug = 'lokal-fashion-box';

-- Step 3: Transition ofertowanie -> realizacja (accepts rev 0)
SELECT change_project_status(p.id, 'realizacja', r.id)
FROM projekty p
JOIN rewizje r ON r.projekt_id = p.id AND r.numer = 0
WHERE p.slug = 'lokal-fashion-box';

-- Step 4: Generate draft zamowienia (one per dostawca) and umowy (one per podwykonawca)
SELECT generate_zamowienia_draft(
  (SELECT id FROM projekty WHERE slug='lokal-fashion-box'),
  (SELECT id FROM rewizje WHERE projekt_id=(SELECT id FROM projekty WHERE slug='lokal-fashion-box') AND numer=0)
);
SELECT generate_umowy_draft(
  (SELECT id FROM projekty WHERE slug='lokal-fashion-box'),
  (SELECT id FROM rewizje WHERE projekt_id=(SELECT id FROM projekty WHERE slug='lokal-fashion-box') AND numer=0)
);

-- Step 5: Process zamowienia - all rozliczone with 100% deliveries
DO $$
DECLARE
  v_projekt_id UUID;
  v_zam RECORD;
  v_dostawa_id UUID;
  v_wz_counter INT := 0;
BEGIN
  SELECT id INTO v_projekt_id FROM projekty WHERE slug = 'lokal-fashion-box';

  -- Update all zamowienia to rozliczone
  UPDATE zamowienia
  SET status = 'rozliczone',
      data_zamowienia = '2025-10-12',
      data_dostawy_planowana = '2025-10-25'
  WHERE projekt_id = v_projekt_id;

  -- For each zamowienie, create 1 complete delivery
  FOR v_zam IN (
    SELECT id, numer FROM zamowienia WHERE projekt_id = v_projekt_id ORDER BY numer
  ) LOOP
    v_wz_counter := v_wz_counter + 1;

    -- Create delivery record
    INSERT INTO zamowienie_dostawy (zamowienie_id, data_dostawy, numer_wz)
    VALUES (v_zam.id, '2025-10-24', 'WZ/2025/' || LPAD(v_wz_counter::text, 3, '0'))
    RETURNING id INTO v_dostawa_id;

    -- Create delivery position records (100% delivered)
    INSERT INTO zamowienie_dostawy_pozycje (zamowienie_dostawa_id, zamowienie_pozycja_id, ilosc_dostarczona)
    SELECT v_dostawa_id, zp.id, zp.ilosc_zamowiona
    FROM zamowienie_pozycje zp
    WHERE zp.zamowienie_id = v_zam.id;

    -- Update zamowienie_pozycje.ilosc_dostarczona = ilosc_zamowiona
    UPDATE zamowienie_pozycje
    SET ilosc_dostarczona = ilosc_zamowiona
    WHERE zamowienie_id = v_zam.id;
  END LOOP;
END $$;

-- Step 6: Process umowy - all rozliczona with 100% execution
DO $$
DECLARE
  v_projekt_id UUID;
BEGIN
  SELECT id INTO v_projekt_id FROM projekty WHERE slug = 'lokal-fashion-box';

  -- Update all umowy to rozliczona
  UPDATE umowy
  SET status = 'rozliczona',
      data_podpisania = '2025-10-12'
  WHERE projekt_id = v_projekt_id;

  -- Update all umowa_pozycje: ilosc_wykonana = ilosc (procent_wykonania is generated)
  UPDATE umowa_pozycje up
  SET ilosc_wykonana = up.ilosc
  FROM umowy u
  WHERE u.id = up.umowa_id
    AND u.projekt_id = v_projekt_id;

  -- Add umowa_wykonanie record for each pozycja (100% done)
  INSERT INTO umowa_wykonanie (umowa_pozycja_id, data_wpisu, ilosc_wykonana, uwagi)
  SELECT up.id, '2025-11-15', up.ilosc, 'Wykonano w całości'
  FROM umowa_pozycje up
  JOIN umowy u ON u.id = up.umowa_id
  WHERE u.projekt_id = v_projekt_id;

END $$;

-- Step 7: Transition realizacja -> zamkniety
SELECT change_project_status(id, 'zamkniety') FROM projekty WHERE slug = 'lokal-fashion-box';

-- Step 8: Backdate timestamps + add realizacja_wpisy
DO $$
DECLARE
  v_projekt_id UUID;
  v_org_id UUID;
  v_zam_matbud_id UUID;
  v_zam_elektro_id UUID;
  v_umowa_budmont_id UUID;
  v_umowa_elektropro_id UUID;
BEGIN
  SELECT id, organization_id INTO v_projekt_id, v_org_id
  FROM projekty WHERE slug = 'lokal-fashion-box';

  -- Backdate timestamps
  UPDATE projekty SET sent_at = '2025-10-05T10:00:00Z', updated_at = '2025-12-20T10:00:00Z' WHERE id = v_projekt_id;
  UPDATE rewizje SET accepted_at = '2025-10-10T10:00:00Z' WHERE projekt_id = v_projekt_id AND numer = 0;

  -- Find specific zamowienia by dostawca kod
  SELECT z.id INTO v_zam_matbud_id
  FROM zamowienia z JOIN dostawcy d ON d.id = z.dostawca_id
  WHERE z.projekt_id = v_projekt_id AND d.kod = 'MAT-BUD';

  SELECT z.id INTO v_zam_elektro_id
  FROM zamowienia z JOIN dostawcy d ON d.id = z.dostawca_id
  WHERE z.projekt_id = v_projekt_id AND d.kod = 'ELEKTRO';

  -- Find specific umowy by podwykonawca nazwa
  SELECT u.id INTO v_umowa_budmont_id
  FROM umowy u JOIN podwykonawcy pw ON pw.id = u.podwykonawca_id
  WHERE u.projekt_id = v_projekt_id AND pw.nazwa = 'BudMont Ekipa';

  SELECT u.id INTO v_umowa_elektropro_id
  FROM umowy u JOIN podwykonawcy pw ON pw.id = u.podwykonawca_id
  WHERE u.projekt_id = v_projekt_id AND pw.nazwa = 'ElektroPro';

  -- 5 realizacja_wpisy (all paid)
  INSERT INTO realizacja_wpisy (organization_id, projekt_id, zamowienie_id, umowa_id, typ, opis, kwota_netto, numer_faktury, data_faktury, oplacone)
  VALUES
    (v_org_id, v_projekt_id, v_zam_matbud_id, NULL, 'material', 'Materiały budowlane MAT-BUD', 8500, 'FV/2025/401', '2025-10-26', true),
    (v_org_id, v_projekt_id, v_zam_elektro_id, NULL, 'material', 'Materiały elektryczne ELEKTRO', 4200, 'FV/2025/402', '2025-10-28', true),
    (v_org_id, v_projekt_id, NULL, v_umowa_budmont_id, 'robocizna', 'Prace budowlane BudMont', 12000, 'FV/2025/501', '2025-11-15', true),
    (v_org_id, v_projekt_id, NULL, v_umowa_elektropro_id, 'robocizna', 'Instalacje elektryczne ElektroPro', 6500, 'FV/2025/502', '2025-11-20', true),
    (v_org_id, v_projekt_id, NULL, NULL, 'inny', 'Transport + sprzątanie końcowe', 2800, 'FV/2025/601', '2025-12-10', true);

END $$;
