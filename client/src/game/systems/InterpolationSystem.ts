import type { Vector2 } from '@invisi-fight/shared';

export class InterpolationSystem {
  #current: Vector2 | null = null;
  #target: Vector2 | null = null;

  setTarget(target: Vector2): void {
    this.#target = { ...target };
    if (!this.#current) this.#current = { ...target };
  }

  update(deltaMs: number): Vector2 | null {
    if (!this.#current || !this.#target) return this.#current;
    const blend = 1 - Math.exp(-Math.min(deltaMs, 100) / 70);
    this.#current.x += (this.#target.x - this.#current.x) * blend;
    this.#current.y += (this.#target.y - this.#current.y) * blend;
    return { ...this.#current };
  }

  reset(): void {
    this.#current = null;
    this.#target = null;
  }
}
