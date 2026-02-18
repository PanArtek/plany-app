# Seed Data - Full Workflow Demo

**Data:** 2026-02-18
**Cel:** Usunięcie istniejących danych i stworzenie kompletnego zestawu danych demo symulującego cały workflow aplikacji.

## Założenia

- Czysta baza - usuwamy WSZYSTKO (włącznie z kategoriami, pozycjami biblioteki, produktami)
- 3 branże: BUD, ELE, SAN (wod-kan + hydranty)
- 5 projektów, każdy w innym statusie
- Realistyczna głębokość danych (8-15 pozycji/projekt, zamówienia z dostawami, umowy z postępem)
- Mix typów projektów: restauracja, biuro, klinika, lokal handlowy, magazyn

## 1. Kategorie (3 branże × 3 poziomy)

### BUD - Budowlane
| Kod | Nazwa |
|-----|-------|
| BUD.01 | Ściany |
| BUD.01.01 | Karton-gips |
| BUD.01.02 | Murowane |
| BUD.01.03 | Szklane |
| BUD.02 | Podłogi |
| BUD.02.01 | Wykładziny |
| BUD.02.02 | Płytki |
| BUD.02.03 | Żywice |
| BUD.03 | Sufity |
| BUD.03.01 | Podwieszane |
| BUD.03.02 | Akustyczne |
| BUD.04 | Stolarka |
| BUD.04.01 | Drzwi |
| BUD.04.02 | Zabudowy |

### ELE - Elektryczne
| Kod | Nazwa |
|-----|-------|
| ELE.01 | Instalacje |
| ELE.01.01 | Okablowanie |
| ELE.01.02 | Rozdzielnie |
| ELE.02 | Osprzęt |
| ELE.02.01 | Gniazdka i wyłączniki |
| ELE.02.02 | Tablice |
| ELE.03 | Oświetlenie |
| ELE.03.01 | Panele LED |
| ELE.03.02 | Oprawy dekoracyjne |

### SAN - Wod-Kan i hydranty
| Kod | Nazwa |
|-----|-------|
| SAN.01 | Instalacja wod-kan |
| SAN.01.01 | Rury |
| SAN.01.02 | Podejścia |
| SAN.02 | Biały montaż |
| SAN.02.01 | Umywalki |
| SAN.02.02 | WC |
| SAN.03 | Instalacja hydrantowa |
| SAN.03.01 | Hydranty |
| SAN.03.02 | Zasilanie |

**Łącznie:** 3 branże, 9 kategorii, 23 podkategorie

## 2. Dostawcy (6)

| Kod | Nazwa | Specjalizacja |
|-----|-------|---------------|
| MAT-BUD | MatBud Hurtownia | płyty g-k, profile, farby |
| FLOOR-EX | FloorExpert | wykładziny, płytki, żywice |
| ELEKTRO | Elektro-Hurt | kable, osprzęt, oprawy LED |
| SANTECH | SanTech Instalacje | rury, armatura, biały montaż |
| HYDRO | HydroSafe | systemy hydrantowe |
| STOLAR | Stolar-Pol | drzwi, zabudowy |

## 3. Podwykonawcy (5)

| Nazwa | Specjalizacja |
|-------|---------------|
| BudMont Ekipa | ściany, sufity, prace ogólnobudowlane |
| FloorTeam | podłogi (wykładziny, płytki, żywice) |
| ElektroPro | instalacje elektryczne, oświetlenie |
| AquaInstal | wod-kan, biały montaż |
| HydroProtect | instalacje hydrantowe, ppoż |

## 4. Produkty (~25-30)

### BUD
- Płyta g-k 12.5mm (m²), Profil CW75 (mb), Wkręty g-k (op/1000szt), Masa szpachlowa (kg), Farba lateksowa biała (l)
- Wykładzina obiektowa (m²), Klej do wykładzin (kg)
- Gres 60x60 mat (m²), Klej do gresu (kg), Fuga cementowa (kg)
- Płyta sufitowa 60x60 (m²), Profil sufitowy T24 (mb)
- Drzwi wewnętrzne pełne 80 (szt), Ościeżnica regulowana (szt)
- Szkło hartowane 10mm (m²)
- Żywica epoksydowa (kg), Grunt epoksydowy (kg)

### ELE
- Kabel YDY 3x2.5 (mb), Kabel YDY 5x2.5 (mb), Puszka podtynkowa fi60 (szt)
- Gniazdko podwójne z/u (szt), Ramka pojedyncza (szt), Wyłącznik świecznikowy (szt)
- Panel LED 60x60 40W (szt), Zasilacz LED (szt)
- Oprawa wisząca dekoracyjna (szt)
- Rozdzielnia n/t 24-mod (szt), Wyłącznik nadprądowy B16 (szt)

### SAN
- Rura PP-R 20mm (mb), Rura PP-R 25mm (mb), Kolano PP-R 20/90° (szt)
- Umywalka nablatowa (szt), Bateria umywalkowa (szt), Syfon umywalkowy (szt)
- Miska WC kompakt (szt), Deska WC (szt), Mechanizm spłuczki (szt)
- Szafka hydrantowa 52 (szt), Zawór hydrantowy DN25 (szt), Wąż pożarniczy 20m (szt)
- Rura stalowa ocynk DN25 (mb), Złączka stalowa DN25 (szt)

Każdy produkt ma **2 ceny** od różnych dostawców.

## 5. Pozycje biblioteki (18 pozycji)

### BUD (8)
| Kod | Nazwa | Jdn | Typ |
|-----|-------|-----|-----|
| BUD.01.01.001 | Ściana z płyt g-k na CW75 | m² | komplet |
| BUD.01.03.001 | Ścianka szklana | m² | komplet |
| BUD.02.01.001 | Wykładzina obiektowa | m² | komplet |
| BUD.02.02.001 | Płytki gresowe 60x60 | m² | komplet |
| BUD.02.03.001 | Posadzka żywiczna | m² | komplet |
| BUD.03.01.001 | Sufit podwieszany modułowy | m² | komplet |
| BUD.04.01.001 | Drzwi wewnętrzne pełne | szt | komplet |
| BUD.04.02.001 | Zabudowa meblowa kuchenna | mb | komplet |

### ELE (5)
| Kod | Nazwa | Jdn | Typ |
|-----|-------|-----|-----|
| ELE.01.01.001 | Punkt elektryczny | szt | komplet |
| ELE.01.02.001 | Rozdzielnia 24-modułowa | szt | komplet |
| ELE.02.01.001 | Gniazdko podwójne z ramką | szt | komplet |
| ELE.03.01.001 | Panel LED 60x60 z zasilaczem | szt | komplet |
| ELE.03.02.001 | Oprawa dekoracyjna wisząca | szt | komplet |

### SAN (5)
| Kod | Nazwa | Jdn | Typ |
|-----|-------|-----|-----|
| SAN.01.01.001 | Instalacja wod-kan - podejście | szt | komplet |
| SAN.02.01.001 | Umywalka z baterią | kpl | komplet |
| SAN.02.02.001 | Miska WC kompakt | kpl | komplet |
| SAN.03.01.001 | Hydrant wewnętrzny DN25 | szt | komplet |
| SAN.03.02.001 | Instalacja zasilająca hydranty | mb | komplet |

Każda pozycja: 1-2 składowe robocizny + 2-4 składowe materiałowe.

## 6. Projekty

### P1: DRAFT - Restauracja "Smaczna" (150m²)
- **Klient:** Gastro Group Sp. z o.o.
- **Adres:** ul. Marszałkowska 45, Warszawa
- **Status:** draft
- **Rewizja 0** (szkic, niezablokowana)
- **8 pozycji:** ściana g-k, gres (kuchnia), żywica (sala), sufit, drzwi×3, punkt elektryczny×12, panel LED×8, wod-kan×4, umywalka×2, WC×2

### P2: OFERTOWANIE - Biuro "TechHub" (300m²)
- **Klient:** TechHub S.A.
- **Adres:** ul. Puławska 182, Warszawa
- **Status:** ofertowanie, sent_at = 2026-02-10
- **Rewizja 0** (zablokowana), **Rewizja 1** (zablokowana - aktualna oferta)
- **12 pozycji:** dużo elektryki, ściany g-k, ścianki szklane, wykładzina, sufit, drzwi

### P3: REALIZACJA - Klinika "DentSmile" (200m²)
- **Klient:** DentSmile Sp. z o.o.
- **Adres:** al. Jerozolimskie 89, Warszawa
- **Status:** realizacja
- **Rewizja 0** (stara), **Rewizja 1** (zaakceptowana, accepted_rewizja_id)
- **10 pozycji:** gres, ściany g-k, wod-kan, hydrant, elektryka, biały montaż
- **Zamówienia:** ZAM/2026/001 (MAT-BUD, częściowo), ZAM/2026/002 (SANTECH, wysłane)
- **Umowy:** UM/2026/001 (BudMont, podpisana, 40%), UM/2026/002 (AquaInstal, wysłana)
- **Realizacja:** 3 wpisy (2 faktury + 1 koszt dodatkowy)

### P4: ZAMKNIĘTY - Lokal "Fashion Box" (120m²)
- **Klient:** Fashion Box Sp.j.
- **Adres:** ul. Nowy Świat 22, Warszawa
- **Status:** zamkniety
- **Rewizja 0** (zaakceptowana)
- **8 pozycji:** ściany, wykładzina, sufit, elektryka, oświetlenie dekoracyjne, drzwi
- **Zamówienia:** ZAM/2025/001 (MAT-BUD, rozliczone), ZAM/2025/002 (ELEKTRO, rozliczone)
- **Umowy:** UM/2025/001 (BudMont, rozliczona), UM/2025/002 (ElektroPro, rozliczona)
- **Realizacja:** 5 faktur

### P5: ODRZUCONY - Magazyn "LogiStore" (400m²)
- **Klient:** LogiStore Sp. z o.o.
- **Adres:** ul. Logistyczna 10, Pruszków
- **Status:** odrzucony
- **Rewizja 0** (zablokowana, wysłana, odrzucona)
- **6 pozycji:** żywica (duża pow.), elektryka, hydranty
- **Brak zamówień/umów**

## 7. Narzuty domyślne

| Branża | Narzut |
|--------|--------|
| BUD | 30% |
| ELE | 25% |
| SAN | 28% |

## 8. Implementacja

Jeden plik SQL wykonany przez `supabase.rpc()` lub `apply_migration`:
1. DELETE cascade od góry (realizacja → umowy → zamówienia → kosztorys → rewizje → projekty → biblioteka → kategorie → dostawcy → podwykonawcy → produkty → narzuty → organizacja)
2. INSERT organizacja + member
3. INSERT kategorie (3 poziomy)
4. INSERT dostawcy, podwykonawcy, produkty, ceny, stawki
5. INSERT pozycje_biblioteka + składowe
6. INSERT narzuty_domyslne
7. INSERT projekty + rewizje + kosztorysy + składowe
8. INSERT zamówienia + dostawy + umowy + wykonanie + realizacja
9. UPDATE statusy projektów przez change_project_status()
