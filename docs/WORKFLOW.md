# Workflow - od pomysłu do produkcji

## Quick Reference

| Krok | Komenda | Output |
|------|---------|--------|
| Planuj | `"zaplanuj feature X"` | `docs/plans/YYYY-MM-DD-*.md` |
| Konwertuj | `"konwertuj plan do prd.json"` | `scripts/ralph/prd.json` |
| Wykonaj | `./scripts/ralph/ralph.sh --tool claude 15` | kod + commity |
| Review | `/commit` → `/pr` | PR na GitHub |
| Docs | `"zaktualizuj dokumentację"` | sync `docs/` |

---

## 1. Planowanie

**Kiedy:** Masz pomysł na feature, nie wiesz od czego zacząć.

```
"zaplanuj feature dodawania pozycji do kosztorysu"
```

Claude użyje:
- **brainstorming skill** - zadaje pytania, proponuje podejścia
- **Context7** - pobiera aktualną dokumentację bibliotek (Next.js, Supabase, etc.)

**Output:** `docs/plans/2024-02-05-adding-items.md`

**Format planu:**
```markdown
# Feature Name

## Context
Dlaczego to robimy, jakie constraints.

## User Stories
- US-001: Jako user chcę X żeby Y
  - AC: kryterium 1
  - AC: kryterium 2
  - AC: Typecheck passes
```

---

## 2. Konwersja do Ralph

**Kiedy:** Plan jest gotowy, chcesz uruchomić Ralpha.

```
"konwertuj docs/plans/2024-02-05-adding-items.md do prd.json"
```

Claude użyje **ralph skill** i stworzy `scripts/ralph/prd.json`.

**Sprawdź przed uruchomieniem:**
- [ ] Każdy task < 10 min
- [ ] AC są weryfikowalne (nie "działa poprawnie")
- [ ] Każdy story ma "Typecheck passes"
- [ ] `dependsOn` ustawione dla zależności

---

## 3. Uruchomienie Ralph

**Kiedy:** `prd.json` gotowy, chcesz automatyczną implementację.

```bash
# Utwórz branch (jeśli nie istnieje)
git checkout -b ralph/feature-name

# Uruchom Ralph (15 iteracji)
./scripts/ralph/ralph.sh --tool claude 15
```

**Ralph automatycznie:**
1. Czyta `prd.json`
2. Wybiera pierwszy task z `passes: false`
3. Implementuje
4. Odpala `npm run build`
5. Commituje
6. Loguje do `progress.txt`

**Monitoring:**
```bash
# W osobnym terminalu
tail -f scripts/ralph/progress.txt
```

---

## 4. Review & Merge

**Kiedy:** Ralph skończył, chcesz zmergować do main.

```
/commit    # jeśli są niezcommitowane zmiany
/pr        # tworzy Pull Request
```

Lub ręcznie:
```bash
git push -u origin ralph/feature-name
gh pr create --title "feat: feature name" --body "..."
```

**Przed mergem:**
- [ ] `npm run build` przechodzi
- [ ] PR review (opcjonalnie)
- [ ] Testy manualne na localhost

---

## 5. Dokumentacja

**Kiedy:** Feature zmergowany, trzeba zaktualizować docs.

```
"zaktualizuj dokumentację po feature X"
```

Claude użyje **doc-updater skill** i zsynchronizuje `docs/`.

---

## Skróty

| Potrzebuję... | Komenda |
|---------------|---------|
| Zaplanować feature | `"zaplanuj X"` |
| Sprawdzić dokumentację lib | `"jak działa X w Next.js"` (Context7) |
| Debugować problem | `"zdebuguj X"` (debugging skill) |
| Zrobić commit | `/commit` |
| Stworzyć PR | `/pr` |
| Code review | `/review-pr` |

---

## Troubleshooting

**Ralph się zawiesił:**
```bash
# Sprawdź co robi
cat scripts/ralph/progress.txt | tail -20

# Zresetuj jeśli trzeba
git status
git diff
```

**Build nie przechodzi:**
```bash
npm run build 2>&1 | head -50
```

**Chcę wrócić do poprzedniego stanu:**
```bash
git log --oneline -10
git reset --hard <commit-hash>
```
