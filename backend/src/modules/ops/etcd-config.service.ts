import { Injectable, Logger } from '@nestjs/common';

export interface DynamicConfigValue {
  key: string;
  value: any;
  revision: number;
  updatedAt: string;
}

@Injectable()
export class EtcdConfigService {
  private readonly logger = new Logger(EtcdConfigService.name);
  private configStore: Map<string, DynamicConfigValue> = new Map();
  private revisionHistory: Map<string, DynamicConfigValue[]> = new Map();

  constructor() {
    this.setInitialDefaults();
  }

  private setInitialDefaults() {
    this.updateConfig('battle.matchTimeoutSeconds', 300);
    this.updateConfig('xp.multiplier', 1.5);
    this.updateConfig('features.powerUpsEnabled', true);
  }

  public getConfig<T>(key: string, defaultValue?: T): T {
    const entry = this.configStore.get(key);
    return entry ? (entry.value as T) : (defaultValue as T);
  }

  public updateConfig(key: string, value: any): DynamicConfigValue {
    const existing = this.configStore.get(key);
    const revision = (existing?.revision || 0) + 1;

    const newConfig: DynamicConfigValue = {
      key,
      value,
      revision,
      updatedAt: new Date().toISOString(),
    };

    // Save to revision history for atomic rollback support
    const history = this.revisionHistory.get(key) || [];
    history.push(newConfig);
    this.revisionHistory.set(key, history);

    this.configStore.set(key, newConfig);
    this.logger.log(`[ETCD HOT-RELOAD] ${key} updated to revision ${revision}: ${JSON.stringify(value)}`);
    return newConfig;
  }

  public rollbackToRevision(key: string, targetRevision: number): boolean {
    const history = this.revisionHistory.get(key) || [];
    const prev = history.find((h) => h.revision === targetRevision);
    if (prev) {
      this.configStore.set(key, { ...prev, updatedAt: new Date().toISOString() });
      this.logger.warn(`[ETCD ROLLBACK] ${key} rolled back to revision ${targetRevision}`);
      return true;
    }
    return false;
  }
}
