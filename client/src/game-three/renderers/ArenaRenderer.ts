import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { GAMEPLAY_CONFIG, type MatchPhase } from '@invisi-fight/shared';
import { disposeObject3D } from '../lifecycle/disposeObject3D.js';

export class ArenaRenderer {
  readonly object = new Group();
  readonly #floorMaterial = new MeshStandardMaterial({
    color: 0x0a1222,
    roughness: 0.86,
    metalness: 0.12,
  });
  readonly #railMaterial = new MeshStandardMaterial({
    color: 0x172642,
    roughness: 0.58,
    metalness: 0.38,
    emissive: new Color(0x061228),
    emissiveIntensity: 0.7,
  });

  constructor() {
    this.object.name = 'tactical-diorama';
    const floor = new Mesh(
      new BoxGeometry(GAMEPLAY_CONFIG.arenaWidth, 8, GAMEPLAY_CONFIG.arenaHeight),
      this.#floorMaterial,
    );
    floor.name = 'arena-floor';
    floor.position.y = -4;
    floor.receiveShadow = true;
    this.object.add(floor);

    const gridPoints: Vector3[] = [];
    for (let x = -GAMEPLAY_CONFIG.arenaWidth / 2; x <= GAMEPLAY_CONFIG.arenaWidth / 2; x += 48) {
      gridPoints.push(
        new Vector3(x, 0.45, -GAMEPLAY_CONFIG.arenaHeight / 2),
        new Vector3(x, 0.45, GAMEPLAY_CONFIG.arenaHeight / 2),
      );
    }
    for (let z = -GAMEPLAY_CONFIG.arenaHeight / 2; z <= GAMEPLAY_CONFIG.arenaHeight / 2; z += 48) {
      gridPoints.push(
        new Vector3(-GAMEPLAY_CONFIG.arenaWidth / 2, 0.45, z),
        new Vector3(GAMEPLAY_CONFIG.arenaWidth / 2, 0.45, z),
      );
    }
    const grid = new LineSegments(
      new BufferGeometry().setFromPoints(gridPoints),
      new LineBasicMaterial({ color: 0x203253, transparent: true, opacity: 0.68 }),
    );
    grid.name = 'arena-grid';
    this.object.add(grid);

    const horizontalRail = new BoxGeometry(GAMEPLAY_CONFIG.arenaWidth + 34, 16, 12);
    const verticalRail = new BoxGeometry(12, 16, GAMEPLAY_CONFIG.arenaHeight + 34);
    this.#rail(horizontalRail, 0, 7, -GAMEPLAY_CONFIG.arenaHeight / 2 - 11);
    this.#rail(horizontalRail, 0, 7, GAMEPLAY_CONFIG.arenaHeight / 2 + 11);
    this.#rail(verticalRail, -GAMEPLAY_CONFIG.arenaWidth / 2 - 11, 7, 0);
    this.#rail(verticalRail, GAMEPLAY_CONFIG.arenaWidth / 2 + 11, 7, 0);

    const cornerGeometry = new BoxGeometry(30, 42, 30);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const corner = new Mesh(cornerGeometry, this.#railMaterial);
        corner.name = 'arena-corner-post';
        corner.position.set(
          x * (GAMEPLAY_CONFIG.arenaWidth / 2 + 18),
          17,
          z * (GAMEPLAY_CONFIG.arenaHeight / 2 + 18),
        );
        corner.castShadow = true;
        corner.receiveShadow = true;
        this.object.add(corner);
      }
    }
  }

  setPhase(phase: MatchPhase): void {
    const resolution = phase === 'resolution' || phase === 'recap';
    this.#floorMaterial.emissive.set(resolution ? 0x151009 : 0x020713);
    this.#floorMaterial.emissiveIntensity = resolution ? 0.8 : 0.35;
  }

  dispose(): void {
    disposeObject3D(this.object);
  }

  #rail(geometry: BoxGeometry, x: number, y: number, z: number): void {
    const rail = new Mesh(geometry, this.#railMaterial);
    rail.name = 'arena-boundary-rail';
    rail.position.set(x, y, z);
    rail.castShadow = true;
    rail.receiveShadow = true;
    this.object.add(rail);
  }
}
