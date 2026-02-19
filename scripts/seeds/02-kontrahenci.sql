-- 02-kontrahenci.sql: Dostawcy, Podwykonawcy, Stawki podwykonawcow
-- Depends on: 01-base.sql (organizations, typy_robocizny)

DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Dostawcy (6)
  INSERT INTO dostawcy (organization_id, nazwa, kod, kontakt) VALUES
    (v_org_id, 'MAT-BUD Hurtownia', 'MAT-BUD', 'Jan Kowalski 500-100-200'),
    (v_org_id, 'FLOOR-EX', 'FLOOR-EX', 'Anna Nowak 500-200-300'),
    (v_org_id, 'ELEKTRO Hurtownia', 'ELEKTRO', 'Piotr Zielinski 500-300-400'),
    (v_org_id, 'SANTECH Materialy', 'SANTECH', 'Maria Wisniewska 500-400-500'),
    (v_org_id, 'HYDRO-Parts', 'HYDRO', 'Adam Mazur 500-500-600'),
    (v_org_id, 'STOLAR-BUD', 'STOLAR', 'Ewa Dabrowska 500-600-700')
  ON CONFLICT DO NOTHING;

  -- Podwykonawcy (5)
  INSERT INTO podwykonawcy (organization_id, nazwa, specjalizacja, kontakt) VALUES
    (v_org_id, 'BudMont Ekipa', 'Prace budowlane ogolne', 'Tomasz Budny 600-100-200'),
    (v_org_id, 'FloorTeam', 'Posadzki i podlogi', 'Marek Podloga 600-200-300'),
    (v_org_id, 'ElektroPro', 'Instalacje elektryczne', 'Janusz Elektryk 600-300-400'),
    (v_org_id, 'AquaInstal', 'Instalacje sanitarne', 'Krzysztof Hydraulik 600-400-500'),
    (v_org_id, 'HydroProtect', 'Hydranty i instalacje ppoz', 'Robert Strazak 600-500-600')
  ON CONFLICT DO NOTHING;

END $$;

-- Stawki podwykonawcow (18) - linked via typ_robocizny_id
INSERT INTO stawki_podwykonawcow (podwykonawca_id, typ_robocizny_id, stawka, aktywny)
SELECT pod.id, tr.id, v.stawka, true
FROM (VALUES
  -- BudMont Ekipa (5 stawek)
  ('BudMont Ekipa', 'Montaz scianek g-k', 45.0),
  ('BudMont Ekipa', 'Montaz szkla', 55.0),
  ('BudMont Ekipa', 'Montaz sufitu', 42.0),
  ('BudMont Ekipa', 'Montaz drzwi', 45.0),
  ('BudMont Ekipa', 'Montaz zabudowy', 50.0),
  -- FloorTeam (3 stawki)
  ('FloorTeam', 'Ukladanie wykladdziny', 40.0),
  ('FloorTeam', 'Ukladanie gresu', 50.0),
  ('FloorTeam', 'Aplikacja zywicy', 55.0),
  -- ElektroPro (5 stawek)
  ('ElektroPro', 'Instalacja punktu elektrycznego', 55.0),
  ('ElektroPro', 'Montaz rozdzielni', 65.0),
  ('ElektroPro', 'Montaz osprzetu elektrycznego', 50.0),
  ('ElektroPro', 'Montaz panelu LED', 50.0),
  ('ElektroPro', 'Montaz oprawy dekoracyjnej', 55.0),
  -- AquaInstal (3 stawki)
  ('AquaInstal', 'Wykonanie podejscia wod-kan', 60.0),
  ('AquaInstal', 'Montaz umywalki', 55.0),
  ('AquaInstal', 'Montaz WC', 55.0),
  -- HydroProtect (2 stawki)
  ('HydroProtect', 'Montaz hydrantu', 65.0),
  ('HydroProtect', 'Montaz rury stalowej', 65.0)
) AS v(podwykonawca_nazwa, typ_robocizny_nazwa, stawka)
JOIN podwykonawcy pod ON pod.nazwa = v.podwykonawca_nazwa
JOIN typy_robocizny tr ON tr.nazwa = v.typ_robocizny_nazwa
ON CONFLICT DO NOTHING;
