-- Migration: get_materialy_aggregated function
-- Aggregates products with pozycje count, dostawcy count, and best price
-- Supports filtering by branza/kategoria/podkategoria via position hierarchy codes

CREATE OR REPLACE FUNCTION public.get_materialy_aggregated(
  p_branza text DEFAULT NULL,
  p_kategoria text DEFAULT NULL,
  p_podkategoria text DEFAULT NULL,
  p_search text DEFAULT NULL,
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
  total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_kod_prefix text;
BEGIN
  -- Build kod prefix from hierarchy filters
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
    SELECT DISTINCT p.id
    FROM produkty p
    WHERE p.aktywny = true
      AND (p_search IS NULL OR (
        p.nazwa ILIKE '%' || p_search || '%'
        OR p.sku ILIKE '%' || p_search || '%'
      ))
      AND (v_kod_prefix IS NULL OR EXISTS (
        SELECT 1
        FROM biblioteka_skladowe_materialy bsm
        JOIN pozycje_biblioteka pb ON pb.id = bsm.pozycja_biblioteka_id
        WHERE bsm.produkt_id = p.id
          AND pb.kod LIKE v_kod_prefix || '%'
      ))
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered_products
  )
  SELECT
    p.id,
    p.sku,
    p.nazwa,
    p.jednostka,
    p.aktywny,
    COUNT(DISTINCT bsm.pozycja_biblioteka_id) AS pozycje_count,
    COUNT(DISTINCT cd.dostawca_id) AS dostawcy_count,
    MIN(cd.cena_netto) AS najlepsza_cena,
    c.cnt AS total_count
  FROM filtered_products fp
  JOIN produkty p ON p.id = fp.id
  CROSS JOIN counted c
  LEFT JOIN biblioteka_skladowe_materialy bsm ON bsm.produkt_id = p.id
  LEFT JOIN ceny_dostawcow cd ON cd.produkt_id = p.id AND cd.aktywny = true
  GROUP BY p.id, p.sku, p.nazwa, p.jednostka, p.aktywny, c.cnt
  ORDER BY p.nazwa ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
