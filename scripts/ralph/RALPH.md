# Ralph Agent - PLANY App (Next.js + Supabase)

## Stack
- Frontend: Next.js 15 + shadcn/ui + TanStack Table
- Database: Supabase SDK (bez Drizzle)
- Auth: Supabase Auth
- State: Zustand (UI only)

## Komendy weryfikacji
```bash
npm run build
npm run lint
```

## Struktura projektu
```
app/           → App Router routes
components/    → React components
components/ui/ → shadcn components
lib/supabase/  → Supabase clients (client.ts, server.ts, middleware.ts)
lib/           → Utilities
actions/       → Server Actions
stores/        → Zustand stores
```

## Patterns
- Server Components domyślnie
- 'use client' tylko gdy potrzebne (hooks, interaktywność)
- Server Actions dla mutacji (`'use server'` w actions/)
- `revalidatePath()` po zmianach danych
- Supabase client w browser: `createClient()` z `lib/supabase/client.ts`
- Supabase client w server: `createClient()` z `lib/supabase/server.ts`

## Supabase
- URL: https://tormvuvlcujetkagmwtc.supabase.co
- Keys in `.env.local`

## Git Workflow

**WAŻNE:** Po każdym ukończonym tasku:
1. `npm run build` - musi przejść!
2. `git add <zmienione pliki>`
3. `git commit -m "feat: [Story ID] - [Story Title]"`
4. `git push`

**Branch z PRD:** Sprawdź `branchName` w `prd.json` i pracuj na tym branchu.

**Commit format:**
```
feat: [STORY-ID] - krótki opis
```

## Reference
- Wireframe: /home/artur/Projekty/wireframe/
- Dokumentacja: /home/artur/Projekty/wireframe/docs/
- Plan migracji: /home/artur/Projekty/plany-app/docs/MIGRATION-PLAN.md
