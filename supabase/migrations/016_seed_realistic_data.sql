-- ============================================
-- 016: Comprehensive realistic seed data
-- Full business flow: biblioteka → kosztorys → lifecycle
-- ============================================

-- ============================================
-- PHASE 1: Additional products (materials catalog)
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM produkty WHERE sku = 'MAL-TASMA-48' AND organization_id = v_org) THEN
    RAISE NOTICE 'Phase 1 already seeded, skipping';
    RETURN;
  END IF;

  INSERT INTO produkty (organization_id, sku, nazwa, jednostka, kategoria) VALUES
    -- Malowanie / wykończenie
    (v_org, 'MAL-TASMA-48',     'Taśma malarska 48mm x 50m',               'szt', 'Malowanie'),
    (v_org, 'MAL-FOLIA-4X5',    'Folia ochronna 4x5m',                     'szt', 'Malowanie'),
    (v_org, 'FRB-LATEX-KOLOR',  'Dulux Latex Matt kolor (baza) 10L',       'l',   'Malowanie'),
    (v_org, 'FRB-CERAMICZNA',   'Śnieżka Barwy Natury ceramiczna 5L',     'l',   'Malowanie'),
    (v_org, 'GLZ-MASA-FINISH',  'Knauf Finish gładź szpachlowa 20kg',     'kg',  'Gładzie'),
    (v_org, 'GLZ-PAPIER-120',   'Papier ścierny P120 arkusz',             'szt', 'Gładzie'),
    (v_org, 'TAP-WINYL-FLZ',    'Tapeta winylowa na flizelinie (rolka)',   'mb',  'Tapety'),
    (v_org, 'TAP-KLEJ-5KG',     'Klej do tapet winylowych 5kg',           'kg',  'Tapety'),
    -- Klimatyzacja / HVAC
    (v_org, 'HVAC-KASET-50',    'Klimatyzator kasetonowy 5.0kW jedn.wewn.','szt','HVAC'),
    (v_org, 'HVAC-KASET-71',    'Klimatyzator kasetonowy 7.1kW jedn.wewn.','szt','HVAC'),
    (v_org, 'HVAC-AGRE-28',     'Agregat zewnętrzny VRF 28kW',            'szt', 'HVAC'),
    (v_org, 'HVAC-STEROW',      'Sterownik przewodowy LCD',               'szt', 'HVAC'),
    (v_org, 'HVAC-BRANCH',      'Skrzynka rozdzielcza VRF (branch box)',  'szt', 'HVAC'),
    (v_org, 'HVAC-IZOL-CU',     'Izolacja Armaflex do rur Cu 10mm',       'mb',  'HVAC'),
    -- Sanitariaty
    (v_org, 'SAN-UMYW-60',      'Umywalka meblowa Cersanit 60cm',         'szt', 'Sanitariaty'),
    (v_org, 'SAN-SZAFKA-60',    'Szafka podumywalkowa 60cm biała',        'szt', 'Sanitariaty'),
    (v_org, 'SAN-BATERIA-UM',   'Bateria umywalkowa Hansgrohe Talis',     'szt', 'Sanitariaty'),
    (v_org, 'SAN-WC-MISKA',     'Miska WC wisząca Koło Nova Pro',         'szt', 'Sanitariaty'),
    (v_org, 'SAN-STELAZ',       'Stelaż podtynkowy Geberit Duofix',      'szt', 'Sanitariaty'),
    (v_org, 'SAN-PRZYCISK-WC',  'Przycisk spłukujący Geberit Sigma',     'szt', 'Sanitariaty'),
    (v_org, 'SAN-DESKA-WC',     'Deska wolnoopadowa Koło Nova Pro',      'szt', 'Sanitariaty'),
    (v_org, 'SAN-SYFON-UM',     'Syfon umywalkowy chromowany',            'szt', 'Sanitariaty'),
    -- Teletechnika
    (v_org, 'TEL-AP-WIFI6',     'Access Point Ubiquiti U6-Pro WiFi 6',    'szt', 'Teletechnika'),
    (v_org, 'TEL-PATCH-1M',     'Patchcord kat.6A 1m',                    'szt', 'Teletechnika'),
    (v_org, 'TEL-GNIAZDO-2X',   'Gniazdo naścienne 2xRJ45 kat.6A',       'szt', 'Teletechnika'),
    (v_org, 'TEL-KORYTKO-100',  'Korytko kablowe teletechniczne 100x60',  'mb',  'Teletechnika'),
    -- Ścianki szklane / systemowe
    (v_org, 'SCN-SZKLO-10',     'Szyba hartowana 10mm (panel ściankowy)',  'm²',  'Ścianki'),
    (v_org, 'SCN-PROFIL-AL',    'Profil aluminiowy do ścianki szklanej',   'mb',  'Ścianki'),
    (v_org, 'SCN-DRZWI-SZKL',   'Drzwi szklane 90cm do ścianki system.',  'szt', 'Ścianki'),
    -- Parkiet
    (v_org, 'POD-PARKIET-DEB',  'Parkiet dębowy przemysłowy 22mm',         'm²',  'Posadzki'),
    (v_org, 'POD-KLEJ-PARKIET', 'Klej do parkietu poliuretanowy 15kg',    'kg',  'Posadzki'),
    (v_org, 'POD-LAKIER-5L',    'Lakier poliuretanowy do parkietu 5L',    'l',   'Posadzki'),
    -- Elektryka dodatkowa
    (v_org, 'ELE-OPRAWA-DEKO',  'Oprawa wisząca dekoracyjna LED 30W',     'szt', 'Elektryka'),
    (v_org, 'ELE-GNIAZDO-1X',   'Gniazdo pojedyncze Legrand Valena',      'szt', 'Elektryka');

  RAISE NOTICE 'Phase 1: Products inserted';
END $$;

-- ============================================
-- PHASE 2: Supplier prices for new + existing products
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  -- Supplier IDs
  v_knauf UUID;  v_sig UUID;  v_bricoman UUID;  v_atlas UUID;
  v_farby UUID;  v_elektro UUID;  v_hvac UUID;  v_wurth UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM ceny_dostawcow cd JOIN dostawcy d ON d.id = cd.dostawca_id
    JOIN produkty p ON p.id = cd.produkt_id WHERE p.sku = 'HVAC-KASET-50' AND d.organization_id = v_org) THEN
    RAISE NOTICE 'Phase 2 already seeded, skipping'; RETURN;
  END IF;

  SELECT id INTO v_knauf   FROM dostawcy WHERE kod = 'KNF' AND organization_id = v_org;
  SELECT id INTO v_sig     FROM dostawcy WHERE kod = 'SIG' AND organization_id = v_org;
  SELECT id INTO v_bricoman FROM dostawcy WHERE kod = 'BRC' AND organization_id = v_org;
  SELECT id INTO v_atlas   FROM dostawcy WHERE kod = 'ATL' AND organization_id = v_org;
  SELECT id INTO v_farby   FROM dostawcy WHERE kod = 'FPR' AND organization_id = v_org;
  SELECT id INTO v_elektro FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org;
  SELECT id INTO v_hvac    FROM dostawcy WHERE kod = 'HVC' AND organization_id = v_org;
  SELECT id INTO v_wurth   FROM dostawcy WHERE kod = 'WRT' AND organization_id = v_org;

  -- Supplier prices (dostawca_id, produkt SKU, cena_netto)
  INSERT INTO ceny_dostawcow (dostawca_id, produkt_id, cena_netto)
  SELECT d_id, p.id, cena FROM (VALUES
    -- Farby Premium: malowanie
    (v_farby, 'MAL-TASMA-48',    8.50),
    (v_farby, 'MAL-FOLIA-4X5',   6.20),
    (v_farby, 'FRB-LATEX-KOLOR', 185.00),
    (v_farby, 'FRB-CERAMICZNA',  145.00),
    (v_farby, 'TAP-WINYL-FLZ',   65.00),
    (v_farby, 'TAP-KLEJ-5KG',    42.00),
    -- Bricoman: ogólne
    (v_bricoman, 'MAL-TASMA-48',    7.90),
    (v_bricoman, 'MAL-FOLIA-4X5',   5.80),
    (v_bricoman, 'GLZ-PAPIER-120',   2.40),
    (v_bricoman, 'POD-PARKIET-DEB', 189.00),
    (v_bricoman, 'POD-KLEJ-PARKIET', 165.00),
    (v_bricoman, 'POD-LAKIER-5L',   195.00),
    -- Knauf: gładzie i GK
    (v_knauf, 'GLZ-MASA-FINISH',  38.00),
    (v_knauf, 'GLZ-PAPIER-120',    1.90),
    -- Atlas: posadzki i kleje
    (v_atlas, 'POD-PARKIET-DEB', 195.00),
    (v_atlas, 'POD-KLEJ-PARKIET', 158.00),
    (v_atlas, 'POD-LAKIER-5L',   185.00),
    -- HVAC Solutions: klimatyzacja
    (v_hvac, 'HVAC-KASET-50',  3200.00),
    (v_hvac, 'HVAC-KASET-71',  4100.00),
    (v_hvac, 'HVAC-AGRE-28', 18500.00),
    (v_hvac, 'HVAC-STEROW',     320.00),
    (v_hvac, 'HVAC-BRANCH',    1850.00),
    (v_hvac, 'HVAC-IZOL-CU',     12.50),
    -- SIG: sanitariaty
    (v_sig, 'SAN-UMYW-60',      285.00),
    (v_sig, 'SAN-SZAFKA-60',    420.00),
    (v_sig, 'SAN-BATERIA-UM',   485.00),
    (v_sig, 'SAN-WC-MISKA',     620.00),
    (v_sig, 'SAN-STELAZ',       780.00),
    (v_sig, 'SAN-PRZYCISK-WC',  195.00),
    (v_sig, 'SAN-DESKA-WC',     145.00),
    (v_sig, 'SAN-SYFON-UM',      45.00),
    -- Bricoman: sanitariaty (tańsza alternatywa)
    (v_bricoman, 'SAN-UMYW-60',   245.00),
    (v_bricoman, 'SAN-WC-MISKA',  520.00),
    (v_bricoman, 'SAN-STELAZ',    680.00),
    -- Elektro-Hurt: teletechnika
    (v_elektro, 'TEL-AP-WIFI6',    890.00),
    (v_elektro, 'TEL-PATCH-1M',      8.50),
    (v_elektro, 'TEL-GNIAZDO-2X',   35.00),
    (v_elektro, 'TEL-KORYTKO-100',  28.00),
    (v_elektro, 'ELE-OPRAWA-DEKO', 650.00),
    (v_elektro, 'ELE-GNIAZDO-1X',   18.50),
    -- Würth: ścianki szklane + drobne
    (v_wurth, 'SCN-SZKLO-10',    380.00),
    (v_wurth, 'SCN-PROFIL-AL',    85.00),
    (v_wurth, 'SCN-DRZWI-SZKL', 2200.00)
  ) AS v(d_id, sku, cena)
  JOIN produkty p ON p.sku = v.sku AND p.organization_id = v_org
  ON CONFLICT (dostawca_id, produkt_id) DO NOTHING;

  RAISE NOTICE 'Phase 2: Supplier prices inserted';
END $$;

-- ============================================
-- PHASE 3: Library składowe (labor + materials) for key positions
-- These are TEMPLATES - norma_domyslna = consumption per 1 unit of position
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  v_pos UUID;
  v_prod UUID;
  v_dost UUID;
  v_podw UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM biblioteka_skladowe_robocizna bsr
    JOIN pozycje_biblioteka pb ON pb.id = bsr.pozycja_biblioteka_id
    WHERE pb.kod = 'BUD.03.02.001' AND pb.organization_id = v_org AND bsr.opis LIKE '%Malowanie%') THEN
    RAISE NOTICE 'Phase 3 already seeded, skipping'; RETURN;
  END IF;

  -- === BUD.03.01.001 - Gładź gipsowa na ścianach GK ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.03.01.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Tynki%' AND organization_id = v_org;
    SELECT id INTO v_prod FROM produkty WHERE sku = 'GLZ-MASA-FINISH' AND organization_id = v_org;
    SELECT id INTO v_dost FROM dostawcy WHERE kod = 'KNF' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Nałożenie gładzi - warstwa 1', v_podw, 18.00, 0.15, 'h'),
      (v_pos, 2, 'Nałożenie gładzi - warstwa 2', v_podw, 18.00, 0.12, 'h'),
      (v_pos, 3, 'Szlifowanie i gruntowanie', v_podw, 18.00, 0.08, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Gładź szpachlowa Knauf Finish', v_prod, v_dost, 1.90, 1.2, 'kg'),
      (v_pos, 2, 'Grunt penetrujący', (SELECT id FROM produkty WHERE sku = 'FRB-GRUNT-5L' AND organization_id = v_org), NULL, 2.80, 0.15, 'l'),
      (v_pos, 3, 'Papier ścierny P120', (SELECT id FROM produkty WHERE sku = 'GLZ-PAPIER-120' AND organization_id = v_org), NULL, 1.90, 0.05, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.03.02.001 - Malowanie ścian farbą lateksową 2 warstwy ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.03.02.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Malarze%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Malowanie - warstwa 1 (baza)', v_podw, 16.00, 0.08, 'h'),
      (v_pos, 2, 'Malowanie - warstwa 2 (krycie)', v_podw, 16.00, 0.06, 'h'),
      (v_pos, 3, 'Zabezpieczenie okien/podłóg folią', v_podw, 16.00, 0.02, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Farba lateksowa biała 10L', (SELECT id FROM produkty WHERE sku = 'FRB-DULUX-10L' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'FPR' AND organization_id = v_org), 16.50, 0.18, 'l'),
      (v_pos, 2, 'Grunt penetrujący', (SELECT id FROM produkty WHERE sku = 'FRB-GRUNT-5L' AND organization_id = v_org), NULL, 2.80, 0.10, 'l'),
      (v_pos, 3, 'Taśma malarska', (SELECT id FROM produkty WHERE sku = 'MAL-TASMA-48' AND organization_id = v_org), NULL, 8.50, 0.02, 'szt'),
      (v_pos, 4, 'Folia ochronna', (SELECT id FROM produkty WHERE sku = 'MAL-FOLIA-4X5' AND organization_id = v_org), NULL, 6.20, 0.01, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.01.02.001 - Zerwanie wykładziny dywanowej ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.01.02.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Płytkarze%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Zerwanie wykładziny i kleju', v_podw, 16.00, 0.10, 'h'),
      (v_pos, 2, 'Szlifowanie podłoża', v_podw, 16.00, 0.05, 'h'),
      (v_pos, 3, 'Wywóz gruzu', NULL, 14.00, 0.02, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.02.01.004 - Ścianka GK akustyczna podwójna Rw>=52dB ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.02.01.004' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Budmont%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż konstrukcji stalowej CW100', v_podw, 22.00, 0.15, 'h'),
      (v_pos, 2, 'Montaż płyt GK 2x12.5mm obustronnie', v_podw, 22.00, 0.30, 'h'),
      (v_pos, 3, 'Szpachlowanie spoin i narożników', v_podw, 22.00, 0.10, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Profil CW 100', (SELECT id FROM produkty WHERE sku = 'GK-CW100' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'KNF' AND organization_id = v_org), 8.50, 0.80, 'mb'),
      (v_pos, 2, 'Profil UW 100', (SELECT id FROM produkty WHERE sku = 'GK-UW100' AND organization_id = v_org), NULL, 7.20, 0.30, 'mb'),
      (v_pos, 3, 'Płyta GK 12.5mm (4 warstwy)', (SELECT id FROM produkty WHERE sku = 'GK-PLYTA-125' AND organization_id = v_org), NULL, 18.50, 4.20, 'm²'),
      (v_pos, 4, 'Wełna akustyczna 100mm', (SELECT id FROM produkty WHERE sku = 'GK-WELNA-100' AND organization_id = v_org), NULL, 28.00, 1.05, 'm²'),
      (v_pos, 5, 'Wkręty GK kpl', (SELECT id FROM produkty WHERE sku = 'GK-WKRETY-KPL' AND organization_id = v_org), NULL, 0.08, 40.00, 'szt'),
      (v_pos, 6, 'Masa szpachlowa Uniflott', (SELECT id FROM produkty WHERE sku = 'GK-MASA-SZPACHL' AND organization_id = v_org), NULL, 3.20, 0.40, 'kg'),
      (v_pos, 7, 'Taśma papierowa', (SELECT id FROM produkty WHERE sku = 'GK-TASMA-PAPIER' AND organization_id = v_org), NULL, 0.12, 0.80, 'mb')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.02.02.001 - Ścianka systemowa szklana pełnej wysokości ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.02.02.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Budmont%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż profili aluminiowych', v_podw, 28.00, 0.20, 'h'),
      (v_pos, 2, 'Montaż paneli szklanych', v_podw, 28.00, 0.30, 'h'),
      (v_pos, 3, 'Regulacja i uszczelnienie', v_podw, 28.00, 0.05, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Szyba hartowana 10mm', (SELECT id FROM produkty WHERE sku = 'SCN-SZKLO-10' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'WRT' AND organization_id = v_org), 380.00, 1.05, 'm²'),
      (v_pos, 2, 'Profil aluminiowy', (SELECT id FROM produkty WHERE sku = 'SCN-PROFIL-AL' AND organization_id = v_org), NULL, 85.00, 2.20, 'mb'),
      (v_pos, 3, 'Uszczelki i okucia (kpl/m²)', NULL, NULL, 45.00, 1.00, 'kpl')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.03.03.001 - Tapetowanie ścian ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.03.03.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Malarze%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Przygotowanie podłoża i gruntowanie', v_podw, 18.00, 0.08, 'h'),
      (v_pos, 2, 'Klejenie tapety winylowej', v_podw, 18.00, 0.18, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Tapeta winylowa na flizelinie', (SELECT id FROM produkty WHERE sku = 'TAP-WINYL-FLZ' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'FPR' AND organization_id = v_org), 65.00, 1.10, 'mb'),
      (v_pos, 2, 'Klej do tapet', (SELECT id FROM produkty WHERE sku = 'TAP-KLEJ-5KG' AND organization_id = v_org), NULL, 8.40, 0.30, 'kg'),
      (v_pos, 3, 'Grunt penetrujący', (SELECT id FROM produkty WHERE sku = 'FRB-GRUNT-5L' AND organization_id = v_org), NULL, 2.80, 0.12, 'l')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === BUD.04.02.004 - Parkiet dębowy klejony ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'BUD.04.02.004' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Płytkarze%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Klejenie parkietu', v_podw, 22.00, 0.25, 'h'),
      (v_pos, 2, 'Szlifowanie 3-krotne', v_podw, 22.00, 0.15, 'h'),
      (v_pos, 3, 'Lakierowanie 3 warstwy', v_podw, 22.00, 0.12, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Parkiet dębowy 22mm', (SELECT id FROM produkty WHERE sku = 'POD-PARKIET-DEB' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'BRC' AND organization_id = v_org), 189.00, 1.05, 'm²'),
      (v_pos, 2, 'Klej poliuretanowy', (SELECT id FROM produkty WHERE sku = 'POD-KLEJ-PARKIET' AND organization_id = v_org), NULL, 11.00, 1.50, 'kg'),
      (v_pos, 3, 'Lakier poliuretanowy', (SELECT id FROM produkty WHERE sku = 'POD-LAKIER-5L' AND organization_id = v_org), NULL, 39.00, 0.12, 'l')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === ELE.01.01.002 - Gniazdo 230V podwójne ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'ELE.01.01.002' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Elektro-Mont%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż puszki i osprzętu', v_podw, 22.00, 0.30, 'h'),
      (v_pos, 2, 'Podłączenie i pomiary', v_podw, 22.00, 0.15, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Gniazdo podwójne Legrand Valena', (SELECT id FROM produkty WHERE sku = 'ELE-GNIAZDO-2X' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org), 32.00, 1.00, 'szt'),
      (v_pos, 2, 'Puszka podtynkowa fi60', (SELECT id FROM produkty WHERE sku = 'ELE-PUSZKA-60' AND organization_id = v_org), NULL, 2.20, 1.00, 'szt'),
      (v_pos, 3, 'Przewód YDYp 3x2.5mm²', (SELECT id FROM produkty WHERE sku = 'ELE-YDYP-3X25' AND organization_id = v_org), NULL, 4.80, 8.00, 'mb')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === ELE.04.01.001 - Korytko kablowe 200x60 ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'ELE.04.01.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Elektro-Mont%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż korytka z uchwytami', v_podw, 22.00, 0.15, 'h'),
      (v_pos, 2, 'Montaż kształtek (łuki, trójniki)', v_podw, 22.00, 0.05, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Korytko kablowe 100x60', (SELECT id FROM produkty WHERE sku = 'ELE-KORYTKO-H100' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org), 18.50, 1.05, 'mb'),
      (v_pos, 2, 'Uchwyty i kołki montażowe', NULL, NULL, 3.50, 2.00, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === HVC.01.01.001 - Klimatyzator kasetonowy 5.0kW ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'HVC.01.01.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%KlimaVent%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż jednostki wewnętrznej', v_podw, 35.00, 3.00, 'h'),
      (v_pos, 2, 'Podłączenie instalacji freonowej', v_podw, 35.00, 2.00, 'h'),
      (v_pos, 3, 'Uruchomienie i próby', v_podw, 35.00, 1.00, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Klimatyzator kasetonowy 5.0kW', (SELECT id FROM produkty WHERE sku = 'HVAC-KASET-50' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'HVC' AND organization_id = v_org), 3200.00, 1.00, 'szt'),
      (v_pos, 2, 'Sterownik przewodowy LCD', (SELECT id FROM produkty WHERE sku = 'HVAC-STEROW' AND organization_id = v_org), NULL, 320.00, 1.00, 'szt'),
      (v_pos, 3, 'Rury miedziane (para) 8m avg', (SELECT id FROM produkty WHERE sku = 'HVAC-RURA-CU' AND organization_id = v_org), NULL, 85.00, 8.00, 'mb'),
      (v_pos, 4, 'Izolacja Armaflex', (SELECT id FROM produkty WHERE sku = 'HVAC-IZOL-CU' AND organization_id = v_org), NULL, 12.50, 8.00, 'mb')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === HVC.01.01.003 - Klimatyzator ścienny split 3.5kW ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'HVC.01.01.003' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%KlimaVent%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż jednostki wewnętrznej i zewnętrznej', v_podw, 35.00, 4.00, 'h'),
      (v_pos, 2, 'Instalacja freonowa i próba szczelności', v_podw, 35.00, 2.00, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Klimatyzator split 3.5kW komplet', (SELECT id FROM produkty WHERE sku = 'HVAC-SPLIT-35' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'HVC' AND organization_id = v_org), 3800.00, 1.00, 'kpl'),
      (v_pos, 2, 'Rury miedziane 5m', (SELECT id FROM produkty WHERE sku = 'HVAC-RURA-CU' AND organization_id = v_org), NULL, 85.00, 5.00, 'mb')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === SAN.03.01.001 - Umywalka meblowa 60cm z szafką ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'SAN.03.01.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%SanTech%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż szafki i umywalki', v_podw, 28.00, 1.50, 'h'),
      (v_pos, 2, 'Podłączenie wod-kan + bateria', v_podw, 28.00, 1.00, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Umywalka meblowa 60cm', (SELECT id FROM produkty WHERE sku = 'SAN-UMYW-60' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'SIG' AND organization_id = v_org), 285.00, 1.00, 'szt'),
      (v_pos, 2, 'Szafka podumywalkowa', (SELECT id FROM produkty WHERE sku = 'SAN-SZAFKA-60' AND organization_id = v_org), NULL, 420.00, 1.00, 'szt'),
      (v_pos, 3, 'Bateria umywalkowa', (SELECT id FROM produkty WHERE sku = 'SAN-BATERIA-UM' AND organization_id = v_org), NULL, 485.00, 1.00, 'szt'),
      (v_pos, 4, 'Syfon chromowany', (SELECT id FROM produkty WHERE sku = 'SAN-SYFON-UM' AND organization_id = v_org), NULL, 45.00, 1.00, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === SAN.03.02.001 - Miska WC wisząca z deską ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'SAN.03.02.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%SanTech%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż stelaża podtynkowego', v_podw, 28.00, 2.00, 'h'),
      (v_pos, 2, 'Montaż miski WC i deska', v_podw, 28.00, 1.00, 'h'),
      (v_pos, 3, 'Podłączenie wody i kanalizacji', v_podw, 28.00, 0.50, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Miska WC wisząca Koło', (SELECT id FROM produkty WHERE sku = 'SAN-WC-MISKA' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'SIG' AND organization_id = v_org), 620.00, 1.00, 'szt'),
      (v_pos, 2, 'Stelaż Geberit Duofix', (SELECT id FROM produkty WHERE sku = 'SAN-STELAZ' AND organization_id = v_org), NULL, 780.00, 1.00, 'szt'),
      (v_pos, 3, 'Przycisk Geberit Sigma', (SELECT id FROM produkty WHERE sku = 'SAN-PRZYCISK-WC' AND organization_id = v_org), NULL, 195.00, 1.00, 'szt'),
      (v_pos, 4, 'Deska wolnoopadowa', (SELECT id FROM produkty WHERE sku = 'SAN-DESKA-WC' AND organization_id = v_org), NULL, 145.00, 1.00, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === TEL.01.01.001 - Punkt logiczny PEL kat.6A ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'TEL.01.01.001' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%NetBuild%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Ułożenie kabla i zakończenie', v_podw, 25.00, 0.50, 'h'),
      (v_pos, 2, 'Montaż gniazda i patchcord', v_podw, 25.00, 0.25, 'h'),
      (v_pos, 3, 'Pomiary i certyfikacja', v_podw, 25.00, 0.15, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Kabel U/UTP kat.6 (avg 30m)', (SELECT id FROM produkty WHERE sku = 'ELE-KABEL-U-UTP' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org), 2.80, 30.00, 'mb'),
      (v_pos, 2, 'Gniazdo 2xRJ45 kat.6A', (SELECT id FROM produkty WHERE sku = 'TEL-GNIAZDO-2X' AND organization_id = v_org), NULL, 35.00, 1.00, 'szt'),
      (v_pos, 3, 'Patchcord 1m', (SELECT id FROM produkty WHERE sku = 'TEL-PATCH-1M' AND organization_id = v_org), NULL, 8.50, 1.00, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === TEL.02.01.003 - Access Point WiFi 6E ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'TEL.02.01.003' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%NetBuild%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż AP i podłączenie PoE', v_podw, 25.00, 0.50, 'h'),
      (v_pos, 2, 'Konfiguracja i test zasięgu', v_podw, 25.00, 0.50, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Access Point WiFi 6 Ubiquiti', (SELECT id FROM produkty WHERE sku = 'TEL-AP-WIFI6' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org), 890.00, 1.00, 'szt'),
      (v_pos, 2, 'Kabel kat.6 do AP (15m avg)', (SELECT id FROM produkty WHERE sku = 'ELE-KABEL-U-UTP' AND organization_id = v_org), NULL, 2.80, 15.00, 'mb')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  -- === ELE.02.01.005 - Oprawa LED dekoracyjna wisząca ===
  SELECT id INTO v_pos FROM pozycje_biblioteka WHERE kod = 'ELE.02.01.005' AND organization_id = v_org;
  IF v_pos IS NOT NULL THEN
    SELECT id INTO v_podw FROM podwykonawcy WHERE nazwa LIKE '%Elektro-Mont%' AND organization_id = v_org;

    INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, opis, podwykonawca_id, stawka_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Montaż oprawy wiszącej z zawieszeniem', v_podw, 25.00, 1.00, 'h'),
      (v_pos, 2, 'Podłączenie elektryczne', v_podw, 25.00, 0.30, 'h')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;

    INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, nazwa, produkt_id, dostawca_id, cena_domyslna, norma_domyslna, jednostka) VALUES
      (v_pos, 1, 'Oprawa wisząca dekoracyjna LED 30W', (SELECT id FROM produkty WHERE sku = 'ELE-OPRAWA-DEKO' AND organization_id = v_org),
        (SELECT id FROM dostawcy WHERE kod = 'ELH' AND organization_id = v_org), 650.00, 1.00, 'szt')
    ON CONFLICT (pozycja_biblioteka_id, lp) DO NOTHING;
  END IF;

  RAISE NOTICE 'Phase 3: Library skladowe inserted';
END $$;

-- ============================================
-- PHASE 4: More subcontractor rates (stawki_podwykonawcow)
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM stawki_podwykonawcow sp
    JOIN podwykonawcy pw ON pw.id = sp.podwykonawca_id
    JOIN pozycje_biblioteka pb ON pb.id = sp.pozycja_biblioteka_id
    WHERE pw.nazwa LIKE '%Malarze%' AND pb.kod = 'BUD.03.02.001' AND pw.organization_id = v_org) THEN
    RAISE NOTICE 'Phase 4 already seeded, skipping'; RETURN;
  END IF;

  -- Malarze Pro: malowanie, tapetowanie, gładzie
  INSERT INTO stawki_podwykonawcow (podwykonawca_id, pozycja_biblioteka_id, stawka, aktywny)
  SELECT pw.id, pb.id, v.stawka, TRUE
  FROM (VALUES
    ('Malarze Pro', 'BUD.03.01.001', 16.00),
    ('Malarze Pro', 'BUD.03.02.001', 14.00),
    ('Malarze Pro', 'BUD.03.02.002', 15.00),
    ('Malarze Pro', 'BUD.03.02.003', 18.00),
    ('Malarze Pro', 'BUD.03.03.001', 22.00),
    -- Tynki-Expres: tynki, gładzie, wylewki
    ('Tynki-Expres', 'BUD.03.01.001', 18.00),
    ('Tynki-Expres', 'BUD.03.01.002', 20.00),
    ('Tynki-Expres', 'BUD.04.01.002', 22.00),
    -- Budmont: ścianki, sufity, rozbiórki
    ('Ekipa GK "Budmont"', 'BUD.02.01.002', 44.00),
    ('Ekipa GK "Budmont"', 'BUD.02.01.004', 55.00),
    ('Ekipa GK "Budmont"', 'BUD.02.22.001', 65.00),  -- may not exist, will skip via JOIN
    ('Ekipa GK "Budmont"', 'BUD.01.02.001', 28.00),
    ('Ekipa GK "Budmont"', 'BUD.01.01.002', 35.00),
    -- Płytkarze OK: posadzki, parkiet
    ('Płytkarze OK', 'BUD.04.01.001', 36.00),
    ('Płytkarze OK', 'BUD.04.02.004', 55.00),
    ('Płytkarze OK', 'BUD.04.03.002', 58.00),
    -- Elektro-Mont: gniazda, oprawy, korytka
    ('Elektro-Mont', 'ELE.01.01.002', 45.00),
    ('Elektro-Mont', 'ELE.04.01.001', 38.00),
    ('Elektro-Mont', 'ELE.02.01.005', 55.00),
    ('Elektro-Mont', 'ELE.04.02.001', 18.00),
    -- SanTech: sanitariaty
    ('SanTech Instalacje', 'SAN.03.01.001', 55.00),
    ('SanTech Instalacje', 'SAN.03.02.001', 60.00),
    ('SanTech Instalacje', 'SAN.01.01.004', 52.00),
    ('SanTech Instalacje', 'SAN.01.02.001', 42.00),
    -- KlimaVent: HVAC
    ('KlimaVent sp. z o.o.', 'HVC.01.01.001', 85.00),
    ('KlimaVent sp. z o.o.', 'HVC.01.01.003', 75.00),
    ('KlimaVent sp. z o.o.', 'HVC.01.02.001', 95.00),
    ('KlimaVent sp. z o.o.', 'HVC.01.03.001', 45.00),
    -- NetBuild: teletechnika
    ('NetBuild Teletechnika', 'TEL.01.01.001', 42.00),
    ('NetBuild Teletechnika', 'TEL.01.01.002', 48.00),
    ('NetBuild Teletechnika', 'TEL.02.01.003', 55.00),
    ('NetBuild Teletechnika', 'TEL.02.01.001', 65.00)
  ) AS v(pw_nazwa, pb_kod, stawka)
  JOIN podwykonawcy pw ON pw.nazwa = v.pw_nazwa AND pw.organization_id = v_org
  JOIN pozycje_biblioteka pb ON pb.kod = v.pb_kod AND pb.organization_id = v_org
  ON CONFLICT (podwykonawca_id, pozycja_biblioteka_id) DO NOTHING;

  RAISE NOTICE 'Phase 4: Subcontractor rates inserted';
END $$;

-- ============================================
-- PHASE 5A: Project "Novum Tech" - DRAFT status
-- Modern IT company, 850m², open-plan + meeting rooms
-- Rev0: initial draft (unlocked, editable)
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  v_proj UUID;
  v_rev0 UUID;
  v_kp UUID;
  v_bib UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM projekty WHERE slug = 'novum-tech-mokotow' AND organization_id = v_org) THEN
    RAISE NOTICE 'Phase 5A already seeded, skipping'; RETURN;
  END IF;

  -- Create project
  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, status, notatki)
  VALUES (v_org, 'Fit-out biura Novum Tech - Mokotów Business Park',
    'novum-tech-mokotow', 'Novum Tech sp. z o.o.',
    'ul. Domaniewska 28, piętro 5, 02-672 Warszawa', 850.00, 'draft',
    'Open-plan 60 stanowisk + 4 sale konferencyjne + kuchnia + recepcja. Budżet klienta: ~1.2M PLN netto.')
  RETURNING id INTO v_proj;

  -- Rev0 (draft, unlocked)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_proj, 0, 'Wersja wstępna', FALSE)
  RETURNING id INTO v_rev0;

  -- Helper: insert kosztorys position + składowe from library
  -- Position 1: Rozbiórka ścian GK
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 1, 'Rozbiórka ścianek z płyt GK na ruszcie stalowym', 120, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Rozbiórka ścian GK z rusztem', 32.00, 0.12, 'h');

  -- Position 2: Demontaż sufitu
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.01.03.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 2, 'Demontaż sufitu podwieszanego kasetonowego z rusztem', 200, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Demontaż sufitu kasetonowego', 30.00, 0.10, 'h');

  -- Position 3: Ścianka GK CW75
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.02.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 3, 'Ścianka GK pojedyncza CW75 1x12.5mm', 280, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż konstrukcji CW75', 42.00, 0.12, 'h'),
    (v_kp, 2, 'Montaż płyt GK', 42.00, 0.15, 'h'),
    (v_kp, 3, 'Szpachlowanie spoin', 42.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Profil CW 75', 6.80, 0.80, 'mb'),
    (v_kp, 2, 'Profil UW 75', 5.50, 0.30, 'mb'),
    (v_kp, 3, 'Płyta GK 12.5mm', 18.50, 2.10, 'm²'),
    (v_kp, 4, 'Wełna mineralna 50mm', 14.50, 1.05, 'm²'),
    (v_kp, 5, 'Wkręty GK', 0.08, 30.00, 'szt'),
    (v_kp, 6, 'Masa szpachlowa', 3.20, 0.30, 'kg'),
    (v_kp, 7, 'Taśma papierowa', 0.12, 0.80, 'mb');

  -- Position 4: Ścianka GK akustyczna
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.02.01.004' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 4, 'Ścianka GK akustyczna podwójna Rw≥52dB', 45, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż konstrukcji CW100', 22.00, 0.15, 'h'),
    (v_kp, 2, 'Montaż płyt 2x12.5 obustronnie', 22.00, 0.30, 'h'),
    (v_kp, 3, 'Szpachlowanie', 22.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Profil CW 100', 8.50, 0.80, 'mb'),
    (v_kp, 2, 'Profil UW 100', 7.20, 0.30, 'mb'),
    (v_kp, 3, 'Płyta GK 12.5mm (4 warstwy)', 18.50, 4.20, 'm²'),
    (v_kp, 4, 'Wełna akustyczna 100mm', 28.00, 1.05, 'm²'),
    (v_kp, 5, 'Wkręty GK kpl', 0.08, 40.00, 'szt');

  -- Position 5: Gładź gipsowa
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 5, 'Gładź gipsowa na ścianach GK - 2 warstwy', 650, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Nałożenie gładzi - warstwa 1', 18.00, 0.15, 'h'),
    (v_kp, 2, 'Nałożenie gładzi - warstwa 2', 18.00, 0.12, 'h'),
    (v_kp, 3, 'Szlifowanie i gruntowanie', 18.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gładź szpachlowa Knauf Finish', 1.90, 1.20, 'kg'),
    (v_kp, 2, 'Grunt penetrujący', 2.80, 0.15, 'l'),
    (v_kp, 3, 'Papier ścierny P120', 1.90, 0.05, 'szt');

  -- Position 6: Malowanie ścian
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 6, 'Malowanie ścian farbą lateksową 2 warstwy', 650, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Malowanie - warstwa 1', 16.00, 0.08, 'h'),
    (v_kp, 2, 'Malowanie - warstwa 2', 16.00, 0.06, 'h'),
    (v_kp, 3, 'Zabezpieczenie folią', 16.00, 0.02, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Farba lateksowa biała 10L', 16.50, 0.18, 'l'),
    (v_kp, 2, 'Grunt penetrujący', 2.80, 0.10, 'l'),
    (v_kp, 3, 'Taśma malarska', 8.50, 0.02, 'szt'),
    (v_kp, 4, 'Folia ochronna', 6.20, 0.01, 'szt');

  -- Position 7: Wylewka samopoziomująca
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 7, 'Wylewka samopoziomująca gr. 3-5mm', 750, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Gruntowanie podłoża', 38.00, 0.03, 'h'),
    (v_kp, 2, 'Wylanie i wyrównanie', 38.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Wylewka samopoziomująca 25kg', 1.20, 7.00, 'kg'),
    (v_kp, 2, 'Grunt pod wylewkę', 4.50, 0.15, 'l');

  -- Position 8: Wykładzina dywanowa
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 8, 'Wykładzina dywanowa płytkowa 50x50cm', 680, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Układanie wykładziny z klejeniem', 35.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Wykładzina dywanowa 50x50', 68.00, 1.05, 'm²'),
    (v_kp, 2, 'Klej do wykładzin', 8.50, 0.30, 'kg');

  -- Position 9: Posadzka gres (kuchnia/łazienki)
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.03.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 9, 'Posadzka z gresu technicznego 60x60', 70, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Układanie płytek', 52.00, 0.20, 'h'),
    (v_kp, 2, 'Fugowanie', 52.00, 0.05, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gres techniczny 60x60', 65.00, 1.05, 'm²'),
    (v_kp, 2, 'Klej Atlas Plus', 2.80, 5.00, 'kg'),
    (v_kp, 3, 'Fuga Mapei', 8.50, 0.40, 'kg');

  -- Position 10: Sufit kasetonowy
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.05.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 10, 'Sufit podwieszany kasetonowy mineralny 60x60', 600, 'm²', 30)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż rusztu T24', 45.00, 0.08, 'h'),
    (v_kp, 2, 'Układanie kasetonów', 45.00, 0.05, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kaseton mineralny Armstrong 60x60', 18.50, 2.80, 'szt'),
    (v_kp, 2, 'Ruszt główny T24 3600mm', 8.20, 1.70, 'mb'),
    (v_kp, 3, 'Ruszt poprzeczny T24 600mm', 3.80, 2.80, 'szt'),
    (v_kp, 4, 'Zawieszka sufitowa', 2.50, 1.20, 'szt'),
    (v_kp, 5, 'Profil obwodowy L', 4.20, 0.40, 'mb');

  -- Position 11: Gniazda podwójne
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.01.01.002' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 11, 'Gniazdo 230V podtynkowe podwójne z uziemieniem', 85, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż puszki i osprzętu', 45.00, 0.30, 'h'),
    (v_kp, 2, 'Podłączenie i pomiary', 45.00, 0.15, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gniazdo podwójne Legrand', 32.00, 1.00, 'szt'),
    (v_kp, 2, 'Puszka podtynkowa fi60', 2.20, 1.00, 'szt'),
    (v_kp, 3, 'Przewód YDYp 3x2.5mm²', 4.80, 8.00, 'mb');

  -- Position 12: Oprawy LED 60x60
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.02.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 12, 'Oprawa LED panel 60x60 40W wpuszczana w sufit', 140, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż oprawy w suficie', 50.00, 0.20, 'h'),
    (v_kp, 2, 'Podłączenie i test', 50.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Panel LED 60x60 40W 4000K', 135.00, 1.00, 'szt'),
    (v_kp, 2, 'Przewód YDYp 3x1.5mm²', 3.20, 5.00, 'mb');

  -- Position 13: Korytko kablowe
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.04.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 13, 'Korytko kablowe perforowane 200x60mm', 180, 'mb', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż korytka z uchwytami', 38.00, 0.15, 'h'),
    (v_kp, 2, 'Montaż kształtek', 38.00, 0.05, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Korytko kablowe 100x60', 18.50, 1.05, 'mb'),
    (v_kp, 2, 'Uchwyty i kołki montażowe', 3.50, 2.00, 'szt');

  -- Position 14: Klimatyzator kasetonowy 5kW
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'HVC.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 14, 'Klimatyzator kasetonowy 4-stronny 5.0kW', 12, 'szt', 22)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż jednostki wewnętrznej', 85.00, 3.00, 'h'),
    (v_kp, 2, 'Podłączenie freon + elektr.', 85.00, 2.00, 'h'),
    (v_kp, 3, 'Uruchomienie i próby', 85.00, 1.00, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Klimatyzator kasetonowy 5.0kW', 3200.00, 1.00, 'szt'),
    (v_kp, 2, 'Sterownik LCD', 320.00, 1.00, 'szt'),
    (v_kp, 3, 'Rury miedziane (para) 8m', 85.00, 8.00, 'mb'),
    (v_kp, 4, 'Izolacja Armaflex', 12.50, 8.00, 'mb');

  -- Position 15: Punkt logiczny PEL
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'TEL.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 15, 'Punkt logiczny PEL kat.6A (gniazdo+kabel+patch)', 95, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Ułożenie kabla i zakończenie', 42.00, 0.50, 'h'),
    (v_kp, 2, 'Montaż gniazda i patchcord', 42.00, 0.25, 'h'),
    (v_kp, 3, 'Pomiary i certyfikacja', 42.00, 0.15, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kabel U/UTP kat.6 (30m avg)', 2.80, 30.00, 'mb'),
    (v_kp, 2, 'Gniazdo 2xRJ45 kat.6A', 35.00, 1.00, 'szt'),
    (v_kp, 3, 'Patchcord 1m', 8.50, 1.00, 'szt');

  RAISE NOTICE 'Phase 5A: Project Novum Tech (draft) created with 15 positions';
END $$;

-- ============================================
-- PHASE 5B: Project "Kancelaria Wardyński" - OFERTOWANIE
-- Premium law firm, 1200m², 2 revisions (both locked, sent to client)
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  v_proj UUID;
  v_rev0 UUID; v_rev1 UUID;
  v_kp UUID; v_bib UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM projekty WHERE slug = 'wardynski-ujazdowskie' AND organization_id = v_org) THEN
    RAISE NOTICE 'Phase 5B already seeded, skipping'; RETURN;
  END IF;

  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, status, sent_at, notatki)
  VALUES (v_org, 'Remont biura kancelarii Wardyński i Wspólnicy',
    'wardynski-ujazdowskie', 'Wardyński i Wspólnicy sp.k.',
    'Al. Ujazdowskie 10, piętro 3-4, 00-478 Warszawa', 1200.00, 'ofertowanie', NOW() - interval '3 days',
    'Kancelaria premium - parkiet dębowy, ścianki szklane, tapety w recepcji. Klient oczekuje najwyższej jakości materiałów. Rev1 po negocjacjach cenowych (-8%).')
  RETURNING id INTO v_proj;

  -- Create revisions UNLOCKED first (trigger prevents inserts into locked revisions)
  -- Will lock after inserting all positions
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_proj, 0, 'Oferta wstępna', FALSE)
  RETURNING id INTO v_rev0;

  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_proj, 1, 'Po negocjacjach (-8%)', FALSE)
  RETURNING id INTO v_rev1;

  -- ====== Rev1 positions (the active offer) ======

  -- 1: Rozbiórka ścian
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 1, 'Rozbiórka ścianek z płyt GK na ruszcie stalowym', 200, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Rozbiórka ścian GK', 30.00, 0.12, 'h');

  -- 2: Zerwanie wykładziny
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.01.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 2, 'Zerwanie wykładziny dywanowej z klejem', 900, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Zerwanie wykładziny', 16.00, 0.10, 'h'),
    (v_kp, 2, 'Szlifowanie podłoża', 16.00, 0.05, 'h');

  -- 3: Ścianka GK podwójna (sale konferencyjne)
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.02.01.003' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 3, 'Ścianka GK podwójna CW75 2x12.5mm', 350, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż konstrukcji CW75', 48.00, 0.12, 'h'),
    (v_kp, 2, 'Montaż płyt 2x12.5mm', 48.00, 0.25, 'h'),
    (v_kp, 3, 'Szpachlowanie', 48.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Profil CW 75', 6.80, 0.80, 'mb'),
    (v_kp, 2, 'Płyta GK 12.5mm (4 warstwy)', 18.50, 4.20, 'm²'),
    (v_kp, 3, 'Wełna mineralna 50mm', 14.50, 2.10, 'm²'),
    (v_kp, 4, 'Masa szpachlowa + taśma', 3.50, 0.50, 'kg');

  -- 4: Ścianka szklana (gabinety partnerów)
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.02.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 4, 'Ścianka systemowa szklana pełnej wysokości', 120, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż profili aluminiowych', 28.00, 0.20, 'h'),
    (v_kp, 2, 'Montaż paneli szklanych', 28.00, 0.30, 'h'),
    (v_kp, 3, 'Regulacja i uszczelnienie', 28.00, 0.05, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Szyba hartowana 10mm', 380.00, 1.05, 'm²'),
    (v_kp, 2, 'Profil aluminiowy', 85.00, 2.20, 'mb'),
    (v_kp, 3, 'Uszczelki i okucia', 45.00, 1.00, 'kpl');

  -- 5: Gładź gipsowa
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 5, 'Gładź gipsowa na ścianach GK - 2 warstwy', 800, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Gładź warstwa 1+2', 16.00, 0.25, 'h'),
    (v_kp, 2, 'Szlifowanie i gruntowanie', 16.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gładź Knauf Finish', 1.90, 1.20, 'kg'),
    (v_kp, 2, 'Grunt', 2.80, 0.15, 'l');

  -- 6: Malowanie ścian
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 6, 'Malowanie ścian farbą lateksową 2 warstwy', 800, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Malowanie 2 warstwy', 14.00, 0.14, 'h'),
    (v_kp, 2, 'Zabezpieczenie folią', 14.00, 0.02, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Farba lateksowa premium', 18.50, 0.18, 'l'),
    (v_kp, 2, 'Grunt', 2.80, 0.10, 'l');

  -- 7: Tapetowanie recepcji
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.03.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 7, 'Tapetowanie ścian tapetą winylową na flizelinie', 60, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Przygotowanie i klejenie tapety', 22.00, 0.26, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Tapeta winylowa premium', 95.00, 1.10, 'mb'),
    (v_kp, 2, 'Klej do tapet', 8.40, 0.30, 'kg');

  -- 8: Wylewka
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 8, 'Wylewka samopoziomująca gr. 3-5mm', 1000, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Gruntowanie + wylewka', 36.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Wylewka samopoziomująca', 1.20, 7.00, 'kg'),
    (v_kp, 2, 'Grunt', 4.50, 0.15, 'l');

  -- 9: Parkiet dębowy (premium)
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.02.004' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 9, 'Parkiet przemysłowy dębowy klejony', 900, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Klejenie parkietu', 55.00, 0.25, 'h'),
    (v_kp, 2, 'Szlifowanie 3-krotne', 55.00, 0.15, 'h'),
    (v_kp, 3, 'Lakierowanie 3 warstwy', 55.00, 0.12, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Parkiet dębowy 22mm', 189.00, 1.05, 'm²'),
    (v_kp, 2, 'Klej poliuretanowy', 11.00, 1.50, 'kg'),
    (v_kp, 3, 'Lakier poliuretanowy', 39.00, 0.12, 'l');

  -- 10: Gres łazienki
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.03.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 10, 'Posadzka z gresu technicznego 60x60', 100, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Układanie + fugowanie', 52.00, 0.25, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gres 60x60', 65.00, 1.05, 'm²'),
    (v_kp, 2, 'Klej + fuga', 3.50, 5.00, 'kg');

  -- 11: Sufit kasetonowy
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.05.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 11, 'Sufit podwieszany kasetonowy mineralny 60x60', 800, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż rusztu + kasetony', 45.00, 0.13, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kaseton Armstrong 60x60', 18.50, 2.80, 'szt'),
    (v_kp, 2, 'Ruszt T24 + zawieszki', 12.00, 1.80, 'kpl');

  -- 12: Sufit GK sale konferencyjne
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.05.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 12, 'Sufit z płyt GK na ruszcie pojedynczym CD60', 120, 'm²', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż rusztu CD60', 50.00, 0.12, 'h'),
    (v_kp, 2, 'Montaż płyt GK', 50.00, 0.15, 'h'),
    (v_kp, 3, 'Szpachlowanie', 50.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Płyta GK 12.5mm', 18.50, 1.05, 'm²'),
    (v_kp, 2, 'Profil CD60', 5.20, 3.00, 'mb'),
    (v_kp, 3, 'Wieszak ES + kołki', 2.80, 1.20, 'szt'),
    (v_kp, 4, 'Masa szpachlowa', 3.20, 0.30, 'kg');

  -- 13: Gniazda podwójne
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.01.01.002' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 13, 'Gniazdo 230V podtynkowe podwójne', 150, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie', 45.00, 0.45, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gniazdo podwójne Legrand', 32.00, 1.00, 'szt'),
    (v_kp, 2, 'Puszka + przewód 8m', 7.00, 1.00, 'kpl');

  -- 14: Oprawy LED
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.02.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 14, 'Oprawa LED panel 60x60 40W', 200, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie', 50.00, 0.30, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Panel LED 60x60 40W', 135.00, 1.00, 'szt'),
    (v_kp, 2, 'Przewód 3x1.5mm² 5m', 3.20, 5.00, 'mb');

  -- 15: Oprawy dekoracyjne recepcja
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.02.01.005' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 15, 'Oprawa LED dekoracyjna wisząca (recepcja)', 12, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż wiszącej oprawy + podłączenie', 55.00, 1.30, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Oprawa wisząca LED 30W', 650.00, 1.00, 'szt');

  -- 16: Umywalki
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'SAN.03.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 16, 'Umywalka meblowa 60cm z szafką podumywalkową', 15, 'kpl', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż szafki + umywalki', 55.00, 1.50, 'h'),
    (v_kp, 2, 'Podłączenie wod-kan + bateria', 55.00, 1.00, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Umywalka 60cm', 285.00, 1.00, 'szt'),
    (v_kp, 2, 'Szafka podumywalkowa', 420.00, 1.00, 'szt'),
    (v_kp, 3, 'Bateria Hansgrohe', 485.00, 1.00, 'szt'),
    (v_kp, 4, 'Syfon chromowany', 45.00, 1.00, 'szt');

  -- 17: WC
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'SAN.03.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 17, 'Miska WC wisząca z deską wolnoopadową', 12, 'kpl', 28)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż stelaża + miska + deska', 60.00, 3.50, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Miska WC Koło Nova Pro', 620.00, 1.00, 'szt'),
    (v_kp, 2, 'Stelaż Geberit Duofix', 780.00, 1.00, 'szt'),
    (v_kp, 3, 'Przycisk Geberit Sigma', 195.00, 1.00, 'szt'),
    (v_kp, 4, 'Deska wolnoopadowa', 145.00, 1.00, 'szt');

  -- 18: Klimatyzatory kasetonowe
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'HVC.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 18, 'Klimatyzator kasetonowy 4-stronny 5.0kW', 20, 'szt', 22)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie + uruchomienie', 85.00, 6.00, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Klimatyzator kasetonowy 5.0kW', 3200.00, 1.00, 'szt'),
    (v_kp, 2, 'Sterownik + rury + izolacja', 500.00, 1.00, 'kpl');

  -- 19: Punkty logiczne
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'TEL.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 19, 'Punkt logiczny PEL kat.6A', 160, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Kabel + gniazdo + pomiary', 42.00, 0.90, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kabel kat.6 (30m)', 2.80, 30.00, 'mb'),
    (v_kp, 2, 'Gniazdo 2xRJ45 + patchcord', 43.50, 1.00, 'kpl');

  -- 20: Korytko kablowe
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.04.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev1, v_bib, 20, 'Korytko kablowe perforowane 200x60mm', 250, 'mb', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż korytka z uchwytami', 38.00, 0.20, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Korytko 100x60 + uchwyty', 22.00, 1.05, 'kpl');

  -- Lock both revisions after all positions inserted
  UPDATE rewizje SET is_locked = TRUE, locked_at = NOW() - interval '7 days' WHERE id = v_rev0;
  UPDATE rewizje SET is_locked = TRUE, locked_at = NOW() - interval '3 days' WHERE id = v_rev1;

  RAISE NOTICE 'Phase 5B: Project Wardynski (ofertowanie) created with 20 positions, revisions locked';
END $$;

-- ============================================
-- PHASE 5C: Project "CoWork Hub Koneser" - ODRZUCONY
-- Budget coworking space, 600m², 1 revision (locked, rejected)
-- ============================================
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  v_proj UUID;
  v_rev0 UUID;
  v_kp UUID; v_bib UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM projekty WHERE slug = 'cowork-koneser' AND organization_id = v_org) THEN
    RAISE NOTICE 'Phase 5C already seeded, skipping'; RETURN;
  END IF;

  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, status, notatki)
  VALUES (v_org, 'Biuro CoWork Hub - Centrum Praskie Koneser',
    'cowork-koneser', 'CoWork Ventures sp. z o.o.',
    'ul. Mińska 25, budynek C, 03-808 Warszawa', 600.00, 'odrzucony',
    'Coworking - budżetowy fit-out. Klient zrezygnował z powodu przekroczenia budżetu (oczekiwał <400k, oferta ~520k). Możliwy powrót w Q2.')
  RETURNING id INTO v_proj;

  -- Rev0 (create unlocked, will lock after inserting positions)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_proj, 0, 'Oferta jednorazowa', FALSE)
  RETURNING id INTO v_rev0;

  -- 1: Rozbiórka ścian
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 1, 'Rozbiórka ścianek z płyt GK', 80, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Rozbiórka ścian GK', 30.00, 0.12, 'h');

  -- 2: Ścianka GK CW75
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.02.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 2, 'Ścianka GK pojedyncza CW75', 150, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż konstrukcji + GK', 42.00, 0.27, 'h'),
    (v_kp, 2, 'Szpachlowanie', 42.00, 0.08, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Profil CW75 + UW75', 12.30, 1.10, 'kpl'),
    (v_kp, 2, 'Płyta GK 12.5mm', 18.50, 2.10, 'm²'),
    (v_kp, 3, 'Wełna 50mm + wkręty + masa', 18.00, 1.10, 'kpl');

  -- 3: Malowanie
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.03.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 3, 'Malowanie ścian farbą lateksową', 500, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Malowanie 2 warstwy + ochrona', 14.00, 0.16, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Farba lateksowa', 16.50, 0.18, 'l'),
    (v_kp, 2, 'Grunt + taśma + folia', 3.50, 0.12, 'kpl');

  -- 4: Wylewka
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 4, 'Wylewka samopoziomująca gr. 3-5mm', 550, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Gruntowanie + wylewka', 36.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Wylewka + grunt', 1.40, 7.50, 'kpl');

  -- 5: Wykładzina
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.04.02.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 5, 'Wykładzina dywanowa płytkowa 50x50cm', 480, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka)
  VALUES (v_kp, 1, 'Układanie wykładziny', 35.00, 0.10, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Wykładzina 50x50 + klej', 72.00, 1.05, 'kpl');

  -- 6: Sufit kasetonowy
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'BUD.05.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 6, 'Sufit podwieszany kasetonowy 60x60', 500, 'm²', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż rusztu + kasetony', 45.00, 0.13, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kaseton + ruszt + zawieszki', 30.00, 1.05, 'kpl');

  -- 7: Gniazda
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.01.01.002' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 7, 'Gniazdo 230V podwójne z uziemieniem', 60, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie', 45.00, 0.45, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Gniazdo + puszka + kabel', 39.00, 1.00, 'kpl');

  -- 8: LED
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'ELE.02.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 8, 'Oprawa LED panel 60x60 40W', 80, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie', 50.00, 0.30, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Panel LED 60x60', 135.00, 1.00, 'szt'),
    (v_kp, 2, 'Kabel 3x1.5mm²', 3.20, 5.00, 'mb');

  -- 9: Klima split
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'HVC.01.01.003' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 9, 'Klimatyzator ścienny split 3.5kW', 8, 'szt', 22)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + instalacja freonowa', 75.00, 6.00, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Split 3.5kW komplet', 3800.00, 1.00, 'kpl'),
    (v_kp, 2, 'Rury Cu 5m + izolacja', 85.00, 5.00, 'kpl');

  -- 10: Punkty logiczne
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'TEL.01.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 10, 'Punkt logiczny PEL kat.6A', 65, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Kabel + gniazdo + pomiary', 42.00, 0.90, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Kabel kat.6 + gniazdo + patchcord', 128.00, 1.00, 'kpl');

  -- 11: Access Point WiFi
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'TEL.02.01.003' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 11, 'Access Point Wi-Fi 6E sufitowy PoE', 8, 'szt', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż AP + konfiguracja', 55.00, 1.00, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'AP WiFi 6 Ubiquiti', 890.00, 1.00, 'szt'),
    (v_kp, 2, 'Kabel kat.6 15m', 2.80, 15.00, 'mb');

  -- 12: Umywalki (is_manual example - fixed quantity regardless of kpl count)
  SELECT id INTO v_bib FROM pozycje_biblioteka WHERE kod = 'SAN.03.01.001' AND organization_id = v_org;
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent)
  VALUES (v_org, v_rev0, v_bib, 12, 'Umywalka meblowa 60cm z szafką', 8, 'kpl', 25)
  RETURNING id INTO v_kp;
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, jednostka) VALUES
    (v_kp, 1, 'Montaż + podłączenie', 55.00, 2.50, 'h');
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, jednostka) VALUES
    (v_kp, 1, 'Umywalka + szafka', 705.00, 1.00, 'kpl'),
    (v_kp, 2, 'Bateria + syfon', 330.00, 1.00, 'kpl');
  -- Manual material: water heater (1 unit regardless of sink count)
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, ilosc, jednostka, is_manual)
  VALUES (v_kp, 3, 'Podgrzewacz wody 80L (1 szt dla łazienek)', 1200.00, 1, 1, 'szt', TRUE);

  -- Lock revision after all positions inserted
  UPDATE rewizje SET is_locked = TRUE, locked_at = NOW() - interval '14 days' WHERE id = v_rev0;

  RAISE NOTICE 'Phase 5C: Project CoWork Hub (odrzucony) created with 12 positions, revision locked';
END $$;
