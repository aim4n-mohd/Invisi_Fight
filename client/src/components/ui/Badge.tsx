export function Badge(label: string): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'ui-badge';
  badge.textContent = label;
  return badge;
}
