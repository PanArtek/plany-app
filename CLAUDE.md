# PLANY App - Kosztorysowanie budowlane

## Stack
- Next.js 15 (App Router)
- shadcn/ui + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- TanStack Table (planowane)
- Zustand (planowane)

## Komendy
```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

## Struktura
```
app/              # App Router
components/ui/    # shadcn components
components/       # Custom components
lib/supabase/     # Supabase clients
lib/              # Utilities
actions/          # Server Actions
stores/           # Zustand stores
```

## Supabase
- URL: https://tormvuvlcujetkagmwtc.supabase.co
- Browser client: `lib/supabase/client.ts`
- Server client: `lib/supabase/server.ts`
- Middleware: `lib/supabase/middleware.ts` + `middleware.ts`

## Ralph (autonomiczny agent)
```bash
cd /home/artur/Projekty/plany-app
./scripts/ralph/ralph.sh --tool claude 15
```

Pliki Ralph:
- `scripts/ralph/prd.json` - taski do wykonania
- `scripts/ralph/progress.txt` - log postępów
- `scripts/ralph/RALPH.md` - kontekst dla agenta

## Git Workflow

**Repo:** https://github.com/PanArtek/plany-app

**Branches:**
- `main` - production, auto-deploy do Vercel
- `feat/*` - nowe funkcjonalności
- `fix/*` - bugfixy
- `ralph/*` - taski Ralph-a

**Commit convention:**
```
feat: nowa funkcjonalność
fix: naprawa błędu
docs: dokumentacja
refactor: refaktoryzacja
chore: maintenance
```

**Workflow:**
1. Utwórz branch (`git checkout -b feat/nazwa`)
2. Implementuj + commituj
3. Push (`git push -u origin feat/nazwa`)
4. PR do main (opcjonalnie)
5. Merge do main → auto-deploy Vercel

**WAŻNE:** Każdy commit musi przejść `npm run build` przed pushem.

## Reference
- Wireframe: `/home/artur/Projekty/wireframe/`
- Dokumentacja architektury: `/home/artur/Projekty/wireframe/docs/ARCHITECTURE.md`
- Plan migracji: `docs/MIGRATION-PLAN.md`
