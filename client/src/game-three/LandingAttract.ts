import {
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { ArenaRenderer } from './renderers/ArenaRenderer.js';
import { FighterModel } from './models/FighterModel.js';
import { CameraController } from './camera/CameraController.js';
import { simulationToWorld } from './math/coordinates.js';

/** Presentation only: no room, gameplay state, input, health, or audio. */
export class LandingAttract {
  #scene = new Scene();
  #renderer = new WebGLRenderer({ antialias: true, alpha: false });
  #camera = new CameraController();
  #arena = new ArenaRenderer();
  #fighters = [new FighterModel({ color: 0x4d8cff }), new FighterModel({ color: 0xffbf33 })];
  #tracer = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xc5d7e0, transparent: true }),
  );
  #observer: ResizeObserver;
  #frame = 0;
  #elapsed = 0;
  #previous = 0;
  #destroyed = false;
  #motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(readonly parent: HTMLElement) {
    this.#scene.background = new Color(0x050912);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    parent.append(this.#renderer.domElement);
    this.#scene.add(
      this.#arena.object,
      ...this.#fighters.map((fighter) => fighter.object),
      this.#tracer,
      new HemisphereLight(0xa8c8ff, 0x091122, 2),
    );
    const key = new DirectionalLight(0xffe2c2, 3);
    key.position.set(-250, 600, 300);
    this.#scene.add(key);
    this.#observer = new ResizeObserver(() => {
      this.#resize();
      this.#draw();
    });
    this.#observer.observe(parent);
    document.addEventListener('visibilitychange', this.#visibility);
    this.#motion.addEventListener('change', this.#visibility);
    this.#resize();
    this.#visibility();
  }

  destroy(): void {
    this.#destroyed = true;
    cancelAnimationFrame(this.#frame);
    this.#observer.disconnect();
    document.removeEventListener('visibilitychange', this.#visibility);
    this.#motion.removeEventListener('change', this.#visibility);
    this.#arena.dispose();
    this.#fighters.forEach((fighter) => fighter.dispose());
    this.#tracer.geometry.dispose();
    this.#tracer.material.dispose();
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
    this.#renderer.domElement.remove();
  }

  readonly #visibility = (): void => {
    cancelAnimationFrame(this.#frame);
    this.#previous = 0;
    if (this.#destroyed || document.hidden) return;
    this.#draw();
    if (!this.#motion.matches) this.#frame = requestAnimationFrame(this.#tick);
  };

  readonly #tick = (now: number): void => {
    if (this.#destroyed || document.hidden) return;
    const delta = this.#previous ? now - this.#previous : 0;
    this.#elapsed = delta > 1_000 ? 0 : this.#elapsed + Math.min(34, delta) / 1_000;
    this.#previous = now;
    this.#draw();
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #draw(): void {
    const t = this.#motion.matches ? 0 : this.#elapsed;
    const positions = [
      { x: 290 + Math.sin(t * 0.45) * 110, y: 230 + Math.cos(t * 0.7) * 115 },
      { x: 680 + Math.sin(t * 0.55 + 2) * 110, y: 280 + Math.cos(t * 0.6 + 1) * 115 },
    ];
    this.#fighters.forEach((fighter, index) => {
      const own = positions[index]!;
      const other = positions[1 - index]!;
      fighter.setPosition(own);
      fighter.setAimAngle(Math.atan2(other.y - own.y, other.x - own.x));
      fighter.setMoving(!this.#motion.matches);
      fighter.animate(t);
    });
    const points = positions.map((position) => {
      const p = simulationToWorld(position, 25);
      return new Vector3(p.x, p.y, p.z);
    });
    this.#tracer.geometry.setFromPoints(points);
    this.#tracer.material.opacity = !this.#motion.matches && t % 2.4 < 0.18 ? 0.45 : 0;
    this.#renderer.render(this.#scene, this.#camera.camera);
  }

  #resize(): void {
    const width = Math.max(1, this.parent.clientWidth);
    const height = Math.max(1, this.parent.clientHeight);
    this.#renderer.setSize(width, height, false);
    this.#camera.resize(width, height);
  }
}
