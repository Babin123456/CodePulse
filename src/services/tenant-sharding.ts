/**
 * Tenant Sharding Client Service
 * Manages organization context, custom headers (x-organization-id),
 * and client-side tenant routing diagnostics.
 */

export interface TenantShardMetadata {
  orgId: string;
  activeShardId: string;
  isGlobalShard: boolean;
  timestamp: string;
}

export class TenantShardingClient {
  private static instance: TenantShardingClient | null = null;
  private currentOrgId: string | null = null;
  private lastKnownShardId: string | null = null;

  public static getInstance(): TenantShardingClient {
    if (!TenantShardingClient.instance) {
      TenantShardingClient.instance = new TenantShardingClient();
    }
    return TenantShardingClient.instance;
  }

  public static resetInstance(): void {
    TenantShardingClient.instance = null;
  }

  public setOrganization(orgId: string | null): void {
    this.currentOrgId = orgId;
  }

  public getOrganization(): string | null {
    return this.currentOrgId;
  }

  public getLastKnownShardId(): string | null {
    return this.lastKnownShardId;
  }

  /**
   * Enriches outgoing fetch request headers with organization tenant context
   */
  public getTenantHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const enriched = { ...headers };
    if (this.currentOrgId) {
      enriched['x-organization-id'] = this.currentOrgId;
    }
    return enriched;
  }

  /**
   * Ingests diagnostic headers from response to track active shard routing
   */
  public handleResponseHeaders(headers: Headers): TenantShardMetadata | null {
    const shardId = headers.get('X-Database-Shard-Id');
    const orgId = headers.get('X-Tenant-Org-Id') || this.currentOrgId || 'global';

    if (shardId) {
      this.lastKnownShardId = shardId;
      return {
        orgId,
        activeShardId: shardId,
        isGlobalShard: shardId.includes('core') || shardId.includes('global'),
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }
}

