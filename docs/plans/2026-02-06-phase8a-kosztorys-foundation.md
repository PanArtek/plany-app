# Phase 8a: Kosztorys Foundation

**Data:** 2026-02-06
**Branch:** `ralph/phase8a-kosztorys-foundation`
**Route:** `/projekty/[projektId]/kosztorys`
**Zależności:** Phase 1-7 (all complete)

## Cel

W pełni działająca strona kosztorysu — wyświetlanie pozycji z kalkulacjami, dodawanie z biblioteki (COPY pattern), edycja przez panel szczegółów, usuwanie, locked revision.

## Podział na fazy

- **Phase 8a** (ten plan): Foundation — layout, CRUD, kalkulacje, panel szczegółów
- **Phase 8b** (osobny plan): Interactions — inline editing, keyboard navigation, undo/redo, client view

---

## Routing & nawigacja

**Route:** `/projekty/[projektId]/kosztorys?rewizja=uuid`

**Struktura plików:**
```
app/(app)/projekty/[projektId]/kosztorys/
├── page.tsx                          # Server Component — fetch danych
└── _components/
    ├── kosztorys-view.tsx            # 'use client' — główny layout 3-kolumnowy
    ├── kosztorys-sidebar.tsx         # Drzewko branż
    ├── kosztorys-table.tsx           # TanStack Table z grupowaniem
    ├── kosztorys-summary.tsx         # KPI bar
    ├── rewizja-selector.tsx          # Dropdown wyboru rewizji
    ├── locked-banner.tsx             # Banner zamkniętej rewizji
    └── panels/
        ├── pozycja-detail-panel.tsx  # Panel szczegółów pozycji (R+M)
        ├── add-from-library-panel.tsx # Dodawanie z biblioteki
        └── delete-confirm-panel.tsx  # Potwierdzenie usunięcia
```

**Flow nawigacji:**
1. `/projekty` → klik wiersz → detail panel → przycisk "Otwórz kosztorys"
2. Navigacja do `/projekty/[projektId]/kosztorys`
3. `page.tsx` pobiera projekt + najnowszą rewizję + pozycje
4. Dropdown rewizji pozwala przełączać (zmiana searchParam `?rewizja=uuid`)

**Data fetching:**
```
page.tsx (Server)
  → reads params.projektId + searchParams.rewizja
  → calls getKosztorysData(projektId, rewizjaId?)
  → passes { projekt, rewizja, rewizje, pozycje } to KosztorysView
```

---

## Layout 3-kolumnowy

```
┌─────────────────────────────────────────────────────────┐
│  [← Projekty]  Projekt: Biuro XYZ  │  Rewizja: [v3 ▼]  │
├──────────┬──────────────────────────┬───────────────────┤
│ SIDEBAR  │        TABLE             │   DETAIL PANEL    │
│  260px   │        flex-1            │     400px         │
│          │                          │   (SlidePanel)    │
│ Drzewko  │  KPI Summary Bar         │                   │
│ branż    │  Tabela z grupowaniem    │  Składowe R+M     │
│          │                          │  Edycja/Override   │
├──────────┴──────────────────────────┴───────────────────┤
│              LOCKED BANNER (jeśli is_locked)             │
└─────────────────────────────────────────────────────────┘
```

- **Sidebar** — zawsze widoczny, collapsible branże
- **Detail panel** — SlidePanel z prawej, pojawia się po kliknięciu wiersza
- **Locked banner** — sticky na górze, gdy `rewizja.is_locked === true`

---

## Server Actions (`actions/kosztorys.ts`)

### READS

```typescript
getKosztorysData(projektId, rewizjaId?)
  → projekt + rewizje lista + aktywna rewizja
  → pozycje z kosztorys_pozycje_view (z kalkulacjami z bazy)
  → return { projekt, rewizje, rewizja, pozycje }

getKosztorysPozycjaDetail(pozycjaId)
  → pozycja + składowe_robocizna[] + składowe_materialy[]
  → dostępni podwykonawcy (dla dropdownów)
  → dostępni dostawcy (dla dropdownów)

getLibraryPositions(filters?)
  → pozycje_biblioteka z filtrami (do panelu "dodaj z biblioteki")
```

### WRITES

```typescript
addPositionFromLibrary(rewizjaId, pozycjaBibliotekaId)
  → COPY: kopiuje pozycję + składowe R/M z biblioteki
  → auto-nadaje lp (max+1)
  → 3-tier price discovery dla cen/stawek
  → revalidatePath

updatePozycja(pozycjaId, { nazwa, ilosc, jednostka, narzut_percent })
  → update kosztorys_pozycje
  → revalidatePath

updateSkladowaR(skladowaId, { stawka, podwykonawca_id })
  → update kosztorys_skladowe_robocizna
  → revalidatePath

updateSkladowaM(skladowaId, { cena, dostawca_id })
  → update kosztorys_skladowe_materialy
  → revalidatePath

deletePositions(pozycjaIds[])
  → cascade delete (składowe mają ON DELETE CASCADE)
  → revalidatePath

copyRevision(rewizjaId)
  → wywołuje DB function copy_revision()
  → redirect do nowej rewizji
```

---

## Tabela (TanStack Table)

### Kolumny

| Kolumna | Szerokość | Źródło | Edytowalne (8b) |
|---------|-----------|--------|-----------------|
| Lp | 60px | `lp` | nie (auto) |
| Kod | 120px | `pozycja_biblioteka.kod` | nie |
| Zadanie | flex | `nazwa` | tak |
| Ilość | 80px | `ilosc` | tak |
| Jedn. | 60px | `jednostka` | tak |
| R | 90px | `r_jednostkowy` (view) | nie (przez panel) |
| M | 90px | `m_jednostkowy` (view) | nie (przez panel) |
| Narzut % | 80px | `narzut_percent` | tak |
| Cena/j | 100px | calculated | nie (auto) |
| Wartość | 110px | `razem` (view) | nie (auto) |

### Grupowanie

```
▼ BUD — Budowlana                    Σ 125,400.00 zł
  ▼ BUD.03 — Ściany działowe          Σ  45,200.00 zł
      1  BUD.03.01.001  Ścianki GK    120 m²  ...  38,400.00
      2  BUD.03.01.002  Zabudowa GK    40 m²   ...   6,800.00
  ▼ BUD.04 — Wykończenie ścian         Σ  80,200.00 zł
      3  BUD.04.03.001  Malowanie     1850 m²  ...  80,200.00
▼ ELE — Elektryczna                   Σ  89,100.00 zł
```

- Nagłówki collapsible (klik zwija/rozwija)
- Sumy per branża i kategoria
- Filtrowanie przez sidebar

### Formatowanie

- Kwoty: `Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2 })` + ` zł`
- Ilości: bez końcowych zer
- Procenty: bez miejsc po przecinku

---

## Sidebar branża tree

```
┌─────────────────────┐
│ 🔍 Szukaj pozycji   │
├─────────────────────┤
│ Wszystkie      (12) │  ← aktywny = podświetlony
│                     │
│ ▼ BUD          (4)  │  ← klik = filtr + toggle
│    Ściany      (2)  │  ← klik = filtr po kategorii
│    Wykończenie (1)  │
│    Podłogi     (1)  │
│ ▶ ELE          (3)  │
│ ▶ SAN          (2)  │
│ ▶ TEL          (1)  │
│ ▶ HVC          (2)  │
└─────────────────────┘
```

- "Wszystkie" — cały kosztorys (domyślne)
- Klik branżę → filtruje tabelę + rozwija kategorie
- Klik kategorię → filtruje do tej kategorii
- Liczniki = count pozycji
- Szukaj → filtruje drzewko + tabelę po nazwie

**Stan:** lokalny `useState` w `kosztorys-view.tsx`:
```typescript
{ type: 'all' | 'branza' | 'kategoria', branzaKod?: string, kategoriaKod?: string }
```

---

## KPI Summary bar

```
┌──────────────────────────────────────────────────────┐
│ Wartość netto    Marża      Zysk       Cena/m²  Poz. │
│ 214,500.00 zł   28.4%   60,918 zł   171.60 zł   12  │
└──────────────────────────────────────────────────────┘
```

- Obliczane z `rewizje_summary` view
- `cena/m²` = suma_razem / projekt.powierzchnia
- Reaguje na filtr sidebar (sumy dla filtrowanej branży)

---

## Panel szczegółów pozycji

SlidePanel otwierany po kliknięciu wiersza.

```
┌─────────────────────────────────┐
│ ← Pozycja #3                    │
│ BUD > Wykończenie > Malowanie   │
├─────────────────────────────────┤
│ Nazwa: [Malowanie ścian 2x    ] │
│ Ilość: [1850]  Jedn: [m²]      │
│ Narzut: [28] %                  │
├─────────────────────────────────┤
│ ROBOCIZNA                       │
│ ┌───────────────────────────┐   │
│ │ Malarz       25.00 zł/h  │   │
│ │ norma: 0.12  [Podwyk ▼]  │   │
│ │ ● stawka nadpisana        │   │
│ ├───────────────────────────┤   │
│ │ Pomocnik     18.00 zł/h  │   │
│ │ norma: 0.08  [Podwyk ▼]  │   │
│ └───────────────────────────┘   │
│ Σ R jednostkowy: 4.46 zł/m²    │
├─────────────────────────────────┤
│ MATERIAŁY                       │
│ ┌───────────────────────────┐   │
│ │ Farba lateks  45.00 zł/l │   │
│ │ norma: 0.15  [Dostaw ▼]  │   │
│ │ ● cena nadpisana          │   │
│ ├───────────────────────────┤   │
│ │ Grunt          22.00 zł/l│   │
│ │ norma: 0.05  [Dostaw ▼]  │   │
│ └───────────────────────────┘   │
│ Σ M jednostkowy: 7.85 zł/m²    │
├─────────────────────────────────┤
│ R + M:        12.31 zł/m²      │
│ Narzut (28%):  3.45 zł/m²      │
│ Cena/jedn:    15.76 zł/m²      │
│ WARTOŚĆ:   29,156.00 zł         │
├─────────────────────────────────┤
│ [Resetuj do biblioteki] [Zapisz]│
└─────────────────────────────────┘
```

**Edycja składowych:**
- Klik na stawkę/cenę → inline input, zapis na blur/Enter
- Dropdown podwykonawcy/dostawcy → zmiana preferred → auto-wstawia cenę
- Override indicator (●) — wartość ≠ biblioteczna. Klik ● → reset jednej wartości

**"Resetuj do biblioteki":**
- Nadpisuje składowe R+M bieżącymi danymi z biblioteki
- Dialog potwierdzenia
- Tylko gdy `pozycja_biblioteka_id IS NOT NULL`

**Locked revision:** panel read-only, przyciski edycji ukryte.

---

## Dodawanie pozycji z biblioteki

Panel otwierany przyciskiem "+ Dodaj pozycję" w headerze.

- Multi-select checkboxami
- Filtrowanie: branża/kategoria dropdown + wyszukiwarka
- Pozycje już w rewizji → oznaczone "Dodano" (nie blokujemy duplikatów)

### COPY pattern

```
pozycje_biblioteka           → kosztorys_pozycje
  .nazwa                       .nazwa
  .jednostka                   .jednostka
  .id                          .pozycja_biblioteka_id
  —                            .ilosc = null (user wpisuje)
  —                            .narzut_percent = 30 (default)
  —                            .lp = auto (max+1)

biblioteka_skladowe_robocizna → kosztorys_skladowe_robocizna
  .opis                         .opis
  .norma                        .norma
  .jednostka                    .jednostka
  —                             .stawka = getEffectiveStawka()
  —                             .podwykonawca_id = preferred/cheapest

biblioteka_skladowe_materialy → kosztorys_skladowe_materialy
  .nazwa                        .nazwa
  .norma                        .norma
  .jednostka                    .jednostka
  .produkt_id                   .produkt_id
  —                             .cena = getEffectiveCena()
  —                             .dostawca_id = preferred/cheapest
```

### 3-tier price discovery (w momencie kopiowania)

1. Preferred supplier price (jeśli ustawiony)
2. Cheapest supplier price (min `cena_netto` z `ceny_dostawcow`)
3. Fallback: `0.00` (user wpisuje ręcznie)

---

## Locked revision banner

```
┌─────────────────────────────────────────────────────┐
│ 🔒 Rewizja v2 jest zamknięta. Edycja zablokowana.  │
│                        [Utwórz nową rewizję]        │
└─────────────────────────────────────────────────────┘
```

- Sticky pod headerem
- Gdy `is_locked === true`: ukrywa "+ Dodaj", "Usuń", panel read-only
- "Utwórz nową rewizję" → `copy_revision()` (DB function) → redirect

---

## Seed data

- 1 projekt testowy z 2 rewizjami (v1 locked, v2 active)
- 12 pozycji kosztorysowych: BUD(4), ELE(3), SAN(2), TEL(1), HVC(2)
- Składowe R+M dla każdej pozycji
- Powiązania z istniejącymi produktami, dostawcami, podwykonawcami

---

## User Stories (kolejność implementacji)

| # | ID | Story | Zależy od |
|---|-----|-------|-----------|
| 1 | KSZ-001 | `calculatePosition` + `getEffectiveSkladowe` utilities | — |
| 2 | KSZ-002 | Server Actions CRUD (`actions/kosztorys.ts`) | — |
| 3 | KSZ-003 | Route + page + layout 3-kolumnowy | — |
| 4 | KSZ-004 | Rewizja selector (dropdown + searchParam) | KSZ-003 |
| 5 | KSZ-005 | Sidebar branża tree z filtrami | KSZ-003 |
| 6 | KSZ-006 | KPI summary bar | KSZ-003, KSZ-002 |
| 7 | KSZ-007 | Main table (TanStack, grupowanie, formatowanie) | KSZ-003, KSZ-002, KSZ-005 |
| 8 | KSZ-008 | Add position from library (COPY + 3-tier + panel) | KSZ-002, KSZ-001 |
| 9 | KSZ-009 | Position detail panel (składowe R+M, edycja, override) | KSZ-002, KSZ-001 |
| 10 | KSZ-010 | Delete positions z potwierdzeniem | KSZ-002 |
| 11 | KSZ-011 | Locked revision banner + copy_revision | KSZ-004 |
| 12 | KSZ-012 | Seed kosztorys data | KSZ-002 |
