-- ============================================
-- Phase 9: Acceptance State Machine
-- ============================================

-- 1) Add sent_at column to projekty (tracks when project was sent to client)
ALTER TABLE projekty ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 2) Recreate rewizje_summary view to include is_accepted and accepted_at
DROP VIEW IF EXISTS rewizje_summary;

CREATE VIEW rewizje_summary
WITH (security_invoker = true)
AS
SELECT
    rew.id,
    rew.projekt_id,
    rew.numer,
    rew.nazwa,
    rew.is_locked,
    rew.locked_at,
    rew.is_accepted,
    rew.accepted_at,
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

-- 3) State machine function for project status transitions
CREATE OR REPLACE FUNCTION change_project_status(
    p_projekt_id UUID,
    p_new_status project_status,
    p_rewizja_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_current_status project_status;
    v_accepted_rewizja_id UUID;
    v_has_locked_rewizja BOOLEAN;
    v_rewizja_locked BOOLEAN;
    v_result JSON;
BEGIN
    -- Fetch current project state
    SELECT status, accepted_rewizja_id
    INTO v_current_status, v_accepted_rewizja_id
    FROM projekty
    WHERE id = p_projekt_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Projekt nie istnieje';
    END IF;

    -- Validate transitions and apply side effects
    IF v_current_status = 'draft' AND p_new_status = 'ofertowanie' THEN
        -- Requires at least 1 locked rewizja
        SELECT EXISTS(
            SELECT 1 FROM rewizje
            WHERE projekt_id = p_projekt_id AND is_locked = true
        ) INTO v_has_locked_rewizja;

        IF NOT v_has_locked_rewizja THEN
            RAISE EXCEPTION 'Nie można wysłać projektu bez zamkniętej rewizji';
        END IF;

        UPDATE projekty
        SET status = p_new_status, sent_at = NOW(), updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'ofertowanie' AND p_new_status = 'draft' THEN
        UPDATE projekty
        SET status = p_new_status, sent_at = NULL, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'ofertowanie' AND p_new_status = 'realizacja' THEN
        IF p_rewizja_id IS NULL THEN
            RAISE EXCEPTION 'Akceptacja wymaga wskazania rewizji';
        END IF;

        SELECT is_locked INTO v_rewizja_locked
        FROM rewizje
        WHERE id = p_rewizja_id AND projekt_id = p_projekt_id;

        IF v_rewizja_locked IS NULL THEN
            RAISE EXCEPTION 'Rewizja nie istnieje w tym projekcie';
        END IF;

        IF NOT v_rewizja_locked THEN
            RAISE EXCEPTION 'Rewizja musi być zamknięta przed akceptacją';
        END IF;

        UPDATE rewizje
        SET is_accepted = true, accepted_at = NOW(), updated_at = NOW()
        WHERE id = p_rewizja_id;

        UPDATE projekty
        SET status = p_new_status, accepted_rewizja_id = p_rewizja_id, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'ofertowanie' AND p_new_status = 'odrzucony' THEN
        UPDATE projekty
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'realizacja' AND p_new_status = 'ofertowanie' THEN
        IF v_accepted_rewizja_id IS NOT NULL THEN
            UPDATE rewizje
            SET is_accepted = false, accepted_at = NULL, updated_at = NOW()
            WHERE id = v_accepted_rewizja_id;
        END IF;

        UPDATE projekty
        SET status = p_new_status, accepted_rewizja_id = NULL, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'odrzucony' AND p_new_status = 'ofertowanie' THEN
        UPDATE projekty
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSIF v_current_status = 'realizacja' AND p_new_status = 'zamkniety' THEN
        UPDATE projekty
        SET status = p_new_status, updated_at = NOW()
        WHERE id = p_projekt_id;

    ELSE
        RAISE EXCEPTION 'Niedozwolona zmiana statusu z % na %', v_current_status, p_new_status;
    END IF;

    SELECT row_to_json(p) INTO v_result
    FROM (
        SELECT * FROM projekty WHERE id = p_projekt_id
    ) p;

    RETURN v_result;
END;
$$;
