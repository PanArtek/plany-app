-- ============================================
-- Sample Data: 5 kategorie per branża, 2-3 podkategorie each, 50 pozycje per branża
-- Total: 25 kategorie (level 2), ~60 podkategorie (level 3), 250 pozycje
-- ============================================

DO $$
BEGIN
  -- Safety: skip if already seeded
  IF EXISTS (SELECT 1 FROM pozycje_biblioteka WHERE kod = 'BUD.01.01.001' AND organization_id IS NULL) THEN
    RAISE NOTICE 'Sample data already exists, skipping';
    RETURN;
  END IF;

  -- ========================================
  -- KATEGORIE LEVEL 2
  -- BUD.01-03 already exist from 010_seed.sql
  -- ========================================
  INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
  SELECT NULL, k.id, v.kod, v.nazwa, 2
  FROM (VALUES
    ('BUD', '04', 'Posadzki'),
    ('BUD', '05', 'Sufity'),
    ('ELE', '01', 'Instalacje siłowe'),
    ('ELE', '02', 'Oświetlenie'),
    ('ELE', '03', 'Rozdzielnice i zabezpieczenia'),
    ('ELE', '04', 'Okablowanie'),
    ('ELE', '05', 'Osprzęt elektroinstalacyjny'),
    ('SAN', '01', 'Instalacja wodna'),
    ('SAN', '02', 'Kanalizacja'),
    ('SAN', '03', 'Wyposażenie sanitarne'),
    ('SAN', '04', 'Ogrzewanie'),
    ('SAN', '05', 'Instalacja p.poż'),
    ('TEL', '01', 'Okablowanie strukturalne'),
    ('TEL', '02', 'Sieci LAN'),
    ('TEL', '03', 'Systemy AV'),
    ('TEL', '04', 'Kontrola dostępu'),
    ('TEL', '05', 'Monitoring CCTV'),
    ('HVC', '01', 'Klimatyzacja'),
    ('HVC', '02', 'Wentylacja'),
    ('HVC', '03', 'Kanały wentylacyjne'),
    ('HVC', '04', 'Centrale wentylacyjne'),
    ('HVC', '05', 'Automatyka BMS')
  ) AS v(parent_kod, kod, nazwa)
  JOIN kategorie k ON k.pelny_kod = v.parent_kod AND k.organization_id IS NULL;

  -- ========================================
  -- KATEGORIE LEVEL 3 (podkategorie)
  -- ========================================
  INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
  SELECT NULL, k.id, v.kod, v.nazwa, 3
  FROM (VALUES
    -- BUD
    ('BUD.01', '01', 'Rozbiórka ścian'),
    ('BUD.01', '02', 'Rozbiórka posadzek'),
    ('BUD.01', '03', 'Rozbiórka sufitów'),
    ('BUD.02', '01', 'Ścianki działowe GK'),
    ('BUD.02', '02', 'Ścianki systemowe'),
    ('BUD.03', '01', 'Tynkowanie i gładzie'),
    ('BUD.03', '02', 'Malowanie'),
    ('BUD.03', '03', 'Okładziny ścienne'),
    ('BUD.04', '01', 'Wylewki i przygotowanie'),
    ('BUD.04', '02', 'Wykładziny i panele'),
    ('BUD.04', '03', 'Płytki i kamień'),
    ('BUD.05', '01', 'Sufity podwieszane systemowe'),
    ('BUD.05', '02', 'Sufity z płyt GK'),
    -- ELE
    ('ELE.01', '01', 'Gniazda elektryczne'),
    ('ELE.01', '02', 'Obwody dedykowane'),
    ('ELE.02', '01', 'Oprawy oświetleniowe'),
    ('ELE.02', '02', 'Oświetlenie awaryjne'),
    ('ELE.02', '03', 'Sterowanie oświetleniem'),
    ('ELE.03', '01', 'Rozdzielnice'),
    ('ELE.03', '02', 'Zabezpieczenia i aparatura'),
    ('ELE.04', '01', 'Trasy kablowe'),
    ('ELE.04', '02', 'Przewody i kable'),
    ('ELE.05', '01', 'Łączniki i gniazda danych'),
    ('ELE.05', '02', 'Czujniki i automatyka'),
    ('ELE.05', '03', 'Uziemienie i połączenia wyrównawcze'),
    -- SAN
    ('SAN.01', '01', 'Rury i podejścia'),
    ('SAN.01', '02', 'Zawory i armatura'),
    ('SAN.02', '01', 'Rury kanalizacyjne'),
    ('SAN.02', '02', 'Wpusty i odwodnienia'),
    ('SAN.03', '01', 'Umywalki i zlewy'),
    ('SAN.03', '02', 'WC i pisuary'),
    ('SAN.03', '03', 'Baterie i akcesoria'),
    ('SAN.04', '01', 'Grzejniki'),
    ('SAN.04', '02', 'Rury grzewcze'),
    ('SAN.05', '01', 'Tryskacze'),
    ('SAN.05', '02', 'Hydranty i gaśnice'),
    ('SAN.05', '03', 'Detekcja pożaru'),
    -- TEL
    ('TEL.01', '01', 'Punkty logiczne'),
    ('TEL.01', '02', 'Trasy kablowe'),
    ('TEL.02', '01', 'Urządzenia aktywne'),
    ('TEL.02', '02', 'Szafy i infrastruktura'),
    ('TEL.03', '01', 'Systemy konferencyjne'),
    ('TEL.03', '02', 'Digital signage'),
    ('TEL.03', '03', 'System nagłośnienia'),
    ('TEL.04', '01', 'Czytniki i kontrolery'),
    ('TEL.04', '02', 'Zamki i elementy'),
    ('TEL.05', '01', 'Kamery'),
    ('TEL.05', '02', 'Rejestratory i serwery'),
    ('TEL.05', '03', 'Infrastruktura monitoringu'),
    -- HVC
    ('HVC.01', '01', 'Jednostki wewnętrzne'),
    ('HVC.01', '02', 'Jednostki zewnętrzne'),
    ('HVC.01', '03', 'Instalacja freonowa'),
    ('HVC.02', '01', 'Nawiewniki i wywiewniki'),
    ('HVC.02', '02', 'Klapy i przepustnice'),
    ('HVC.03', '01', 'Kanały prostokątne'),
    ('HVC.03', '02', 'Kanały okrągłe'),
    ('HVC.03', '03', 'Izolacja kanałów'),
    ('HVC.04', '01', 'Centrale nawiewno-wywiewne'),
    ('HVC.04', '02', 'Wentylatory'),
    ('HVC.05', '01', 'Czujniki i regulatory'),
    ('HVC.05', '02', 'Siłowniki i napędy'),
    ('HVC.05', '03', 'Okablowanie sterujące')
  ) AS v(parent_kod, kod, nazwa)
  JOIN kategorie k ON k.pelny_kod = v.parent_kod AND k.organization_id IS NULL;

  -- ========================================
  -- POZYCJE BIBLIOTEKA (250 total)
  -- ========================================
  INSERT INTO pozycje_biblioteka (organization_id, kategoria_id, kod, nazwa, jednostka, typ)
  SELECT NULL, k.id, v.kod, v.nazwa, v.jednostka, v.typ::position_type
  FROM (VALUES
    -- ==========================================
    -- BUD - Budowlane (50 pozycji)
    -- ==========================================
    -- BUD.01.01 Rozbiórka ścian
    ('BUD.01.01', 'BUD.01.01.001', 'Rozbiórka ścianek z płyt GK na ruszcie stalowym', 'm²', 'komplet'),
    ('BUD.01.01', 'BUD.01.01.002', 'Rozbiórka ścian murowanych gr. do 12cm', 'm²', 'komplet'),
    ('BUD.01.01', 'BUD.01.01.003', 'Rozbiórka ścian murowanych gr. 12-25cm', 'm²', 'komplet'),
    ('BUD.01.01', 'BUD.01.01.004', 'Demontaż ościeżnic drzwiowych stalowych', 'szt', 'komplet'),
    -- BUD.01.02 Rozbiórka posadzek
    ('BUD.01.02', 'BUD.01.02.001', 'Zerwanie wykładziny dywanowej z klejem', 'm²', 'komplet'),
    ('BUD.01.02', 'BUD.01.02.002', 'Skucie posadzki z płytek ceramicznych z klejem', 'm²', 'komplet'),
    ('BUD.01.02', 'BUD.01.02.003', 'Frezowanie/szlifowanie posadzki betonowej', 'm²', 'komplet'),
    -- BUD.01.03 Rozbiórka sufitów
    ('BUD.01.03', 'BUD.01.03.001', 'Demontaż sufitu podwieszanego kasetonowego z rusztem', 'm²', 'komplet'),
    ('BUD.01.03', 'BUD.01.03.002', 'Demontaż sufitu z płyt GK na ruszcie', 'm²', 'komplet'),
    ('BUD.01.03', 'BUD.01.03.003', 'Demontaż obudów instalacyjnych z GK', 'mb', 'komplet'),
    -- BUD.02.01 Ścianki działowe GK
    ('BUD.02.01', 'BUD.02.01.001', 'Ścianka GK pojedyncza CW75 1x12.5mm', 'm²', 'komplet'),
    ('BUD.02.01', 'BUD.02.01.002', 'Ścianka GK pojedyncza CW100 1x12.5mm', 'm²', 'komplet'),
    ('BUD.02.01', 'BUD.02.01.003', 'Ścianka GK podwójna CW75 2x12.5mm', 'm²', 'komplet'),
    ('BUD.02.01', 'BUD.02.01.004', 'Ścianka GK akustyczna podwójna Rw≥52dB', 'm²', 'komplet'),
    ('BUD.02.01', 'BUD.02.01.005', 'Zabudowa szachtów instalacyjnych z płyt GK', 'm²', 'komplet'),
    -- BUD.02.02 Ścianki systemowe
    ('BUD.02.02', 'BUD.02.02.001', 'Ścianka systemowa szklana pełnej wysokości', 'm²', 'komplet'),
    ('BUD.02.02', 'BUD.02.02.002', 'Ścianka systemowa aluminiowa z panelami', 'm²', 'komplet'),
    ('BUD.02.02', 'BUD.02.02.003', 'Ścianka mobilna przesuwna składana', 'm²', 'komplet'),
    -- BUD.03.01 Tynkowanie i gładzie
    ('BUD.03.01', 'BUD.03.01.001', 'Gładź gipsowa na ścianach GK - 2 warstwy', 'm²', 'komplet'),
    ('BUD.03.01', 'BUD.03.01.002', 'Tynk cementowo-wapienny ścian gr. 15mm', 'm²', 'komplet'),
    ('BUD.03.01', 'BUD.03.01.003', 'Gładź gipsowa na sufitach GK - 2 warstwy', 'm²', 'komplet'),
    -- BUD.03.02 Malowanie
    ('BUD.03.02', 'BUD.03.02.001', 'Malowanie ścian farbą lateksową 2 warstwy', 'm²', 'komplet'),
    ('BUD.03.02', 'BUD.03.02.002', 'Malowanie sufitów farbą akrylową matową 2 warstwy', 'm²', 'komplet'),
    ('BUD.03.02', 'BUD.03.02.003', 'Malowanie ścian farbą ceramiczną (strefy mokre)', 'm²', 'komplet'),
    ('BUD.03.02', 'BUD.03.02.004', 'Malowanie elementów stalowych farbą antykorozyjną', 'm²', 'komplet'),
    ('BUD.03.02', 'BUD.03.02.005', 'Malowanie lamperii (2 kolory, linia podziału)', 'm²', 'komplet'),
    -- BUD.03.03 Okładziny ścienne
    ('BUD.03.03', 'BUD.03.03.001', 'Tapetowanie ścian tapetą winylową na flizelinie', 'm²', 'komplet'),
    ('BUD.03.03', 'BUD.03.03.002', 'Okładzina ścienna z paneli drewnopodobnych HPL', 'm²', 'komplet'),
    ('BUD.03.03', 'BUD.03.03.003', 'Okładzina ścienna z płytek ceramicznych 30x60', 'm²', 'komplet'),
    -- BUD.04.01 Wylewki i przygotowanie
    ('BUD.04.01', 'BUD.04.01.001', 'Wylewka samopoziomująca gr. 3-5mm', 'm²', 'komplet'),
    ('BUD.04.01', 'BUD.04.01.002', 'Wylewka cementowa zbrojona gr. 40-60mm', 'm²', 'komplet'),
    ('BUD.04.01', 'BUD.04.01.003', 'Gruntowanie podłoża pod posadzki', 'm²', 'komplet'),
    ('BUD.04.01', 'BUD.04.01.004', 'Hydroizolacja posadzki płynną folią (strefy mokre)', 'm²', 'komplet'),
    -- BUD.04.02 Wykładziny i panele
    ('BUD.04.02', 'BUD.04.02.001', 'Wykładzina dywanowa płytkowa 50x50cm', 'm²', 'komplet'),
    ('BUD.04.02', 'BUD.04.02.002', 'Wykładzina heterogeniczna PVC rulonowa', 'm²', 'komplet'),
    ('BUD.04.02', 'BUD.04.02.003', 'Panele winylowe LVT klejone', 'm²', 'komplet'),
    ('BUD.04.02', 'BUD.04.02.004', 'Parkiet przemysłowy dębowy klejony', 'm²', 'komplet'),
    ('BUD.04.02', 'BUD.04.02.005', 'Wykładzina antystatyczna ESD (serwerownia)', 'm²', 'komplet'),
    -- BUD.04.03 Płytki i kamień
    ('BUD.04.03', 'BUD.04.03.001', 'Posadzka z gresu technicznego 60x60', 'm²', 'komplet'),
    ('BUD.04.03', 'BUD.04.03.002', 'Posadzka z gresu wielkoformatowego 120x60', 'm²', 'komplet'),
    ('BUD.04.03', 'BUD.04.03.003', 'Cokoły ceramiczne h=10cm', 'mb', 'komplet'),
    ('BUD.04.03', 'BUD.04.03.004', 'Listwy progowe aluminiowe', 'mb', 'komplet'),
    -- BUD.05.01 Sufity podwieszane systemowe
    ('BUD.05.01', 'BUD.05.01.001', 'Sufit podwieszany kasetonowy mineralny 60x60', 'm²', 'komplet'),
    ('BUD.05.01', 'BUD.05.01.002', 'Sufit podwieszany z płyt mineralnych 120x60', 'm²', 'komplet'),
    ('BUD.05.01', 'BUD.05.01.003', 'Sufit metalowy kasetonowy aluminiowy', 'm²', 'komplet'),
    ('BUD.05.01', 'BUD.05.01.004', 'Sufit rastrowy otwarty typu grill 60x60', 'm²', 'komplet'),
    ('BUD.05.01', 'BUD.05.01.005', 'Sufit akustyczny klasy A wełna mineralna', 'm²', 'komplet'),
    -- BUD.05.02 Sufity z płyt GK
    ('BUD.05.02', 'BUD.05.02.001', 'Sufit z płyt GK na ruszcie pojedynczym CD60', 'm²', 'komplet'),
    ('BUD.05.02', 'BUD.05.02.002', 'Sufit z płyt GK na ruszcie podwójnym CD60', 'm²', 'komplet'),
    ('BUD.05.02', 'BUD.05.02.003', 'Obudowa belek i instalacji z płyt GK', 'mb', 'komplet'),

    -- ==========================================
    -- ELE - Elektryczne (50 pozycji)
    -- ==========================================
    -- ELE.01.01 Gniazda elektryczne
    ('ELE.01.01', 'ELE.01.01.001', 'Gniazdo 230V podtynkowe pojedyncze z uziemieniem', 'szt', 'komplet'),
    ('ELE.01.01', 'ELE.01.01.002', 'Gniazdo 230V podtynkowe podwójne z uziemieniem', 'szt', 'komplet'),
    ('ELE.01.01', 'ELE.01.01.003', 'Gniazdo 230V natynkowe IP44 (strefy mokre)', 'szt', 'komplet'),
    ('ELE.01.01', 'ELE.01.01.004', 'Gniazdo DATA+POWER w puszce podłogowej', 'szt', 'komplet'),
    ('ELE.01.01', 'ELE.01.01.005', 'Gniazdo siłowe 400V 16A CEE 5P', 'szt', 'komplet'),
    -- ELE.01.02 Obwody dedykowane
    ('ELE.01.02', 'ELE.01.02.001', 'Obwód dedykowany zasilania klimatyzatora', 'kpl', 'komplet'),
    ('ELE.01.02', 'ELE.01.02.002', 'Obwód dedykowany do kuchni/aneksu socjalnego', 'kpl', 'komplet'),
    ('ELE.01.02', 'ELE.01.02.003', 'Obwód zasilania gwarantowanego UPS', 'kpl', 'komplet'),
    ('ELE.01.02', 'ELE.01.02.004', 'Obwód zasilania szafy serwerowej', 'kpl', 'komplet'),
    -- ELE.02.01 Oprawy oświetleniowe
    ('ELE.02.01', 'ELE.02.01.001', 'Oprawa LED panel 60x60 40W wpuszczana w sufit', 'szt', 'komplet'),
    ('ELE.02.01', 'ELE.02.01.002', 'Oprawa LED downlight Ø150 wpuszczana 18W', 'szt', 'komplet'),
    ('ELE.02.01', 'ELE.02.01.003', 'Oprawa LED liniowa wpuszczana w sufit', 'mb', 'komplet'),
    ('ELE.02.01', 'ELE.02.01.004', 'Oprawa LED liniowa natynkowa/zwieszana', 'mb', 'komplet'),
    ('ELE.02.01', 'ELE.02.01.005', 'Oprawa LED dekoracyjna wisząca (recepcja/sala)', 'szt', 'komplet'),
    -- ELE.02.02 Oświetlenie awaryjne
    ('ELE.02.02', 'ELE.02.02.001', 'Oprawa awaryjna LED z autotestem 3h', 'szt', 'komplet'),
    ('ELE.02.02', 'ELE.02.02.002', 'Oprawa ewakuacyjna LED z piktogramem', 'szt', 'komplet'),
    ('ELE.02.02', 'ELE.02.02.003', 'Centralna bateria oświetlenia awaryjnego', 'kpl', 'komplet'),
    -- ELE.02.03 Sterowanie oświetleniem
    ('ELE.02.03', 'ELE.02.03.001', 'Czujnik ruchu sufitowy 360° do oświetlenia', 'szt', 'komplet'),
    ('ELE.02.03', 'ELE.02.03.002', 'Czujnik zmierzchowy do sterowania oświetleniem', 'szt', 'komplet'),
    ('ELE.02.03', 'ELE.02.03.003', 'System DALI sterowania oświetleniem (strefa)', 'kpl', 'komplet'),
    -- ELE.03.01 Rozdzielnice
    ('ELE.03.01', 'ELE.03.01.001', 'Rozdzielnica główna RG kompletna', 'kpl', 'komplet'),
    ('ELE.03.01', 'ELE.03.01.002', 'Rozdzielnica piętrowa/strefowa RP', 'kpl', 'komplet'),
    ('ELE.03.01', 'ELE.03.01.003', 'Rozdzielnica obwodowa RO natynkowa', 'kpl', 'komplet'),
    ('ELE.03.01', 'ELE.03.01.004', 'Szafa zasilania gwarantowanego SZG z UPS', 'kpl', 'komplet'),
    -- ELE.03.02 Zabezpieczenia i aparatura
    ('ELE.03.02', 'ELE.03.02.001', 'Wyłącznik nadprądowy B/C 1P 16A', 'szt', 'komplet'),
    ('ELE.03.02', 'ELE.03.02.002', 'Wyłącznik różnicowoprądowy 2P 30mA', 'szt', 'komplet'),
    ('ELE.03.02', 'ELE.03.02.003', 'Ogranicznik przepięć klasy B+C (komplet 3-faz)', 'kpl', 'komplet'),
    ('ELE.03.02', 'ELE.03.02.004', 'Wyłącznik główny pożarowy z przyciskiem', 'szt', 'komplet'),
    -- ELE.04.01 Trasy kablowe
    ('ELE.04.01', 'ELE.04.01.001', 'Korytko kablowe perforowane 200x60mm', 'mb', 'komplet'),
    ('ELE.04.01', 'ELE.04.01.002', 'Korytko kablowe perforowane 300x60mm', 'mb', 'komplet'),
    ('ELE.04.01', 'ELE.04.01.003', 'Rura instalacyjna fi20 w bruzdach ściennych', 'mb', 'komplet'),
    ('ELE.04.01', 'ELE.04.01.004', 'Kanał elektroinstalacyjny PCV 40x40', 'mb', 'komplet'),
    ('ELE.04.01', 'ELE.04.01.005', 'Puszka podłogowa 4-modułowa z ramką', 'szt', 'komplet'),
    -- ELE.04.02 Przewody i kable
    ('ELE.04.02', 'ELE.04.02.001', 'Przewód YDYp 3x2,5mm² (obwody gniazd)', 'mb', 'komplet'),
    ('ELE.04.02', 'ELE.04.02.002', 'Przewód YDYp 3x1,5mm² (obwody oświetl.)', 'mb', 'komplet'),
    ('ELE.04.02', 'ELE.04.02.003', 'Kabel YKY 5x10mm² (zasilanie rozdzielnic)', 'mb', 'komplet'),
    ('ELE.04.02', 'ELE.04.02.004', 'Przewód LgY 1x6mm² żółto-zielony PE', 'mb', 'komplet'),
    -- ELE.05.01 Łączniki i gniazda danych
    ('ELE.05.01', 'ELE.05.01.001', 'Łącznik jednobiegunowy podtynkowy', 'szt', 'komplet'),
    ('ELE.05.01', 'ELE.05.01.002', 'Łącznik podwójny świecznikowy', 'szt', 'komplet'),
    ('ELE.05.01', 'ELE.05.01.003', 'Łącznik schodowy/krzyżowy', 'szt', 'komplet'),
    ('ELE.05.01', 'ELE.05.01.004', 'Ściemniacz obrotowy LED 3-200W', 'szt', 'komplet'),
    ('ELE.05.01', 'ELE.05.01.005', 'Przycisk dzwonkowy podświetlany', 'szt', 'komplet'),
    -- ELE.05.02 Czujniki i automatyka
    ('ELE.05.02', 'ELE.05.02.001', 'Czujnik temperatury pokojowy', 'szt', 'komplet'),
    ('ELE.05.02', 'ELE.05.02.002', 'Czujnik obecności sufitowy 360°', 'szt', 'komplet'),
    ('ELE.05.02', 'ELE.05.02.003', 'Przycisk ewakuacyjny ROP natynkowy', 'szt', 'komplet'),
    ('ELE.05.02', 'ELE.05.02.004', 'Sygnalizator akustyczno-optyczny SAO', 'szt', 'komplet'),
    -- ELE.05.03 Uziemienie i połączenia wyrównawcze
    ('ELE.05.03', 'ELE.05.03.001', 'Szyna wyrównawcza główna PE', 'szt', 'komplet'),
    ('ELE.05.03', 'ELE.05.03.002', 'Bednarka ocynkowana 30x4mm', 'mb', 'komplet'),
    ('ELE.05.03', 'ELE.05.03.003', 'Uziom pionowy stalowy 3m', 'szt', 'komplet'),
    ('ELE.05.03', 'ELE.05.03.004', 'Połączenie wyrównawcze miejscowe', 'kpl', 'komplet'),

    -- ==========================================
    -- SAN - Sanitarne (50 pozycji)
    -- ==========================================
    -- SAN.01.01 Rury i podejścia
    ('SAN.01.01', 'SAN.01.01.001', 'Rura PP-R fi20 wody zimnej z uchwytami', 'mb', 'komplet'),
    ('SAN.01.01', 'SAN.01.01.002', 'Rura PP-R fi20 wody ciepłej z izolacją', 'mb', 'komplet'),
    ('SAN.01.01', 'SAN.01.01.003', 'Rura PP-R fi25 wody zimnej z uchwytami', 'mb', 'komplet'),
    ('SAN.01.01', 'SAN.01.01.004', 'Podejście wodne do umywalki (ciepła+zimna)', 'kpl', 'komplet'),
    ('SAN.01.01', 'SAN.01.01.005', 'Podejście wodne do WC (zimna)', 'kpl', 'komplet'),
    -- SAN.01.02 Zawory i armatura
    ('SAN.01.02', 'SAN.01.02.001', 'Zawór kulowy fi20 mosiężny', 'szt', 'komplet'),
    ('SAN.01.02', 'SAN.01.02.002', 'Zawór zwrotny fi20 mosiężny', 'szt', 'komplet'),
    ('SAN.01.02', 'SAN.01.02.003', 'Filtr siatkowy fi25 z zaworem spustowym', 'szt', 'komplet'),
    ('SAN.01.02', 'SAN.01.02.004', 'Wodomierz lokalowy fi20 z plombą', 'szt', 'komplet'),
    -- SAN.02.01 Rury kanalizacyjne
    ('SAN.02.01', 'SAN.02.01.001', 'Rura kanalizacyjna PVC fi50 z kielichem', 'mb', 'komplet'),
    ('SAN.02.01', 'SAN.02.01.002', 'Rura kanalizacyjna PVC fi110 z kielichem', 'mb', 'komplet'),
    ('SAN.02.01', 'SAN.02.01.003', 'Rura kanalizacyjna PVC fi160 z kielichem', 'mb', 'komplet'),
    ('SAN.02.01', 'SAN.02.01.004', 'Podejście kanalizacyjne do umywalki fi50', 'kpl', 'komplet'),
    ('SAN.02.01', 'SAN.02.01.005', 'Podejście kanalizacyjne do WC fi110', 'kpl', 'komplet'),
    -- SAN.02.02 Wpusty i odwodnienia
    ('SAN.02.02', 'SAN.02.02.001', 'Wpust podłogowy fi50 z kratką nierdzewną', 'szt', 'komplet'),
    ('SAN.02.02', 'SAN.02.02.002', 'Wpust liniowy 60cm z rusztem nierdzewnym', 'szt', 'komplet'),
    ('SAN.02.02', 'SAN.02.02.003', 'Rewizja kanalizacyjna fi110 natynkowa', 'szt', 'komplet'),
    -- SAN.03.01 Umywalki i zlewy
    ('SAN.03.01', 'SAN.03.01.001', 'Umywalka meblowa 60cm z szafką podumywalkową', 'kpl', 'komplet'),
    ('SAN.03.01', 'SAN.03.01.002', 'Umywalka nablatowa okrągła Ø40cm', 'kpl', 'komplet'),
    ('SAN.03.01', 'SAN.03.01.003', 'Umywalka wisząca dla niepełnosprawnych z uchwytami', 'kpl', 'komplet'),
    ('SAN.03.01', 'SAN.03.01.004', 'Zlew kuchenny jednokomorowy ze stali nierdzewnej', 'kpl', 'komplet'),
    ('SAN.03.01', 'SAN.03.01.005', 'Zlew gospodarczy z kratką ściekową', 'kpl', 'komplet'),
    -- SAN.03.02 WC i pisuary
    ('SAN.03.02', 'SAN.03.02.001', 'Miska WC wisząca z deską wolnoopadową', 'kpl', 'komplet'),
    ('SAN.03.02', 'SAN.03.02.002', 'Stelaż podtynkowy do WC z przyciskiem', 'kpl', 'komplet'),
    ('SAN.03.02', 'SAN.03.02.003', 'Miska WC dla niepełnosprawnych z uchwytami', 'kpl', 'komplet'),
    ('SAN.03.02', 'SAN.03.02.004', 'Pisuar z zaworem spłukującym bezdotykowym', 'kpl', 'komplet'),
    -- SAN.03.03 Baterie i akcesoria
    ('SAN.03.03', 'SAN.03.03.001', 'Bateria umywalkowa jednouchwytowa stojąca', 'szt', 'komplet'),
    ('SAN.03.03', 'SAN.03.03.002', 'Bateria zlewozmywakowa z wyciąganą wylewką', 'szt', 'komplet'),
    ('SAN.03.03', 'SAN.03.03.003', 'Dozownik mydła w płynie ścienny', 'szt', 'komplet'),
    ('SAN.03.03', 'SAN.03.03.004', 'Suszarka do rąk elektryczna automatyczna', 'szt', 'komplet'),
    -- SAN.04.01 Grzejniki
    ('SAN.04.01', 'SAN.04.01.001', 'Grzejnik płytowy C22 600x1000mm', 'szt', 'komplet'),
    ('SAN.04.01', 'SAN.04.01.002', 'Grzejnik płytowy C22 600x1400mm', 'szt', 'komplet'),
    ('SAN.04.01', 'SAN.04.01.003', 'Grzejnik łazienkowy drabinkowy 500x1200mm', 'szt', 'komplet'),
    ('SAN.04.01', 'SAN.04.01.004', 'Grzejnik kanałowy podłogowy z wentylatorem', 'mb', 'komplet'),
    ('SAN.04.01', 'SAN.04.01.005', 'Głowica termostatyczna z czujnikiem cieczowym', 'szt', 'komplet'),
    -- SAN.04.02 Rury grzewcze
    ('SAN.04.02', 'SAN.04.02.001', 'Rura PEX/AL/PEX fi16 w izolacji', 'mb', 'komplet'),
    ('SAN.04.02', 'SAN.04.02.002', 'Rura PEX/AL/PEX fi20 w izolacji', 'mb', 'komplet'),
    ('SAN.04.02', 'SAN.04.02.003', 'Izolacja termiczna rur grzewczych gr. 20mm', 'mb', 'material'),
    ('SAN.04.02', 'SAN.04.02.004', 'Zawór grzejnikowy kątowy fi15 z głowicą', 'szt', 'komplet'),
    -- SAN.05.01 Tryskacze
    ('SAN.05.01', 'SAN.05.01.001', 'Tryskacz wiszący standardowy K80', 'szt', 'komplet'),
    ('SAN.05.01', 'SAN.05.01.002', 'Tryskacz ukryty (concealed) z rozetą', 'szt', 'komplet'),
    ('SAN.05.01', 'SAN.05.01.003', 'Rura stalowa czarna fi25 inst. tryskaczowej', 'mb', 'komplet'),
    ('SAN.05.01', 'SAN.05.01.004', 'Rura stalowa czarna fi50 inst. tryskaczowej', 'mb', 'komplet'),
    -- SAN.05.02 Hydranty i gaśnice
    ('SAN.05.02', 'SAN.05.02.001', 'Hydrant wewnętrzny DN25 z wężem półsztywnym', 'kpl', 'komplet'),
    ('SAN.05.02', 'SAN.05.02.002', 'Gaśnica proszkowa ABC 6kg z uchwytem', 'szt', 'komplet'),
    ('SAN.05.02', 'SAN.05.02.003', 'Szafka hydrantowa podtynkowa 800x800', 'szt', 'komplet'),
    -- SAN.05.03 Detekcja pożaru
    ('SAN.05.03', 'SAN.05.03.001', 'Czujka dymu optyczna adresowalna', 'szt', 'komplet'),
    ('SAN.05.03', 'SAN.05.03.002', 'Ręczny ostrzegacz pożarowy ROP adresowalny', 'szt', 'komplet'),
    ('SAN.05.03', 'SAN.05.03.003', 'Sygnalizator akustyczny pożarowy ścienny', 'szt', 'komplet'),
    ('SAN.05.03', 'SAN.05.03.004', 'Centrala sygnalizacji pożaru 4-strefowa', 'kpl', 'komplet'),

    -- ==========================================
    -- TEL - Teletechniczne (50 pozycji)
    -- ==========================================
    -- TEL.01.01 Punkty logiczne
    ('TEL.01.01', 'TEL.01.01.001', 'Punkt logiczny PEL kat.6A (gniazdo+kabel+patch)', 'szt', 'komplet'),
    ('TEL.01.01', 'TEL.01.01.002', 'Punkt logiczny podwójny 2xRJ45 kat.6A', 'szt', 'komplet'),
    ('TEL.01.01', 'TEL.01.01.003', 'Punkt logiczny w puszce podłogowej kat.6A', 'szt', 'komplet'),
    ('TEL.01.01', 'TEL.01.01.004', 'Punkt logiczny Wi-Fi (kabel do AP kat.6A)', 'szt', 'komplet'),
    ('TEL.01.01', 'TEL.01.01.005', 'Punkt logiczny światłowodowy LC duplex OS2', 'szt', 'komplet'),
    -- TEL.01.02 Trasy kablowe
    ('TEL.01.02', 'TEL.01.02.001', 'Korytko kablowe perforowane 200x60 (tele)', 'mb', 'komplet'),
    ('TEL.01.02', 'TEL.01.02.002', 'Rura instalacyjna fi25 w bruzdach (tele)', 'mb', 'komplet'),
    ('TEL.01.02', 'TEL.01.02.003', 'Kanał kablowy podpodłogowy 2-komorowy', 'mb', 'komplet'),
    ('TEL.01.02', 'TEL.01.02.004', 'Przepust kablowy ognioodporny przez ścianę', 'szt', 'komplet'),
    -- TEL.02.01 Urządzenia aktywne
    ('TEL.02.01', 'TEL.02.01.001', 'Switch zarządzalny PoE+ 24-port 1GbE', 'szt', 'komplet'),
    ('TEL.02.01', 'TEL.02.01.002', 'Switch zarządzalny 48-port 1GbE z 4x10G SFP+', 'szt', 'komplet'),
    ('TEL.02.01', 'TEL.02.01.003', 'Access Point Wi-Fi 6E sufitowy PoE', 'szt', 'komplet'),
    ('TEL.02.01', 'TEL.02.01.004', 'Router brzegowy / firewall UTM', 'szt', 'komplet'),
    -- TEL.02.02 Szafy i infrastruktura
    ('TEL.02.02', 'TEL.02.02.001', 'Szafa rack 19" 42U stojąca 800x1000', 'szt', 'komplet'),
    ('TEL.02.02', 'TEL.02.02.002', 'Szafa rack 19" 12U wisząca', 'szt', 'komplet'),
    ('TEL.02.02', 'TEL.02.02.003', 'Panel krosowy 24xRJ45 kat.6A 1U', 'szt', 'komplet'),
    ('TEL.02.02', 'TEL.02.02.004', 'Organizator kabli poziomy 19" 1U', 'szt', 'komplet'),
    -- TEL.03.01 Systemy konferencyjne
    ('TEL.03.01', 'TEL.03.01.001', 'Monitor/telewizor konferencyjny 65" 4K', 'szt', 'komplet'),
    ('TEL.03.01', 'TEL.03.01.002', 'Kamera konferencyjna PTZ 4K USB-C', 'szt', 'komplet'),
    ('TEL.03.01', 'TEL.03.01.003', 'Soundbar konferencyjny z mikrofonami', 'szt', 'komplet'),
    ('TEL.03.01', 'TEL.03.01.004', 'System wideokonferencji (hub + pilot + kamera)', 'kpl', 'komplet'),
    ('TEL.03.01', 'TEL.03.01.005', 'Okablowanie AV do sali konferencyjnej (HDMI+USB+LAN)', 'kpl', 'komplet'),
    -- TEL.03.02 Digital signage
    ('TEL.03.02', 'TEL.03.02.001', 'Monitor digital signage 43" z playerem', 'szt', 'komplet'),
    ('TEL.03.02', 'TEL.03.02.002', 'Player multimedialny do digital signage', 'szt', 'komplet'),
    ('TEL.03.02', 'TEL.03.02.003', 'Uchwyt ścienny VESA do monitora', 'szt', 'komplet'),
    -- TEL.03.03 System nagłośnienia
    ('TEL.03.03', 'TEL.03.03.001', 'Głośnik sufitowy wpuszczany 6W 100V', 'szt', 'komplet'),
    ('TEL.03.03', 'TEL.03.03.002', 'Wzmacniacz strefowy 120W z mikserem', 'szt', 'komplet'),
    ('TEL.03.03', 'TEL.03.03.003', 'Mikrofon biurkowy pojemnościowy (sala konf.)', 'szt', 'komplet'),
    -- TEL.04.01 Czytniki i kontrolery
    ('TEL.04.01', 'TEL.04.01.001', 'Czytnik kart zbliżeniowych RFID Mifare', 'szt', 'komplet'),
    ('TEL.04.01', 'TEL.04.01.002', 'Kontroler dostępu 2-drzwiowy sieciowy', 'szt', 'komplet'),
    ('TEL.04.01', 'TEL.04.01.003', 'Przycisk wyjścia z czujnikiem RTE bezdotykowy', 'szt', 'komplet'),
    ('TEL.04.01', 'TEL.04.01.004', 'Elektrozaczep rewersyjny 12V z monitoringiem', 'szt', 'komplet'),
    ('TEL.04.01', 'TEL.04.01.005', 'Terminal rejestracji czasu pracy (RCP)', 'szt', 'komplet'),
    -- TEL.04.02 Zamki i elementy
    ('TEL.04.02', 'TEL.04.02.001', 'Zamek elektromagnetyczny 300kg z sygnalizacją', 'szt', 'komplet'),
    ('TEL.04.02', 'TEL.04.02.002', 'Samozamykacz drzwiowy z regulacją', 'szt', 'komplet'),
    ('TEL.04.02', 'TEL.04.02.003', 'Kontaktron drzwiowy wpuszczany', 'szt', 'komplet'),
    ('TEL.04.02', 'TEL.04.02.004', 'Przycisk ewakuacyjny break-glass zielony', 'szt', 'komplet'),
    -- TEL.05.01 Kamery
    ('TEL.05.01', 'TEL.05.01.001', 'Kamera IP kopułkowa 4MP IR wewnętrzna', 'szt', 'komplet'),
    ('TEL.05.01', 'TEL.05.01.002', 'Kamera IP tubowa 4MP IR zewnętrzna IP67', 'szt', 'komplet'),
    ('TEL.05.01', 'TEL.05.01.003', 'Kamera IP PTZ 2MP 25x zoom', 'szt', 'komplet'),
    ('TEL.05.01', 'TEL.05.01.004', 'Kamera IP panoramiczna 360° fisheye 12MP', 'szt', 'komplet'),
    ('TEL.05.01', 'TEL.05.01.005', 'Kamera IP kompaktowa biurkowa 2MP', 'szt', 'komplet'),
    -- TEL.05.02 Rejestratory i serwery
    ('TEL.05.02', 'TEL.05.02.001', 'Rejestrator NVR 16-kanałowy PoE', 'szt', 'komplet'),
    ('TEL.05.02', 'TEL.05.02.002', 'Dysk HDD 4TB klasy surveillance', 'szt', 'material'),
    ('TEL.05.02', 'TEL.05.02.003', 'Monitor podglądowy LED 22" Full HD', 'szt', 'komplet'),
    ('TEL.05.02', 'TEL.05.02.004', 'Switch PoE dedykowany CCTV 8-port', 'szt', 'komplet'),
    -- TEL.05.03 Infrastruktura monitoringu
    ('TEL.05.03', 'TEL.05.03.001', 'Zasilacz buforowy 12V/5A w obudowie', 'szt', 'komplet'),
    ('TEL.05.03', 'TEL.05.03.002', 'Obudowa zewnętrzna na kamerę IP66', 'szt', 'komplet'),
    ('TEL.05.03', 'TEL.05.03.003', 'Maszt/uchwyt do kamery zewnętrznej', 'szt', 'komplet'),
    ('TEL.05.03', 'TEL.05.03.004', 'Licencja oprogramowania VMS (per kamera)', 'szt', 'komplet'),

    -- ==========================================
    -- HVC - HVAC (50 pozycji)
    -- ==========================================
    -- HVC.01.01 Jednostki wewnętrzne
    ('HVC.01.01', 'HVC.01.01.001', 'Klimatyzator kasetonowy 4-stronny 5.0kW', 'szt', 'komplet'),
    ('HVC.01.01', 'HVC.01.01.002', 'Klimatyzator kasetonowy 4-stronny 7.1kW', 'szt', 'komplet'),
    ('HVC.01.01', 'HVC.01.01.003', 'Klimatyzator ścienny split 3.5kW', 'szt', 'komplet'),
    ('HVC.01.01', 'HVC.01.01.004', 'Klimatyzator kanałowy średniego sprężu 10kW', 'szt', 'komplet'),
    ('HVC.01.01', 'HVC.01.01.005', 'Klimatyzator podsufitowy/przypodłogowy 5kW', 'szt', 'komplet'),
    -- HVC.01.02 Jednostki zewnętrzne
    ('HVC.01.02', 'HVC.01.02.001', 'Agregat zewnętrzny VRF 28kW', 'szt', 'komplet'),
    ('HVC.01.02', 'HVC.01.02.002', 'Agregat zewnętrzny split 5kW', 'szt', 'komplet'),
    ('HVC.01.02', 'HVC.01.02.003', 'Konsola stalowa pod agregat zewnętrzny', 'szt', 'komplet'),
    ('HVC.01.02', 'HVC.01.02.004', 'Ekran akustyczny maskujący dla agregatu', 'kpl', 'komplet'),
    -- HVC.01.03 Instalacja freonowa
    ('HVC.01.03', 'HVC.01.03.001', 'Rury miedziane w izolacji fi6.35/12.7mm (split)', 'mb', 'komplet'),
    ('HVC.01.03', 'HVC.01.03.002', 'Rury miedziane w izolacji fi9.52/15.88mm (VRF)', 'mb', 'komplet'),
    ('HVC.01.03', 'HVC.01.03.003', 'Skrzynka rozdzielcza VRF (branch box)', 'szt', 'komplet'),
    ('HVC.01.03', 'HVC.01.03.004', 'Próba szczelności i napełnienie czynnikiem R32', 'kpl', 'robocizna'),
    -- HVC.02.01 Nawiewniki i wywiewniki
    ('HVC.02.01', 'HVC.02.01.001', 'Nawiewnik wirowy sufitowy Ø315mm', 'szt', 'komplet'),
    ('HVC.02.01', 'HVC.02.01.002', 'Nawiewnik szczelinowy 2-szczelinowy', 'mb', 'komplet'),
    ('HVC.02.01', 'HVC.02.01.003', 'Kratka wywiewna stalowa 325x225mm', 'szt', 'komplet'),
    ('HVC.02.01', 'HVC.02.01.004', 'Kratka nawiewna z przepustnicą 425x225mm', 'szt', 'komplet'),
    ('HVC.02.01', 'HVC.02.01.005', 'Anemostat nawiewny Ø200mm', 'szt', 'komplet'),
    -- HVC.02.02 Klapy i przepustnice
    ('HVC.02.02', 'HVC.02.02.001', 'Klapa przeciwpożarowa Ø250mm EI120', 'szt', 'komplet'),
    ('HVC.02.02', 'HVC.02.02.002', 'Klapa odcinająca Ø315 z siłownikiem 24V', 'szt', 'komplet'),
    ('HVC.02.02', 'HVC.02.02.003', 'Przepustnica regulacyjna ręczna Ø200mm', 'szt', 'komplet'),
    -- HVC.03.01 Kanały prostokątne
    ('HVC.03.01', 'HVC.03.01.001', 'Kanał wentylacyjny prostokątny 400x250mm', 'm²', 'komplet'),
    ('HVC.03.01', 'HVC.03.01.002', 'Kanał wentylacyjny prostokątny 600x300mm', 'm²', 'komplet'),
    ('HVC.03.01', 'HVC.03.01.003', 'Kanał wentylacyjny prostokątny 800x400mm', 'm²', 'komplet'),
    ('HVC.03.01', 'HVC.03.01.004', 'Kształtki wentylacyjne (kolana, trójniki, redukcje)', 'szt', 'komplet'),
    -- HVC.03.02 Kanały okrągłe
    ('HVC.03.02', 'HVC.03.02.001', 'Kanał wentylacyjny spiralny Ø200mm', 'mb', 'komplet'),
    ('HVC.03.02', 'HVC.03.02.002', 'Kanał wentylacyjny spiralny Ø315mm', 'mb', 'komplet'),
    ('HVC.03.02', 'HVC.03.02.003', 'Kanał elastyczny izolowany Ø200mm', 'mb', 'komplet'),
    -- HVC.03.03 Izolacja kanałów
    ('HVC.03.03', 'HVC.03.03.001', 'Izolacja kanałów wełną mineralną gr. 40mm', 'm²', 'material'),
    ('HVC.03.03', 'HVC.03.03.002', 'Izolacja akustyczna kanałów gr. 50mm', 'm²', 'material'),
    ('HVC.03.03', 'HVC.03.03.003', 'Izolacja antyskroplinowa gr. 10mm samoprzylepna', 'm²', 'material'),
    -- HVC.04.01 Centrale nawiewno-wywiewne
    ('HVC.04.01', 'HVC.04.01.001', 'Centrala nawiewno-wywiewna z rekuperacją 2000m³/h', 'kpl', 'komplet'),
    ('HVC.04.01', 'HVC.04.01.002', 'Centrala nawiewno-wywiewna z rekuperacją 5000m³/h', 'kpl', 'komplet'),
    ('HVC.04.01', 'HVC.04.01.003', 'Centrala dachowa rooftop 3000m³/h', 'kpl', 'komplet'),
    ('HVC.04.01', 'HVC.04.01.004', 'Nagrzewnica wodna kanałowa 400x250mm', 'szt', 'komplet'),
    -- HVC.04.02 Wentylatory
    ('HVC.04.02', 'HVC.04.02.001', 'Wentylator kanałowy Ø315 230V', 'szt', 'komplet'),
    ('HVC.04.02', 'HVC.04.02.002', 'Wentylator dachowy wyciągowy Ø400', 'szt', 'komplet'),
    ('HVC.04.02', 'HVC.04.02.003', 'Wentylator łazienkowy Ø100 z higrostatem', 'szt', 'komplet'),
    ('HVC.04.02', 'HVC.04.02.004', 'Wentylator oddymiający 400°C/2h osiowy', 'szt', 'komplet'),
    -- HVC.05.01 Czujniki i regulatory
    ('HVC.05.01', 'HVC.05.01.001', 'Czujnik temperatury kanałowy NTC', 'szt', 'komplet'),
    ('HVC.05.01', 'HVC.05.01.002', 'Czujnik CO2 kanałowy 0-2000ppm', 'szt', 'komplet'),
    ('HVC.05.01', 'HVC.05.01.003', 'Termostat pokojowy z wyświetlaczem LCD', 'szt', 'komplet'),
    ('HVC.05.01', 'HVC.05.01.004', 'Regulator pogodowy centralnego ogrzewania', 'szt', 'komplet'),
    -- HVC.05.02 Siłowniki i napędy
    ('HVC.05.02', 'HVC.05.02.001', 'Siłownik przepustnicy 24V 0-10V obrotowy', 'szt', 'komplet'),
    ('HVC.05.02', 'HVC.05.02.002', 'Siłownik zaworu 3-drogowego 24V', 'szt', 'komplet'),
    ('HVC.05.02', 'HVC.05.02.003', 'Przetwornik ciśnienia 0-10V 0-1000Pa', 'szt', 'komplet'),
    ('HVC.05.02', 'HVC.05.02.004', 'Presostat różnicowy filtra z sygnalizacją', 'szt', 'komplet'),
    -- HVC.05.03 Okablowanie sterujące
    ('HVC.05.03', 'HVC.05.03.001', 'Kabel sterowniczy LIYCY 4x0,75mm²', 'mb', 'komplet'),
    ('HVC.05.03', 'HVC.05.03.002', 'Kabel sterowniczy JY(St)Y 2x2x0,8mm', 'mb', 'komplet'),
    ('HVC.05.03', 'HVC.05.03.003', 'Podłączenie urządzenia do systemu BMS', 'szt', 'robocizna')

  ) AS v(parent_kod, kod, nazwa, jednostka, typ)
  JOIN kategorie k ON k.pelny_kod = v.parent_kod AND k.organization_id IS NULL;

  RAISE NOTICE 'Sample data inserted successfully!';
END $$;
