export type RandomSource = () => number;

export class FiringOrderService {
  createInitialOrder(playerIds: readonly string[], random: RandomSource = Math.random): string[] {
    const order = [...playerIds];
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex] ?? '', order[index] ?? ''];
    }
    return order;
  }

  rotateOne(previousOrder: readonly string[], livingPlayerIds: ReadonlySet<string>): string[] {
    const survivors = previousOrder.filter((playerId) => livingPlayerIds.has(playerId));
    if (survivors.length <= 1) return survivors;
    const first = survivors.shift();
    if (first) survivors.push(first);
    return survivors;
  }
}
