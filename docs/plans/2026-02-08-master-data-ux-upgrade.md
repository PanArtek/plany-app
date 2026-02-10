# Master Data UX Upgrade - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve UX of Materialy, Dostawcy, and Podwykonawcy pages with stats bars, column sorting, better columns, additional filters, and showInactive toggles.

**Architecture:** Evolutionary approach - keep existing SlidePanel/table/filter patterns. Add DB-level aggregation RPCs to replace N+1 patterns (dostawcy, podwykonawcy) and add new aggregate columns. Create one shared StatsBar component used by all 3 pages. Sorting handled server-side via URL params.

**Tech Stack:** PostgreSQL functions (Supabase `apply_migration`), Next.js Server Components/Actions, TanStack Table, Zod validation, Tailwind CSS.

---

## US-001: Database Migrations - Enhanced Aggregation Functions

**Files:**
- Create: `supabase/migrations/016_enhanced_aggregations.sql` (via `apply_migration`)
- Modify: `actions/materialy.ts` (update interface + mapping)
- Modify: `actions/dostawcy.ts` (replace N+1 with RPC)
- Modify: `actions/podwykonawcy.ts` (replace N+1 with RPC)

**Acceptance Criteria:**
- `get_materialy_aggregated` returns additional `najgorsza_cena` (MAX price) column
- New `get_dostawcy_aggregated` RPC replaces N+1 pattern, returns `produkty_count`, `total_wartosc`, supports sort/order
- New `get_podwykonawcy_aggregated` RPC replaces N+1, returns `stawki_count`, `min_stawka`, `max_stawka`, supports sort/order
- New `get_materialy_stats` returns: total, with_suppliers, without_suppliers, avg_price
- New `get_dostawcy_stats` returns: total, total_products, avg_products
- New `get_podwykonawcy_stats` returns: total, total_stawki, avg_stawka
- Typecheck passes

### Step 1: Apply migration with all 6 functions

Apply via Supabase `apply_migration` with name `enhanced_aggregations`:

```sql
-- 1. Update get_materialy_aggregated: add najgorsza_cena + sort support
CREATE OR REPLACE FUNCTION public.get_materialy_aggregated(
  p_branza text DEFAULT NULL,
  p_kategoria text DEFAULT NULL,
  p_podkategoria text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_status_cenowy text DEFAULT NULL,
  p_show_inactive boolean DEFAULT FALSE,
  p_sort text DEFAULT 'nazwa',
  p_order text DEFAULT 'asc',
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  sku character varying,
  nazwa character varying,
  jednostka character varying,
  aktywny boolean,
  pozycje_count bigint,
  dostawcy_count bigint,
  najlepsza_cena numeric,
  najgorsza_cena numeric,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $function$
DECLARE
  v_kod_prefix text;
BEGIN
  IF p_branza IS NOT NULL THEN
    v_kod_prefix := p_branza;
    IF p_kategoria IS NOT NULL THEN
      v_kod_prefix := v_kod_prefix || '.' || p_kategoria;
      IF p_podkategoria IS NOT NULL THEN
        v_kod_prefix := v_kod_prefix || '.' || p_podkategoria;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered_products AS (
    SELECT DISTINCT p2.id
    FROM produkty p2
    WHERE (p_show_inactive OR p2.aktywny = true)
      AND (p_search IS NULL OR (
        p2.nazwa ILIKE '%' || p_search || '%'
        OR p2.sku ILIKE '%' || p_search || '%'
      ))
      AND (v_kod_prefix IS NULL OR EXISTS (
        SELECT 1
        FROM biblioteka_skladowe_materialy bsm
        JOIN pozycje_biblioteka pb ON pb.id = bsm.pozycja_biblioteka_id
        WHERE bsm.produkt_id = p2.id
          AND pb.kod LIKE v_kod_prefix || '%'
      ))
  ),
  aggregated AS (
    SELECT
      p3.id,
      p3.sku,
      p3.nazwa,
      p3.jednostka,
      p3.aktywny,
      COUNT(DISTINCT bsm2.pozycja_biblioteka_id) AS pozycje_count,
      COUNT(DISTINCT cd.dostawca_id) AS dostawcy_count,
      MIN(cd.cena_netto) AS najlepsza_cena,
      MAX(cd.cena_netto) AS najgorsza_cena
    FROM filtered_products fp
    JOIN produkty p3 ON p3.id = fp.id
    LEFT JOIN biblioteka_skladowe_materialy bsm2 ON bsm2.produkt_id = p3.id
    LEFT JOIN ceny_dostawcow cd ON cd.produkt_id = p3.id AND cd.aktywny = true
    GROUP BY p3.id, p3.sku, p3.nazwa, p3.jednostka, p3.aktywny
  ),
  filtered_by_status AS (
    SELECT a.*
    FROM aggregated a
    WHERE (p_status_cenowy IS NULL)
      OR (p_status_cenowy = 'with_suppliers' AND a.dostawcy_count > 0)
      OR (p_status_cenowy = 'without_suppliers' AND a.dostawcy_count = 0)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered_by_status
  )
  SELECT
    f.id, f.sku, f.nazwa, f.jednostka, f.aktywny,
    f.pozycje_count, f.dostawcy_count, f.najlepsza_cena, f.najgorsza_cena,
    c.cnt AS total_count
  FROM filtered_by_status f
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN p_sort = 'nazwa' AND p_order = 'asc' THEN f.nazwa END ASC,
    CASE WHEN p_sort = 'nazwa' AND p_order = 'desc' THEN f.nazwa END DESC,
    CASE WHEN p_sort = 'sku' AND p_order = 'asc' THEN f.sku END ASC,
    CASE WHEN p_sort = 'sku' AND p_order = 'desc' THEN f.sku END DESC,
    CASE WHEN p_sort = 'pozycje' AND p_order = 'asc' THEN f.pozycje_count END ASC,
    CASE WHEN p_sort = 'pozycje' AND p_order = 'desc' THEN f.pozycje_count END DESC,
    CASE WHEN p_sort = 'dostawcy' AND p_order = 'asc' THEN f.dostawcy_count END ASC,
    CASE WHEN p_sort = 'dostawcy' AND p_order = 'desc' THEN f.dostawcy_count END DESC,
    CASE WHEN p_sort = 'cena' AND p_order = 'asc' THEN f.najlepsza_cena END ASC NULLS LAST,
    CASE WHEN p_sort = 'cena' AND p_order = 'desc' THEN f.najlepsza_cena END DESC NULLS LAST,
    f.nazwa ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 2. Materialy stats
CREATE OR REPLACE FUNCTION public.get_materialy_stats()
RETURNS TABLE(
  total bigint,
  with_suppliers bigint,
  without_suppliers bigint,
  avg_price numeric
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM ceny_dostawcow cd WHERE cd.produkt_id = p.id AND cd.aktywny = true
    ) THEN 1 END)::bigint AS with_suppliers,
    COUNT(CASE WHEN NOT EXISTS (
      SELECT 1 FROM ceny_dostawcow cd WHERE cd.produkt_id = p.id AND cd.aktywny = true
    ) THEN 1 END)::bigint AS without_suppliers,
    ROUND(AVG(min_price), 2) AS avg_price
  FROM produkty p
  LEFT JOIN LATERAL (
    SELECT MIN(cd.cena_netto) AS min_price
    FROM ceny_dostawcow cd
    WHERE cd.produkt_id = p.id AND cd.aktywny = true
  ) prices ON true
  WHERE p.aktywny = true;
END;
$function$;

-- 3. Dostawcy aggregated (replaces N+1)
CREATE OR REPLACE FUNCTION public.get_dostawcy_aggregated(
  p_search text DEFAULT NULL,
  p_show_inactive boolean DEFAULT FALSE,
  p_sort text DEFAULT 'nazwa',
  p_order text DEFAULT 'asc',
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  nazwa character varying,
  kod character varying,
  kontakt text,
  aktywny boolean,
  produkty_count bigint,
  total_wartosc numeric,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT d.id
    FROM dostawcy d
    WHERE (p_show_inactive OR d.aktywny = true)
      AND (p_search IS NULL OR (
        d.nazwa ILIKE '%' || p_search || '%'
        OR d.kod ILIKE '%' || p_search || '%'
      ))
  ),
  aggregated AS (
    SELECT
      d2.id, d2.nazwa, d2.kod, d2.kontakt, d2.aktywny,
      COUNT(DISTINCT cd.id) AS produkty_count,
      COALESCE(SUM(cd.cena_netto), 0) AS total_wartosc
    FROM filtered f
    JOIN dostawcy d2 ON d2.id = f.id
    LEFT JOIN ceny_dostawcow cd ON cd.dostawca_id = d2.id AND cd.aktywny = true
    GROUP BY d2.id, d2.nazwa, d2.kod, d2.kontakt, d2.aktywny
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM aggregated
  )
  SELECT
    a.id, a.nazwa, a.kod, a.kontakt, a.aktywny,
    a.produkty_count, a.total_wartosc,
    c.cnt AS total_count
  FROM aggregated a
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN p_sort = 'nazwa' AND p_order = 'asc' THEN a.nazwa END ASC,
    CASE WHEN p_sort = 'nazwa' AND p_order = 'desc' THEN a.nazwa END DESC,
    CASE WHEN p_sort = 'kod' AND p_order = 'asc' THEN a.kod END ASC NULLS LAST,
    CASE WHEN p_sort = 'kod' AND p_order = 'desc' THEN a.kod END DESC NULLS LAST,
    CASE WHEN p_sort = 'produkty' AND p_order = 'asc' THEN a.produkty_count END ASC,
    CASE WHEN p_sort = 'produkty' AND p_order = 'desc' THEN a.produkty_count END DESC,
    CASE WHEN p_sort = 'wartosc' AND p_order = 'asc' THEN a.total_wartosc END ASC,
    CASE WHEN p_sort = 'wartosc' AND p_order = 'desc' THEN a.total_wartosc END DESC,
    a.nazwa ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 4. Dostawcy stats
CREATE OR REPLACE FUNCTION public.get_dostawcy_stats()
RETURNS TABLE(
  total bigint,
  total_products bigint,
  avg_products numeric
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    (SELECT COUNT(*)::bigint FROM ceny_dostawcow WHERE aktywny = true) AS total_products,
    ROUND(AVG(cnt), 1) AS avg_products
  FROM dostawcy d
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::numeric AS cnt
    FROM ceny_dostawcow cd
    WHERE cd.dostawca_id = d.id AND cd.aktywny = true
  ) counts ON true
  WHERE d.aktywny = true;
END;
$function$;

-- 5. Podwykonawcy aggregated (replaces N+1)
CREATE OR REPLACE FUNCTION public.get_podwykonawcy_aggregated(
  p_search text DEFAULT NULL,
  p_specjalizacja text DEFAULT NULL,
  p_show_inactive boolean DEFAULT FALSE,
  p_sort text DEFAULT 'nazwa',
  p_order text DEFAULT 'asc',
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  nazwa character varying,
  specjalizacja character varying,
  kontakt text,
  aktywny boolean,
  stawki_count bigint,
  min_stawka numeric,
  max_stawka numeric,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT p.id
    FROM podwykonawcy p
    WHERE (p_show_inactive OR p.aktywny = true)
      AND (p_search IS NULL OR (
        p.nazwa ILIKE '%' || p_search || '%'
        OR p.specjalizacja ILIKE '%' || p_search || '%'
      ))
      AND (p_specjalizacja IS NULL OR p.specjalizacja ILIKE '%' || p_specjalizacja || '%')
  ),
  aggregated AS (
    SELECT
      pw.id, pw.nazwa, pw.specjalizacja, pw.kontakt, pw.aktywny,
      COUNT(DISTINCT sp.id) AS stawki_count,
      MIN(sp.stawka) AS min_stawka,
      MAX(sp.stawka) AS max_stawka
    FROM filtered f
    JOIN podwykonawcy pw ON pw.id = f.id
    LEFT JOIN stawki_podwykonawcow sp ON sp.podwykonawca_id = pw.id
    GROUP BY pw.id, pw.nazwa, pw.specjalizacja, pw.kontakt, pw.aktywny
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM aggregated
  )
  SELECT
    a.id, a.nazwa, a.specjalizacja, a.kontakt, a.aktywny,
    a.stawki_count, a.min_stawka, a.max_stawka,
    c.cnt AS total_count
  FROM aggregated a
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN p_sort = 'nazwa' AND p_order = 'asc' THEN a.nazwa END ASC,
    CASE WHEN p_sort = 'nazwa' AND p_order = 'desc' THEN a.nazwa END DESC,
    CASE WHEN p_sort = 'specjalizacja' AND p_order = 'asc' THEN a.specjalizacja END ASC NULLS LAST,
    CASE WHEN p_sort = 'specjalizacja' AND p_order = 'desc' THEN a.specjalizacja END DESC NULLS LAST,
    CASE WHEN p_sort = 'stawki' AND p_order = 'asc' THEN a.stawki_count END ASC,
    CASE WHEN p_sort = 'stawki' AND p_order = 'desc' THEN a.stawki_count END DESC,
    CASE WHEN p_sort = 'min_stawka' AND p_order = 'asc' THEN a.min_stawka END ASC NULLS LAST,
    CASE WHEN p_sort = 'min_stawka' AND p_order = 'desc' THEN a.min_stawka END DESC NULLS LAST,
    a.nazwa ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 6. Podwykonawcy stats
CREATE OR REPLACE FUNCTION public.get_podwykonawcy_stats()
RETURNS TABLE(
  total bigint,
  total_stawki bigint,
  avg_stawka numeric
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    (SELECT COUNT(*)::bigint FROM stawki_podwykonawcow) AS total_stawki,
    (SELECT ROUND(AVG(stawka), 2) FROM stawki_podwykonawcow) AS avg_stawka
  FROM podwykonawcy p
  WHERE p.aktywny = true;
END;
$function$;
```

### Step 2: Update `actions/materialy.ts` - new interface + RPC params

**Modify** `actions/materialy.ts`:

1. Add `najlepszaCena` → keep, add `najgorszaCena: number | null` to `ProduktWithAggregation`
2. Add `sort`, `order`, `statusCenowy`, `showInactive` to `getMaterialy()` RPC call params
3. Map new `najgorsza_cena` field
4. Add `getMaterialyStats()` server action

```typescript
// Updated interface
export interface ProduktWithAggregation {
  id: string;
  sku: string;
  nazwa: string;
  jednostka: string;
  aktywny: boolean;
  pozycjeCount: number;
  dostawcyCount: number;
  najlepszaCena: number | null;
  najgorszaCena: number | null;  // NEW
}

// Updated getMaterialy to pass new params
export async function getMaterialy(filters: MaterialyFilters): Promise<MaterialyResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_materialy_aggregated', {
    p_branza: filters.branza || null,
    p_kategoria: filters.kategoria || null,
    p_podkategoria: filters.podkategoria || null,
    p_search: filters.search || null,
    p_status_cenowy: filters.statusCenowy || null,  // NEW
    p_show_inactive: filters.showInactive || false,  // NEW
    p_sort: filters.sort || 'nazwa',                 // NEW
    p_order: filters.order || 'asc',                 // NEW
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string; sku: string; nazwa: string; jednostka: string; aktywny: boolean;
    pozycje_count: number; dostawcy_count: number;
    najlepsza_cena: number | null; najgorsza_cena: number | null;
    total_count: number;
  }>;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map(r => ({
      id: r.id, sku: r.sku, nazwa: r.nazwa, jednostka: r.jednostka, aktywny: r.aktywny,
      pozycjeCount: Number(r.pozycje_count),
      dostawcyCount: Number(r.dostawcy_count),
      najlepszaCena: r.najlepsza_cena !== null ? Number(r.najlepsza_cena) : null,
      najgorszaCena: r.najgorsza_cena !== null ? Number(r.najgorsza_cena) : null,  // NEW
    })),
    totalCount, page, pageSize: PAGE_SIZE,
  };
}

// NEW: Stats action
export interface MaterialyStats {
  total: number;
  withSuppliers: number;
  withoutSuppliers: number;
  avgPrice: number | null;
}

export async function getMaterialyStats(): Promise<MaterialyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_materialy_stats');
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>>)?.[0];
  return {
    total: Number(row?.total ?? 0),
    withSuppliers: Number(row?.with_suppliers ?? 0),
    withoutSuppliers: Number(row?.without_suppliers ?? 0),
    avgPrice: row?.avg_price != null ? Number(row.avg_price) : null,
  };
}
```

### Step 3: Update `actions/dostawcy.ts` - replace N+1 with RPC

Replace `getDostawcy()` to use the new RPC. Add `totalWartosc` to `DostawcaWithCount`. Add `getDostawcyStats()`.

```typescript
// Updated interface
export interface DostawcaWithCount {
  id: string;
  nazwa: string;
  kod: string | null;
  kontakt: string | null;
  aktywny: boolean;
  produktyCount: number;
  totalWartosc: number;  // NEW
}

// Rewritten getDostawcy using RPC
export async function getDostawcy(filters: DostawcyFilters): Promise<DostawcyResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_dostawcy_aggregated', {
    p_search: filters.search || null,
    p_show_inactive: filters.showInactive || false,
    p_sort: filters.sort || 'nazwa',
    p_order: filters.order || 'asc',
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string; nazwa: string; kod: string | null; kontakt: string | null; aktywny: boolean;
    produkty_count: number; total_wartosc: number; total_count: number;
  }>;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map(r => ({
      id: r.id, nazwa: r.nazwa, kod: r.kod, kontakt: r.kontakt, aktywny: r.aktywny,
      produktyCount: Number(r.produkty_count),
      totalWartosc: Number(r.total_wartosc),
    })),
    totalCount, page, pageSize: PAGE_SIZE,
  };
}

// NEW stats
export interface DostawcyStats {
  total: number;
  totalProducts: number;
  avgProducts: number;
}

export async function getDostawcyStats(): Promise<DostawcyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_dostawcy_stats');
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>>)?.[0];
  return {
    total: Number(row?.total ?? 0),
    totalProducts: Number(row?.total_products ?? 0),
    avgProducts: Number(row?.avg_products ?? 0),
  };
}
```

### Step 4: Update `actions/podwykonawcy.ts` - replace N+1 with RPC

Same pattern. Add `minStawka`, `maxStawka` to interface. Add `getPodwykonawcyStats()`.

```typescript
// Updated interface
export interface PodwykonawcaWithCount {
  id: string;
  nazwa: string;
  specjalizacja: string | null;
  kontakt: string | null;
  aktywny: boolean;
  stawkiCount: number;
  minStawka: number | null;  // NEW
  maxStawka: number | null;  // NEW
}

// Rewritten getPodwykonawcy using RPC
export async function getPodwykonawcy(filters: PodwykonawcyFilters): Promise<PodwykonawcyResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_podwykonawcy_aggregated', {
    p_search: filters.search || null,
    p_specjalizacja: filters.specjalizacja || null,
    p_show_inactive: filters.showInactive || false,
    p_sort: filters.sort || 'nazwa',
    p_order: filters.order || 'asc',
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: string; nazwa: string; specjalizacja: string | null; kontakt: string | null;
    aktywny: boolean; stawki_count: number; min_stawka: number | null;
    max_stawka: number | null; total_count: number;
  }>;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map(r => ({
      id: r.id, nazwa: r.nazwa, specjalizacja: r.specjalizacja, kontakt: r.kontakt,
      aktywny: r.aktywny,
      stawkiCount: Number(r.stawki_count),
      minStawka: r.min_stawka !== null ? Number(r.min_stawka) : null,
      maxStawka: r.max_stawka !== null ? Number(r.max_stawka) : null,
    })),
    totalCount, page, pageSize: PAGE_SIZE,
  };
}

// NEW stats
export interface PodwykonawcyStats {
  total: number;
  totalStawki: number;
  avgStawka: number | null;
}

export async function getPodwykonawcyStats(): Promise<PodwykonawcyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_podwykonawcy_stats');
  if (error) throw error;
  const row = (data as Array<Record<string, unknown>>)?.[0];
  return {
    total: Number(row?.total ?? 0),
    totalStawki: Number(row?.total_stawki ?? 0),
    avgStawka: row?.avg_stawka != null ? Number(row.avg_stawka) : null,
  };
}
```

### Step 5: Update validation schemas

**Modify** `lib/validations/materialy.ts` - add `statusCenowy`, `showInactive`, `sort`, `order`:

```typescript
export const materialyFiltersSchema = z.object({
  branza: z.string().optional(),
  kategoria: z.string().optional(),
  podkategoria: z.string().optional(),
  search: z.string().optional(),
  statusCenowy: z.enum(['with_suppliers', 'without_suppliers']).optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});
```

**Modify** `lib/validations/dostawcy.ts` - add `sort`, `order`:

```typescript
export const dostawcyFiltersSchema = z.object({
  search: z.string().optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});
```

**Modify** `lib/validations/podwykonawcy.ts` - add `specjalizacja`, `sort`, `order`:

```typescript
export const podwykonawcyFiltersSchema = z.object({
  search: z.string().optional(),
  specjalizacja: z.string().optional(),
  showInactive: z.coerce.boolean().optional().default(false),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().optional().default(1),
});
```

### Step 6: Verify

Run: `npm run build`
Expected: Build succeeds with no errors.

### Step 7: Commit

```
feat: add enhanced aggregation RPCs for materialy, dostawcy, podwykonawcy
```

---

## US-002: Shared StatsBar Component

**Files:**
- Create: `components/stats-bar.tsx`

**Acceptance Criteria:**
- Reusable component accepting array of stat items
- Each item: `{ label: string; value: string; sublabel?: string }`
- Glass card styling consistent with app design system
- Values in amber font-mono
- Typecheck passes

### Step 1: Create `components/stats-bar.tsx`

```tsx
interface StatItem {
  label: string;
  value: string;
  sublabel?: string;
}

interface StatsBarProps {
  items: StatItem[];
}

export function StatsBar({ items }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.06] rounded-lg px-4 py-3"
        >
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
            {item.label}
          </div>
          <div className="text-lg font-mono font-semibold text-amber-500">
            {item.value}
          </div>
          {item.sublabel && (
            <div className="text-xs text-white/30 mt-0.5">{item.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Step 2: Verify

Run: `npm run build`

### Step 3: Commit

```
feat: add shared StatsBar component
```

---

## US-003: Materialy Page UX Upgrade

**Files:**
- Modify: `app/(app)/materialy/page.tsx` - add stats fetch, pass sort/order/statusCenowy/showInactive
- Modify: `app/(app)/materialy/_components/materialy-view.tsx` - add StatsBar, count in breadcrumb
- Modify: `app/(app)/materialy/_components/materialy-table.tsx` - price range column, sortable headers
- Modify: `app/(app)/materialy/_components/materialy-filters.tsx` - add statusCenowy dropdown, showInactive toggle

**Acceptance Criteria:**
- Stats bar shows: total products, with suppliers count, without suppliers count, avg best price
- Table column "Najlepsza cena" becomes "Cena" showing range `45 – 120 zł` or single price
- All column headers are clickable for sorting with arrow indicators
- New "Status" dropdown filter: Wszystkie / Z dostawcami / Bez dostawców
- showInactive checkbox toggle next to search
- Breadcrumb shows count: "Materiały (234)"
- Inactive rows shown with opacity-50 and "Nieaktywny" badge
- sort/order/statusCenowy/showInactive persist in URL params
- Typecheck passes

### Step 1: Update `page.tsx` - add stats + new filter params

```tsx
import { getMaterialy, getMaterialyStats } from '@/actions/materialy';
import { MaterialyView } from './_components/materialy-view';
import { type MaterialyFilters } from '@/lib/validations/materialy';

const BRANZE_NAMES: Record<string, string> = {
  BUD: 'Budowlana', ELE: 'Elektryczna', SAN: 'Sanitarna',
  TEL: 'Teletechnika', HVC: 'HVAC',
};

interface PageProps {
  searchParams: Promise<{
    branza?: string; kategoria?: string; podkategoria?: string;
    search?: string; page?: string;
    statusCenowy?: string; showInactive?: string;
    sort?: string; order?: string;
  }>;
}

export default async function MaterialyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: MaterialyFilters = {
    branza: params.branza,
    kategoria: params.kategoria,
    podkategoria: params.podkategoria,
    search: params.search,
    statusCenowy: params.statusCenowy as 'with_suppliers' | 'without_suppliers' | undefined,
    showInactive: params.showInactive === 'true',
    sort: params.sort,
    order: params.order as 'asc' | 'desc' | undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const [result, stats] = await Promise.all([
    getMaterialy(filters),
    getMaterialyStats(),
  ]);

  const branzaLabel = params.branza ? BRANZE_NAMES[params.branza] : undefined;

  return (
    <div className="p-6">
      <MaterialyView
        initialData={result}
        stats={stats}
        initialBranza={params.branza}
        branzaLabel={branzaLabel}
      />
    </div>
  );
}
```

### Step 2: Update `materialy-view.tsx` - add StatsBar + count

Add `stats` prop to `MaterialyViewProps`, render `<StatsBar>` between breadcrumb and filters.

Breadcrumb: `Materiały (${initialData.totalCount})` instead of `Materiały`.

Format stats:
```typescript
const statsItems = [
  { label: 'Produkty', value: String(stats.total) },
  { label: 'Z dostawcami', value: String(stats.withSuppliers) },
  { label: 'Bez dostawców', value: String(stats.withoutSuppliers) },
  { label: 'Śr. cena', value: stats.avgPrice != null ? `${stats.avgPrice.toFixed(2).replace('.', ',')} zł` : '—' },
];
```

### Step 3: Update `materialy-table.tsx` - price range + sortable headers

**Price column** change from `najlepszaCena` single value to range display:

```tsx
columnHelper.accessor('najlepszaCena', {
  id: 'cena',
  header: 'Cena',
  cell: (info) => {
    const min = info.getValue();
    const max = info.row.original.najgorszaCena;
    if (min === null) return <span className="text-white/30">—</span>;
    const fmtMin = min.toFixed(2).replace('.', ',');
    if (max === null || max === min) {
      return <span className="font-mono text-amber-500">{fmtMin} zł</span>;
    }
    const fmtMax = max.toFixed(2).replace('.', ',');
    return <span className="font-mono text-amber-500">{fmtMin} – {fmtMax} zł</span>;
  },
}),
```

**Sortable headers:** Add `onSortChange` prop to table. Each `<th>` becomes clickable:

```tsx
interface MaterialyTableProps {
  data: ProduktWithAggregation[];
  onRowClick: (produkt: ProduktWithAggregation) => void;
  sort?: string;
  order?: 'asc' | 'desc';
  onSortChange: (sort: string) => void;
}
```

Header cell renders sort indicator:
```tsx
<th onClick={() => onSortChange(columnSortKey)} className="cursor-pointer select-none ...">
  {label}
  {sort === columnSortKey && (
    <ArrowUp className={cn("h-3 w-3 ml-1 inline", order === 'desc' && "rotate-180")} />
  )}
</th>
```

Column sort keys: `nazwa` → 'nazwa', `jednostka` → skip (no sort), `pozycje` → 'pozycje', `dostawcy` → 'dostawcy', `cena` → 'cena'.

`onSortChange` in view: toggles order if same column, or sets new sort with 'asc'.

**Inactive rows:** Add opacity + badge:

```tsx
<tr className={cn(
  "hover:bg-white/5 border-b border-white/[0.06] cursor-pointer transition-colors",
  !row.original.aktywny && "opacity-50"
)}>
```

### Step 4: Update `materialy-filters.tsx` - add statusCenowy + showInactive

Add after search input:

1. **Status dropdown** (Select component):
   - Options: `Wszystkie` (empty) | `Z dostawcami` (with_suppliers) | `Bez dostawców` (without_suppliers)
   - Sets `?statusCenowy=value`

2. **showInactive toggle** (Checkbox):
   - Label: "Nieaktywne"
   - Sets `?showInactive=true`

Both reset `page` to 1 on change.

### Step 5: Wire sorting in `materialy-view.tsx`

```typescript
const handleSortChange = (newSort: string) => {
  const params = new URLSearchParams(window.location.search);
  const currentSort = params.get('sort') || 'nazwa';
  const currentOrder = params.get('order') || 'asc';

  if (currentSort === newSort) {
    params.set('order', currentOrder === 'asc' ? 'desc' : 'asc');
  } else {
    params.set('sort', newSort);
    params.set('order', 'asc');
  }
  params.delete('page');
  router.push(`/materialy?${params.toString()}`);
};
```

Pass `sort`, `order`, `onSortChange` to `<MaterialyTable>`.

### Step 6: Verify

Run: `npm run build`
Verify at `localhost:3000/materialy`:
- Stats bar renders with 4 cards
- Price column shows range for products with multiple suppliers
- Clicking column headers sorts
- Status dropdown filters correctly
- showInactive shows deactivated products dimmed

### Step 7: Commit

```
feat: materialy page UX upgrade - stats bar, price range, sorting, filters
```

---

## US-004: Dostawcy Page UX Upgrade

**Files:**
- Modify: `app/(app)/dostawcy/page.tsx` - add stats fetch, new params
- Modify: `app/(app)/dostawcy/_components/dostawcy-view.tsx` - StatsBar, count
- Modify: `app/(app)/dostawcy/_components/dostawcy-table.tsx` - value column, sorting, inactive style
- Modify: `app/(app)/dostawcy/_components/dostawcy-filters.tsx` - showInactive toggle

**Acceptance Criteria:**
- Stats bar: total suppliers, total products in cenniki, avg products per supplier
- New column "Wartość cennika" showing sum of all prices per supplier
- All sortable headers (nazwa, kod, produkty, wartość)
- showInactive checkbox visible
- Breadcrumb: "Dostawcy (12)"
- Inactive rows dimmed with opacity-50
- Typecheck passes

### Step 1: Update `page.tsx`

Similar to materialy: fetch `getDostawcyStats()` in parallel with `getDostawcy()`. Pass `stats` to view. Add `sort`, `order`, `showInactive` to filters from searchParams.

### Step 2: Update `dostawcy-view.tsx`

Add StatsBar with items:
```typescript
const statsItems = [
  { label: 'Dostawcy', value: String(stats.total) },
  { label: 'Pozycji w cennikach', value: String(stats.totalProducts) },
  { label: 'Śr. produktów/dostawca', value: String(stats.avgProducts) },
];
```

Breadcrumb: `Dostawcy (${initialData.totalCount})`.

Wire `handleSortChange` same pattern as materialy.

### Step 3: Update `dostawcy-table.tsx`

Add "Wartość cennika" column:
```tsx
columnHelper.accessor('totalWartosc', {
  header: 'Wartość cennika',
  cell: (info) => {
    const val = info.getValue();
    if (val === 0) return <span className="text-white/30">—</span>;
    return (
      <span className="font-mono text-amber-500">
        {val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} zł
      </span>
    );
  },
}),
```

Add sortable headers with same pattern as materialy (sort keys: 'nazwa', 'kod', 'produkty', 'wartosc').

Add inactive row styling (opacity-50).

### Step 4: Update `dostawcy-filters.tsx`

Add showInactive checkbox after search input.

### Step 5: Verify

Run: `npm run build`
Verify at `localhost:3000/dostawcy`:
- Stats bar renders
- Value column visible
- Sorting works
- showInactive toggle works

### Step 6: Commit

```
feat: dostawcy page UX upgrade - stats bar, value column, sorting, showInactive
```

---

## US-005: Podwykonawcy Page UX Upgrade

**Files:**
- Modify: `app/(app)/podwykonawcy/page.tsx` - add stats fetch, new params
- Modify: `app/(app)/podwykonawcy/_components/podwykonawcy-view.tsx` - StatsBar, count
- Modify: `app/(app)/podwykonawcy/_components/podwykonawcy-table.tsx` - rate range, specjalizacja badges, sorting, inactive
- Modify: `app/(app)/podwykonawcy/_components/podwykonawcy-filters.tsx` - specjalizacja dropdown, showInactive

**Acceptance Criteria:**
- Stats bar: total subcontractors, total rates, avg rate
- "Stawki" column shows range `35 – 85 zł` instead of count "5 stawek"
- "Specjalizacja" column shows colored badge instead of plain text
- New specjalizacja filter dropdown populated from distinct DB values
- All sortable headers (nazwa, specjalizacja, stawki/min, stawki count)
- showInactive checkbox
- Breadcrumb: "Podwykonawcy (8)"
- Typecheck passes

### Step 1: Update `page.tsx`

Fetch `getPodwykonawcyStats()` in parallel. Pass `stats` + new filter params (`specjalizacja`, `sort`, `order`, `showInactive`).

### Step 2: Add `getDistinctSpecjalizacje` action

Add to `actions/podwykonawcy.ts`:
```typescript
export async function getDistinctSpecjalizacje(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('podwykonawcy')
    .select('specjalizacja')
    .eq('aktywny', true)
    .not('specjalizacja', 'is', null)
    .order('specjalizacja');

  if (error) throw error;
  const unique = [...new Set((data || []).map((d: { specjalizacja: string }) => d.specjalizacja))];
  return unique;
}
```

Fetch in `page.tsx` in parallel with other data.

### Step 3: Update `podwykonawcy-view.tsx`

StatsBar:
```typescript
const statsItems = [
  { label: 'Podwykonawcy', value: String(stats.total) },
  { label: 'Stawek ogółem', value: String(stats.totalStawki) },
  { label: 'Śr. stawka', value: stats.avgStawka != null ? `${stats.avgStawka.toFixed(2).replace('.', ',')} zł` : '—' },
];
```

Breadcrumb: `Podwykonawcy (${initialData.totalCount})`.

### Step 4: Update `podwykonawcy-table.tsx`

**Rate range column** - replace count with min-max:
```tsx
columnHelper.display({
  id: 'stawki',
  header: 'Zakres stawek',
  cell: ({ row }) => {
    const { stawkiCount, minStawka, maxStawka } = row.original;
    if (stawkiCount === 0 || minStawka === null) return <span className="text-white/30">—</span>;
    const fmtMin = minStawka.toFixed(2).replace('.', ',');
    if (maxStawka === null || maxStawka === minStawka) {
      return (
        <div>
          <span className="font-mono text-amber-500">{fmtMin} zł</span>
          <span className="text-white/30 text-xs ml-2">({stawkiCount})</span>
        </div>
      );
    }
    const fmtMax = maxStawka.toFixed(2).replace('.', ',');
    return (
      <div>
        <span className="font-mono text-amber-500">{fmtMin} – {fmtMax} zł</span>
        <span className="text-white/30 text-xs ml-2">({stawkiCount})</span>
      </div>
    );
  },
}),
```

**Specjalizacja badge** - color-coded:
```tsx
const SPEC_COLORS: Record<string, string> = {
  'GK': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Tynki': 'bg-green-500/15 text-green-400 border-green-500/20',
  'Elektryka': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Hydraulika': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};
const DEFAULT_SPEC_COLOR = 'bg-white/5 text-white/60 border-white/10';

// In column cell:
cell: (info) => {
  const spec = info.getValue();
  if (!spec) return <span className="text-white/30">—</span>;
  const colorClass = SPEC_COLORS[spec] || DEFAULT_SPEC_COLOR;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${colorClass}`}>
      {spec}
    </span>
  );
},
```

Sortable headers + inactive row styling - same pattern.

### Step 5: Update `podwykonawcy-filters.tsx`

Add **specjalizacja dropdown** (Select):
- Options: `Wszystkie` + unique values from `getDistinctSpecjalizacje()`
- Sets `?specjalizacja=value`

Add **showInactive checkbox** after search.

### Step 6: Verify

Run: `npm run build`
Verify at `localhost:3000/podwykonawcy`:
- Stats bar renders
- Rate range visible
- Specjalizacja badges colored
- Specjalizacja filter works
- Sorting works
- showInactive works

### Step 7: Commit

```
feat: podwykonawcy page UX upgrade - stats bar, rate range, spec badges, sorting, filters
```

---

## US-006: Final Polish & Build Verification

**Acceptance Criteria:**
- `npm run build` passes clean
- `npm run lint` passes
- All 3 pages render correctly at localhost:3000
- No TypeScript errors
- URL state persists correctly (sort, order, filters)

### Step 1: Fix any remaining type errors

Check build output, fix type mismatches.

### Step 2: Full build + lint

```bash
npm run build && npm run lint
```

### Step 3: Commit

```
chore: final polish and build verification for master data UX upgrade
```
