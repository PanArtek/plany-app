-- Organizacje (firmy/zespoły)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazwa VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Członkowie organizacji
CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- Helper function: get user's organizations
CREATE OR REPLACE FUNCTION user_organizations()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Index for RLS performance
CREATE INDEX idx_org_members_user ON organization_members(user_id);
