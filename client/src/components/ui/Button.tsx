export interface ButtonOptions {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function Button(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `ui-button ui-button--${options.variant ?? 'secondary'}`;
  button.type = options.type ?? 'button';
  button.disabled = options.disabled ?? false;
  button.textContent = options.loading ? `${options.label}…` : options.label;
  button.setAttribute('aria-busy', String(options.loading ?? false));
  if (options.onClick) button.addEventListener('click', options.onClick);
  return button;
}
