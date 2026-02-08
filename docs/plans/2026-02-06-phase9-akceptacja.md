# Phase 9: Akceptacja + State Machine

## Overview

Acceptance workflow and project status state machine. No zamówienia/umowy generation — that's deferred to Phase 10/11.

## State Machine

```
         cofnij              cofnij                zakończ
DRAFT ⇄ WYSŁANO_DO_KLIENTA ⇄ REALIZACJA ────────→ ZAMKNIĘTY
                             ⇄ ODRZUCONY
```

### Allowed Transitions

| From | To | Condition | Side Effects |
|------|-----|-----------|-------------|
| DRAFT | WYSŁANO | ≥1 locked rewizja | `sent_at = NOW()` |
| WYSŁANO | DRAFT | — | `sent_at = NULL` |
| WYSŁANO | REALIZACJA | wskazana locked rewizja | `accepted_rewizja_id = X`, `rewizja.is_accepted = true`, `rewizja.accepted_at = NOW()` |
| WYSŁANO | ODRZUCONY | — | — |
| REALIZACJA | WYSŁANO | — | `accepted_rewizja_id = NULL`, `rewizja.is_accepted = false`, `rewizja.accepted_at = NULL` |
| ODRZUCONY | WYSŁANO | — | — |
| REALIZACJA | ZAMKNIĘTY | — | — |

ZAMKNIĘTY is terminal — no reversal.

## Database Migration (014)

One migration `014_acceptance_state_machine.sql`:

```sql
-- 1. New column
ALTER TABLE projekty ADD COLUMN sent_at TIMESTAMPTZ;

-- 2. RPC function
CREATE FUNCTION change_project_status(
  p_projekt_id UUID,
  p_new_status project_status,
  p_rewizja_id UUID DEFAULT NULL
) RETURNS projekty
```

Function validates:
- Transition is allowed (from transition table above)
- Has locked rewizja (for DRAFT→WYSŁANO)
- Rewizja specified (for WYSŁANO→REALIZACJA)
- On REALIZACJA→WYSŁANO: clears acceptance (is_accepted, accepted_at, accepted_rewizja_id)
- On DRAFT→WYSŁANO: sets sent_at = NOW()
- On WYSŁANO→DRAFT: clears sent_at

Single RPC, all logic in Postgres, server action is just a wrapper.

## Server Action

```
actions/acceptance.ts:
  changeProjectStatus(projektId, newStatus, rewizjaId?)
    → supabase.rpc('change_project_status', {...})
    → revalidatePath('/projekty')
```

## UI — Status Badge

Reusable component used in: project table, project detail panel, kosztorys header.

| Status | Color | Extra |
|--------|-------|-------|
| DRAFT | gray | — |
| WYSŁANO DO KLIENTA | blue | + sent_at date |
| REALIZACJA | green | + "Zaakceptowano R{numer}" |
| ODRZUCONY | red | — |
| ZAMKNIĘTY | dark gray | — |

## UI — Project Detail Panel

Contextual action buttons below project info, above "Otwórz kosztorys":

| Status | Buttons |
|--------|---------|
| DRAFT | `Wyślij do klienta` (blue, requires locked rewizja) |
| WYSŁANO | `Akceptuj rewizję` (green, opens rewizja select dialog) + `Odrzuć` (red) + `Cofnij do draft` (ghost) |
| REALIZACJA | `Zamknij projekt` (gray) + `Cofnij do wysłano` (ghost) |
| ODRZUCONY | `Cofnij do wysłano` (ghost) |
| ZAMKNIĘTY | no buttons |

"Akceptuj rewizję" opens a small dialog with locked rewizja selector + confirm button.

## UI — Kosztorys

- Status badge in header (read-only, no action buttons)
- Locked banner extended: if rewizja `is_accepted`, text changes to "Rewizja R{numer} została zaakceptowana. Edycja zablokowana na stałe." (no "Utwórz nową rewizję" button)

## UI — Projects Table

- Status column with colored badge
- "Wysłano" column showing sent_at date (empty if NULL)

## Files

### New
- `supabase/migrations/014_acceptance_state_machine.sql`
- `actions/acceptance.ts`
- `app/(app)/projekty/_components/status-badge.tsx`
- `app/(app)/projekty/_components/panels/accept-rewizja-dialog.tsx`

### Modified
- `app/(app)/projekty/_components/panels/projekt-detail-panel.tsx` — badge + contextual buttons
- `app/(app)/projekty/[projektId]/kosztorys/_components/locked-banner.tsx` — accepted variant
- `app/(app)/projekty/[projektId]/kosztorys/_components/kosztorys-view.tsx` — badge in header
- `actions/projekty.ts` — extend interface with sent_at, accepted_rewizja_id
- Projects table component — status + sent_at columns
