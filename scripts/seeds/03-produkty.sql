-- 03-produkty.sql: Produkty (48) and Ceny dostawcow (96)
-- Depends on: 01-base.sql (organizations), 02-kontrahenci.sql (dostawcy)

DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Produkty (48)
  INSERT INTO produkty (organization_id, sku, nazwa, jednostka, kategoria) VALUES
    -- Sciany g-k (5)
    (v_org_id, 'GK-PLYTA-125', 'Plyta g-k 1200x2500x12.5mm', 'm2', 'Sciany g-k'),
    (v_org_id, 'GK-PROFIL-CW75', 'Profil CW 75 stalowy', 'mb', 'Sciany g-k'),
    (v_org_id, 'GK-PROFIL-UW75', 'Profil UW 75 stalowy', 'mb', 'Sciany g-k'),
    (v_org_id, 'GK-WELNA-75', 'Welna mineralna 75mm', 'm2', 'Sciany g-k'),
    (v_org_id, 'GK-TASMA-SZ', 'Tasma szpachlowa do g-k', 'mb', 'Sciany g-k'),
    -- Sciany szklane (3)
    (v_org_id, 'SZ-SZKLO-10', 'Szklo hartowane 10mm', 'm2', 'Sciany szklane'),
    (v_org_id, 'SZ-PROFIL-AL', 'Profil aluminiowy do szkla', 'mb', 'Sciany szklane'),
    (v_org_id, 'SZ-USZCZELKA', 'Uszczelka silikonowa do szkla', 'mb', 'Sciany szklane'),
    -- Wykladdziny (3)
    (v_org_id, 'WYK-TARKETT', 'Wykladdzina obiektowa Tarkett', 'm2', 'Wykladdziny'),
    (v_org_id, 'WYK-KLEJ', 'Klej do wykladdzin', 'kg', 'Wykladdziny'),
    (v_org_id, 'WYK-LISTWY', 'Listwy przypodlogowe PVC', 'mb', 'Wykladdziny'),
    -- Gres (3)
    (v_org_id, 'GR-PLYTKA-60', 'Plytka gresowa 60x60', 'm2', 'Gres'),
    (v_org_id, 'GR-KLEJ', 'Klej do gresu elastyczny', 'kg', 'Gres'),
    (v_org_id, 'GR-FUGA', 'Fuga epoksydowa', 'kg', 'Gres'),
    -- Zywica (2)
    (v_org_id, 'ZYW-EPOXY', 'Zywica epoksydowa podlogowa', 'kg', 'Zywica'),
    (v_org_id, 'ZYW-GRUNT', 'Grunt pod zywice', 'kg', 'Zywica'),
    -- Sufity (4)
    (v_org_id, 'SUF-PLYTA-60', 'Plyta sufitowa mineralna 600x600', 'm2', 'Sufity'),
    (v_org_id, 'SUF-PROFIL-GL', 'Profil glowny sufitowy T24', 'mb', 'Sufity'),
    (v_org_id, 'SUF-PROFIL-PO', 'Profil poprzeczny sufitowy T24', 'mb', 'Sufity'),
    (v_org_id, 'SUF-ZAWIESZKA', 'Zawieszka regulowana do sufitu', 'szt', 'Sufity'),
    -- Drzwi (3)
    (v_org_id, 'DRZ-WEWN-80', 'Drzwi wewnetrzne 80cm pelne', 'szt', 'Drzwi'),
    (v_org_id, 'DRZ-OSCIEZN', 'Oscieznica regulowana', 'szt', 'Drzwi'),
    (v_org_id, 'DRZ-KLAMKA', 'Klamka drzwiowa chromowana', 'szt', 'Drzwi'),
    -- Zabudowy (3)
    (v_org_id, 'ZAB-PLYTA-18', 'Plyta meblowa laminowana 18mm', 'm2', 'Zabudowy'),
    (v_org_id, 'ZAB-BLAT-28', 'Blat roboczy 28mm', 'mb', 'Zabudowy'),
    (v_org_id, 'ZAB-OKUCIA', 'Okucia meblowe komplet', 'kpl', 'Zabudowy'),
    -- Elektro punkty (3)
    (v_org_id, 'EL-KABEL-YDY', 'Kabel YDYp 3x2.5', 'mb', 'Elektro punkty'),
    (v_org_id, 'EL-PUSZKA-PK', 'Puszka podtynkowa PK-60', 'szt', 'Elektro punkty'),
    (v_org_id, 'EL-RURA-RL', 'Rura elektroinstalacyjna RL 20', 'mb', 'Elektro punkty'),
    -- Rozdzielnie (2)
    (v_org_id, 'EL-ROZDZ-24', 'Rozdzielnica natynkowa 24-mod', 'szt', 'Rozdzielnie'),
    (v_org_id, 'EL-WYLACZNIK-B16', 'Wylacznik nadpradowy B16', 'szt', 'Rozdzielnie'),
    -- Osprzet (2)
    (v_org_id, 'EL-GNIAZDKO', 'Gniazdko podwojne z uziemieniem', 'szt', 'Osprzet'),
    (v_org_id, 'EL-WYLACZNIK-SW', 'Wylacznik swiatla pojedynczy', 'szt', 'Osprzet'),
    -- LED (2)
    (v_org_id, 'LED-PANEL-60', 'Panel LED 60x60 40W', 'szt', 'LED'),
    (v_org_id, 'LED-ZASILACZ', 'Zasilacz LED 40W', 'szt', 'LED'),
    -- Dekoracyjne (1)
    (v_org_id, 'LED-DEKO-WISZ', 'Oprawa dekoracyjna wiszaca', 'szt', 'Dekoracyjne'),
    -- Podejscia (2)
    (v_org_id, 'SAN-RURA-PP', 'Rura PP-R 20mm', 'mb', 'Podejscia'),
    (v_org_id, 'SAN-KOLANO-PP', 'Kolano PP-R 20mm 90st', 'szt', 'Podejscia'),
    -- Umywalki (3)
    (v_org_id, 'SAN-UMYW-NAB', 'Umywalka nablatowa ceramiczna', 'szt', 'Umywalki'),
    (v_org_id, 'SAN-BATERIA', 'Bateria umywalkowa stojaca', 'szt', 'Umywalki'),
    (v_org_id, 'SAN-SYFON', 'Syfon umywalkowy chromowany', 'szt', 'Umywalki'),
    -- WC (3)
    (v_org_id, 'SAN-WC-MISK', 'Miska WC wisząca ceramiczna', 'szt', 'WC'),
    (v_org_id, 'SAN-WC-DESKA', 'Deska WC wolnoopadajaca', 'szt', 'WC'),
    (v_org_id, 'SAN-STELAZ', 'Stelaz podtynkowy WC', 'szt', 'WC'),
    -- Hydranty (2)
    (v_org_id, 'HYD-SZAFKA', 'Szafka hydrantowa naścienna', 'szt', 'Hydranty'),
    (v_org_id, 'HYD-WAZ-25', 'Waz hydrantowy DN25 20m', 'szt', 'Hydranty'),
    -- Rury stalowe (2)
    (v_org_id, 'SAN-RURA-ST', 'Rura stalowa ocynkowana DN25', 'mb', 'Rury stalowe'),
    (v_org_id, 'SAN-ZLACZKA', 'Zlaczka gwintowana DN25', 'szt', 'Rury stalowe')
  ON CONFLICT DO NOTHING;

END $$;

-- Ceny dostawcow (96 = 48 produktow x 2 ceny kazdy)
-- Pattern: each product has 2 suppliers with prices
-- Primary supplier is cheaper, secondary is ~10-20% more expensive

INSERT INTO ceny_dostawcow (dostawca_id, produkt_id, cena_netto)
SELECT d.id, p.id, v.cena
FROM (VALUES
  -- Sciany g-k: MAT-BUD (primary), STOLAR (secondary)
  ('MAT-BUD', 'GK-PLYTA-125', 28.50),
  ('STOLAR',  'GK-PLYTA-125', 32.00),
  ('MAT-BUD', 'GK-PROFIL-CW75', 8.90),
  ('STOLAR',  'GK-PROFIL-CW75', 10.20),
  ('MAT-BUD', 'GK-PROFIL-UW75', 7.50),
  ('STOLAR',  'GK-PROFIL-UW75', 8.80),
  ('MAT-BUD', 'GK-WELNA-75', 18.00),
  ('STOLAR',  'GK-WELNA-75', 21.00),
  ('MAT-BUD', 'GK-TASMA-SZ', 1.20),
  ('STOLAR',  'GK-TASMA-SZ', 1.50),

  -- Sciany szklane: MAT-BUD (primary), STOLAR (secondary)
  ('MAT-BUD', 'SZ-SZKLO-10', 320.00),
  ('STOLAR',  'SZ-SZKLO-10', 365.00),
  ('MAT-BUD', 'SZ-PROFIL-AL', 45.00),
  ('STOLAR',  'SZ-PROFIL-AL', 52.00),
  ('MAT-BUD', 'SZ-USZCZELKA', 8.50),
  ('STOLAR',  'SZ-USZCZELKA', 9.90),

  -- Wykladdziny: FLOOR-EX (primary), MAT-BUD (secondary)
  ('FLOOR-EX', 'WYK-TARKETT', 85.00),
  ('MAT-BUD',  'WYK-TARKETT', 95.00),
  ('FLOOR-EX', 'WYK-KLEJ', 12.00),
  ('MAT-BUD',  'WYK-KLEJ', 14.50),
  ('FLOOR-EX', 'WYK-LISTWY', 6.50),
  ('MAT-BUD',  'WYK-LISTWY', 7.80),

  -- Gres: FLOOR-EX (primary), MAT-BUD (secondary)
  ('FLOOR-EX', 'GR-PLYTKA-60', 65.00),
  ('MAT-BUD',  'GR-PLYTKA-60', 75.00),
  ('FLOOR-EX', 'GR-KLEJ', 3.80),
  ('MAT-BUD',  'GR-KLEJ', 4.50),
  ('FLOOR-EX', 'GR-FUGA', 22.00),
  ('MAT-BUD',  'GR-FUGA', 25.00),

  -- Zywica: FLOOR-EX (primary), MAT-BUD (secondary)
  ('FLOOR-EX', 'ZYW-EPOXY', 48.00),
  ('MAT-BUD',  'ZYW-EPOXY', 55.00),
  ('FLOOR-EX', 'ZYW-GRUNT', 28.00),
  ('MAT-BUD',  'ZYW-GRUNT', 32.00),

  -- Sufity: MAT-BUD (primary), STOLAR (secondary)
  ('MAT-BUD', 'SUF-PLYTA-60', 22.00),
  ('STOLAR',  'SUF-PLYTA-60', 26.00),
  ('MAT-BUD', 'SUF-PROFIL-GL', 9.50),
  ('STOLAR',  'SUF-PROFIL-GL', 11.00),
  ('MAT-BUD', 'SUF-PROFIL-PO', 6.80),
  ('STOLAR',  'SUF-PROFIL-PO', 7.90),
  ('MAT-BUD', 'SUF-ZAWIESZKA', 2.50),
  ('STOLAR',  'SUF-ZAWIESZKA', 3.10),

  -- Drzwi: STOLAR (primary), MAT-BUD (secondary)
  ('STOLAR',  'DRZ-WEWN-80', 450.00),
  ('MAT-BUD', 'DRZ-WEWN-80', 520.00),
  ('STOLAR',  'DRZ-OSCIEZN', 180.00),
  ('MAT-BUD', 'DRZ-OSCIEZN', 210.00),
  ('STOLAR',  'DRZ-KLAMKA', 65.00),
  ('MAT-BUD', 'DRZ-KLAMKA', 78.00),

  -- Zabudowy: STOLAR (primary), MAT-BUD (secondary)
  ('STOLAR',  'ZAB-PLYTA-18', 42.00),
  ('MAT-BUD', 'ZAB-PLYTA-18', 48.00),
  ('STOLAR',  'ZAB-BLAT-28', 120.00),
  ('MAT-BUD', 'ZAB-BLAT-28', 140.00),
  ('STOLAR',  'ZAB-OKUCIA', 85.00),
  ('MAT-BUD', 'ZAB-OKUCIA', 98.00),

  -- Elektro punkty: ELEKTRO (primary), MAT-BUD (secondary)
  ('ELEKTRO', 'EL-KABEL-YDY', 4.20),
  ('MAT-BUD', 'EL-KABEL-YDY', 5.00),
  ('ELEKTRO', 'EL-PUSZKA-PK', 2.80),
  ('MAT-BUD', 'EL-PUSZKA-PK', 3.40),
  ('ELEKTRO', 'EL-RURA-RL', 1.90),
  ('MAT-BUD', 'EL-RURA-RL', 2.30),

  -- Rozdzielnie: ELEKTRO (primary), MAT-BUD (secondary)
  ('ELEKTRO', 'EL-ROZDZ-24', 280.00),
  ('MAT-BUD', 'EL-ROZDZ-24', 320.00),
  ('ELEKTRO', 'EL-WYLACZNIK-B16', 18.50),
  ('MAT-BUD', 'EL-WYLACZNIK-B16', 22.00),

  -- Osprzet: ELEKTRO (primary), MAT-BUD (secondary)
  ('ELEKTRO', 'EL-GNIAZDKO', 24.00),
  ('MAT-BUD', 'EL-GNIAZDKO', 28.00),
  ('ELEKTRO', 'EL-WYLACZNIK-SW', 18.00),
  ('MAT-BUD', 'EL-WYLACZNIK-SW', 22.00),

  -- LED: ELEKTRO (primary), MAT-BUD (secondary)
  ('ELEKTRO', 'LED-PANEL-60', 85.00),
  ('MAT-BUD', 'LED-PANEL-60', 98.00),
  ('ELEKTRO', 'LED-ZASILACZ', 35.00),
  ('MAT-BUD', 'LED-ZASILACZ', 42.00),

  -- Dekoracyjne: ELEKTRO (primary), MAT-BUD (secondary)
  ('ELEKTRO', 'LED-DEKO-WISZ', 320.00),
  ('MAT-BUD', 'LED-DEKO-WISZ', 370.00),

  -- Podejscia: SANTECH (primary), HYDRO (secondary)
  ('SANTECH', 'SAN-RURA-PP', 5.80),
  ('HYDRO',   'SAN-RURA-PP', 6.90),
  ('SANTECH', 'SAN-KOLANO-PP', 3.20),
  ('HYDRO',   'SAN-KOLANO-PP', 3.80),

  -- Umywalki: SANTECH (primary), HYDRO (secondary)
  ('SANTECH', 'SAN-UMYW-NAB', 380.00),
  ('HYDRO',   'SAN-UMYW-NAB', 430.00),
  ('SANTECH', 'SAN-BATERIA', 220.00),
  ('HYDRO',   'SAN-BATERIA', 255.00),
  ('SANTECH', 'SAN-SYFON', 35.00),
  ('HYDRO',   'SAN-SYFON', 42.00),

  -- WC: SANTECH (primary), HYDRO (secondary)
  ('SANTECH', 'SAN-WC-MISK', 520.00),
  ('HYDRO',   'SAN-WC-MISK', 590.00),
  ('SANTECH', 'SAN-WC-DESKA', 120.00),
  ('HYDRO',   'SAN-WC-DESKA', 140.00),
  ('SANTECH', 'SAN-STELAZ', 650.00),
  ('HYDRO',   'SAN-STELAZ', 740.00),

  -- Hydranty: HYDRO (primary), SANTECH (secondary)
  ('HYDRO',   'HYD-SZAFKA', 480.00),
  ('SANTECH', 'HYD-SZAFKA', 550.00),
  ('HYDRO',   'HYD-WAZ-25', 180.00),
  ('SANTECH', 'HYD-WAZ-25', 210.00),

  -- Rury stalowe: HYDRO (primary), SANTECH (secondary)
  ('HYDRO',   'SAN-RURA-ST', 32.00),
  ('SANTECH', 'SAN-RURA-ST', 38.00),
  ('HYDRO',   'SAN-ZLACZKA', 12.00),
  ('SANTECH', 'SAN-ZLACZKA', 14.50)
) AS v(dostawca_kod, produkt_sku, cena)
JOIN dostawcy d ON d.kod = v.dostawca_kod
JOIN produkty p ON p.sku = v.produkt_sku
ON CONFLICT DO NOTHING;
