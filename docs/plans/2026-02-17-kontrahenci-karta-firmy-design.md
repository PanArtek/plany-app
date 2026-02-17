# Kontrahenci — Pełna Karta Firmy

> Data: 2026-02-17
> Branch: `ralph/kontrahenci-karta-firmy`
> Base: `main`

## Przegląd

Rozszerzenie modułów Podwykonawcy i Dostawcy o pełną kartę firmy: dane rejestrowe do umów, ocenę, historię realizacji. Cel — przyspieszenie pracy PM-a/kosztorysanta (wszystko pod ręką, kopiowanie do umów jednym klikiem).

Dodatkowy seed data z pliku Excel (PODWYKONAWCY_ZABUDOWY_MEBLOWE.xlsx): 9 stolarni jako podwykonawcy, 7 hurtowni płyt jako dostawcy.

## Decyzje projektowe

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|-------------|
| Podział firm z Excela | Stolarnie → podwykonawcy, Hurtownie → dostawcy | Naturalny podział: usługa vs materiał |
| Nowe pola | Rozszerzenie obu tabel osobno | Brak zmian w istniejącym kodzie, prostota |
| Ocena | Globalna (1-5), ręczna | Wystarczająca na tym etapie |
| Historia realizacji | Automatyczna z kosztorysów (read-only) | Bez ręcznego wpisywania, dane z powiązań |
| Dane do umowy w formularzu | Collapsible sekcja | PM nie musi wypełniać od razu |

## Migracja DB

```sql
-- Rozszerzenie podwykonawcy
ALTER TABLE podwykonawcy
  ADD COLUMN IF NOT EXISTS nazwa_pelna VARCHAR(500),
  ADD COLUMN IF NOT EXISTS nip VARCHAR(13),
  ADD COLUMN IF NOT EXISTS regon VARCHAR(14),
  ADD COLUMN IF NOT EXISTS krs VARCHAR(10),
  ADD COLUMN IF NOT EXISTS adres_siedziby TEXT,
  ADD COLUMN IF NOT EXISTS osoba_reprezentujaca VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS strona_www VARCHAR(500),
  ADD COLUMN IF NOT EXISTS nr_konta VARCHAR(32),
  ADD COLUMN IF NOT EXISTS uwagi TEXT,
  ADD COLUMN IF NOT EXISTS ocena SMALLINT CHECK (ocena BETWEEN 1 AND 5);

-- Rozszerzenie dostawcy
ALTER TABLE dostawcy
  ADD COLUMN IF NOT EXISTS nazwa_pelna VARCHAR(500),
  ADD COLUMN IF NOT EXISTS nip VARCHAR(13),
  ADD COLUMN IF NOT EXISTS regon VARCHAR(14),
  ADD COLUMN IF NOT EXISTS krs VARCHAR(10),
  ADD COLUMN IF NOT EXISTS adres_siedziby TEXT,
  ADD COLUMN IF NOT EXISTS osoba_reprezentujaca VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS strona_www VARCHAR(500),
  ADD COLUMN IF NOT EXISTS nr_konta VARCHAR(32),
  ADD COLUMN IF NOT EXISTS uwagi TEXT,
  ADD COLUMN IF NOT EXISTS ocena SMALLINT CHECK (ocena BETWEEN 1 AND 5);
```

## UI — Rozszerzony formularz

```
┌──────────────────────────────────────────┐
│ Dodaj podwykonawcę                  [✕]  │
├──────────────────────────────────────────┤
│ PODSTAWOWE                               │
│ Nazwa*          [Akccent              ]  │
│ Specjalizacja   [Meble na wymiar      ]  │
│ Ocena           [★★★★★ ▾]               │
│                                          │
│ KONTAKT                                  │
│ Telefon         [501 234 567          ]  │
│ Email           [biuro@akccent.pl     ]  │
│ Strona www      [akccent.pl           ]  │
│                                          │
│ ▶ DANE DO UMOWY (collapsible)            │
│ Pełna nazwa     [Akccent Sp. z o.o.  ]  │
│ NIP             [521-123-45-67        ]  │
│ REGON           [123456789           ]  │
│ KRS             [0000123456          ]  │
│ Adres siedziby  [ul. Meblowa 5,      ]  │
│                 [02-100 Warszawa     ]  │
│ Osoba repr.     [Jan Kowalski        ]  │
│ Nr konta        [PL61 1090 1014...   ]  │
│                                          │
│ UWAGI                                   │
│ [Textarea - notatki wewnętrzne       ]  │
│                                          │
│              [Zapisz]  [Anuluj]          │
└──────────────────────────────────────────┘
```

Ten sam layout dla dostawców (z polem `kod` zamiast `specjalizacja`).

## "Kopiuj dane do umowy"

Przycisk na detail panelu — kopiuje do schowka:

```
Akccent Sp. z o.o.
NIP: 521-123-45-67, REGON: 123456789, KRS: 0000123456
ul. Meblowa 5, 02-100 Warszawa
Reprezentowany przez: Jan Kowalski
Nr konta: PL61 1090 1014 0000 0000 1234 5678
```

Pomija puste pola. Wspólny komponent `CopyContractData` reużywany w obu modułach.

## Detail panel — Historia realizacji

```
┌──────────────────────────────────────────┐
│ Ekipa "Akccent"                          │
│ ★★★★★  Meble na wymiar                  │
├──────────────────────────────────────────┤
│ Kontakt / Dane do umowy / ...            │
├──────────────────────────────────────────┤
│ Cennik stawek (4)            [+ Dodaj]   │
│ MEB.01.001  Zabudowa kuchenna  120 zł/mb │
│ ...                                      │
├──────────────────────────────────────────┤
│ Historia realizacji (3)                  │
│ 📋 Biuro Clienta X    2025-11   32 400 zł │
│ 📋 Lokal Klienta Y    2025-08   18 200 zł │
│ 📋 Biuro ABC           2025-03   45 100 zł │
│                                          │
│ Łącznie: 95 700 zł z 3 projektów         │
└──────────────────────────────────────────┘
```

Dane z: `kosztorys_skladowe_robocizna` / `kosztorys_skladowe_materialy` → JOIN `kosztorys_pozycje` → `kosztorysy` → `projekty`. Grupowane per projekt, sumowane wartości. Read-only.

## Seed data

### Podwykonawcy (9 stolarni z Excela)

| Nazwa | Specjalizacja | Ocena |
|-------|--------------|-------|
| Akccent | Meble na wymiar, zabudowy biurowe | 5 |
| Pracownia Kogut | Meble na wymiar, kuchnie | 5 |
| Mebbble.pl | Meble biurowe, zabudowy | 4 |
| Maxmeble | Meble na wymiar | 4 |
| Ekta Meble | Meble na wymiar, zabudowy | 4 |
| Projekt Gabinetu | Meble gabinetowe, biurowe | 4 |
| Blue Meble | Meble na wymiar | 3 |
| Rozbicki Meble | Meble na wymiar | 3 |
| 10office | Meble biurowe | 3 |

### Dostawcy (7 hurtowni z Excela)

| Nazwa | Kod | Ocena |
|-------|-----|-------|
| FlexMeble / ŚwiatPłyt.pl | FLX | 5 |
| W.M.-FORMAT | WMF | 5 |
| ETS Nova | ETS | 4 |
| Centrum.meble.pl | CEN | 4 |
| Płyta-Meblowa.pl | PLM | 3 |
| Stolarnia Cito | CIT | 3 |
| Płytwior | PLW | 3 |

Kontakt, uwagi, www — wypełnione z Excela. Stawki/ceny puste — do uzupełnienia ręcznie.

## Zakres zmian

**Co zmieniamy:**
1. Migracja DB — ALTER obu tabel + seed data
2. Walidacje Zod — rozszerzenie schematów
3. Server Actions — update CRUD o nowe pola
4. Form panele — rozbudowa o 3 sekcje (collapsible "Dane do umowy")
5. Detail panele — nowe dane + przycisk "Kopiuj dane do umowy"
6. Komponent `CopyContractData` — wspólny, reużywalny
7. Historia realizacji — nowa sekcja na detail panelu
8. Regeneracja typów

**Czego NIE ruszamy:**
- Tabele stawek/cen
- Tabela/widoki kosztorysu
- Logika cennikowa
- Filtrowanie, paginacja

## User Stories

| ID | Tytuł | Zależy od | Priorytet |
|----|-------|-----------|-----------|
| US-001 | Migracja DB: rozszerzenie podwykonawcy i dostawcy o kartę firmy | - | 1 |
| US-002 | Seed data: 9 stolarni + 7 hurtowni z Excela | US-001 | 1 |
| US-003 | Regeneracja typów TypeScript | US-001 | 2 |
| US-004 | Walidacje Zod: rozszerzenie schematów obu modułów | US-003 | 2 |
| US-005 | Server Actions: rozszerzenie CRUD podwykonawcy o nowe pola | US-004 | 3 |
| US-006 | Server Actions: rozszerzenie CRUD dostawcy o nowe pola | US-004 | 3 |
| US-007 | Form panel podwykonawcy: sekcje Kontakt + Dane do umowy + Uwagi | US-005 | 4 |
| US-008 | Form panel dostawcy: sekcje Kontakt + Dane do umowy + Uwagi | US-006 | 4 |
| US-009 | Komponent CopyContractData + integracja w detail panelach | US-005, US-006 | 5 |
| US-010 | Detail panel: sekcja Historia realizacji (podwykonawcy) | US-005 | 5 |
| US-011 | Detail panel: sekcja Historia realizacji (dostawcy) | US-006 | 5 |
| US-012 | Typecheck + build verification | US-007..US-011 | 6 |
