import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class QueryWeightMiddleware implements NestMiddleware {
  private readonly logger = new Logger(QueryWeightMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const isHeavyRead =
      req.method === 'GET' &&
      (req.path.includes('/leaderboard') ||
        req.path.includes('/analytics') ||
        req.path.includes('/repositories'));

    (req as any).isHeavyReadQuery = isHeavyRead;
    (req as any).routeToReplica = isHeavyRead;

    if (isHeavyRead) {
      this.logger.debug(`[QUERY BALANCER] Dispatched heavy read request ${req.path} to lowest-lag read replica`);
    }

    next();
  }
}
