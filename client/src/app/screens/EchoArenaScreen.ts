import { ECHO_GAMEPLAY_CONFIG as ECHO } from '@invisi-fight/shared';
import { matchViewStore } from '../../state/matchViewStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { echoStore, soundLevelAt } from '../../state/echoStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { connectionStore } from '../../state/connectionStore.js';
import { uiStore } from '../../state/uiStore.js';
import { serverClock } from '../../network/serverClock.js';
import { roomClient } from '../../network/colyseusClient.js';
import { Button } from '../../components/ui/Button.js';
import { openSettings } from '../SettingsDialog.js';
import { copyInvite } from '../invites.js';
import { mountArena } from './mountArena.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { echoIcon, hudCard } from './echoGraphics.js';

function textNode(tag: string, className = '', text = ''): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function EchoArenaScreen(): HTMLElement {
  const screen = textNode('main', 'echo-screen');
  screen.setAttribute('aria-label', 'Echo Hunt arena');
  const frame = document.createElement('div');
  const top = textNode('header', 'echo-topbar');
  const roomDetails = textNode('section', 'echo-room-panel');
  roomDetails.setAttribute('aria-label', 'Room details');
  const phase = textNode('strong', 'echo-phase');
  const connection = textNode('span', 'echo-connection');
  const roster = textNode('div', 'echo-roster');
  roster.setAttribute('aria-label', 'Fighter roster');
  roomDetails.append(
    textNode('span', 'echo-eyebrow', 'INVISI FIGHT / ECHO HUNT'),
    phase,
    connection,
    roster,
  );
  const sharing = textNode('section', 'echo-share-panel');
  sharing.setAttribute('aria-label', 'Room invitation');
  const room = textNode('strong', 'echo-room-code');
  const inviteFeedback = textNode('span', 'echo-invite-feedback');
  inviteFeedback.setAttribute('role', 'status');
  const utility = textNode('div', 'echo-utilities');
  utility.append(
    Button({
      label: 'Copy link',
      onClick: () => {
        const session = sessionStore.getState().roomSession;
        if (session) void copyInvite(session.roomCode, session.mode, inviteFeedback);
      },
    }),
    Button({ label: 'Settings', onClick: openSettings }),
    Button({ label: 'Leave room', variant: 'ghost', onClick: () => void roomClient.leave() }),
  );
  sharing.append(room, utility, inviteFeedback);
  top.append(roomDetails, sharing);

  const hud = textNode('section', 'echo-hud');
  hud.setAttribute('aria-label', 'Match controls');
  const status = textNode('p', 'echo-status');
  status.setAttribute('role', 'status');
  const cards = textNode('div', 'echo-hud__cards');
  const hearts = textNode('strong', 'echo-hearts');
  const alive = textNode('span', 'echo-card__hint');
  const health = textNode('div');
  health.append(hearts, alive);
  const ammo = textNode('div', 'echo-ammo');
  ammo.setAttribute('role', 'img');
  const bullets = Array.from({ length: ECHO.magazineSize }, () => echoIcon('bullet'));
  ammo.append(...bullets);
  const weapon = textNode('div');
  const reloadProgress = document.createElement('progress');
  reloadProgress.max = 1;
  reloadProgress.setAttribute('aria-label', 'Reload progress');
  weapon.append(ammo, reloadProgress);
  const sonar = textNode('strong');
  const sonarBody = textNode('div');
  sonarBody.append(sonar, textNode('span', 'echo-card__hint', 'SPACE · Reveal echoes'));
  const decoy = textNode('strong');
  const decoyBody = textNode('div');
  decoyBody.append(decoy, textNode('span', 'echo-card__hint', 'RMB · False footsteps'));
  const noiseBody = textNode('div');
  const noise = document.createElement('meter');
  noise.min = 0;
  noise.max = 1;
  noise.setAttribute('aria-label', 'Your emitted sound');
  noiseBody.append(noise, textNode('span', 'echo-card__hint', 'SHIFT · Run louder'));
  const weaponCard = hudCard('Three-round sidearm', 'bullet', weapon);
  const sonarCard = hudCard('Sonar', 'radar', sonarBody);
  const decoyCard = hudCard('Decoy', 'decoy', decoyBody);
  const noiseCard = hudCard('Your sound', 'sound', noiseBody);
  cards.append(
    hudCard('Your fighter', 'fighter', health),
    weaponCard,
    sonarCard,
    decoyCard,
    noiseCard,
  );
  const announcement = textNode('div', 'echo-announcement');
  announcement.setAttribute('aria-live', 'polite');

  const results = document.createElement('dialog');
  results.className = 'echo-results';
  results.setAttribute('aria-label', 'Match results');
  const resultTitle = textNode('h2');
  const resultSubtitle = textNode('p', 'echo-result-subtitle');
  const resultBody = textNode('div', 'echo-result-grid');
  const resultHeading = textNode('div', 'echo-result-heading');
  resultHeading.append(
    echoIcon('trophy'),
    textNode('span', 'echo-eyebrow', 'MATCH COMPLETE'),
    resultTitle,
    resultSubtitle,
  );
  const ready = Button({
    label: 'Next match',
    variant: 'primary',
    onClick: () => {
      const self = matchViewStore
        .getState()
        .players.find((p) => p.playerId === sessionStore.getState().roomSession?.playerId);
      roomClient.sendNextMatch(!self?.readyForNextMatch);
    },
  });
  const readyStatus = textNode('span', 'echo-ready-status');
  readyStatus.setAttribute('role', 'status');
  const resultFooter = textNode('footer', 'echo-result-footer');
  resultFooter.append(
    readyStatus,
    ready,
    Button({ label: 'Back to arena', onClick: () => results.close() }),
  );
  results.append(resultHeading, resultBody, resultFooter);
  const viewResults = Button({ label: 'Match results', onClick: () => openResults() });
  viewResults.hidden = true;
  const openResults = () => {
    if (!results.open && screen.isConnected && !viewResults.hidden) {
      results.setAttribute('aria-modal', 'true');
      results.showModal();
      ready.focus();
    }
  };
  results.addEventListener('close', () => {
    results.removeAttribute('aria-modal');
    if (!viewResults.hidden && screen.isConnected) viewResults.focus();
  });
  hud.append(status, viewResults, cards);
  screen.append(frame, top, announcement, hud, results);
  const disposeArena = mountArena(frame, 'echo_hunt');
  let resultKey = '';
  let rosterKey = '';
  let previousHearts = -1;
  let previousPhase = '';
  let phaseChangedAt = 0;
  let hitUntil = 0;
  let resultsShown = false;
  const render = () => {
    const match = matchViewStore.getState();
    const session = sessionStore.getState().roomSession;
    const self = match.players.find((p) => p.playerId === session?.playerId);
    const privateState = privateSnapshotStore.getState();
    const echo = echoStore.getState();
    const now = serverClock.now();
    const connected = connectionStore.getState().status === 'connected';
    const active = Boolean(self?.alive && self.inCurrentRoster);
    const practice =
      match.phase === 'lobby' || (match.phase === 'countdown' && match.roundNumber === 0);
    const showResults =
      match.phase === 'results' || (match.phase === 'countdown' && match.roundNumber > 0);
    const seconds = Math.max(0, Math.ceil(((match.phaseEndsAtServerMs ?? now) - now) / 1000));
    if (match.phase !== previousPhase) {
      previousPhase = match.phase;
      phaseChangedAt = now;
    }
    if (previousHearts >= 0 && self && self.hearts < previousHearts) hitUntil = now + 700;
    previousHearts = self?.hearts ?? -1;
    phase.textContent =
      match.phase === 'lobby'
        ? 'Free practice'
        : match.phase === 'countdown'
          ? `Starting in ${seconds}`
          : match.phase === 'final_echo'
            ? 'Final Echo'
            : match.phase === 'results'
              ? 'Match complete'
              : `Echo Hunt · ${seconds}s`;
    connection.textContent = connected ? '● Connected' : '○ Reconnecting';
    connection.dataset.connected = String(connected);
    room.textContent = `Room ${session?.roomCode ?? '…'}`;
    hearts.textContent = active
      ? '♥'.repeat(self?.hearts ?? 0) + '♡'.repeat(ECHO.startingHearts - (self?.hearts ?? 0))
      : 'Spectating';
    hearts.setAttribute('aria-label', active ? `${self?.hearts} hearts` : 'Spectating');
    hearts.dataset.hit = String(now < hitUntil);
    const livingCount = match.players.filter((p) => p.inCurrentRoster && p.alive).length;
    alive.textContent = `${livingCount} ${livingCount === 1 ? 'fighter' : 'fighters'} alive`;
    const nextRosterKey = JSON.stringify(
      match.players.map((p) => [
        p.playerId,
        p.displayName,
        p.inCurrentRoster,
        p.readyForNextMatch,
        p.alive,
        p.hearts,
        p.connected,
        p.isHost,
      ]),
    );
    if (nextRosterKey !== rosterKey) {
      rosterKey = nextRosterKey;
      roster.replaceChildren(
        ...match.players
          .filter((p) => p.inCurrentRoster || p.readyForNextMatch)
          .map((p) => {
            const chip = textNode('span', 'echo-roster__chip');
            chip.dataset.alive = String(p.alive);
            chip.textContent = `${p.isHost ? '◇ ' : ''}${p.displayName} · ${p.readyForNextMatch ? 'Ready' : p.alive ? `${p.hearts} ♥` : 'Out'}${p.connected ? '' : ' · Offline'}`;
            return chip;
          }),
      );
    }
    const reloading = echo.reloadEndsAtServerMs > 0;
    const usable = active && !showResults;
    for (const card of [weaponCard, sonarCard, decoyCard, noiseCard]) card.hidden = !usable;
    ammo.setAttribute(
      'aria-label',
      `${echo.ammo} of ${ECHO.magazineSize} bullets${reloading ? ', reloading' : ''}`,
    );
    bullets.forEach((bullet, index) =>
      bullet.setAttribute('data-loaded', String(index < echo.ammo)),
    );
    weaponCard.dataset.ready = String(
      connected && usable && !reloading && echo.ammo > 0 && now >= echo.fireReadyAtServerMs,
    );
    weaponCard.dataset.reloading = String(reloading);
    reloadProgress.hidden = !reloading;
    reloadProgress.value = Math.max(
      0,
      Math.min(1, 1 - (echo.reloadEndsAtServerMs - now) / ECHO.reloadDurationMs),
    );
    sonar.textContent =
      now >= privateState.sonarReadyAtServerMs
        ? 'Ready'
        : `${((privateState.sonarReadyAtServerMs - now) / 1000).toFixed(1)}s`;
    sonarCard.dataset.ready = String(now >= privateState.sonarReadyAtServerMs);
    decoy.textContent = practice || echo.decoyAvailable ? 'Ready' : 'Used';
    decoyCard.dataset.ready = String(practice || echo.decoyAvailable);
    noise.value = active ? soundLevelAt(echo.noiseLevel, echo.noiseAtServerMs, now) : 0;
    noise.style.setProperty(
      '--echo-noise-color',
      `hsl(${Math.round((1 - noise.value) * 120)} 75% 60%)`,
    );
    ready.disabled = !connected;
    const readyText = self?.readyForNextMatch
      ? 'Cancel next match'
      : self?.inCurrentRoster
        ? 'Play again'
        : 'Join next match';
    if (ready.textContent !== readyText) ready.textContent = readyText;
    const readyCount = match.players.filter((p) => p.readyForNextMatch && p.connected).length;
    readyStatus.textContent =
      match.phase === 'countdown'
        ? `Next match in ${seconds} · ${readyCount}/4 ready`
        : `${readyCount}/4 ready for next match`;
    status.textContent =
      uiStore.getState().errorMessage ??
      (!connected
        ? 'Connection lost. Reconnecting…'
        : showResults
          ? readyStatus.textContent
          : practice
            ? 'Waiting for players: free practice'
            : !active
              ? 'Spectating · Watch the echoes. Join the next match.'
              : 'Last fighter standing wins');
    announcement.textContent =
      match.phase === 'countdown'
        ? String(seconds)
        : match.phase === 'final_echo' && now - phaseChangedAt < 2000
          ? 'FINAL ECHO'
          : now < hitUntil
            ? self?.alive
              ? 'HIT'
              : 'ELIMINATED'
            : '';
    const nextKey = showResults
      ? JSON.stringify([
          match.winnerPlayerId,
          match.players.map((p) => [
            p.playerId,
            p.displayName,
            p.rivalryWins,
            p.resultStats,
            p.award,
          ]),
        ])
      : '';
    if (nextKey !== resultKey) {
      resultKey = nextKey;
      resultBody.replaceChildren();
      if (showResults) {
        const winner = match.players.find((p) => p.playerId === match.winnerPlayerId);
        resultTitle.textContent = winner ? `${winner.displayName} wins` : 'Match complete';
        resultSubtitle.textContent =
          winner?.playerId === session?.playerId
            ? 'You were the last fighter standing.'
            : 'Every echo told a story. Ready for another?';
        const fighters = match.players.filter((p) => p.inCurrentRoster || p.resultStats);
        fighters.sort(
          (a, b) =>
            Number(b.playerId === match.winnerPlayerId) -
            Number(a.playerId === match.winnerPlayerId),
        );
        for (const p of fighters) {
          const card = textNode('article', 'echo-result-card');
          card.dataset.winner = String(p.playerId === match.winnerPlayerId);
          const heading = textNode('h3', '', p.displayName);
          const badge = textNode(
            'span',
            'echo-result-badge',
            p.playerId === match.winnerPlayerId ? 'WINNER' : 'FIGHTER',
          );
          const s = p.resultStats;
          const stats = textNode('dl', 'echo-result-stats');
          const entries: [string, string][] = s
            ? [
                ['Accuracy', `${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%`],
                ['Shots landed', `${s.hits}/${s.shots} hits`],
                ['Eliminations', String(s.eliminations)],
                ['Damage', String(s.damage)],
                ['Survived', `${(s.survivalMs / 1000).toFixed(1)}s`],
                ['Room wins', String(p.rivalryWins)],
              ]
            : [['Room wins', String(p.rivalryWins)]];
          for (const [label, value] of entries) {
            const pair = textNode('div');
            pair.append(textNode('dt', '', label), textNode('dd', '', value));
            stats.append(pair);
          }
          card.append(badge, heading, stats);
          if (s) {
            const details = document.createElement('details');
            details.append(
              textNode('summary', '', 'More match stats'),
              textNode(
                'p',
                '',
                `${s.sonarDetections} sonar detections · ${s.emittedSound.toFixed(1)} sound emitted${s.closestMissPx === null ? '' : ` · closest miss ${Math.round(s.closestMissPx)}px`}`,
              ),
            );
            card.append(details);
          }
          if (p.award) card.append(textNode('p', 'echo-result-award', `★ ${p.award}`));
          resultBody.append(card);
        }
      }
    }
    viewResults.hidden = !showResults;
    if (showResults && !resultsShown) {
      resultsShown = true;
      queueMicrotask(openResults);
    }
    if (!showResults) {
      resultsShown = false;
      if (results.open) results.close();
    }
  };
  const timer = window.setInterval(render, 100);
  const unsubscribes = [
    matchViewStore.subscribe(render),
    connectionStore.subscribe(render),
    uiStore.subscribe(render),
  ];
  render();
  disposeWhenDetached(screen, () => {
    window.clearInterval(timer);
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    if (results.open) results.close();
    disposeArena();
  });
  return screen;
}
