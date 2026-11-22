import { describe, it, expect, beforeEach } from 'vitest';
import { TenantShardingClient } from './tenant-sharding';

describe('TenantShardingClient', () => {
  let client: TenantShardingClient;

  beforeEach(() => {
    TenantShardingClient.resetInstance();
    client = TenantShardingClient.getInstance();
  });

  it('enriches HTTP headers with active organization context', () => {
    client.setOrganization('org-mit-csail');

    const headers = client.getTenantHeaders({ Authorization: 'Bearer token-123' });
    expect(headers['x-organization-id']).toBe('org-mit-csail');
    expect(headers['Authorization']).toBe('Bearer token-123');
  });

  it('parses response headers to record active database shard allocation', () => {
    client.setOrganization('org-stanford-ai');

    const headers = new Headers({
      'X-Database-Shard-Id': 'shard-alpha',
      'X-Tenant-Org-Id': 'org-stanford-ai',
    });

    const metadata = client.handleResponseHeaders(headers);
    expect(metadata).toBeDefined();
    expect(metadata?.activeShardId).toBe('shard-alpha');
    expect(metadata?.orgId).toBe('org-stanford-ai');
    expect(metadata?.isGlobalShard).toBe(false);
    expect(client.getLastKnownShardId()).toBe('shard-alpha');
  });

  it('handles global fallback when no organization is active', () => {
    const headers = new Headers({
      'X-Database-Shard-Id': 'shard-core',
    });

    const metadata = client.handleResponseHeaders(headers);
    expect(metadata?.activeShardId).toBe('shard-core');
    expect(metadata?.isGlobalShard).toBe(true);
  });
});

