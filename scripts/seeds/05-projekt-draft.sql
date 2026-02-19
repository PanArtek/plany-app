-- US-006: DRAFT project — Restauracja 'Smaczna' (150m²)

DO $$
DECLARE
  v_org_id UUID;
  v_projekt_id UUID;
  v_rewizja_id UUID;
BEGIN
  -- Get organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-fit-out';

  -- Create project
  INSERT INTO projekty (organization_id, nazwa, slug, klient, adres, powierzchnia, notatki)
  VALUES (v_org_id, 'Fit-out restauracja Smaczna', 'restauracja-smaczna', 'Gastro Group Sp. z o.o.', 'ul. Marszałkowska 45, 00-042 Warszawa', 150, 'Nowa restauracja w kamienicy. Kuchnia otwarta, 60 miejsc.')
  RETURNING id INTO v_projekt_id;

  -- Create revision 0 (unlocked, still being edited)
  INSERT INTO rewizje (projekt_id, numer, nazwa, is_locked)
  VALUES (v_projekt_id, 0, 'Wycena wstępna', false)
  RETURNING id INTO v_rewizja_id;

  -- Insert 8 kosztorys_pozycje
  INSERT INTO kosztorys_pozycje (organization_id, rewizja_id, pozycja_biblioteka_id, lp, nazwa, ilosc, jednostka, narzut_percent, notatki)
  SELECT v_org_id, v_rewizja_id, pb.id, v.lp, pb.nazwa, v.ilosc, pb.jednostka, v.narzut, v.notatki
  FROM (VALUES
    (1, 'BUD.01.01.001', 80, 30, 'Ściany g-k sali i zaplecza'),
    (2, 'BUD.02.02.001', 95, 30, 'Gres kuchnia + łazienki'),
    (3, 'BUD.02.03.001', 55, 30, 'Żywica sala restauracyjna'),
    (4, 'BUD.03.01.001', 120, 30, 'Sufit podwieszany cała restauracja'),
    (5, 'BUD.04.01.001', 6, 30, 'Drzwi (kuchnia, toalety, zaplecze)'),
    (6, 'ELE.01.01.001', 24, 25, 'Punkty elektryczne'),
    (7, 'ELE.03.01.001', 18, 25, 'Panele LED kuchnia + zaplecze'),
    (8, 'SAN.01.01.001', 8, 28, 'Podejścia wod-kan')
  ) AS v(lp, kod, ilosc, narzut, notatki)
  JOIN pozycje_biblioteka pb ON pb.kod = v.kod AND pb.organization_id = v_org_id;

  -- Copy robocizna from library
  INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, typ_robocizny_id, podwykonawca_id, cena)
  SELECT kp.id, br.lp, br.typ_robocizny_id, br.podwykonawca_id,
    COALESCE(sp.stawka, 0)
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_robocizna br ON br.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN stawki_podwykonawcow sp ON sp.typ_robocizny_id = br.typ_robocizny_id AND sp.podwykonawca_id = br.podwykonawca_id AND sp.aktywny = true
  WHERE kp.rewizja_id = v_rewizja_id;

  -- Copy materialy from library (with active supplier price)
  INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, produkt_id, dostawca_id, cena, norma, jednostka)
  SELECT kp.id, bm.lp, bm.produkt_id, bm.dostawca_id,
    COALESCE(cd.cena_netto, 0),
    bm.norma_domyslna, bm.jednostka
  FROM kosztorys_pozycje kp
  JOIN biblioteka_skladowe_materialy bm ON bm.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
  LEFT JOIN ceny_dostawcow cd ON cd.produkt_id = bm.produkt_id AND cd.dostawca_id = bm.dostawca_id AND cd.aktywny = true
  WHERE kp.rewizja_id = v_rewizja_id;

END $$;
