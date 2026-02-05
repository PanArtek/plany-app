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

## Reference
- Wireframe: `/home/artur/Projekty/wireframe/`
- Dokumentacja architektury: `/home/artur/Projekty/wireframe/docs/ARCHITECTURE.md`
