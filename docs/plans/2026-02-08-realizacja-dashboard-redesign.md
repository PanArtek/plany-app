# Realizacja Dashboard Redesign

**Data:** 2026-02-08
**Status:** Zatwierdzony

## Cel

Przebudowa zakładki "Realizacja" w projekcie z prostego trackera wydatków na **hub operacyjny projektu** — centrum dowodzenia z checklistą zamówień do wysłania i umów do podpisania.

## Kontekst

Obecna realizacja to:
- Sidebar KPI (budżet planowane vs rzeczywiste + podsumowanie zamówień/umów)
- Tabela wpisów kosztowych z CRUD, filtrami, sortowaniem
- Slide panele (formularz + szczegóły wpisu)

Po akceptacji rewizji system auto-generuje draft zamówień (per dostawca) i umów (per podwykonawca). Brakuje widoku który pokazuje "co jeszcze trzeba zrobić" — jakie zamówienia wysłać, jakich podwykonawców zakontraktować.

## Design

### Układ strony

```
┌─────────────────────────────────────────────────────┐
│  REALIZACJA (przebudowana)                          │
│                                                     │
│  ┌─── Sidebar KPI ────────────┐ ┌─── Content ────┐ │
│  │ Budżet (jak teraz)         │ │                 │ │
│  │ Zamówienia + progress bar  │ │  TABS:          │ │
│  │ Umowy + progress bar       │ │  [Checklista    │ │
│  │                            │ │   | Wpisy]      │ │
│  │                            │ │                 │ │
│  └────────────────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Zakładki

- **Checklista** (domyślna) — actionable lista zamówień i umów
- **Wpisy** — obecna tabela wydatków (przenoszona 1:1 bez zmian)
- Stan zakładki w URL: `?tab=checklista|wpisy`
- Sidebar KPI widoczny na obu zakładkach

### Checklista

Dwie grupy generowane automatycznie z istniejących zamówień i umów:

```
ZAMÓWIENIA MATERIAŁÓW                          3/5 ✓
─────────────────────────────────────────────────────
✓  ZAM/2026/001  Hilti Polska     12 450 zł  dostarczone
✓  ZAM/2026/002  Knauf Sp.z.o.o   8 200 zł   wysłane
◻  ZAM/2026/003  Siniat           15 800 zł   draft    [→]
◻  ZAM/2026/004  Baumit           3 100 zł    draft    [→]
◻  ZAM/2026/005  Rockwool         6 700 zł    draft    [→]

UMOWY Z PODWYKONAWCAMI                         1/3 ✓
─────────────────────────────────────────────────────
✓  UMW/2026/001  ElektroPro       podpisana   45%
◻  UMW/2026/002  HydroInstal      draft       0%  [→]
◻  UMW/2026/003  MalBud           draft       0%  [→]
```

**Każdy wiersz:**
- Status wizualny (checkbox — "zrobione" gdy status >= wysłane/podpisana)
- Numer zamówienia/umowy
- Nazwa dostawcy/podwykonawcy
- Kwota (wartość zamówienia/umowy)
- Status badge z kolorem
- Dla umów: % wykonania
- Przycisk [→] — link do szczegółów zamówienia/umowy

**Logika "zrobione":**
- Zamówienie: status >= `wysłane` (wysłane, częściowo, dostarczone, rozliczone)
- Umowa: status >= `podpisana` (podpisana, wykonana, rozliczona)

**Sortowanie:** draft na górze (do zrobienia), potem reszta chronologicznie.

### Rozbudowany Sidebar KPI

Zmiany vs obecny sidebar:

1. **Zamówienia** — dodany progress bar: ile zamówień >= `wysłane` / total
2. **Umowy** — dodany progress bar: ile umów >= `podpisana` / total, średni % wykonania
3. **Budżet** — bez zmian

Linki `→ zobacz` przełączają na zakładkę Checklista.

### Dane

Page.tsx ładuje równolegle:
- `getRealizacjaStats()` — jak teraz
- `getRealizacjaWpisy()` — jak teraz
- `getZamowieniaForSelect()` — jak teraz
- `getUmowyForSelect()` — jak teraz
- **NOWE:** `getZamowieniaChecklista(projektId)` — zamówienia z dostawcą i statusem
- **NOWE:** `getUmowyChecklista(projektId)` — umowy z podwykonawcą i statusem

Nowe akcje to proste SELECTy z istniejących tabel.

## Scope

**Zmiany w istniejących plikach:**
- `realizacja-view.tsx` — tabs (checklista/wpisy), stan zakładki z URL
- `realizacja-sidebar.tsx` — progress bary dla zamówień/umów
- `page.tsx` — dwa nowe fetche równoległe

**Nowe pliki:**
- `_components/realizacja-checklista.tsx` — lista zamówień + umów
- Dwie nowe funkcje w `actions/realizacja.ts`

**Czego NIE robimy:**
- Zero nowych tabel DB / migracji
- Bez harmonogramu
- Bez widoku multi-project
- Wpisy tab — zero zmian
- Logika akceptacji — bez zmian
