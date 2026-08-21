export function disposeWhenDetached(element: HTMLElement, cleanup: () => void): void {
  queueMicrotask(() => {
    const observer = new MutationObserver(() => {
      if (element.isConnected) return;
      observer.disconnect();
      cleanup();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
