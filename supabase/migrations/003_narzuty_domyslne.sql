-- Domyślne narzuty per branża (tylko podpowiedź!)
CREATE TABLE narzuty_domyslne (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    branza_kod branza_kod NOT NULL,
    narzut_percent DECIMAL(5,2) NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT narzuty_unique UNIQUE (organization_id, branza_kod)
);

-- System defaults (organization_id = NULL)
INSERT INTO narzuty_domyslne (organization_id, branza_kod, narzut_percent) VALUES
    (NULL, 'BUD', 30),
    (NULL, 'ELE', 25),
    (NULL, 'SAN', 28),
    (NULL, 'TEL', 25),
    (NULL, 'HVC', 22);
