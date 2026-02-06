# Feature Design: Materialy + Dostawcy (Faza 4)

**Data:** 2026-02-06
**Branch:** `ralph/phase4-materialy-dostawcy`
**Status:** Design approved

## Decyzje projektowe

| Pytanie | Decyzja |
|---------|---------|
| Organizacja modułów | Dwa osobne widoki: `/materialy` i `/dostawcy` |
| Filtrowanie materiałów | Po hierarchii pozycji (branza → kategoria → podkategoria) |
| Zarządzanie cennikiem | Edytowalny tylko z Dostawcy, read-only w Materiałach |
| Panele UI | Slide panele (Sheet) dla obu modułów |
| Dane początkowe | Seed data z wireframe + pełny CRUD |
| Tabela materiałów | Pełna agregacja (pozycje, dostawcy, najlepsza cena) |

---

## Architektura i struktura plików

```
app/(app)/materialy/
├── page.tsx                          # Server Component - fetch + filtrowanie
└── _components/
    ├── materialy-view.tsx            # Client - state, breadcrumb, layout
    ├── materialy-table.tsx           # Client - TanStack Table z agregacją
    ├── materialy-filters.tsx         # Client - branza tabs + cascading dropdowns
    └── panels/
        ├── material-detail-panel.tsx # Slide panel - read-only: dostawcy, pozycje
        ├── material-form-panel.tsx   # Slide panel - add/edit produkt
        └── delete-confirm-panel.tsx  # Reuse z kategorie

app/(app)/dostawcy/
├── page.tsx
└── _components/
    ├── dostawcy-view.tsx
    ├── dostawcy-table.tsx
    ├── dostawcy-filters.tsx          # Search + toggle aktywność
    └── panels/
        ├── dostawca-detail-panel.tsx  # Slide panel - kontakt, cennik CRUD, pozycje
        ├── dostawca-form-panel.tsx    # Slide panel - add/edit dostawca
        ├── cennik-form-panel.tsx      # Slide panel - add/edit cena w cenniku
        └── delete-confirm-panel.tsx

actions/
├── materialy.ts                      # CRUD produkty + query z agregacją
├── dostawcy.ts                       # CRUD dostawcy + ceny_dostawcow

lib/validations/
├── materialy.ts                      # Zod schemas: createProduktSchema, filters
├── dostawcy.ts                       # Zod schemas: createDostawcaSchema, createCenaSchema
```

Data flow: `page.tsx` (Server) fetchuje z filtrem → `*-view.tsx` (Client) zarządza stanem UI → tabela wyświetla → slide panel do CRUD → server action → revalidatePath.

---

## Moduł Materiały

### Filtry

Góra strony: breadcrumb + wiersz filtrów (identyczne z Pozycjami).

- **Branza tabs**: `BUD | ELE | SAN | TEL | HVC` - full-width, flex-1, amber glow na aktywnej. Klik = URL param `?branza=BUD`.
- **Kategoria dropdown** (320px): pojawia się po wyborze branży. Pobiera kategorie z poziomu 2 dla wybranej branży.
- **Podkategoria dropdown** (320px): pojawia się po wyborze kategorii.
- **Search**: input po prawej stronie, debounce 300ms, szuka po nazwie i SKU produktu.
- **Zakładka "Wszystkie"**: domyślna - pokazuje wszystkie produkty bez filtra branżowego. Ważne dla produktów-sierot (nieprzypisanych do pozycji).

### Tabela (TanStack Table)

| Kolumna | Dane | Format |
|---------|------|--------|
| **Nazwa** | `produkty.nazwa` + `produkty.sku` | Nazwa bold, SKU pod spodem `font-mono text-amber-500 text-xs` |
| **Jednostka** | `produkty.jednostka` | `text-white/50` |
| **Pozycje** | COUNT z `biblioteka_skladowe_materialy` | `font-mono`, np. "3 pozycje" |
| **Dostawcy** | COUNT z `ceny_dostawcow` | `font-mono`, np. "2 dostawców" |
| **Najlepsza cena** | MIN z `ceny_dostawcow.cena_netto` | `font-mono text-amber-500`, np. "42,50 zł" lub "—" |

Query: LEFT JOIN na `biblioteka_skladowe_materialy` (przez `produkt_id`) → `pozycje_biblioteka` → `kategorie` dla filtrowania po branży. Agregacja przez `GROUP BY produkty.id`.

Paginacja: 15 items/page, ten sam wzorzec co Pozycje.

Klik na wiersz → otwiera detail panel (slide z prawej).

### Detail Panel (read-only)

Otwiera się po kliknięciu wiersza tabeli. Nagłówek: nazwa produktu + SKU + jednostka. Dwa przyciski w headerze: **Edytuj** (ołówek) i **Usuń** (kosz).

**Sekcja 1: "Dostawcy z cenami"**
- Lista dostawców oferujących ten produkt (z `ceny_dostawcow`)
- Sortowana rosnąco po cenie
- Każdy wiersz: nazwa dostawcy + cena netto + jednostka
- Najlepsza cena oznaczona badge `NAJLEPSZA` (amber)
- Jeśli brak dostawców: "Brak dostawców w cenniku"
- **Read-only** - edycja cennika tylko z widoku Dostawcy

**Sekcja 2: "Używany w pozycjach (N)"**
- Lista pozycji z `biblioteka_skladowe_materialy` gdzie `produkt_id` = ten produkt
- Każdy wiersz: kod pozycji (`font-mono amber`) + nazwa pozycji
- Klik na pozycję → nawigacja do `/pozycje?selected=id`
- Jeśli brak: "Nie jest używany w żadnej pozycji"

### Form Panel (add/edit)

Formularz w slide panelu. Pola:
- **SKU** - text input, wymagane, unikalne per organizacja
- **Nazwa** - text input, wymagane
- **Jednostka** - select: m², mb, szt, l, kg, opak, kpl (domyślnie "szt")
- **Aktywny** - checkbox (domyślnie true)

Tryb "edit" prefilluje dane. Submit → server action → toast → zamknij panel.

### Delete Panel

Reuse komponentu `DeleteConfirmPanel`. Blokada usuwania jeśli produkt jest używany w pozycjach lub cenniku dostawców (sprawdzenie w server action).

---

## Moduł Dostawcy

### Filtry

Prostszy zestaw (dostawca to niezależna encja, nie ma powiązania z hierarchią branż):

- **Search**: input, debounce 300ms, szuka po nazwie dostawcy i kodzie
- **Aktywność**: opcjonalny toggle "Pokaż nieaktywnych" (domyślnie ukryci)

Bez branza tabs. Breadcrumb: "Dostawcy".

### Tabela (TanStack Table)

| Kolumna | Dane | Format |
|---------|------|--------|
| **Nazwa** | `dostawcy.nazwa` | Bold, główna kolumna |
| **Kod** | `dostawcy.kod` | `font-mono text-amber-500 text-xs`, lub "—" jeśli brak |
| **Produkty** | COUNT z `ceny_dostawcow` | `font-mono`, np. "12 produktów" |
| **Kontakt** | `dostawcy.kontakt` | `text-white/50`, obcięty do 1 linii |

Sortowanie domyślne po nazwie. Paginacja: 15 items/page.

Klik na wiersz → otwiera detail panel z pełnym cennikiem i danymi kontaktowymi.

### Detail Panel

Nagłówek: nazwa dostawcy + kod. Przyciski: **Edytuj** i **Usuń**.

**Sekcja 1: "Dane kontaktowe"**
- Kontakt (tekst, może być multi-line: telefon, email, adres)
- Read-only w detail view, edytowalne w form panel

**Sekcja 2: "Cennik produktów (N)"**
- Lista wszystkich produktów dostawcy z `ceny_dostawcow`
- Każdy wiersz: SKU (`font-mono amber`) + nazwa produktu + cena netto + jednostka
- Przycisk **"+ Dodaj produkt"** na górze sekcji → otwiera cennik-form-panel
- Każdy wiersz ma ikony: **edytuj** (ołówek) i **usuń** (kosz) po prawej
- Edytuj → cennik-form-panel w trybie edit
- Usuń → inline confirm (bez osobnego panelu)

**Sekcja 3: "Używany w pozycjach (N)"** (opcjonalna)
- Pozycje gdzie materiały tego dostawcy są referencjonowane w `biblioteka_skladowe_materialy`
- Klik → nawigacja do `/pozycje?selected=id`

### Form Panel (add/edit dostawca)

- **Nazwa** - text, wymagane
- **Kod** - text, opcjonalne (np. skrót: "LER", "CAS")
- **Kontakt** - textarea (telefon, email, adres w jednym polu)
- **Aktywny** - checkbox

### Cennik Form Panel (add/edit cena)

- **Produkt** - searchable select z `produkty` (SKU + nazwa), wymagane
- **Cena netto** - number input, wymagane, `DECIMAL(12,2)`
- **Aktywny** - checkbox

Constraint: para (dostawca_id, produkt_id) jest unikalna - server action sprawdza duplikat.

---

## Server Actions

### `actions/materialy.ts`

```
getMaterialy(filters)     → lista produktów z agregacją (pozycje count, dostawcy count, min cena)
getProdukt(id)            → szczegóły produktu
getProduktDostawcy(id)    → dostawcy z cenami dla produktu (sorted by cena ASC)
getProduktPozycje(id)     → pozycje używające produktu
createProdukt(input)      → insert do produkty, revalidatePath('/materialy')
updateProdukt(id, input)  → update produkty, revalidatePath('/materialy')
deleteProdukt(id)         → check: ceny_dostawcow + biblioteka_skladowe_materialy,
                            jeśli używany → error, jeśli nie → soft delete (aktywny=false)
```

**Filtrowanie `getMaterialy`**: query budowany dynamicznie:
- Brak filtra branży → wszystkie produkty
- Z branżą → JOIN `biblioteka_skladowe_materialy` → `pozycje_biblioteka` → `kategorie` WHERE `pelny_kod LIKE 'BUD%'`
- Search → `ilike` na `nazwa` i `sku`
- Agregacja w jednym query: LEFT JOIN + COUNT DISTINCT + MIN

### `actions/dostawcy.ts`

```
getDostawcy(filters)       → lista dostawców z count produktów
getDostawca(id)            → szczegóły dostawcy
getDostawcaCennik(id)      → produkty z cenami (JOIN produkty)
getDostawcaPozycje(id)     → pozycje referencjonujące materiały dostawcy
createDostawca(input)      → insert, revalidatePath('/dostawcy')
updateDostawca(id, input)  → update, revalidatePath('/dostawcy')
deleteDostawca(id)         → check: ceny_dostawcow, jeśli ma cennik → error
createCena(input)          → insert do ceny_dostawcow, revalidatePath('/dostawcy') + revalidatePath('/materialy')
updateCena(id, input)      → update ceny_dostawcow, revalidate oba
deleteCena(id)             → delete z ceny_dostawcow, revalidate oba
```

**Ważne**: mutacje na `ceny_dostawcow` revalidują **oba** paths (`/materialy` i `/dostawcy`), bo zmiana cennika wpływa na agregację "najlepsza cena" w tabeli materiałów.

---

## Seed data

Z wireframe'u:
- **~15-20 produktów** (płyty GK, farby, płytki, kable, rury itp.)
- **~5-6 dostawców** (Leroymerlin, Castorama, hurtownie specjalistyczne)
- **~30-40 wpisów ceny** (powiązania produkt-dostawca-cena)

Seed jako migracja SQL lub server action.

---

## User Stories (Ralph)

```
MAT-001: Zod schemas dla produkty i ceny_dostawcow
MAT-002: Server Actions - getMaterialy z agregacją i filtrowaniem
MAT-003: Server Actions - CRUD produkty (create, update, delete z walidacją)
MAT-004: Materialy page.tsx + materialy-view.tsx (layout, breadcrumb, state)
MAT-005: Materialy filters (branza tabs, cascading dropdowns, search)
MAT-006: Materialy table (TanStack, 5 kolumn, paginacja)
MAT-007: Material detail panel (dostawcy read-only, pozycje z linkami)
MAT-008: Material form panel (add/edit produkt)
DOST-001: Server Actions - CRUD dostawcy + ceny_dostawcow
DOST-002: Dostawcy page + view + table + filters
DOST-003: Dostawca detail panel z cennikiem CRUD
DOST-004: Dostawca form panel + cennik form panel + delete
DOST-005: Seed data (produkty + dostawcy + ceny_dostawcow)
```

### Kolejność wykonania

```
MAT-001 (schemas)
  ↓
MAT-002 + MAT-003 (server actions)
  ↓
MAT-004 + MAT-005 + MAT-006 (UI - równolegle)
  ↓
MAT-007 + MAT-008 (panele)
  ↓
DOST-001 (server actions dostawcy)
  ↓
DOST-002 + DOST-003 + DOST-004 (UI dostawcy - równolegle)
  ↓
DOST-005 (seed data - na końcu, bo wymaga obu modułów)
```

---

## Tabele DB (już zdefiniowane)

Tabele `produkty`, `dostawcy`, `ceny_dostawcow` są w pełni zdefiniowane w `docs/DATABASE-ARCHITECTURE.md` (sekcja 3.4). RLS policies gotowe (sekcja 3.9). Triggery `updated_at` gotowe (sekcja 3.8).

## Wzorce UI (referencja)

Moduły podążają za wzorcami ustalonymi w Kategorie i Pozycje:
- Dark theme: `#0A0A0F` bg, amber-500 akcenty, glass morphism panele
- Slide panele: shadcn Sheet component
- Filtry: URL-driven state z debounced search
- Tabele: TanStack React Table z sticky header
- Toasty: Sonner, polskie komunikaty
- Walidacja: Zod schemas współdzielone między UI a server actions
