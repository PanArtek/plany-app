# Logika Biznesowa PLANY App - Pozycja jako Core

## Kontekst

Aplikacja do kosztorysowania fit-out komercyjnego potrzebuje spójnej logiki biznesowej, gdzie **POZYCJA** jest centralnym bytem. Obecny stan: zaimplementowane moduły biblioteki (kategorie, pozycje, materiały, dostawcy), schemat kosztorysu w DB. Brakuje: logika akceptacji, zamówienia materiałów, umowy z podwykonawcami, śledzenie realizacji.

**Cel dokumentu:** zaprojektować pełny flow od kosztorysu do realizacji (zamówienia + umowy), traktując pozycję jako rdzeń systemu.

---

## 1. Dwa Światy Pozycji

System operuje w dwóch równoległych światach:

```
BIBLIOTEKA (dane referencyjne)          KOSZTORYS (źródło prawdy)
══════════════════════════              ══════════════════════════
pozycje_biblioteka                      kosztorys_pozycje
├── skladowe_robocizna                  ├── skladowe_robocizna
│   (norma_domyslna, stawka_domyslna)   │   (stawka, norma, ilosc, is_manual)
└── skladowe_materialy                  └── skladowe_materialy
    (norma_domyslna, cena_domyslna)         (cena, norma, ilosc, is_manual)

SZABLONY (sugestie)                     EDYTOWALNA KOPIA → zamrożona po lock
```

**Kluczowa zasada:** kosztorys KOPIUJE wartości z biblioteki/cenników przy tworzeniu. Od tego momentu jest niezależny. Cennik zmienił się? Kosztorys nie.

---

## 2. Mapa Relacji (Pozycja-Centric)

```
                    HIERARCHIA KODÓW
                    kategorie (BUD → BUD.03 → BUD.03.01)
                         │
                         │ kategoria_id (FK)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              POZYCJA BIBLIOTEKA                          │
│  kod (BUD.03.01.001), nazwa, typ, jednostka              │
├─────────────────────────────────────────────────────────┤
│  skladowe_robocizna[]          skladowe_materialy[]       │
│  (opis, norma_domyslna)        (nazwa, norma, produkt_id) │
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────┐           ┌───────────────────┐
│  podwykonawcy    │           │    produkty        │
│  (nazwa, spec.)  │           │  (sku, nazwa)      │
└────────┬─────────┘           └─────────┬──────────┘
         │                               │
         ▼                               ▼
┌────────────────────┐         ┌──────────────────────┐
│ stawki_podwykonawcow│        │  ceny_dostawcow       │
│ UNIQUE(podwyk_id,  │         │  UNIQUE(dostawca_id,  │
│   pozycja_bib_id)  │         │         produkt_id)   │
│ stawka (zł/j)      │         │  cena_netto (zł/j)    │
└────────────────────┘         └──────────────────────┘
```

**Many-to-many w bibliotece:** wielu podwykonawców może wycenić tę samą pozycję, wielu dostawców może mieć cenę na ten sam produkt.

**1:1 w kosztorysie:** per pozycja kosztorysu wybierasz jednego podwykonawcę (preferowanego lub najtańszego).

---

## 3. Trójstopniowe Odkrywanie Cen

Identyczny algorytm dla materiałów i robocizny:

### Materiały (`getCenaMaterialu`):
1. **Ręczny override** → `kosztorys_skladowe_materialy.cena` (edytowane bezpośrednio)
2. **Preferowany dostawca** → `ceny_dostawcow WHERE dostawca_id = preferowany`
3. **Najtańszy** → `MIN(cena_netto) FROM ceny_dostawcow WHERE produkt_id = X`

### Robocizna (`getStawkaRobocizny`):
1. **Ręczny override** → `kosztorys_skladowe_robocizna.stawka`
2. **Preferowany podwykonawca** → `stawki_podwykonawcow WHERE podwykonawca_id = preferowany`
3. **Najtańszy** → `MIN(stawka) FROM stawki_podwykonawcow WHERE pozycja_biblioteka_id = X`

### Kalkulacja pozycji:
```
R = SUM(norma × stawka) × ilosc  +  SUM(manual: ilosc × stawka)
M = SUM(norma × cena) × ilosc    +  SUM(manual: ilosc × cena)
Razem = (R + M) × (1 + narzut% / 100)
```

---

## 4. Cykl Życia Projektu (State Machine)

```
┌─────────┐   wyślij    ┌────────────┐   akceptuj   ┌────────────┐
│  DRAFT  │────────────→│ OFERTOWANIE│─────────────→│ REALIZACJA │
│(buduj   │             │(klient     │              │(zamówienia,│
│kosztorys│←────────────│ decyduje)  │              │ umowy)     │
└─────────┘ nowa rewizja└─────┬──────┘              └─────┬──────┘
                              │ odrzuć                     │ zakończ
                        ┌─────▼──────┐              ┌─────▼──────┐
                        │ ODRZUCONY  │              │  ZAMKNIĘTY │
                        └────────────┘              └────────────┘
```

| Status | Rewizja edytowalna? | Zamówienia? | Umowy? |
|--------|---------------------|-------------|--------|
| `draft` | Tak (unlocked) | Nie | Nie |
| `ofertowanie` | Nie (locked). Można tworzyć nową rewizję → draft | Nie | Nie |
| `realizacja` | Nie. Zaakceptowana rewizja zamrożona | Tak | Tak |
| `zamkniety` | Nie | Zakończone | Zakończone |
| `odrzucony` | Nie | N/A | N/A |

---

## 5. Flow Akceptacji (NOWY)

**Przejście:** `ofertowanie` → `realizacja`

```
1. Użytkownik wybiera rewizję do akceptacji (musi być locked)
2. System:
   a) SET rewizje.is_accepted = TRUE, accepted_at = NOW()
   b) SET projekty.accepted_rewizja_id = rewizja_id
   c) SET projekty.status = 'realizacja'
   d) Trigger: nie można już odblokować zaakceptowanej rewizji
3. Opcjonalnie: auto-generuj draft zamówień i umów
```

**Co jest zamrożone?** Nic nowego nie trzeba kopiować! Istniejący mechanizm `is_locked` + triggery (`trigger_check_revision_locked`, `trigger_check_skladowe_locked`) już blokują edycję. Dodajemy tylko:
- `is_accepted` na `rewizje` (permanentny lock)
- `accepted_rewizja_id` na `projekty` (wskaźnik)

### Zmiany w istniejących tabelach:
```sql
ALTER TABLE rewizje ADD COLUMN is_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE rewizje ADD COLUMN accepted_at TIMESTAMPTZ;

ALTER TABLE projekty ADD COLUMN accepted_rewizja_id UUID REFERENCES rewizje(id);
```

### Nowy trigger (blokada odblokowania zaakceptowanej rewizji):
```sql
CREATE OR REPLACE FUNCTION trigger_prevent_unlock_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_accepted = TRUE AND NEW.is_locked = FALSE THEN
        RAISE EXCEPTION 'Nie można odblokować zaakceptowanej rewizji';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Flow Zamówień Materiałów (NOWY)

### Model: zbiorcze per dostawca, z podziałem na etapy (etapy = later)

```
AKCEPTACJA KOSZTORYSU
        │
        ▼
  Agreguj materiały per dostawca
  (GROUP BY dostawca_id, produkt_id)
        │
        ▼
  Generuj DRAFT zamówień
  (1 zamówienie per dostawca)
        │
        ▼
  Użytkownik przegląda/edytuje
  (zaokrąglenia, podział na transze)
        │
        ▼
  Wyślij do dostawcy → WYSŁANE
        │
        ▼
  Loguj dostawy → CZĘŚCIOWO / DOSTARCZONE
        │
        ▼
  Dopasuj faktury → ROZLICZONE
```

### Cykl życia zamówienia:
```
DRAFT → WYSŁANE → CZĘŚCIOWO_DOSTARCZONE → DOSTARCZONE → ROZLICZONE
```

### Nowe tabele:

**`zamowienia`** - nagłówek zamówienia
| Pole | Typ | Opis |
|------|-----|------|
| id | UUID PK | |
| organization_id | UUID FK | |
| projekt_id | UUID FK→projekty | |
| rewizja_id | UUID FK→rewizje | która rewizja wygenerowała |
| dostawca_id | UUID FK→dostawcy | |
| numer | VARCHAR(50) UNIQUE | ZAM/2026/001 |
| status | zamowienie_status | draft/wyslane/czesciowo/dostarczone/rozliczone |
| data_zamowienia | DATE | |
| data_dostawy_planowana | DATE | |
| uwagi | TEXT | |

**`zamowienie_pozycje`** - linie zamówienia (zagregowane z kosztorysu)
| Pole | Typ | Opis |
|------|-----|------|
| id | UUID PK | |
| zamowienie_id | UUID FK | |
| produkt_id | UUID FK→produkty | referencyjna (nawigacja) |
| nazwa | VARCHAR(255) | ZAMROŻONA nazwa produktu |
| jednostka | VARCHAR(20) | ZAMROŻONA |
| ilosc_zamowiona | DECIMAL | zagregowana ilość |
| cena_jednostkowa | DECIMAL | ZAMROŻONA z kosztorysu |
| wartosc | DECIMAL GENERATED | ilosc × cena |
| ilosc_dostarczona | DECIMAL | śledzenie dostaw |

**`zamowienie_pozycje_zrodla`** - link do składowych kosztorysu
| Pole | Typ | Opis |
|------|-----|------|
| zamowienie_pozycja_id | UUID FK | |
| kosztorys_skladowa_m_id | UUID FK | która składowa materiałowa |
| ilosc | DECIMAL | ile z tej składowej |

**`zamowienie_dostawy`** + **`zamowienie_dostawy_pozycje`** - log dostaw częściowych

### SQL agregacji (generowanie zamówień):
```sql
SELECT
    ksm.dostawca_id,
    ksm.produkt_id,
    p.nazwa AS produkt_nazwa,
    p.jednostka,
    ksm.cena AS cena_jednostkowa,
    SUM(CASE WHEN ksm.is_manual
        THEN ksm.ilosc
        ELSE ksm.norma * kp.ilosc
    END) AS ilosc_total
FROM kosztorys_skladowe_materialy ksm
JOIN kosztorys_pozycje kp ON kp.id = ksm.kosztorys_pozycja_id
JOIN produkty p ON p.id = ksm.produkt_id
WHERE kp.rewizja_id = :accepted_rewizja_id
GROUP BY ksm.dostawca_id, ksm.produkt_id, p.nazwa, p.jednostka, ksm.cena
```

---

## 7. Flow Umów z Podwykonawcami (NOWY)

### Model: jedna umowa ramowa per podwykonawca per projekt

```
AKCEPTACJA KOSZTORYSU
        │
        ▼
  Agreguj robociznę per podwykonawca
  (GROUP BY podwykonawca_id, pozycja_biblioteka_id)
        │
        ▼
  Generuj DRAFT umów
  (1 umowa per podwykonawca + załącznik cennikowy)
        │
        ▼
  Użytkownik przegląda/negocjuje stawki
        │
        ▼
  Wyślij → WYSŁANA → Podpisz → PODPISANA
        │
        ▼
  Śledź postęp prac → WYKONANA
        │
        ▼
  Rozlicz → ROZLICZONA
```

### Cykl życia umowy:
```
DRAFT → WYSŁANA → PODPISANA → WYKONANA → ROZLICZONA
```

### Nowe tabele:

**`umowy`** - nagłówek umowy
| Pole | Typ | Opis |
|------|-----|------|
| id | UUID PK | |
| organization_id | UUID FK | |
| projekt_id | UUID FK→projekty | |
| rewizja_id | UUID FK→rewizje | |
| podwykonawca_id | UUID FK→podwykonawcy | |
| numer | VARCHAR(50) UNIQUE | UMW/2026/001 |
| status | umowa_status | draft/wyslana/podpisana/wykonana/rozliczona |
| data_podpisania | DATE | |
| warunki_platnosci | TEXT | |
| uwagi | TEXT | |

**`umowa_pozycje`** - załącznik cennikowy (pozycje w umowie)
| Pole | Typ | Opis |
|------|-----|------|
| id | UUID PK | |
| umowa_id | UUID FK | |
| pozycja_biblioteka_id | UUID FK | referencyjna |
| nazwa | VARCHAR(500) | ZAMROŻONA nazwa pozycji |
| jednostka | VARCHAR(20) | ZAMROŻONA |
| ilosc | DECIMAL | zagregowana z kosztorysu |
| stawka | DECIMAL | ZAMROŻONA z kosztorysu |
| wartosc | DECIMAL GENERATED | ilosc × stawka |
| ilosc_wykonana | DECIMAL | śledzenie postępu |
| procent_wykonania | DECIMAL GENERATED | ilosc_wykonana / ilosc × 100 |

**`umowa_pozycje_zrodla`** - link do składowych kosztorysu

---

## 8. Strategia Zamrażania Danych

```
CZAS ──────────────────────────────────────────────────────────→

BIBLIOTEKA        KOSZTORYS          KOSZTORYS           ZAMÓWIENIA
(live)            (edytowalny)       (locked+accepted)   / UMOWY
═════════         ═══════════        ═════════════        ════════
ceny_dostawcow ─COPY→ ksm.cena    ─LOCK→ ksm.cena     ─COPY→ zam_poz.cena
stawki_podwyk  ─COPY→ ksr.stawka  ─LOCK→ ksr.stawka   ─COPY→ um_poz.stawka
pozycje_bib    ─COPY→ kp.nazwa    ─LOCK→ kp.nazwa     ─COPY→ zam/um.nazwa

SUGESTIE          KOPIA ROBOCZA      ZAMROŻONY SNAPSHOT   KOPIA OPERACYJNA
```

**Zasada:** każdy etap KOPIUJE wartości liczbowe i nazwy. FK-i (produkt_id, dostawca_id, podwykonawca_id) pozostają jako live references do nawigacji, ale wartości (cena, stawka, nazwa) są zamrożone.

---

## 9. Realizacja - Śledzenie (NOWY)

**Tabela `realizacja_wpisy`** - wpisy kosztowe (faktury):
| Pole | Typ | Opis |
|------|-----|------|
| id | UUID PK | |
| organization_id | UUID FK | |
| projekt_id | UUID FK | |
| zamowienie_id | UUID FK (opt) | powiązane zamówienie |
| umowa_id | UUID FK (opt) | powiązana umowa |
| typ | material/robocizna/inny | |
| opis | VARCHAR(500) | |
| kwota_netto | DECIMAL | |
| numer_faktury | VARCHAR(100) | |
| data_faktury | DATE | |
| oplacone | BOOLEAN | |

### Dashboard realizacji:

Dwie zakładki: **Checklista** (domyślna) i **Wpisy**.

**Zakładka Checklista** — operacyjny przegląd zamówień i umów:
```
┌────────────────────────────────────────────────────────────┐
│ ZAMÓWIENIA MATERIAŁÓW                          4/6 ✓      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☐ ZAM/2026/001  Hurtownia Atlas   10 780 zł  Szkic →│   │
│ │ ☑ ZAM/2026/002  Elektro-Hurt      18 432 zł  Dost.  │   │
│ │ ...                                                   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ UMOWY Z PODWYKONAWCAMI                         3/5 ✓      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☐ UMW/2026/001  Ekipa Budmont     23 376 zł  Szkic →│   │
│ │ ☑ UMW/2026/002  Tynki-Expres       4 560 zł  Podp.  │   │
│ │ ...                                                   │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Logika statusu "done":**
- Zamówienie done: `status IN ('wyslane', 'czesciowo', 'dostarczone', 'rozliczone')`
- Umowa done: `status IN ('podpisana', 'wykonana', 'rozliczona')`

Każdy wiersz jest linkiem do strony szczegółowej (`/zamowienia?detail=ID` / `/umowy?detail=ID`).

**Zakładka Wpisy** — tabela faktur kosztowych (istniejący widok):
```
┌─────────────────────────────────────────────────┐
│ Projekt: Biuro XYZ     Status: REALIZACJA       │
├────────────────────┬────────────┬────────┬──────┤
│                    │  PLANOWANE │RZECZYW.│   %  │
│ Materiały:         │  650 000   │423 000 │ 65%  │
│ Robocizna:         │  380 000   │195 000 │ 51%  │
│ Narzut:            │  309 000   │   -    │  -   │
│ RAZEM:             │1 339 000   │618 000 │ 46%  │
└─────────────────────────────────────────────────┘
```

**Sidebar KPI** (widoczny na obu zakładkach):
- Budżet: materiały + robocizna + razem (progress bars green/amber/red)
- Zamówienia: per-status breakdown + **progress bar** (done/total)
- Umowy: per-status breakdown + **progress bar** (done/total) + % wykonania

Planowane = z `rewizje_summary` (zaakceptowana rewizja)
Rzeczywiste = z `realizacja_wpisy` (dopasowane faktury)

---

## 10. Kompletny Flow End-to-End

```
1. BIBLIOTEKA (master data)
   └─ Użytkownik definiuje pozycje + składowe + cenniki
      └─ podwykonawcy wyceniają pozycje (stawki_podwykonawcow)
      └─ dostawcy wyceniają produkty (ceny_dostawcow)

2. KOSZTORYS (draft)
   └─ Użytkownik tworzy projekt → rewizja 0
   └─ Dodaje pozycje z biblioteki → KOPIUJE wartości
   └─ System kalkuluje R+M+narzut (view)
   └─ Użytkownik edytuje (override cen, norm, ilości)

3. OFERTOWANIE
   └─ Lock rewizji → wyślij klientowi
   └─ Klient negocjuje → nowa rewizja (deep copy) → edytuj → lock

4. AKCEPTACJA (przejście do realizacji)
   └─ Klient akceptuje → is_accepted=true
   └─ System generuje draft zamówień (per dostawca)
   └─ System generuje draft umów (per podwykonawca)

5. ZAMÓWIENIA
   └─ Przegląd/edycja → wyślij do dostawcy
   └─ Loguj dostawy (częściowe)
   └─ Dopasuj faktury → rozlicz

6. UMOWY
   └─ Przegląd/negocjacja → wyślij → podpisz
   └─ Śledź postęp prac (% wykonania per pozycja)
   └─ Rozlicz

7. REALIZACJA (dashboard)
   └─ Planowane vs. rzeczywiste
   └─ Status zamówień i umów
   └─ Cashflow
```

---

## 11. Nowe Typy Enum

```sql
CREATE TYPE zamowienie_status AS ENUM (
    'draft', 'wyslane', 'czesciowo', 'dostarczone', 'rozliczone'
);

CREATE TYPE umowa_status AS ENUM (
    'draft', 'wyslana', 'podpisana', 'wykonana', 'rozliczona'
);
```

---

## 12. Podsumowanie Nowych Tabel

| Moduł | Nowe tabele | Ilość |
|-------|-------------|-------|
| Akceptacja | (kolumny na rewizje + projekty) | 0 |
| Zamówienia | zamowienia, zamowienie_pozycje, zamowienie_pozycje_zrodla, zamowienie_dostawy, zamowienie_dostawy_pozycje | 5 |
| Umowy | umowy, umowa_pozycje, umowa_pozycje_zrodla | 3 |
| Realizacja | realizacja_wpisy | 1 |
| **Razem** | | **9 tabel + 2 enumy + 3 kolumny** |

---

## 13. Sugerowane Fazy Implementacji

| Faza | Moduł | Zależy od | ~Stories |
|------|-------|-----------|----------|
| 5 | Podwykonawcy CRUD | fazy 1-4 | 10 (gotowe) |
| 6 | Projekty + Rewizje | fazy 1-4 | ~8 |
| 7 | Kosztorys (CORE) | fazy 3-6 | ~20 |
| 8 | Kalkulatory | faza 7 | ~8 |
| 9 | Akceptacja + State Machine | faza 7 | ~6 |
| 10 | Zamówienia | faza 9 | ~12 |
| 11 | Umowy | faza 9 | ~10 |
| 12 | Realizacja Dashboard | fazy 10-11 | ~8 |
| 13 | Etapy (przyszłość) | faza 12 | ~10 |

---

## 14. Przyszłość: Etapy

Gdy będą potrzebne, architektura rozszerza się naturalnie:

```sql
CREATE TABLE etapy (
    id UUID PK,
    projekt_id UUID FK→projekty,
    numer INTEGER,
    nazwa VARCHAR(255)  -- "Piętro 1", "Lobby"
);

-- Dodaj etap_id do:
ALTER TABLE kosztorys_pozycje ADD COLUMN etap_id UUID REFERENCES etapy(id);
ALTER TABLE zamowienia ADD COLUMN etap_id UUID REFERENCES etapy(id);
ALTER TABLE umowy ADD COLUMN etap_id UUID REFERENCES etapy(id);
```

Pozwala na: zamówienia per etap, umowy per etap, budżetowanie per etap.

---

## 15. Kluczowe Decyzje Architektoniczne

| Decyzja | Wybór | Dlaczego |
|---------|-------|----------|
| Zamrażanie | Istniejące triggery `is_locked` | Już działa, nie trzeba snapshot tables |
| Akceptacja | `is_accepted` flaga na rewizji | Minimalna zmiana, reuse lock infra |
| Zamówienia | Zbiorcze per dostawca | Decyzja użytkownika + standard branży |
| Umowy | 1 ramowa per podwykonawca per projekt | Decyzja użytkownika + praktyka PL |
| Etapy | Później | YAGNI - na razie zbyt wcześnie |
| Dane zamrożone | Wartości KOPIOWANE + FK-i live | Nazwy/ceny zamrożone, FK do nawigacji |
| Przypisanie | Biblioteka M:N, Kosztorys 1:1 | Cennik = porównanie ofert, kosztorys = wybór |

---

## Ten dokument jest planem logiki biznesowej - nie implementacją.
Będzie służył jako referencja przy budowie kolejnych faz aplikacji.
