export function StatusBanner(message: string, tone: 'info' | 'error' = 'info'): HTMLElement {
  const banner = document.createElement('div');
  banner.className = `status-banner status-banner--${tone}`;
  banner.role = tone === 'error' ? 'alert' : 'status';
  banner.textContent = message;
  return banner;
}
