import { describe, it, expect, afterAll } from 'vitest';
import {
  supabase,
  createTestOrganization,
  cleanupOrganization,
} from './helpers/setup';

describe('Smoke test', () => {
  let orgId: string;

  afterAll(async () => {
    if (orgId) await cleanupOrganization(orgId);
  });

  it('can connect to Supabase and create/delete organization', async () => {
    const org = await createTestOrganization('smoke');
    orgId = org.id;
    expect(org.id).toBeDefined();
    expect(org.nazwa).toContain('Test Org');
  });

  it('organization exists after creation', async () => {
    const { data } = await supabase
      .from('organizations')
      .select()
      .eq('id', orgId)
      .single();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(orgId);
  });
});
