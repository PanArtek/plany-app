# Przebudowa logiki biznesowej: Pozycja = Pakiet

**Data:** 2026-02-18
**Status:** Design approved

## Problem

Podwykonawcy, materialy, dostawcy nie sa powiazani z pozycjami w sposob widoczny i uzywalny:
- UI nie pokazuje powiazan
- Logika jest za posrednia (3 tabele zeby dojsc od pozycji do dostawcy)
- Kosztorys nie pozwala zmieniac dostawcow/podwykonawcow
- Bug w query stawki_podwykonawcow (cena_netto vs stawka)

## Model mentalny

**Pozycja biblioteczna = gotowy pakiet.** Domyslnie kompletna z przypisanymi dostawcami i podwykonawcami. W kosztorysie mozna zmienic.

### Symetryczny model

```
MATERIALY                              ROBOCIZNA
══════════                             ═════════
produkty                               typy_robocizny (NOWE!)
  farba, grunt, panele...                malowanie, szlifowanie, montaz...

ceny_dostawcow                         stawki_podwykonawcow (PRZEBUDOWANE)
  dostawca + produkt → cena              podwykonawca + typ_robocizny → stawka

biblioteka_skladowe_materialy          biblioteka_skladowe_robocizna
  produkt + domyslny dostawca            typ_robocizny + domyslny podwykonawca
  + norma (0.15 L/m2)                   + norma (0.05 h/m2)
```

### Przyklad pozycji "Malowanie scian"

```
Materialy:
  Farba Dulux biala   → MAT-BUD  → 45 zl/10L  x norma 0.15 L/m2
  Grunt akrylowy      → MAT-BUD  → 12 zl/5L   x norma 0.05 L/m2

Robocizna:
  Szlifowanie scian   → BudMont  → 15 zl/m2   x norma 1.0
  Malowanie 2 warstwy → BudMont  → 35 zl/m2   x norma 1.0
```

## Kosztorys - kopia pakietu z mozliwoscia zmiany

Kiedy dodajesz pozycje do kosztorysu:
1. Kopiuje skladowe z biblioteki
2. Pobiera ceny z cennika (aktualne, nie "domyslne")
3. Zapisuje snapshot - kosztorys jest niezalezny

### Zmiana dostawcy/podwykonawcy w kosztorysie

- Dropdown z cenami z cennika dla danego produktu/typu robocizny
- `cena_manualna` / `stawka_manualna` = NULL → cena z cennika (automatyczna)
- `cena_manualna` / `stawka_manualna` = wartosc → nadpisanie reczne
- Zmiana dostawcy/podwykonawcy → reset manualnej ceny, pobranie nowej z cennika

## Schemat bazy danych

### NOWA: typy_robocizny

```sql
typy_robocizny
  id              UUID PK
  organization_id UUID FK → organizations
  nazwa           TEXT NOT NULL        -- "Malowanie", "Szlifowanie"
  jednostka       TEXT DEFAULT 'm2'    -- m2, h, szt, mb
  opis            TEXT
  aktywny         BOOLEAN DEFAULT TRUE
  created_at      TIMESTAMPTZ
```

### PRZEBUDOWANA: stawki_podwykonawcow

```sql
-- BYLO:  podwykonawca_id + pozycja_biblioteka_id → stawka
-- TERAZ: podwykonawca_id + typ_robocizny_id      → stawka

stawki_podwykonawcow
  id                UUID PK
  organization_id   UUID FK
  podwykonawca_id   UUID FK → podwykonawcy      NOT NULL
  typ_robocizny_id  UUID FK → typy_robocizny     NOT NULL
  stawka            DECIMAL(12,2) NOT NULL
  aktywny           BOOLEAN DEFAULT TRUE
  UNIQUE(podwykonawca_id, typ_robocizny_id)
```

### PRZEBUDOWANA: biblioteka_skladowe_materialy

```sql
-- BYLO:  produkt_id (nullable), dostawca_id (nullable), cena_domyslna
-- TERAZ: produkt_id (required), dostawca_id (required), bez ceny domyslnej

biblioteka_skladowe_materialy
  id                    UUID PK
  pozycja_biblioteka_id UUID FK NOT NULL
  produkt_id            UUID FK → produkty   NOT NULL
  dostawca_id           UUID FK → dostawcy   NOT NULL
  norma                 DECIMAL(12,4) DEFAULT 1
  -- USUNIETE: cena_domyslna
```

### PRZEBUDOWANA: biblioteka_skladowe_robocizna

```sql
-- BYLO:  nazwa, opis, norma, stawka_domyslna, podwykonawca_id (nullable)
-- TERAZ: typ_robocizny_id (required), podwykonawca_id (required)

biblioteka_skladowe_robocizna
  id                    UUID PK
  pozycja_biblioteka_id UUID FK NOT NULL
  typ_robocizny_id      UUID FK → typy_robocizny   NOT NULL
  podwykonawca_id       UUID FK → podwykonawcy      NOT NULL
  norma                 DECIMAL(12,4) DEFAULT 1
  -- USUNIETE: nazwa, stawka_domyslna
```

### PRZEBUDOWANA: kosztorys_skladowe_materialy

```sql
kosztorys_skladowe_materialy
  id                    UUID PK
  kosztorys_pozycja_id  UUID FK NOT NULL
  produkt_id            UUID FK → produkty    NOT NULL
  dostawca_id           UUID FK → dostawcy    NOT NULL
  norma                 DECIMAL(12,4)
  cena                  DECIMAL(12,2)          -- snapshot z cennika
  cena_manualna         DECIMAL(12,2)          -- override (NULL = uzyj cena)
```

### PRZEBUDOWANA: kosztorys_skladowe_robocizna

```sql
kosztorys_skladowe_robocizna
  id                    UUID PK
  kosztorys_pozycja_id  UUID FK NOT NULL
  typ_robocizny_id      UUID FK → typy_robocizny  NOT NULL
  podwykonawca_id       UUID FK → podwykonawcy     NOT NULL
  norma                 DECIMAL(12,4)
  stawka                DECIMAL(12,2)              -- snapshot z cennika
  stawka_manualna       DECIMAL(12,2)              -- override (NULL = uzyj stawka)
```

### PRZEBUDOWANE: zamowienie_pozycje / umowa_pozycje

```sql
zamowienie_pozycje
  kosztorys_skladowa_material_id  UUID FK  -- zrodlo tej linii
  produkt_id                      UUID FK
  ilosc                           DECIMAL
  cena                            DECIMAL

umowa_pozycje
  kosztorys_skladowa_robocizna_id UUID FK  -- zrodlo tej linii
  typ_robocizny_id                UUID FK
  ilosc                           DECIMAL
  stawka                          DECIMAL
```

## Wplyw na zamowienia i umowy

Po akceptacji kosztorysu system grupuje po dostawcy/podwykonawcy:

- Skladowe materialy z tym samym dostawca_id → jeden DRAFT zamowienia
- Skladowe robocizny z tym samym podwykonawca_id → jedna DRAFT umowy
- zamowienie_pozycje/umowa_pozycje maja FK do kosztorys_skladowe → pelna traceability

## UI - powiazania widoczne wszedzie

### Nowe/zmienione strony

| Strona | Zmiana |
|--------|--------|
| `/typy-robocizny` | NOWA - CRUD lista typow prac |
| `/pozycje` detail | Pelny widok pakietu (materialy z dostawcami + robocizna z podwykonawcami) |
| `/dostawcy` detail | Sekcja "uzywany w pozycjach" |
| `/podwykonawcy` detail | Sekcja "uzywany w pozycjach" |
| `/projekty/[id]/kosztorys` | Dropdown zmiana dostawcy/podwykonawcy per skladowa |
| `/materialy` | Kolumna "w ilu pozycjach" |
| `/typy-robocizny` | Kolumna "w ilu pozycjach" |

### Nawigacja

```
Sidebar:
  Kategorie
  Pozycje
  Materialy (= produkty)
  Typy robocizny (NOWE)
  Dostawcy
  Podwykonawcy
  Projekty
```

## Strategia migracji

### Faza 1: Nowe tabele + migracja danych

1. CREATE TABLE typy_robocizny - wypelnic z istniejacych nazw skladowych
2. ALTER stawki_podwykonawcow - klucz na typ_robocizny zamiast pozycja_biblioteka
3. ALTER biblioteka_skladowe_materialy - FK NOT NULL, drop cena_domyslna
4. ALTER biblioteka_skladowe_robocizna - dodaj typ_robocizny_id, drop nazwa/stawka_domyslna
5. ALTER kosztorys_skladowe_* - dodaj manualne ceny, typ_robocizny_id, FK NOT NULL

### Faza 2: Nowe actions + UI

6. CRUD: typy_robocizny (strona + actions)
7. CRUD: stawki_podwykonawcow (przebudowa)
8. UI: pozycja detail - pelny widok pakietu
9. UI: dostawca/podwykonawca detail - sekcja "uzywany w pozycjach"
10. Przebudowa: addPositionFromLibrary - pobieranie cen z cennika
11. UI: kosztorys skladowe - dropdown zmiana dostawcy/podwykonawcy
12. Przebudowa: generowanie zamowien/umow z grupowaniem

### Faza 3: Seed data od nowa

13. Nowe seedy uwzgledniajace typy_robocizny
14. Powiazania w seedach: kazda pozycja = kompletny pakiet

## Przebudowane actions

| Action | Zmiana |
|--------|--------|
| `kosztorys.ts` | `addPositionFromLibrary` - pobieranie cen z cennika, fix buga |
| `kosztorys.ts` | Nowe: zmiana dostawcy/podwykonawcy per skladowa |
| `zamowienia.ts` | Generowanie z grupowaniem po dostawcy |
| `umowy.ts` | Generowanie z grupowaniem po podwykonawcy |
| NOWY `typy-robocizny.ts` | CRUD dla typow robocizny |

## Szacunkowa zlozonosc

~20 user stories dla Ralph
