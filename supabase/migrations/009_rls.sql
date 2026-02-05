-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE narzuty_domyslne ENABLE ROW LEVEL SECURITY;
ALTER TABLE produkty ENABLE ROW LEVEL SECURITY;
ALTER TABLE dostawcy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceny_dostawcow ENABLE ROW LEVEL SECURITY;
ALTER TABLE podwykonawcy ENABLE ROW LEVEL SECURITY;
ALTER TABLE stawki_podwykonawcow ENABLE ROW LEVEL SECURITY;
ALTER TABLE pozycje_biblioteka ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteka_skladowe_robocizna ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteka_skladowe_materialy ENABLE ROW LEVEL SECURITY;
ALTER TABLE projekty ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewizje ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_pozycje ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_skladowe_robocizna ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_skladowe_materialy ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS & MEMBERS
-- =====================================================
CREATE POLICY "organizations_select" ON organizations FOR SELECT
    TO authenticated
    USING (id IN (SELECT user_organizations()));

CREATE POLICY "org_members_select" ON organization_members FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- ORG-OWNED TABLES (projekty, produkty, dostawcy, podwykonawcy)
-- =====================================================

-- Projekty
CREATE POLICY "projekty_select" ON projekty FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_insert" ON projekty FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_update" ON projekty FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_delete" ON projekty FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Produkty (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "produkty_select" ON produkty FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_insert" ON produkty FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_update" ON produkty FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_delete" ON produkty FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Dostawcy (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "dostawcy_select" ON dostawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_insert" ON dostawcy FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_update" ON dostawcy FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_delete" ON dostawcy FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Podwykonawcy (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "podwykonawcy_select" ON podwykonawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_insert" ON podwykonawcy FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_update" ON podwykonawcy FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_delete" ON podwykonawcy FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- CHILD TABLES (przez parent FK)
-- =====================================================

-- Rewizje (przez projekty.organization_id)
CREATE POLICY "rewizje_select" ON rewizje FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_insert" ON rewizje FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_update" ON rewizje FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_delete" ON rewizje FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- Ceny dostawców (przez dostawcy.organization_id)
CREATE POLICY "ceny_dostawcow_select" ON ceny_dostawcow FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND (d.organization_id IS NULL OR d.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "ceny_dostawcow_insert" ON ceny_dostawcow FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_update" ON ceny_dostawcow FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_delete" ON ceny_dostawcow FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));

-- Stawki podwykonawców (przez podwykonawcy.organization_id)
CREATE POLICY "stawki_select" ON stawki_podwykonawcow FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND (p.organization_id IS NULL OR p.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "stawki_insert" ON stawki_podwykonawcow FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_update" ON stawki_podwykonawcow FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_delete" ON stawki_podwykonawcow FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- Biblioteka składowe robocizna (przez pozycje_biblioteka)
CREATE POLICY "bib_skladowe_r_select" ON biblioteka_skladowe_robocizna FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_r_insert" ON biblioteka_skladowe_robocizna FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_update" ON biblioteka_skladowe_robocizna FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_delete" ON biblioteka_skladowe_robocizna FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- Biblioteka składowe materiały (przez pozycje_biblioteka)
CREATE POLICY "bib_skladowe_m_select" ON biblioteka_skladowe_materialy FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_m_insert" ON biblioteka_skladowe_materialy FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_update" ON biblioteka_skladowe_materialy FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_delete" ON biblioteka_skladowe_materialy FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- =====================================================
-- HYBRID TABLES (org_id = NULL dla szablonów systemowych)
-- =====================================================
CREATE POLICY "kategorie_select" ON kategorie FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_insert" ON kategorie FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_update" ON kategorie FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_delete" ON kategorie FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "pozycje_biblioteka_select" ON pozycje_biblioteka FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_insert" ON pozycje_biblioteka FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_update" ON pozycje_biblioteka FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_delete" ON pozycje_biblioteka FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "narzuty_select" ON narzuty_domyslne FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_insert" ON narzuty_domyslne FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_update" ON narzuty_domyslne FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_delete" ON narzuty_domyslne FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- KOSZTORYS TABLES
-- =====================================================
CREATE POLICY "kosztorys_pozycje_select" ON kosztorys_pozycje FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_insert" ON kosztorys_pozycje FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_update" ON kosztorys_pozycje FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_delete" ON kosztorys_pozycje FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Pattern: skladowe (through kosztorys_pozycje.organization_id)
CREATE POLICY "ksz_skladowe_r_select" ON kosztorys_skladowe_robocizna FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_insert" ON kosztorys_skladowe_robocizna FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_update" ON kosztorys_skladowe_robocizna FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_delete" ON kosztorys_skladowe_robocizna FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));

-- Same for skladowe_materialy
CREATE POLICY "ksz_skladowe_m_select" ON kosztorys_skladowe_materialy FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_insert" ON kosztorys_skladowe_materialy FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_update" ON kosztorys_skladowe_materialy FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_delete" ON kosztorys_skladowe_materialy FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
