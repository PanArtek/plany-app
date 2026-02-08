# Phase 8b - Kosztorys Interactions

## Kontekst

Phase 8a dostarczyła fundament kosztorysu: 3-kolumnowy layout (sidebar + tabela + panel szczegółów), CRUD pozycji, COPY z biblioteki, kalkulacje, locked revision. Phase 8b dodaje interakcje usprawniające pracę z kosztorysem.

## Scope

### IN SCOPE
1. **Override indicators (●)** - wizualne oznaczenie zmian vs biblioteka + reset per-pole + reset całej pozycji
2. **Dolny drawer biblioteki (Ctrl+B)** - zastępuje obecny SlidePanel "Dodaj z biblioteki"
3. **Multi-select + bulk operations** - checkboxy w tabeli + bulk delete + bulk narzut%

### OUT OF SCOPE
- Inline editing w tabeli (edycja tylko w panelu szczegółów)
- Client view toggle (eksport do Excela w przyszłości)
- Undo/Redo (reset do biblioteki wystarczy)
- Drag & drop
- Keyboard navigation (poza Ctrl+B)
- Clipboard operations
- Eksport PDF/Excel

---

## Feature 1: Override Indicators

### Opis
W panelu szczegółów (PozycjaDetailPanel) przy każdym edytowalnym polu składowej (stawka, cena, norma) pojawia się **pomarańczowa kropka ●** gdy wartość różni się od aktualnej wartości w bibliotece. Klik na kropkę resetuje to jedno pole do wartości z biblioteki.

Na dole panelu przycisk **"Resetuj do biblioteki"** resetuje wszystkie składowe pozycji do aktualnych wartości z biblioteki.

### Mechanizm porównania
- Pozycja kosztorysowa ma `pozycja_biblioteka_id` (FK do `pozycje_biblioteka`)
- Przy otwarciu panelu: fetch oryginalne wartości z `biblioteka_skladowe_robocizna` / `biblioteka_skladowe_materialy` dla tej pozycji biblioteki
- Porównanie: `kosztorys_skladowe.stawka !== biblioteka_skladowe.stawka_domyslna` → pokaż ●
- Kolumna `is_manual` (już istnieje w DB, nieużywana w UI) → ustawiaj `true` przy edycji, `false` przy resecie

### Reset per-pole
- Klik na ● przy polu → server action `resetSkladowaField(skladowaId, fieldName)`:
  - Pobiera wartość z biblioteki
  - Aktualizuje pole w kosztorys_skladowe
  - Ustawia `is_manual = false` (jeśli wszystkie pola zgodne z biblioteką)
  - `revalidatePath()`

### Reset całej pozycji
- Przycisk "Resetuj do biblioteki" na dole panelu
- Server action `resetToLibrary(pozycjaId)`:
  - Pobiera wszystkie składowe z `biblioteka_skladowe_robocizna/materialy` dla `pozycja_biblioteka_id`
  - Nadpisuje wartości w `kosztorys_skladowe_robocizna/materialy`
  - Ustawia `is_manual = false` na wszystkich składowych
  - Ponownie uruchamia 3-tier price discovery dla składowych materiałowych
  - `revalidatePath()`
- Dialog potwierdzenia przed resetem ("Czy na pewno chcesz zresetować wszystkie wartości do biblioteki?")

### UI w panelu
```
Składowe robocizna:
┌─────────────────────────────────────────┐
│ Murarz                                  │
│ Stawka: [45.00] ●   Norma: [1.2]       │
│ Podwykonawca: [Dropdown]               │
├─────────────────────────────────────────┤
│ Pomocnik                                │
│ Stawka: [25.00]     Norma: [0.8] ●     │
│ Podwykonawca: [Dropdown]               │
└─────────────────────────────────────────┘

Składowe materiały:
┌─────────────────────────────────────────┐
│ Płyta GK 12.5mm                         │
│ Cena: [32.50] ●    Norma: [1.05]       │
│ Dostawca: [Dropdown]                    │
└─────────────────────────────────────────┘

[Resetuj do biblioteki]  ← przycisk na dole
```

● = pomarańczowa kropka, klikalna, tooltip "Resetuj do wartości z biblioteki (X.XX)"

### Zmiany w API
- Rozszerzyć `getKosztorysPozycjaDetail()` o zwracanie wartości bibliotecznych (join z `biblioteka_skladowe_*`)
- Nowy action: `resetSkladowaToLibrary(skladowaId, type: 'robocizna' | 'material')`
- Nowy action: `resetPozycjaToLibrary(pozycjaId)`
- Modyfikacja `updateKosztorysSkladowaR/M` → ustawianie `is_manual = true`

---

## Feature 2: Dolny Drawer Biblioteki

### Opis
Zastępuje obecny SlidePanel "Dodaj z biblioteki". Drawer wysuwa się z dołu ekranu (Sheet z shadcn, `side="bottom"`), wysokość ~40vh. Toggle: Ctrl+B lub przycisk "+" w toolbarze.

### Layout drawera
```
┌──────────────────────────────────────────────────┐
│ Biblioteka pozycji                          [X]  │
│ [🔍 Szukaj...]  [Branża ▼] [Kategoria ▼] [Podkat ▼] │
├──────────────────────────────────────────────────┤
│ ☐  BUD.03.01.001  Ścianki GK 100mm    m²   3R 2M │
│ ☑  BUD.03.01.002  Ścianki GK 150mm    m²   2R 3M │
│ ☐  BUD.03.02.001  Sufit podwieszany   m²   1R 2M │  ← "Dodano" badge
│ ...                                              │
│ [Załaduj więcej...]                              │
├──────────────────────────────────────────────────┤
│                          [Dodaj 1 pozycję]       │
└──────────────────────────────────────────────────┘
```

### Filtry kaskadowe
- **Branża** (dropdown): BUD, ELE, SAN, TEL, HVC
- **Kategoria** (dropdown): ładuje się po wybraniu branży (filtruje po `parent_id` gdzie `poziom=1`)
- **Podkategoria** (dropdown): ładuje się po wybraniu kategorii (filtruje po `parent_id` gdzie `poziom=2`)
- **Wyszukiwanie**: po nazwie i kodzie (istniejący mechanizm)
- Reset filtrów po zamknięciu drawera

### Zachowanie
- Ctrl+B → toggle open/close
- Przycisk "+" w toolbarze tabeli → otwiera drawer
- Multi-select checkboxami
- "Dodano" badge (szary) przy pozycjach już w kosztorysie (nie blokuje ponownego dodania)
- Sticky footer: "Dodaj N pozycji" (amber, disabled gdy nic nie zaznaczone)
- Po dodaniu → drawer zamyka się → `revalidatePath()` → tabela odświeża
- Paginacja: "Załaduj więcej" (20 pozycji per batch)
- W trybie locked revision: drawer niedostępny (Ctrl+B ignorowany, przycisk "+" ukryty)

### Zmiany w API
- Modyfikacja `getLibraryPositions()` → dodanie filtrów `kategoriaId`, `podkategoriaId`
- Nowy action: `getKategorieForFilter(parentId?)` → zwraca kategorie dla kaskadowych dropdownów
- Batch add: wywołanie `addPositionFromLibrary()` w pętli (istniejący action)

### Usuwane komponenty
- `panels/add-from-library-panel.tsx` → zastąpiony drawerem

---

## Feature 3: Multi-select + Bulk Operations

### Opis
Kolumna checkboxów w tabeli kosztorysu. Toolbar z bulk akcjami pojawia się nad tabelą gdy zaznaczono ≥1 pozycji.

### Checkbox w tabeli
- Nowa kolumna po lewej (przed Lp)
- **Header checkbox**: zaznacz/odznacz wszystkie widoczne pozycje (z uwzględnieniem filtrów/grup)
- **Row checkbox**: zaznacz pojedynczą pozycję
- Klik na checkbox NIE otwiera panelu szczegółów
- Klik na resztę wiersza nadal otwiera panel
- W trybie locked revision: checkboxy ukryte

### Toolbar bulk (sticky nad tabelą)
```
┌──────────────────────────────────────────────────┐
│ ☑ Zaznaczono 3 pozycje  [Ustaw narzut %] [Usuń] │
└──────────────────────────────────────────────────┘
```

- **"Zaznaczono N pozycji"** - tekst informacyjny
- **"Ustaw narzut %"** (button) → Popover z:
  - Input liczbowy (narzut %)
  - Przycisk "Zastosuj"
  - Wywołuje nowy `bulkUpdateNarzut(ids[], narzutPercent)`
- **"Usuń"** (red button) → Dialog potwierdzenia ("Czy na pewno chcesz usunąć N pozycji?") → wywołuje istniejący `deleteKosztorysPozycje(ids[])`
- Po wykonaniu akcji: odznacz wszystkie, toolbar znika

### State management
- `selectedIds: Set<string>` w useState komponentu KosztorysView
- Przekazywane do KosztorysTable jako prop
- Header checkbox: toggle all visible position IDs
- Reset selection na: bulk action, zmiana filtra, zmiana rewizji

### Zmiany w API
- Nowy action: `bulkUpdateNarzut(pozycjaIds: string[], narzutPercent: number)`
  - UPDATE kosztorys_pozycje SET narzut_percent = $1 WHERE id = ANY($2)
  - `revalidatePath()`

---

## Podsumowanie zmian

### Nowe server actions (actions/kosztorys.ts)
1. `resetSkladowaToLibrary(skladowaId, type)` - reset jednej składowej
2. `resetPozycjaToLibrary(pozycjaId)` - reset wszystkich składowych pozycji
3. `bulkUpdateNarzut(pozycjaIds[], narzutPercent)` - bulk narzut
4. `getKategorieForFilter(parentId?)` - kategorie do kaskadowych dropdownów

### Modyfikacje istniejących actions
1. `getKosztorysPozycjaDetail()` - dodać join z biblioteka_skladowe_* (wartości referencyjne)
2. `updateKosztorysSkladowaR()` - ustawiać `is_manual = true`
3. `updateKosztorysSkladowaM()` - ustawiać `is_manual = true`
4. `getLibraryPositions()` - dodać filtry kategoriaId, podkategoriaId

### Nowe komponenty
1. `_components/library-drawer.tsx` - dolny drawer biblioteki
2. `_components/bulk-toolbar.tsx` - toolbar akcji bulk
3. `_components/override-indicator.tsx` - komponent ● z tooltip i onClick

### Modyfikowane komponenty
1. `_components/kosztorys-view.tsx` - state: selectedIds, drawer open, Ctrl+B listener
2. `_components/kosztorys-table.tsx` - kolumna checkboxów, bulk toolbar
3. `_components/panels/pozycja-detail-panel.tsx` - override indicators, reset buttons

### Usuwane komponenty
1. `_components/panels/add-from-library-panel.tsx` - zastąpiony drawer

### Zmiany DB
- Brak nowych migracji (kolumna `is_manual` już istnieje)
- Ewentualnie: index na `is_manual` jeśli potrzebny (raczej nie)

---

## Kolejność implementacji

1. **Override indicators** (US-001 → US-004)
   - Rozszerzenie API o wartości biblioteczne
   - Komponent override-indicator
   - Modyfikacja panelu szczegółów
   - Server actions: reset per-pole, reset pozycji

2. **Dolny drawer biblioteki** (US-005 → US-008)
   - Komponent library-drawer (Sheet bottom)
   - Filtry kaskadowe (branża → kategoria → podkategoria)
   - Multi-select + "Dodaj N pozycji"
   - Ctrl+B shortcut + usunięcie starego panelu

3. **Multi-select + bulk** (US-009 → US-012)
   - Kolumna checkboxów w tabeli
   - Bulk toolbar
   - Bulk delete (istniejący action)
   - Bulk narzut (nowy action)
