export function screenFrame(eyebrow: string, title: string, description: string): HTMLElement {
  const screen = document.createElement('section');
  screen.className = 'screen';
  screen.setAttribute('aria-labelledby', 'screen-title');
  const eyebrowElement = document.createElement('p');
  eyebrowElement.className = 'screen__eyebrow';
  eyebrowElement.textContent = eyebrow;
  const titleElement = document.createElement('h1');
  titleElement.className = 'screen__title';
  titleElement.id = 'screen-title';
  titleElement.textContent = title;
  const descriptionElement = document.createElement('p');
  descriptionElement.className = 'screen__lede';
  descriptionElement.textContent = description;
  screen.append(eyebrowElement, titleElement, descriptionElement);
  return screen;
}
