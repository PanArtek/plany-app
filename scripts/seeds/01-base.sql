-- 01-base.sql: Organization, categories, narzuty, typy_robocizny
-- Depends on: 00-clean.sql

INSERT INTO organizations (nazwa, slug)
VALUES ('Demo Fit-Out Sp. z o.o.', 'demo-fit-out')
ON CONFLICT DO NOTHING;

DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Branze (poziom 1)
  INSERT INTO kategorie (organization_id, kod, nazwa, poziom, pelny_kod) VALUES
    (v_org_id, 'BUD', 'Budowlanka', 1, 'BUD'),
    (v_org_id, 'ELE', 'Elektryka', 1, 'ELE'),
    (v_org_id, 'SAN', 'Sanitarka', 1, 'SAN')
  ON CONFLICT DO NOTHING;

  -- Kategorie (poziom 2)
  INSERT INTO kategorie (organization_id, kod, nazwa, poziom, parent_id, pelny_kod)
  SELECT v_org_id, v.kod, v.nazwa, 2, k.id, k.kod || '.' || v.kod
  FROM (VALUES
    ('BUD', '01', 'Ściany'),
    ('BUD', '02', 'Podłogi'),
    ('BUD', '03', 'Sufity'),
    ('BUD', '04', 'Zabudowy'),
    ('ELE', '01', 'Instalacje'),
    ('ELE', '02', 'Osprzęt'),
    ('ELE', '03', 'Oświetlenie'),
    ('SAN', '01', 'Instalacje wod-kan'),
    ('SAN', '02', 'Wyposażenie sanitarne'),
    ('SAN', '03', 'Hydranty'),
    ('SAN', '04', 'Rury')
  ) AS v(branza, kod, nazwa)
  JOIN kategorie k ON k.kod = v.branza AND k.poziom = 1 AND k.organization_id = v_org_id
  ON CONFLICT DO NOTHING;

  -- Podkategorie (poziom 3)
  INSERT INTO kategorie (organization_id, kod, nazwa, poziom, parent_id, pelny_kod)
  SELECT v_org_id, v.kod, v.nazwa, 3, k2.id, k2.pelny_kod || '.' || v.kod
  FROM (VALUES
    ('BUD', '01', '01', 'Gipsowo-kartonowe'),
    ('BUD', '01', '02', 'Murowane'),
    ('BUD', '01', '03', 'Szklane'),
    ('BUD', '02', '01', 'Wykładziny'),
    ('BUD', '02', '02', 'Gres/Terakota'),
    ('BUD', '02', '03', 'Żywica'),
    ('BUD', '03', '01', 'Podwieszane'),
    ('BUD', '04', '01', 'Drzwi'),
    ('BUD', '04', '02', 'Meble'),
    ('ELE', '01', '01', 'Punkty elektryczne'),
    ('ELE', '01', '02', 'Rozdzielnie'),
    ('ELE', '02', '01', 'Gniazdka i wyłączniki'),
    ('ELE', '03', '01', 'LED panele'),
    ('ELE', '03', '02', 'Dekoracyjne'),
    ('SAN', '01', '01', 'Podejścia'),
    ('SAN', '02', '01', 'Umywalki'),
    ('SAN', '02', '02', 'WC'),
    ('SAN', '03', '01', 'Hydranty wewnętrzne'),
    ('SAN', '03', '02', 'Rury stalowe'),
    ('SAN', '04', '01', 'Stalowe ocynkowane'),
    ('SAN', '04', '02', 'PVC')
  ) AS v(branza, kat_kod, kod, nazwa)
  JOIN kategorie k2 ON k2.pelny_kod = v.branza || '.' || v.kat_kod AND k2.poziom = 2 AND k2.organization_id = v_org_id
  ON CONFLICT DO NOTHING;

  -- Narzuty domyslne
  INSERT INTO narzuty_domyslne (organization_id, branza_kod, narzut_percent) VALUES
    (v_org_id, 'BUD', 30),
    (v_org_id, 'ELE', 25),
    (v_org_id, 'SAN', 28)
  ON CONFLICT DO NOTHING;

  -- Typy robocizny (18)
  INSERT INTO typy_robocizny (organization_id, nazwa, jednostka, opis) VALUES
    (v_org_id, 'Montaz scianek g-k', 'm2', 'Montaz scian z plyt gipsowo-kartonowych na profilach'),
    (v_org_id, 'Montaz szkla', 'm2', 'Montaz scianek szklanych hartowanych'),
    (v_org_id, 'Ukladanie wykladdziny', 'm2', 'Ukladanie wykladdzin obiektowych z klejeniem'),
    (v_org_id, 'Ukladanie gresu', 'm2', 'Ukladanie plytek gresowych z fugowaniem'),
    (v_org_id, 'Aplikacja zywicy', 'm2', 'Aplikacja posadzki zywicznej epoksydowej'),
    (v_org_id, 'Montaz sufitu', 'm2', 'Montaz sufitow podwieszanych modulowych'),
    (v_org_id, 'Montaz drzwi', 'szt', 'Montaz drzwi wewnetrznych z oscieznica'),
    (v_org_id, 'Montaz zabudowy', 'mb', 'Montaz zabudow meblowych'),
    (v_org_id, 'Instalacja punktu elektrycznego', 'szt', 'Kompletna instalacja punktu elektrycznego'),
    (v_org_id, 'Montaz rozdzielni', 'szt', 'Montaz i podlaczenie rozdzielni elektrycznej'),
    (v_org_id, 'Montaz osprzetu elektrycznego', 'szt', 'Montaz gniazdek, wylacznikow z ramkami'),
    (v_org_id, 'Montaz panelu LED', 'szt', 'Montaz paneli oswietleniowych LED'),
    (v_org_id, 'Montaz oprawy dekoracyjnej', 'szt', 'Montaz opraw dekoracyjnych wiszacych'),
    (v_org_id, 'Wykonanie podejscia wod-kan', 'szt', 'Wykonanie podejscia wodno-kanalizacyjnego'),
    (v_org_id, 'Montaz umywalki', 'kpl', 'Montaz umywalki z bateria i syfonem'),
    (v_org_id, 'Montaz WC', 'kpl', 'Montaz miski WC z deska i spluczka'),
    (v_org_id, 'Montaz hydrantu', 'szt', 'Montaz hydrantu wewnetrznego z szafka'),
    (v_org_id, 'Montaz rury stalowej', 'mb', 'Montaz instalacji stalowej ocynkowanej')
  ON CONFLICT DO NOTHING;

END $$;
