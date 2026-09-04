const paths = {
  radar: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l8-8M12 11v2',
  decoy: 'M8 3l-4 7 4 4 3-6-3-5M16 10l-3 6 4 5 4-7-5-4',
  bullet: 'M9 20V8l3-5 3 5v12H9ZM9 15h6',
  sound: 'M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4',
  trophy: 'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 13v7M8 21h8',
  fighter: 'M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3',
} as const;

export function echoIcon(name: keyof typeof paths): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[name]);
  svg.append(path);
  return svg;
}

export function hudCard(
  label: string,
  icon: keyof typeof paths,
  content: HTMLElement,
): HTMLElement {
  const card = document.createElement('div');
  card.className = `echo-card echo-card--${icon}`;
  const heading = document.createElement('span');
  heading.className = 'echo-card__label';
  heading.textContent = label;
  const body = document.createElement('div');
  body.className = 'echo-card__body';
  body.append(heading, content);
  card.append(echoIcon(icon), body);
  return card;
}
