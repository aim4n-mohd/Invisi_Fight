export function HeartMeter(hearts: number, label = 'You'): HTMLElement {
  const meter = document.createElement('div');
  meter.className = 'heart-meter';
  meter.setAttribute('role', 'status');
  meter.setAttribute('aria-label', `${label}: ${hearts} of 3 hearts remaining`);
  for (let index = 0; index < 3; index += 1) {
    const heart = document.createElement('span');
    heart.className = `heart-meter__heart${index < hearts ? '' : ' heart-meter__heart--empty'}`;
    heart.textContent = '♥';
    heart.setAttribute('aria-hidden', 'true');
    meter.append(heart);
  }
  return meter;
}
