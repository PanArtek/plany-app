# PLANY App - Plan Migracji z Wireframe

## Źródło
- Wireframe: `/home/artur/Projekty/wireframe/`
- Dokumentacja: `/home/artur/Projekty/wireframe/docs/`

## Docelowy Stack
- Next.js 15 (App Router)
- shadcn/ui + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- TanStack Table
- Zustand (UI state only)

---

## FAZA 1: Database Schema (Supabase)

**Cel:** Utworzyć wszystkie tabele w Supabase na podstawie mock data.

**Tabele do utworzenia:**

### 1.1 Hierarchia kategorii
```
branzes (5 rekordów)
  - kod: TEXT PRIMARY KEY (BUD, ELE, SAN, TEL, HVC)
  - nazwa: TEXT
  - opis: TEXT

kategorie
  - kod: TEXT (np. "03")
  - branza_kod: TEXT FK → branzes
  - nazwa: TEXT
  - opis: TEXT
  - PRIMARY KEY (branza_kod, kod)

podkategorie
  - kod: TEXT (np. "01")
  - kategoria_kod: TEXT
  - branza_kod: TEXT
  - nazwa: TEXT
  - opis: TEXT
  - PRIMARY KEY (branza_kod, kategoria_kod, kod)
```

### 1.2 Pozycje kosztorysowe (biblioteka)
```
pozycje
  - kod: TEXT PRIMARY KEY (np. "BUD.03.01.001")
  - branza_kod: TEXT FK
  - kategoria_kod: TEXT FK
  - podkategoria_kod: TEXT FK
  - opis: TEXT
  - jednostka: TEXT (m2, m, szt, kpl)
  - notatki: TEXT
```

### 1.3 Materiały i dostawcy
```
produkty
  - sku: TEXT PRIMARY KEY
  - nazwa: TEXT
  - jednostka: TEXT
  - kategoria: TEXT

dostawcy
  - id: UUID PRIMARY KEY
  - nazwa: TEXT
  - email: TEXT
  - telefon: TEXT
  - kategorie: TEXT[]

cenniki_dostawcow
  - id: UUID PRIMARY KEY
  - produkt_sku: TEXT FK
  - dostawca_id: UUID FK
  - cena_netto: DECIMAL
  - data_aktualizacji: TIMESTAMP
```

### 1.4 Podwykonawcy
```
podwykonawcy
  - id: UUID PRIMARY KEY
  - nazwa: TEXT
  - specjalizacja: TEXT
  - kontakt: JSONB

stawki_podwykonawcow
  - id: UUID PRIMARY KEY
  - podwykonawca_id: UUID FK
  - pozycja_kod: TEXT FK
  - stawka_za_jednostke: DECIMAL
```

### 1.5 Projekty i kosztorysy
```
projekty
  - id: UUID PRIMARY KEY
  - nazwa: TEXT
  - klient: TEXT
  - adres: TEXT
  - status: TEXT (draft, active, completed)
  - created_at: TIMESTAMP

wersje_kosztorysu
  - id: UUID PRIMARY KEY
  - projekt_id: UUID FK
  - numer: INTEGER
  - status: TEXT (draft, locked, approved)
  - created_at: TIMESTAMP

pozycje_kosztorysu
  - id: UUID PRIMARY KEY
  - wersja_id: UUID FK
  - pozycja_kod: TEXT FK
  - ilosc: DECIMAL
  - cena_material_override: DECIMAL NULL
  - cena_robocizna_override: DECIMAL NULL
  - notatki: TEXT
```

### 1.6 Kalkulatory (opcjonalne)
```
kalkulatory
  - id: UUID PRIMARY KEY
  - typ: TEXT (farby, plytki, gk, sufity)
  - parametry: JSONB
  - wynik: JSONB
```

**Źródło danych:** `wireframe/js/data/*.js`

---

## FAZA 2: Podstawowa struktura UI

**Cel:** Layout, nawigacja, dark theme, podstawowe komponenty.

### 2.1 Layout i nawigacja
```
app/
  layout.tsx        # Root layout z dark theme
  page.tsx          # Redirect do /kosztorys lub dashboard

  (main)/
    layout.tsx      # Sidebar + header

    pozycje/
      page.tsx
    kategorie/
      page.tsx
    kalkulatory/
      page.tsx
    materialy/
      page.tsx
    podwykonawcy/
      page.tsx
    dostawcy/
      page.tsx
    projekty/
      page.tsx
    kosztorys/
      page.tsx
```

### 2.2 Komponenty shadcn do zainstalowania
```bash
npx shadcn@latest add button card dialog table tabs toast input select badge
```

### 2.3 Dark theme
- Konfiguracja Tailwind dla dark mode
- Kolory z wireframe (industrial AutoCAD style)
- Fonty: JetBrains Mono (kod), Plus Jakarta Sans (tekst)

### 2.4 Sidebar nawigacja
- 8 linków do widoków
- Ikony (Lucide)
- Active state

---

## FAZA 3: Biblioteka pozycji

**Cel:** CRUD dla hierarchii kategorii i pozycji.

### 3.1 Kategorie (najważniejsze - już przetestowane w wireframe)
- Widok z tabs dla 5 branż
- Karty kategorii (expandable)
- Podkategorie wewnątrz kart
- CRUD modals (add/edit/delete)
- Walidacja kodów i nazw

**Źródło:** `wireframe/js/views/kategorie.js` (768 linii)

### 3.2 Pozycje
- Tabela z filtrowaniem (branża, kategoria, search)
- Modal szczegółów pozycji
- Przypisane materiały i stawki

**Źródło:** `wireframe/js/views/pozycje.js`

---

## FAZA 4: Materiały i dostawcy

**Cel:** Zarządzanie produktami i cenami.

### 4.1 Materiały
- Agregacja produktów z najtańszą ceną
- Tabela z filtrami
- Modal szczegółów (wszystkie ceny od dostawców)

**Źródło:** `wireframe/js/views/materialy.js`

### 4.2 Dostawcy
- Lista dostawców z kontaktem
- Przypisane kategorie materiałów
- CRUD

**Źródło:** `wireframe/js/views/dostawcy.js`

### 4.3 Cenniki
- Edycja cen dla produktu/dostawcy
- Historia zmian cen

---

## FAZA 5: Podwykonawcy

**Cel:** Zarządzanie podwykonawcami i stawkami.

### 5.1 Lista podwykonawców
- Tabela z filtrami (specjalizacja)
- Dane kontaktowe
- CRUD

### 5.2 Stawki
- Przypisanie stawek do pozycji
- Edycja stawek

**Źródło:** `wireframe/js/views/podwykonawcy.js`

---

## FAZA 6: Kalkulatory

**Cel:** Specjalne kalkulatory pomocnicze.

### 6.1 Typy kalkulatorów
- Farby (na podstawie metrażu)
- Płytki (z fugą i stratami)
- Systemy GK (wysokość)
- Sufity podwieszane

### 6.2 Implementacja
- Formularze z parametrami
- Obliczenia w czasie rzeczywistym
- Eksport wyników do kosztorysu

**Źródło:** `wireframe/js/views/kalkulatory.js`

---

## FAZA 7: Moduł kosztorysowania (CORE)

**Cel:** Główna funkcjonalność aplikacji - tworzenie kosztorysów.

### 7.1 Tabela pozycji kosztorysu
- Pozycje z ilościami
- Ceny (materiał + robocizna + usługi)
- Sumy częściowe i całkowite
- Grupowanie po branżach

### 7.2 Edycja pozycji
- Modal z detalami
- Override cen (custom pricing)
- Składowe kosztów

### 7.3 KPIs
- Suma kosztorysu
- Rozbicie po branżach (% udziału)
- Szacowane czasy

### 7.4 Logika obliczeniowa
- `calculatePosition()` - suma dla pozycji
- `getEffectiveSkladowe()` - składowe z overrides
- Formatowanie walut (PLN)

**Źródło:** `wireframe/js/views/kosztorys.js` (73k linii - najsłożniejszy!)
**Utils:** `wireframe/js/utils/kosztorys.js`, `wireframe/js/utils/kosztorys-overrides.js`

---

## FAZA 8: Projekty i wersjonowanie

**Cel:** Zarządzanie projektami i wersjami kosztorysów.

### 8.1 Lista projektów
- Karty projektów
- Status (draft, active, completed)
- Ostatnia aktywność

### 8.2 Wersje kosztorysu
- Historia wersji
- Status (draft, locked, approved)
- Porównanie wersji (diff)

### 8.3 Blokowanie wersji
- Locked version = read-only
- Tworzenie nowej wersji z locked

**Źródło:** `wireframe/js/views/projekty.js`, `wireframe/js/data/projekty.js`

---

## Zależności między fazami

```
FAZA 1 (Database)
    ↓
FAZA 2 (UI Base)
    ↓
FAZA 3 (Kategorie + Pozycje)  ← fundamenty dla wszystkiego
    ↓
┌───────────────┬───────────────┐
↓               ↓               ↓
FAZA 4        FAZA 5          FAZA 6
(Materiały)   (Podwykonawcy)  (Kalkulatory)
└───────────────┴───────────────┘
                ↓
           FAZA 7 (Kosztorys) ← wymaga 3,4,5
                ↓
           FAZA 8 (Projekty)
```

---

## Priorytety

| Faza | Priorytet | Złożoność | Czas* |
|------|-----------|-----------|-------|
| 1. Database | CRITICAL | Medium | - |
| 2. UI Base | CRITICAL | Low | - |
| 3. Kategorie | HIGH | Medium | - |
| 4. Materiały | HIGH | Low | - |
| 5. Podwykonawcy | MEDIUM | Low | - |
| 6. Kalkulatory | LOW | Medium | - |
| 7. Kosztorys | CRITICAL | HIGH | - |
| 8. Projekty | HIGH | Medium | - |

*Nie podaję czasu - to zależy od granulacji tasków.

---

## Dokumentacja źródłowa

| Dokument | Ścieżka | Zawartość |
|----------|---------|-----------|
| Architektura | `wireframe/docs/ARCHITECTURE.md` | Docelowy stack |
| Logika biznesowa | `wireframe/docs/BUSINESS-LOGIC.md` | Reguły biznesowe |
| Model danych | `wireframe/docs/DATA-MODEL.md` | Mapowanie mock → Supabase |
| Moduły | `wireframe/docs/MODULES.md` | Dokumentacja każdego modułu |

---

## Jak używać tego planu

1. **Wybierz fazę** do implementacji
2. **Przeczytaj źródła** (pliki z wireframe)
3. **Rozbij na mniejsze taski** (user stories)
4. **Zapisz w `scripts/ralph/prd.json`**
5. **Uruchom Ralph** lub implementuj ręcznie

---

## Przykład rozbicia FAZY 3 na taski

```json
{
  "branchName": "feat/kategorie",
  "description": "Implementacja hierarchii kategorii",
  "userStories": [
    {
      "id": "KAT-001",
      "title": "Create kategorie Server Actions",
      "description": "Server Actions dla CRUD kategorii w Supabase",
      "priority": 1,
      "passes": false
    },
    {
      "id": "KAT-002",
      "title": "Create kategorie page with tabs",
      "description": "Strona /kategorie z tabs dla 5 branż",
      "priority": 2,
      "passes": false
    },
    {
      "id": "KAT-003",
      "title": "Implement kategoria cards",
      "description": "Karty kategorii z expand/collapse",
      "priority": 3,
      "passes": false
    }
  ]
}
```

---

## Notatki

- **Dark theme** jest kluczowy dla UX (industrial style jak AutoCAD)
- **Kod hierarchii** (BUD.03.01.001) jest fundamentem całej aplikacji
- **Kosztorys (Faza 7)** to 73k linii w wireframe - wymaga starannego rozbicia
- **Server Actions** zamiast API routes (Next.js 15 pattern)
- **Zustand** tylko dla UI state (expanded cards, filters) - dane w Supabase
