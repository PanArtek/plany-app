-- Auto pelny_kod dla kategorie
CREATE OR REPLACE FUNCTION trigger_generate_pelny_kod()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.pelny_kod := NEW.kod;
    ELSE
        SELECT pelny_kod || '.' || NEW.kod INTO NEW.pelny_kod
        FROM kategorie WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kategorie_pelny_kod
    BEFORE INSERT OR UPDATE OF kod, parent_id ON kategorie
    FOR EACH ROW EXECUTE FUNCTION trigger_generate_pelny_kod();

-- Auto numer rewizji
CREATE OR REPLACE FUNCTION trigger_auto_revision_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numer IS NULL THEN
        SELECT COALESCE(MAX(numer), -1) + 1 INTO NEW.numer
        FROM rewizje WHERE projekt_id = NEW.projekt_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rewizje_auto_numer
    BEFORE INSERT ON rewizje
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_revision_number();

-- Auto updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER produkty_updated_at BEFORE UPDATE ON produkty FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER dostawcy_updated_at BEFORE UPDATE ON dostawcy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER ceny_dostawcow_updated_at BEFORE UPDATE ON ceny_dostawcow FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER podwykonawcy_updated_at BEFORE UPDATE ON podwykonawcy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER stawki_podwykonawcow_updated_at BEFORE UPDATE ON stawki_podwykonawcow FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kategorie_updated_at BEFORE UPDATE ON kategorie FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER pozycje_biblioteka_updated_at BEFORE UPDATE ON pozycje_biblioteka FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER projekty_updated_at BEFORE UPDATE ON projekty FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER rewizje_updated_at BEFORE UPDATE ON rewizje FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_pozycje_updated_at BEFORE UPDATE ON kosztorys_pozycje FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_skladowe_r_updated_at BEFORE UPDATE ON kosztorys_skladowe_robocizna FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_skladowe_m_updated_at BEFORE UPDATE ON kosztorys_skladowe_materialy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Trigger: blokada edycji locked rewizji
CREATE OR REPLACE FUNCTION trigger_check_revision_locked()
RETURNS TRIGGER AS $$
DECLARE
    revision_locked BOOLEAN;
BEGIN
    -- Sprawdź czy rewizja jest locked
    SELECT is_locked INTO revision_locked
    FROM rewizje WHERE id = COALESCE(NEW.rewizja_id, OLD.rewizja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie można modyfikować pozycji w zablokowanej rewizji';
    END IF;

    -- DELETE zwraca OLD, INSERT/UPDATE zwraca NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kosztorys_pozycje_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_pozycje
    FOR EACH ROW EXECUTE FUNCTION trigger_check_revision_locked();

-- Trigger: blokada edycji składowych w locked rewizji
CREATE OR REPLACE FUNCTION trigger_check_skladowe_locked()
RETURNS TRIGGER AS $$
DECLARE
    revision_locked BOOLEAN;
BEGIN
    -- Sprawdź przez kosztorys_pozycje → rewizje
    SELECT r.is_locked INTO revision_locked
    FROM kosztorys_pozycje kp
    JOIN rewizje r ON r.id = kp.rewizja_id
    WHERE kp.id = COALESCE(NEW.kosztorys_pozycja_id, OLD.kosztorys_pozycja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie można modyfikować składowych w zablokowanej rewizji';
    END IF;

    -- DELETE zwraca OLD, INSERT/UPDATE zwraca NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ksz_skladowe_r_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_skladowe_robocizna
    FOR EACH ROW EXECUTE FUNCTION trigger_check_skladowe_locked();

CREATE TRIGGER ksz_skladowe_m_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_skladowe_materialy
    FOR EACH ROW EXECUTE FUNCTION trigger_check_skladowe_locked();

-- Private schema dla security definer functions
CREATE SCHEMA IF NOT EXISTS private;

-- Deep copy rewizji z pozycjami i składowymi (PRIVATE - nie dostępne przez API)
-- SECURITY DEFINER - pomija RLS, dlatego w private schema
CREATE OR REPLACE FUNCTION private.copy_revision(
    source_rewizja_id UUID,
    new_nazwa VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_rewizja_id UUID;
    old_pozycja RECORD;
    new_pozycja_id UUID;
    source_org_id UUID;
BEGIN
    -- Walidacja uprawnień: sprawdź czy user ma dostęp do projektu
    SELECT p.organization_id INTO source_org_id
    FROM rewizje r
    JOIN projekty p ON p.id = r.projekt_id
    WHERE r.id = source_rewizja_id;

    IF source_org_id IS NULL THEN
        RAISE EXCEPTION 'Rewizja nie istnieje';
    END IF;

    IF source_org_id NOT IN (SELECT user_organizations()) THEN
        RAISE EXCEPTION 'Brak uprawnień do kopiowania tej rewizji';
    END IF;

    -- Create new revision
    INSERT INTO rewizje (projekt_id, nazwa, is_locked)
    SELECT projekt_id, COALESCE(new_nazwa, 'Kopia ' || nazwa), FALSE
    FROM rewizje WHERE id = source_rewizja_id
    RETURNING id INTO new_rewizja_id;

    -- Copy positions with their skladowe
    FOR old_pozycja IN
        SELECT * FROM kosztorys_pozycje WHERE rewizja_id = source_rewizja_id
    LOOP
        -- Copy position
        INSERT INTO kosztorys_pozycje (
            organization_id, rewizja_id, pozycja_biblioteka_id,
            lp, nazwa, ilosc, jednostka, narzut_percent, notatki
        ) VALUES (
            old_pozycja.organization_id, new_rewizja_id, old_pozycja.pozycja_biblioteka_id,
            old_pozycja.lp, old_pozycja.nazwa, old_pozycja.ilosc, old_pozycja.jednostka,
            old_pozycja.narzut_percent, old_pozycja.notatki
        ) RETURNING id INTO new_pozycja_id;

        -- Copy skladowe robocizna (z is_manual i ilosc)
        INSERT INTO kosztorys_skladowe_robocizna (
            kosztorys_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        )
        SELECT
            new_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        FROM kosztorys_skladowe_robocizna
        WHERE kosztorys_pozycja_id = old_pozycja.id;

        -- Copy skladowe materialy (z is_manual i ilosc)
        INSERT INTO kosztorys_skladowe_materialy (
            kosztorys_pozycja_id, lp, nazwa, produkt_id, dostawca_id,
            cena, norma, ilosc, jednostka, is_manual
        )
        SELECT
            new_pozycja_id, lp, nazwa, produkt_id, dostawca_id,
            cena, norma, ilosc, jednostka, is_manual
        FROM kosztorys_skladowe_materialy
        WHERE kosztorys_pozycja_id = old_pozycja.id;
    END LOOP;

    RETURN new_rewizja_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public wrapper (SECURITY INVOKER - wymusza RLS)
-- Dostępny przez API, deleguje do private.copy_revision
CREATE OR REPLACE FUNCTION copy_revision(
    source_rewizja_id UUID,
    new_nazwa VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
    SELECT private.copy_revision(source_rewizja_id, new_nazwa);
$$ LANGUAGE SQL SECURITY INVOKER;

-- Onboarding: auto-create organization for new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO organizations (nazwa, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Moja firma'),
        NEW.id::text
    )
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
