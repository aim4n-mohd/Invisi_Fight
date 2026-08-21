class ServerClock {
  #offsetMs = 0;

  synchronize(serverTimeMs: number, receivedAtClientMs = Date.now()): void {
    this.#offsetMs = serverTimeMs - receivedAtClientMs;
  }

  now(clientTimeMs = Date.now()): number {
    return clientTimeMs + this.#offsetMs;
  }

  reset(): void {
    this.#offsetMs = 0;
  }
}

export const serverClock = new ServerClock();
