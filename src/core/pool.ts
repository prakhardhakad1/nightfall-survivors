export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, initialCapacity: number = 64) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialCapacity; i++) {
      this.available.push(this.factory());
    }
  }

  public obtain(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.factory();
  }

  public release(item: T): void {
    this.reset(item);
    this.available.push(item);
  }

  public clear(): void {
    this.available.length = 0;
  }
}
