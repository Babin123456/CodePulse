export interface KvCacheEntry {
  prefixKey: string;
  keys: Float32Array;
  values: Float32Array;
  seqLength: number;
  lastAccessed: number;
}

export class OnnxKvCache {
  private cache: Map<string, KvCacheEntry> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number = 200) {
    this.maxEntries = maxEntries;
  }

  public get(prefix: string): KvCacheEntry | undefined {
    const entry = this.cache.get(prefix);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  public set(prefix: string, keys: Float32Array, values: Float32Array, seqLength: number): void {
    if (this.cache.size >= this.maxEntries) {
      // LRU eviction
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, item] of this.cache.entries()) {
        if (item.lastAccessed < oldestTime) {
          oldestTime = item.lastAccessed;
          oldestKey = key;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(prefix, {
      prefixKey: prefix,
      keys,
      values,
      seqLength,
      lastAccessed: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
