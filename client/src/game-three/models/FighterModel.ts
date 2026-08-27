import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  type Material,
  type Object3D,
} from 'three';
import type { Vector2 } from '@invisi-fight/shared';
import { simulationToWorld } from '../math/coordinates.js';

interface FighterModelOptions {
  color: number;
  hologram?: boolean;
}

interface FighterAppearance {
  active: boolean;
  alive: boolean;
  hit?: boolean;
  opacity?: number;
}

export class FighterModel {
  readonly object = new Group();
  readonly #pose = new Group();
  readonly #materials: Material[] = [];
  readonly #solidMaterials: MeshStandardMaterial[] = [];
  readonly #hologramMaterials: MeshBasicMaterial[] = [];
  readonly #activeRing: Mesh<CircleGeometry, MeshBasicMaterial>;
  #moving = false;

  constructor(options: FighterModelOptions) {
    this.object.name = 'fighter';
    this.#pose.name = 'fighter-pose';
    this.object.add(this.#pose);

    const bodyMaterial = this.#material(options.color, options.hologram);
    const darkMaterial = this.#material(0x13203a, options.hologram);
    const skinMaterial = this.#material(0xcfd9ea, options.hologram);
    const gunMaterial = this.#material(0x252e3e, options.hologram);

    const shadow = new Mesh(
      new CircleGeometry(15, 24),
      new MeshBasicMaterial({
        color: 0x02040a,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    shadow.name = 'fighter-shadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.25;
    this.#materials.push(shadow.material);
    this.object.add(shadow);

    const body = this.#mesh(new CapsuleGeometry(8.5, 14, 4, 8), bodyMaterial, 0, 22, 0);
    body.name = 'fighter-body';
    const chest = this.#mesh(new BoxGeometry(19, 7, 14), darkMaterial, 0, 24, 0);
    chest.name = 'fighter-chest';
    const head = this.#mesh(new SphereGeometry(7, 12, 8), skinMaterial, 0, 39, 0);
    head.name = 'fighter-head';
    const visor = this.#mesh(new BoxGeometry(5, 4, 12), bodyMaterial, 5.3, 40, 0);
    visor.name = 'fighter-visor';

    this.#mesh(new BoxGeometry(6, 15, 6), darkMaterial, -2, 8, -5).name = 'fighter-leg-left';
    this.#mesh(new BoxGeometry(6, 15, 6), darkMaterial, -2, 8, 5).name = 'fighter-leg-right';

    const gun = new Group();
    gun.name = 'fighter-gun';
    gun.position.set(0, 27, 0);
    const stock = new Mesh(new BoxGeometry(12, 6, 7), gunMaterial);
    stock.position.x = 8;
    const receiver = new Mesh(new BoxGeometry(19, 6, 7), bodyMaterial);
    receiver.position.x = 21;
    const barrel = new Mesh(new BoxGeometry(17, 3, 3), gunMaterial);
    barrel.position.x = 38;
    const muzzle = new Mesh(new CylinderGeometry(2.8, 2.8, 4, 8), gunMaterial);
    muzzle.name = 'fighter-muzzle';
    muzzle.rotation.z = Math.PI / 2;
    muzzle.position.x = 48;
    const armLeft = new Mesh(new BoxGeometry(15, 4, 4), skinMaterial);
    armLeft.position.set(8, -2, -7);
    const armRight = new Mesh(new BoxGeometry(15, 4, 4), skinMaterial);
    armRight.position.set(10, -2, 7);
    gun.add(stock, receiver, barrel, muzzle, armLeft, armRight);
    gun.traverse((entry) => {
      if (entry instanceof Mesh) {
        entry.castShadow = !options.hologram;
        entry.receiveShadow = !options.hologram;
      }
    });
    this.#pose.add(gun);

    const ringMaterial = new MeshBasicMaterial({
      color: 0xffbf33,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.#materials.push(ringMaterial);
    this.#activeRing = new Mesh(new CircleGeometry(23, 32), ringMaterial);
    this.#activeRing.name = 'active-shooter-ring';
    this.#activeRing.rotation.x = -Math.PI / 2;
    this.#activeRing.position.y = 0.35;
    this.object.add(this.#activeRing);
  }

  setPosition(position: Vector2): void {
    const world = simulationToWorld(position);
    this.object.position.set(world.x, world.y, world.z);
  }

  setAimAngle(angleRad: number): void {
    this.object.rotation.y = -angleRad;
  }

  setMoving(moving: boolean): void {
    this.#moving = moving;
  }

  animate(elapsedSeconds: number): void {
    this.#pose.position.y = this.#moving
      ? Math.sin(elapsedSeconds * 12) * 1.5
      : Math.sin(elapsedSeconds * 3) * 0.45;
  }

  setAppearance({ active, alive, hit = false, opacity = 1 }: FighterAppearance): void {
    this.#activeRing.material.opacity = active ? 0.42 : 0;
    this.#activeRing.scale.setScalar(active ? 1 + Math.sin(performance.now() / 130) * 0.08 : 1);
    this.#pose.rotation.x = hit ? -0.2 : 0;
    this.#pose.rotation.z = alive ? 0 : Math.PI * 0.42;
    this.#solidMaterials.forEach((material) => {
      material.emissive.set(hit ? 0x8a1026 : active ? 0x6e4b00 : 0x000000);
      material.emissiveIntensity = hit ? 1.4 : active ? 0.85 : 0;
      material.transparent = opacity < 1 || !alive;
      material.opacity = alive ? opacity : Math.min(opacity, 0.38);
    });
    this.#hologramMaterials.forEach((material) => {
      material.opacity = (alive ? 0.62 : 0.28) * opacity;
    });
  }

  dispose(): void {
    this.object.traverse((entry: Object3D) => {
      if (!(entry instanceof Mesh)) return;
      entry.geometry.dispose();
    });
    this.#materials.forEach((material) => material.dispose());
  }

  #material(color: number, hologram = false): Material {
    if (hologram) {
      const material = new MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      this.#materials.push(material);
      this.#hologramMaterials.push(material);
      return material;
    }
    const material = new MeshStandardMaterial({
      color: new Color(color),
      roughness: 0.72,
      metalness: 0.08,
    });
    this.#materials.push(material);
    this.#solidMaterials.push(material);
    return material;
  }

  #mesh(
    geometry: BoxGeometry | CapsuleGeometry | SphereGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
  ): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.#pose.add(mesh);
    return mesh;
  }
}
