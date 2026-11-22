export interface CrossShardQueryResult<T> {
  shardId: string;
  data: T[];
  executionTimeMs: number;
}

export class CrossShardAggregator {
  /**
   * Executes parallel queries across shard clusters and merge-sorts results
   */
  public async executeParallelAndMerge<T>(
    shardQueries: Array<() => Promise<T[]>>,
    sortField: keyof T,
    ascending: boolean = false,
  ): Promise<T[]> {
    const results = await Promise.all(shardQueries.map((q) => q()));
    const flattened = results.flat();

    return flattened.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });
  }
}
