-- 04-pozycje-stawki.sql: Library positions + their skladowe (robocizna + materialy)
-- Depends on: 01-base.sql (organizations, kategorie, typy_robocizny)
--             02-kontrahenci.sql (dostawcy, podwykonawcy)
--             03-produkty.sql (produkty, ceny_dostawcow)

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- 18 pozycje_biblioteka entries (typ defaults to 'komplet')
  INSERT INTO pozycje_biblioteka (organization_id, kategoria_id, kod, nazwa, opis, jednostka, aktywny, cena_robocizny)
  SELECT v_org_id, k.id, v.kod, v.nazwa, v.opis, v.jednostka, true, 0
  FROM (VALUES
    ('BUD.01.01', 'BUD.01.01.001', 'Ściany gipsowo-kartonowe',       'Ścianki działowe g-k na profilach CW/UW', 'm2'),
    ('BUD.01.03', 'BUD.01.03.001', 'Ścianki szklane',                'Ścianki szklane hartowane na profilach aluminiowych', 'm2'),
    ('BUD.02.01', 'BUD.02.01.001', 'Wykładzina obiektowa',           'Wykładzina obiektowa klejona z listwami', 'm2'),
    ('BUD.02.02', 'BUD.02.02.001', 'Posadzka gresowa',               'Płytki gresowe z fugowaniem', 'm2'),
    ('BUD.02.03', 'BUD.02.03.001', 'Posadzka żywiczna',              'Posadzka epoksydowa z gruntem', 'm2'),
    ('BUD.03.01', 'BUD.03.01.001', 'Sufit podwieszany',              'Sufit podwieszany modułowy na stelażu', 'm2'),
    ('BUD.04.01', 'BUD.04.01.001', 'Drzwi wewnętrzne',              'Drzwi wewnętrzne pełne z ościeżnicą', 'szt'),
    ('BUD.04.02', 'BUD.04.02.001', 'Zabudowa meblowa',               'Zabudowa meblowa na wymiar', 'mb'),
    ('ELE.01.01', 'ELE.01.01.001', 'Punkt elektryczny',              'Kompletny punkt elektryczny z okablowaniem', 'szt'),
    ('ELE.01.02', 'ELE.01.02.001', 'Rozdzielnia elektryczna',        'Rozdzielnica z wyłącznikami', 'szt'),
    ('ELE.02.01', 'ELE.02.01.001', 'Gniazdka i wyłączniki',         'Osprzęt elektryczny z montażem', 'szt'),
    ('ELE.03.01', 'ELE.03.01.001', 'Panel LED 60x60',                'Panel oświetleniowy LED z zasilaczem', 'szt'),
    ('ELE.03.02', 'ELE.03.02.001', 'Oprawa dekoracyjna',             'Oprawa oświetleniowa dekoracyjna wisząca', 'szt'),
    ('SAN.01.01', 'SAN.01.01.001', 'Podejście wod-kan',             'Podejście wodno-kanalizacyjne', 'szt'),
    ('SAN.02.01', 'SAN.02.01.001', 'Umywalka kompletna',             'Umywalka z baterią i syfonem', 'kpl'),
    ('SAN.02.02', 'SAN.02.02.001', 'WC kompletne',                   'Miska WC z deską i stelażem', 'kpl'),
    ('SAN.03.01', 'SAN.03.01.001', 'Hydrant wewnętrzny',            'Hydrant wewnętrzny z szafką', 'szt'),
    ('SAN.03.02', 'SAN.03.02.001', 'Instalacja rur stalowych',       'Rury stalowe ocynkowane ze złączkami', 'mb')
  ) AS v(pelny_kod_kat, kod, nazwa, opis, jednostka)
  JOIN kategorie k ON k.pelny_kod = v.pelny_kod_kat AND k.organization_id = v_org_id
  ON CONFLICT DO NOTHING;

  -- biblioteka_skladowe_robocizna: 1 robocizna per pozycja
  INSERT INTO biblioteka_skladowe_robocizna (pozycja_biblioteka_id, lp, typ_robocizny_id, podwykonawca_id, cena)
  SELECT pb.id, 1, tr.id, pod.id, COALESCE(sp.stawka, 0)
  FROM (VALUES
    ('BUD.01.01.001', 'Montaz scianek g-k',                'BudMont Ekipa'),
    ('BUD.01.03.001', 'Montaz szkla',                       'BudMont Ekipa'),
    ('BUD.02.01.001', 'Ukladanie wykladdziny',              'FloorTeam'),
    ('BUD.02.02.001', 'Ukladanie gresu',                    'FloorTeam'),
    ('BUD.02.03.001', 'Aplikacja zywicy',                   'FloorTeam'),
    ('BUD.03.01.001', 'Montaz sufitu',                      'BudMont Ekipa'),
    ('BUD.04.01.001', 'Montaz drzwi',                       'BudMont Ekipa'),
    ('BUD.04.02.001', 'Montaz zabudowy',                    'BudMont Ekipa'),
    ('ELE.01.01.001', 'Instalacja punktu elektrycznego',    'ElektroPro'),
    ('ELE.01.02.001', 'Montaz rozdzielni',                  'ElektroPro'),
    ('ELE.02.01.001', 'Montaz osprzetu elektrycznego',      'ElektroPro'),
    ('ELE.03.01.001', 'Montaz panelu LED',                  'ElektroPro'),
    ('ELE.03.02.001', 'Montaz oprawy dekoracyjnej',         'ElektroPro'),
    ('SAN.01.01.001', 'Wykonanie podejscia wod-kan',        'AquaInstal'),
    ('SAN.02.01.001', 'Montaz umywalki',                    'AquaInstal'),
    ('SAN.02.02.001', 'Montaz WC',                          'AquaInstal'),
    ('SAN.03.01.001', 'Montaz hydrantu',                    'HydroProtect'),
    ('SAN.03.02.001', 'Montaz rury stalowej',               'HydroProtect')
  ) AS v(poz_kod, typ_rob_nazwa, podwyk_nazwa)
  JOIN pozycje_biblioteka pb ON pb.kod = v.poz_kod AND pb.organization_id = v_org_id
  JOIN typy_robocizny tr ON tr.nazwa = v.typ_rob_nazwa AND tr.organization_id = v_org_id
  JOIN podwykonawcy pod ON pod.nazwa = v.podwyk_nazwa AND pod.organization_id = v_org_id
  LEFT JOIN stawki_podwykonawcow sp ON sp.podwykonawca_id = pod.id AND sp.typ_robocizny_id = tr.id AND sp.aktywny = true
  ON CONFLICT DO NOTHING;

  -- biblioteka_skladowe_materialy: multiple materials per pozycja
  -- Each references primary supplier (cheapest) from ceny_dostawcow
  INSERT INTO biblioteka_skladowe_materialy (pozycja_biblioteka_id, lp, produkt_id, dostawca_id, norma_domyslna, jednostka)
  SELECT pb.id, v.lp, p.id, d.id, v.norma, v.jedn
  FROM (VALUES
    -- BUD.01.01.001 Ściany g-k: 5 materials
    ('BUD.01.01.001', 1, 'GK-PLYTA-125',    'MAT-BUD', 1.05, 'm2'),
    ('BUD.01.01.001', 2, 'GK-PROFIL-CW75',  'MAT-BUD', 0.80, 'mb'),
    ('BUD.01.01.001', 3, 'GK-PROFIL-UW75',  'MAT-BUD', 0.60, 'mb'),
    ('BUD.01.01.001', 4, 'GK-WELNA-75',     'MAT-BUD', 1.00, 'm2'),
    ('BUD.01.01.001', 5, 'GK-TASMA-SZ',     'MAT-BUD', 1.50, 'mb'),
    -- BUD.01.03.001 Ścianki szklane: 3 materials
    ('BUD.01.03.001', 1, 'SZ-SZKLO-10',     'MAT-BUD', 1.00, 'm2'),
    ('BUD.01.03.001', 2, 'SZ-PROFIL-AL',    'MAT-BUD', 2.50, 'mb'),
    ('BUD.01.03.001', 3, 'SZ-USZCZELKA',    'MAT-BUD', 3.00, 'mb'),
    -- BUD.02.01.001 Wykładzina: 3 materials
    ('BUD.02.01.001', 1, 'WYK-TARKETT',     'FLOOR-EX', 1.05, 'm2'),
    ('BUD.02.01.001', 2, 'WYK-KLEJ',        'FLOOR-EX', 0.35, 'kg'),
    ('BUD.02.01.001', 3, 'WYK-LISTWY',      'FLOOR-EX', 0.40, 'mb'),
    -- BUD.02.02.001 Gres: 3 materials
    ('BUD.02.02.001', 1, 'GR-PLYTKA-60',    'FLOOR-EX', 1.10, 'm2'),
    ('BUD.02.02.001', 2, 'GR-KLEJ',         'FLOOR-EX', 5.00, 'kg'),
    ('BUD.02.02.001', 3, 'GR-FUGA',         'FLOOR-EX', 0.50, 'kg'),
    -- BUD.02.03.001 Żywica: 2 materials
    ('BUD.02.03.001', 1, 'ZYW-EPOXY',       'FLOOR-EX', 1.50, 'kg'),
    ('BUD.02.03.001', 2, 'ZYW-GRUNT',       'FLOOR-EX', 0.30, 'kg'),
    -- BUD.03.01.001 Sufit: 4 materials
    ('BUD.03.01.001', 1, 'SUF-PLYTA-60',    'MAT-BUD', 1.05, 'm2'),
    ('BUD.03.01.001', 2, 'SUF-PROFIL-GL',   'MAT-BUD', 1.60, 'mb'),
    ('BUD.03.01.001', 3, 'SUF-PROFIL-PO',   'MAT-BUD', 1.60, 'mb'),
    ('BUD.03.01.001', 4, 'SUF-ZAWIESZKA',   'MAT-BUD', 2.00, 'szt'),
    -- BUD.04.01.001 Drzwi: 3 materials
    ('BUD.04.01.001', 1, 'DRZ-WEWN-80',     'STOLAR', 1.00, 'szt'),
    ('BUD.04.01.001', 2, 'DRZ-OSCIEZN',     'STOLAR', 1.00, 'szt'),
    ('BUD.04.01.001', 3, 'DRZ-KLAMKA',      'STOLAR', 1.00, 'szt'),
    -- BUD.04.02.001 Zabudowa: 3 materials
    ('BUD.04.02.001', 1, 'ZAB-PLYTA-18',    'STOLAR', 2.50, 'm2'),
    ('BUD.04.02.001', 2, 'ZAB-BLAT-28',     'STOLAR', 1.00, 'mb'),
    ('BUD.04.02.001', 3, 'ZAB-OKUCIA',      'STOLAR', 0.50, 'kpl'),
    -- ELE.01.01.001 Punkt elektryczny: 3 materials
    ('ELE.01.01.001', 1, 'EL-KABEL-YDY',    'ELEKTRO', 8.00, 'mb'),
    ('ELE.01.01.001', 2, 'EL-PUSZKA-PK',    'ELEKTRO', 1.00, 'szt'),
    ('ELE.01.01.001', 3, 'EL-RURA-RL',      'ELEKTRO', 4.00, 'mb'),
    -- ELE.01.02.001 Rozdzielnia: 2 materials
    ('ELE.01.02.001', 1, 'EL-ROZDZ-24',     'ELEKTRO', 1.00, 'szt'),
    ('ELE.01.02.001', 2, 'EL-WYLACZNIK-B16','ELEKTRO', 12.00, 'szt'),
    -- ELE.02.01.001 Gniazdka: 2 materials
    ('ELE.02.01.001', 1, 'EL-GNIAZDKO',     'ELEKTRO', 1.00, 'szt'),
    ('ELE.02.01.001', 2, 'EL-WYLACZNIK-SW', 'ELEKTRO', 1.00, 'szt'),
    -- ELE.03.01.001 Panel LED: 2 materials
    ('ELE.03.01.001', 1, 'LED-PANEL-60',    'ELEKTRO', 1.00, 'szt'),
    ('ELE.03.01.001', 2, 'LED-ZASILACZ',    'ELEKTRO', 1.00, 'szt'),
    -- ELE.03.02.001 Oprawa dekoracyjna: 1 material
    ('ELE.03.02.001', 1, 'LED-DEKO-WISZ',   'ELEKTRO', 1.00, 'szt'),
    -- SAN.01.01.001 Podejście wod-kan: 2 materials
    ('SAN.01.01.001', 1, 'SAN-RURA-PP',     'SANTECH', 3.00, 'mb'),
    ('SAN.01.01.001', 2, 'SAN-KOLANO-PP',   'SANTECH', 4.00, 'szt'),
    -- SAN.02.01.001 Umywalka: 3 materials
    ('SAN.02.01.001', 1, 'SAN-UMYW-NAB',    'SANTECH', 1.00, 'szt'),
    ('SAN.02.01.001', 2, 'SAN-BATERIA',     'SANTECH', 1.00, 'szt'),
    ('SAN.02.01.001', 3, 'SAN-SYFON',       'SANTECH', 1.00, 'szt'),
    -- SAN.02.02.001 WC: 3 materials
    ('SAN.02.02.001', 1, 'SAN-WC-MISK',     'SANTECH', 1.00, 'szt'),
    ('SAN.02.02.001', 2, 'SAN-WC-DESKA',    'SANTECH', 1.00, 'szt'),
    ('SAN.02.02.001', 3, 'SAN-STELAZ',      'SANTECH', 1.00, 'szt'),
    -- SAN.03.01.001 Hydrant: 2 materials
    ('SAN.03.01.001', 1, 'HYD-SZAFKA',      'HYDRO', 1.00, 'szt'),
    ('SAN.03.01.001', 2, 'HYD-WAZ-25',      'HYDRO', 1.00, 'szt'),
    -- SAN.03.02.001 Rury stalowe: 2 materials
    ('SAN.03.02.001', 1, 'SAN-RURA-ST',     'HYDRO', 1.00, 'mb'),
    ('SAN.03.02.001', 2, 'SAN-ZLACZKA',     'HYDRO', 2.00, 'szt')
  ) AS v(poz_kod, lp, produkt_sku, dostawca_kod, norma, jedn)
  JOIN pozycje_biblioteka pb ON pb.kod = v.poz_kod AND pb.organization_id = v_org_id
  JOIN produkty p ON p.sku = v.produkt_sku AND p.organization_id = v_org_id
  JOIN dostawcy d ON d.kod = v.dostawca_kod AND d.organization_id = v_org_id
  ON CONFLICT DO NOTHING;

END $$;
