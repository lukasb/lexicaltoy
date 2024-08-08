export class QueryCounter {
  private counts: Map<string, number>;

  constructor() {
    this.counts = new Map();
  }

  increment(query: string): void {
    this.counts.set(query, (this.counts.get(query) || 0) + 1);
  }

  decrement(query: string): void {
    const count = this.counts.get(query) || 0;
    if (count > 1) {
      this.counts.set(query, count - 1);
    } else {
      this.counts.delete(query);
    }
  }

  getCount(query: string): number {
    return this.counts.get(query) || 0;
  }

  getAllCounts(): Map<string, number> {
    return new Map(this.counts);
  }

  getUniqueQueries(): IterableIterator<string> {
    return this.counts.keys();
  }
}