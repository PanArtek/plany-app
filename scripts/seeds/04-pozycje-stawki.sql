-- 04-pozycje-stawki.sql
-- Insert stawki_podwykonawcow for all 18 library positions
-- Depends on: 02-kontrahenci.sql (podwykonawcy), 04-pozycje.sql (pozycje_biblioteka)

INSERT INTO stawki_podwykonawcow (podwykonawca_id, pozycja_biblioteka_id, stawka, aktywny)
SELECT pod.id, pb.id, v.stawka, true
FROM (VALUES
  ('BUD.01.01.001', 'BudMont Ekipa', 45.0),
  ('BUD.01.03.001', 'BudMont Ekipa', 55.0),
  ('BUD.02.01.001', 'FloorTeam', 40.0),
  ('BUD.02.02.001', 'FloorTeam', 50.0),
  ('BUD.02.03.001', 'FloorTeam', 55.0),
  ('BUD.03.01.001', 'BudMont Ekipa', 42.0),
  ('BUD.04.01.001', 'BudMont Ekipa', 45.0),
  ('BUD.04.02.001', 'BudMont Ekipa', 50.0),
  ('ELE.01.01.001', 'ElektroPro', 55.0),
  ('ELE.01.02.001', 'ElektroPro', 65.0),
  ('ELE.02.01.001', 'ElektroPro', 50.0),
  ('ELE.03.01.001', 'ElektroPro', 50.0),
  ('ELE.03.02.001', 'ElektroPro', 55.0),
  ('SAN.01.01.001', 'AquaInstal', 60.0),
  ('SAN.02.01.001', 'AquaInstal', 55.0),
  ('SAN.02.02.001', 'AquaInstal', 55.0),
  ('SAN.03.01.001', 'HydroProtect', 65.0),
  ('SAN.03.02.001', 'HydroProtect', 65.0)
) AS v(pozycja_kod, podwykonawca_nazwa, stawka)
JOIN pozycje_biblioteka pb ON pb.kod = v.pozycja_kod
JOIN podwykonawcy pod ON pod.nazwa = v.podwykonawca_nazwa
ON CONFLICT DO NOTHING;
