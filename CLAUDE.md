# PLANY App

Aplikacja do kosztorysowania fit-out komercyjnego - wyceny prac wykończeniowych biur i lokali.

## Komendy

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build - MUSI PRZEJŚĆ przed KAŻDYM COMMITEM
npm run lint     # ESLint
```

## Struktura

```
app/              # App Router (Server Components domyślnie)
components/ui/    # shadcn components (nie edytuj ręcznie)
components/       # Custom components
lib/supabase/     # Supabase clients (client.ts, server.ts)
actions/          # Server Actions ('use server')
stores/           # Zustand (tylko UI state)
docs/             # Dokumentacja projektu
```

## Konwencje

- **Server Components** domyślnie, `'use client'` tylko gdy potrzebne (hooks, onClick)
- **Server Actions** dla mutacji danych (`actions/*.ts` z `'use server'`)
- **revalidatePath()** po każdej mutacji w Supabase
- **Supabase client:** `createClient()` z `lib/supabase/client.ts` (browser) lub `server.ts` (server)
- **Kod hierarchii:** `BRANZA.KAT.PODKAT.NR` (np. `BUD.03.01.001`) - fundament całej aplikacji

## Gotchas

- `middleware.ts` odświeża sesję Supabase - nie usuwaj
- shadcn components w `components/ui/` - instaluj przez `npx shadcn@latest add`, nie edytuj ręcznie
- `.env.local` NIE JEST w repo - klucze Supabase są tam lokalnie
- `npm run build` MUSI przejść przed pushem - Vercel odrzuci broken build

## Development Workflow

```
1. PLANUJ    → brainstorming skill → docs/plans/YYYY-MM-DD-feature.md
2. KONWERTUJ → ralph skill         → scripts/ralph/prd.json
3. WYKONAJ   → ralph.sh            → implementacja
4. REVIEW    → github-workflow     → PR → main
5. DOCS      → doc-updater skill   → sync docs/
```

### 1. Planowanie (brainstorming + Context7)
```bash
# W Claude Code:
"zaplanuj feature X"  # używa brainstorming skill + Context7 dla docs
# Output: docs/plans/YYYY-MM-DD-feature-name.md
```

### 2. Konwersja do Ralph
```bash
# W Claude Code:
"konwertuj plan do prd.json"  # używa ralph skill
# Output: scripts/ralph/prd.json
```

### 3. Uruchomienie Ralph
```bash
./scripts/ralph/ralph.sh --tool claude 15
```

### 4. Review & Merge
```bash
# W Claude Code:
/commit              # git-commit skill
/pr                  # github-pr-creation skill
```

### 5. Dokumentacja
```bash
# W Claude Code:
"zaktualizuj dokumentację"  # doc-updater skill
```

## Ralph (pliki)

```
scripts/ralph/
├── prd.json       # Taski (state file)
├── progress.txt   # Log postępów
├── RALPH.md       # Kontekst agenta
└── ralph.sh       # Loop script
```

### Zasady prd.json
- **Task size:** < 10 min, mieści się w jednym context window
- **Acceptance criteria:** weryfikowalne (`npm run build`, `npm run test`, "Verify at localhost:3000/path")
- **Dependencies:** użyj `dependsOn: ["US-001"]` dla zależności
- **Zawsze dodaj:** `"Typecheck passes"` do każdego story

### prd.json schema
```json
{
  "project": "PLANY App",
  "branchName": "ralph/feature-name",
  "description": "Feature description",
  "mode": "feature",
  "baseBranch": "main",
  "userStories": [{
    "id": "US-001",
    "title": "Add feature X",
    "description": "As a user, I want...",
    "acceptanceCriteria": ["Criterion 1", "Typecheck passes"],
    "priority": 1,
    "passes": false,
    "notes": "",
    "dependsOn": []
  }]
}
```

## Reference

- Wireframe źródłowy: `/home/artur/Projekty/wireframe/`
- Plan migracji: `docs/MIGRATION-PLAN.md`
- Logika biznesowa: `/home/artur/Projekty/wireframe/docs/BUSINESS-LOGIC.md`
