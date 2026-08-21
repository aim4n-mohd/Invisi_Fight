export interface InputOptions {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  spellCheck?: boolean;
  uppercase?: boolean;
  onInput?: (value: string) => void;
}

export function Input(options: InputOptions): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'ui-field';
  const label = document.createElement('span');
  label.className = 'ui-field__label';
  label.textContent = options.label;
  const input = document.createElement('input');
  input.className = 'ui-input';
  input.name = options.name;
  input.value = options.value ?? '';
  input.placeholder = options.placeholder ?? '';
  input.setAttribute('autocomplete', options.autoComplete ?? 'off');
  input.setAttribute('autocapitalize', options.autoCapitalize ?? 'none');
  input.spellcheck = options.spellCheck ?? false;
  if (options.uppercase) input.classList.add('ui-input--uppercase');
  if (options.maxLength) input.maxLength = options.maxLength;
  input.setAttribute('aria-invalid', String(options.invalid ?? false));
  input.addEventListener('input', () => {
    if (options.uppercase) input.value = input.value.toUpperCase();
    options.onInput?.(input.value);
  });
  wrapper.append(label, input);
  return wrapper;
}
