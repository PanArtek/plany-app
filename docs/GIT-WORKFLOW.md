# Git Workflow

## Repo
https://github.com/PanArtek/plany-app

## Branches
- `main` - production, auto-deploy do Vercel
- `feat/*` - nowe funkcjonalności
- `fix/*` - bugfixy
- `ralph/*` - taski autonomicznego agenta

## Commit convention
```
feat: nowa funkcjonalność
fix: naprawa błędu
docs: dokumentacja
refactor: refaktoryzacja
chore: maintenance
```

## Workflow

1. Utwórz branch: `git checkout -b feat/nazwa`
2. Implementuj + commituj
3. **WAŻNE:** `npm run build` musi przejść!
4. Push: `git push -u origin feat/nazwa`
5. PR do main (opcjonalnie)
6. Merge do main → auto-deploy Vercel

## Ralph workflow

Ralph automatycznie:
1. Czyta `scripts/ralph/prd.json`
2. Wybiera najwyższy priorytet z `passes: false`
3. Implementuje
4. Odpala `npm run build`
5. Commituje: `feat: [Story ID] - [Story Title]`
6. Dopisuje do `progress.txt`

Uruchomienie:
```bash
./scripts/ralph/ralph.sh --tool claude 15
```
