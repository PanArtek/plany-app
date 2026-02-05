-- View: kosztorys_pozycje z wyliczonymi R, M, Razem
-- WAŻNE: Wzór kalkulacji z obsługą manual override:
--   is_manual=false → koszt = norma × cena × kp.ilosc
--   is_manual=true  → koszt = ilosc × cena (user override)
-- WAŻNE: security_invoker = true wymusza RLS na views
CREATE OR REPLACE VIEW kosztorys_pozycje_view
WITH (security_invoker = true)
AS
SELECT
    kp.id,
    kp.organization_id,
    kp.rewizja_id,
    kp.pozycja_biblioteka_id,
    kp.lp,
    kp.nazwa,
    kp.ilosc,
    kp.jednostka,
    kp.narzut_percent,
    kp.notatki,
    kp.created_at,
    kp.updated_at,

    -- Koszt jednostkowy (na 1 m², 1 szt, etc.) - tylko dla składowych auto
    COALESCE(r.suma_jedn, 0) AS r_jednostkowy,
    COALESCE(m.suma_jedn, 0) AS m_jednostkowy,

    -- Koszt całkowity R (auto + manual)
    COALESCE(r.suma_jedn, 0) * kp.ilosc + COALESCE(r.suma_manual, 0) AS r_robocizna,

    -- Koszt całkowity M (auto + manual)
    COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0) AS m_materialy,

    -- R + M
    (COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0) AS r_plus_m,

    -- Narzut i razem
    ((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * kp.narzut_percent / 100 AS narzut_wartosc,
    ((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * (1 + kp.narzut_percent / 100) AS razem

FROM kosztorys_pozycje kp

LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        -- Auto: suma(stawka × norma) - będzie pomnożone przez kp.ilosc
        SUM(CASE WHEN NOT is_manual THEN stawka * norma ELSE 0 END) AS suma_jedn,
        -- Manual: suma(stawka × ilosc) - już finalna wartość
        -- COALESCE na wypadek niespójnych danych (constraint powinien temu zapobiec)
        SUM(CASE WHEN is_manual THEN stawka * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_robocizna
    GROUP BY kosztorys_pozycja_id
) r ON r.kosztorys_pozycja_id = kp.id

LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        -- Auto: suma(cena × norma) - będzie pomnożone przez kp.ilosc
        SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
        -- Manual: suma(cena × ilosc) - już finalna wartość
        -- COALESCE na wypadek niespójnych danych (constraint powinien temu zapobiec)
        SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_materialy
    GROUP BY kosztorys_pozycja_id
) m ON m.kosztorys_pozycja_id = kp.id;

-- View: podsumowanie rewizji
-- WAŻNE: security_invoker = true wymusza RLS na views
CREATE OR REPLACE VIEW rewizje_summary
WITH (security_invoker = true)
AS
SELECT
    rew.id,
    rew.projekt_id,
    rew.numer,
    rew.nazwa,
    rew.is_locked,
    rew.locked_at,
    rew.created_at,
    COALESCE(stats.liczba_pozycji, 0) AS liczba_pozycji,
    COALESCE(stats.suma_r, 0) AS suma_r,
    COALESCE(stats.suma_m, 0) AS suma_m,
    COALESCE(stats.suma_razem, 0) AS suma_razem
FROM rewizje rew
LEFT JOIN (
    SELECT
        kp.rewizja_id,
        COUNT(kp.id) AS liczba_pozycji,
        SUM(COALESCE(r.suma_jedn, 0) * kp.ilosc + COALESCE(r.suma_manual, 0)) AS suma_r,
        SUM(COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0)) AS suma_m,
        SUM(((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
            + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * (1 + kp.narzut_percent / 100)) AS suma_razem
    FROM kosztorys_pozycje kp
    LEFT JOIN (
        SELECT kosztorys_pozycja_id,
            SUM(CASE WHEN NOT is_manual THEN stawka * norma ELSE 0 END) AS suma_jedn,
            SUM(CASE WHEN is_manual THEN stawka * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
        FROM kosztorys_skladowe_robocizna GROUP BY kosztorys_pozycja_id
    ) r ON r.kosztorys_pozycja_id = kp.id
    LEFT JOIN (
        SELECT kosztorys_pozycja_id,
            SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
            SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
        FROM kosztorys_skladowe_materialy GROUP BY kosztorys_pozycja_id
    ) m ON m.kosztorys_pozycja_id = kp.id
    GROUP BY kp.rewizja_id
) stats ON stats.rewizja_id = rew.id;
