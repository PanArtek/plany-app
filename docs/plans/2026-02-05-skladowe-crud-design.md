# Składowe dla Pozycji - Design Document

> Phase 3B rozszerzenie: dodawanie/edycja składowych (robocizna + materiały) w bibliotece pozycji

## Problem

Obecnie moduł Pozycji pozwala tylko wyświetlać składowe read-only. Użytkownik nie może dodawać, edytować ani usuwać składowych robocizny i materiałów dla pozycji bibliotecznej.

## Rozwiązanie

**Inline editing w detail panel** - przyciski [+ Dodaj], [✎], [×] bezpośrednio w sekcjach Robocizna/Materiały.

### Powody wyboru:
1. Naturalny flow - użytkownik widzi składowe i edytuje w miejscu
2. Minimalna liczba kliknięć dla częstej operacji
3. Spójność z wireframe

---

## UI Design

### Rozszerzona SkladoweSection

```
┌─ Robocizna ────────────────── [+ Dodaj] ─┐
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Montaż profili CW/UW    12.50 zł   │  │
│  │ 1.0 h × 12.50 zł/h       [✎] [×]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Szpachlowanie           8.00 zł    │  │
│  │ 0.5 h × 16.00 zł/h       [✎] [×]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Suma:                     20.50 zł      │
└──────────────────────────────────────────┘
```

### Modal Robocizna

```
┌─ Dodaj składową robocizny ───────────────┐
│                                          │
│  Opis *                                  │
│  ┌────────────────────────────────────┐  │
│  │ Montaż profili CW/UW               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─────────────┐  ┌─────────────┐        │
│  │ Norma *     │  │ Jednostka   │        │
│  │ 1.0         │  │ h      ▼    │        │
│  └─────────────┘  └─────────────┘        │
│                                          │
│  Stawka domyślna (zł)                    │
│  ┌────────────────────────────────────┐  │
│  │ 12.50                              │  │
│  └────────────────────────────────────┘  │
│  ℹ️ Opcjonalna. Można nadpisać w kosztorysie. │
│                                          │
│           [ Anuluj ]  [ Zapisz ]         │
└──────────────────────────────────────────┘
```

### Modal Materiały

```
┌─ Dodaj składową materiałową ─────────────┐
│                                          │
│  Nazwa *                                 │
│  ┌────────────────────────────────────┐  │
│  │ Płyta GK 12.5mm                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─────────────┐  ┌─────────────┐        │
│  │ Norma *     │  │ Jednostka   │        │
│  │ 1.05        │  │ m²     ▼    │        │
│  └─────────────┘  └─────────────┘        │
│                                          │
│  Cena domyślna (zł)                      │
│  ┌────────────────────────────────────┐  │
│  │ 18.50                              │  │
│  └────────────────────────────────────┘  │
│  ℹ️ Opcjonalna. Można powiązać z produktem później. │
│                                          │
│           [ Anuluj ]  [ Zapisz ]         │
└──────────────────────────────────────────┘
```

---

## Architektura

### Struktura plików

```
app/(app)/pozycje/_components/
├── pozycja-detail-panel.tsx      ← zarządza stanem modali
├── skladowe-section.tsx          ← MODYFIKACJA: dodaje przyciski
└── modals/
    ├── skladowa-robocizna-modal.tsx   ← NOWY
    ├── skladowa-material-modal.tsx    ← NOWY
    └── delete-skladowa-dialog.tsx     ← NOWY

actions/
└── skladowe.ts                   ← NOWY: CRUD dla składowych

lib/validations/
└── skladowe.ts                   ← NOWY: Zod schemas
```

### Flow danych

```
PozycjaDetailPanel
  │
  ├── state: { modalType, modalMode, editingSkladowa }
  │
  ├── SkladoweSection (robocizna)
  │     ├── onAdd → openModal('robocizna', 'add')
  │     ├── onEdit(item) → openModal('robocizna', 'edit', item)
  │     └── onDelete(item) → openDeleteDialog(item)
  │
  ├── SkladoweSection (materialy)
  │     └── ... analogicznie
  │
  ├── SkladowaRobociznaModal
  │     └── onSuccess → close + toast
  │
  ├── SkladowaMaterialModal
  │     └── onSuccess → close + toast
  │
  └── DeleteSkladowaDialog
        └── onConfirm → delete action + toast
```

---

## Server Actions

### actions/skladowe.ts

```typescript
'use server'

// === ROBOCIZNA ===
createSkladowaRobocizna(pozycjaId: string, data: CreateSkladowaRobociznaInput)
  → INSERT do biblioteka_skladowe_robocizna
  → auto-increment lp (MAX(lp) + 1 dla pozycji)
  → revalidatePath('/pozycje')

updateSkladowaRobocizna(id: string, data: UpdateSkladowaRobociznaInput)
  → UPDATE biblioteka_skladowe_robocizna
  → revalidatePath('/pozycje')

deleteSkladowaRobocizna(id: string)
  → DELETE z biblioteka_skladowe_robocizna
  → revalidatePath('/pozycje')

// === MATERIAŁY ===
createSkladowaMaterial(pozycjaId: string, data: CreateSkladowaMaterialInput)
updateSkladowaMaterial(id: string, data: UpdateSkladowaMaterialInput)
deleteSkladowaMaterial(id: string)
  → analogicznie
```

### Return type

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

---

## Validation Schemas

### lib/validations/skladowe.ts

```typescript
// Robocizna
export const createSkladowaRobociznaSchema = z.object({
  opis: z.string().min(1).max(500),
  norma_domyslna: z.number().positive(),
  jednostka: z.enum(['h', 'szt', 'kpl']).default('h'),
  stawka_domyslna: z.number().nonnegative().nullable().optional(),
});

// Materiały
export const createSkladowaMaterialSchema = z.object({
  nazwa: z.string().min(1).max(255),
  norma_domyslna: z.number().positive(),
  jednostka: z.enum(['m²', 'mb', 'szt', 'l', 'kg', 'kpl']).nullable().optional(),
  cena_domyslna: z.number().nonnegative().nullable().optional(),
});
```

---

## Plan implementacji

| ID | Tytuł | Zależności | Opis |
|----|-------|------------|------|
| SKL-001 | Validation schemas | - | Zod schemas w lib/validations/skladowe.ts |
| SKL-002 | Server Actions CRUD | SKL-001 | actions/skladowe.ts z 6 funkcjami |
| SKL-003 | Modal robocizny | SKL-002 | skladowa-robocizna-modal.tsx |
| SKL-004 | Modal materiałów | SKL-002 | skladowa-material-modal.tsx |
| SKL-005 | Interaktywna SkladoweSection | SKL-003, SKL-004 | Dodanie przycisków i callbacks |
| SKL-006 | Integracja w DetailPanel | SKL-005 | Stan modali, delete dialog |

---

## Pominięte (future scope)

- Powiązanie z podwykonawcą (`podwykonawca_id`) - wymaga modułu Podwykonawcy
- Powiązanie z produktem/dostawcą (`produkt_id`, `dostawca_id`) - wymaga modułu Materiały
- Drag & drop reordering składowych
- Bulk operations (kopiowanie składowych między pozycjami)

---

## Baza danych

Tabele już istnieją (005_biblioteka.sql):

- `biblioteka_skladowe_robocizna` - składowe robocizny
- `biblioteka_skladowe_materialy` - składowe materiałowe

Nie wymaga migracji.
