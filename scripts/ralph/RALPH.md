# Ralph Agent - PLANY App (Next.js + Supabase)

## CRITICAL: Before Starting Any Task
1. Read `prd.json` - find first story with `passes: false`
2. Check `dependsOn` - ensure all dependencies have `passes: true`
3. Work on ONE story at a time
4. After completion: verify ALL acceptance criteria

## Stack
- Frontend: Next.js 15 + shadcn/ui + TanStack Table
- Database: Supabase SDK (bez Drizzle)
- Auth: Supabase Auth
- State: Zustand (UI only)

## Komendy weryfikacji
```bash
npm run build    # MUSI PRZEJŚĆ przed commitem
npm run lint     # Opcjonalne ale zalecane
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

## Task Completion Checklist
For EACH story, before marking as complete:
- [ ] All acceptance criteria met
- [ ] `npm run build` passes
- [ ] Code committed with message: `feat: [STORY-ID] - title`
- [ ] Update `prd.json`: set `passes: true`, add notes if needed
- [ ] Append learnings to `progress.txt`

## Acceptance Criteria Rules
- Must be VERIFIABLE (not vague like "works correctly")
- Always include: `"Typecheck passes"` (run `npm run build`)
- For UI: `"Verify at localhost:3000/path using dev-browser skill"`
- For tests: `"Tests pass"` (run `npm run test`)

## Reference
- Wireframe: /home/artur/Projekty/wireframe/
- Dokumentacja: /home/artur/Projekty/wireframe/docs/
- Plan migracji: /home/artur/Projekty/plany-app/docs/MIGRATION-PLAN.md
- Business Logic: /home/artur/Projekty/wireframe/docs/BUSINESS-LOGIC.md
- Data Model: /home/artur/Projekty/wireframe/docs/DATA-MODEL.md
