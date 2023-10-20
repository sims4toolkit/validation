/**
 * Utility for counting hashable items.
 */
export default class ItemCounter<T> {
  private readonly _map = new Map<T, number>();

  count(item: T) {
    this._map.set(item, this.get(item) + 1);
  }

  get(item: T): number {
    return this._map.get(item) ?? 0;
  }

  forEach(threshold: number, fn: (item: T, count: number) => void) {
    this._map.forEach((count, item) => {
      if (count >= threshold) fn(item, count);
    });
  }
}