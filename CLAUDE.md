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

## Reference

- Wireframe źródłowy: `/home/artur/Projekty/wireframe/`
- Plan migracji: `docs/MIGRATION-PLAN.md`
- Logika biznesowa: `/home/artur/Projekty/wireframe/docs/BUSINESS-LOGIC.md`
