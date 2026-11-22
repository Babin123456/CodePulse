import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantShardingService } from '../../prisma/tenant-sharding.service';

export interface TenantRequest {
  user?: {
    id?: string;
    orgId?: string;
    organizationId?: string;
    tenantId?: string;
    [key: string]: any;
  };
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  query?: Record<string, any>;
  shardClient?: any;
  activeShardId?: string;
  tenantOrgId?: string;
  [key: string]: any;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    private readonly shardingService?: TenantShardingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<TenantRequest>();
    const res = http.getResponse<any>();

    // 1. Extract organization ID from JWT claims, custom headers, or route params
    const orgId =
      req.user?.orgId ||
      req.user?.organizationId ||
      req.user?.tenantId ||
      (req.headers['x-organization-id'] as string) ||
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-org-id'] as string) ||
      req.params?.orgId ||
      req.params?.organizationId ||
      req.params?.orgName ||
      (req.query?.orgId as string) ||
      (req.query?.organizationId as string) ||
      null;

    if (this.shardingService) {
      const activeShardId = this.shardingService.resolveShardId(orgId);
      const shardClient = this.shardingService.getShardClient(activeShardId);

      // 2. Inject active shard connection and tenant context into request
      req.tenantOrgId = orgId || undefined;
      req.activeShardId = activeShardId;
      req.shardClient = shardClient;

      // 3. Attach diagnostic headers if response object is available
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('X-Database-Shard-Id', activeShardId);
        if (orgId) {
          res.setHeader('X-Tenant-Org-Id', orgId);
        }
      }
    }

    return next.handle();
  }
}

