-- Systemowe kategorie (organization_id = NULL)
INSERT INTO kategorie (organization_id, kod, pelny_kod, nazwa, poziom) VALUES
    (NULL, 'BUD', 'BUD', 'Budowlane', 1),
    (NULL, 'ELE', 'ELE', 'Elektryczne', 1),
    (NULL, 'SAN', 'SAN', 'Sanitarne', 1),
    (NULL, 'TEL', 'TEL', 'Teletechniczne', 1),
    (NULL, 'HVC', 'HVC', 'HVAC', 1);

-- Podkategorie BUD (przykład)
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '01', 'Prace rozbiórkowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '02', 'Prace murowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '03', 'Prace wykończeniowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
