import {
  Line,
  LineSegments,
  Mesh,
  Points,
  type Material,
  type Object3D,
  type Texture,
} from 'three';

function disposeMaterial(material: Material): void {
  Object.values(material).forEach((value: unknown) => {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as Texture).dispose();
    }
  });
  material.dispose();
}

export function disposeObject3D(root: Object3D): void {
  root.traverse((entry) => {
    if (
      !(entry instanceof Mesh) &&
      !(entry instanceof Line) &&
      !(entry instanceof LineSegments) &&
      !(entry instanceof Points)
    ) {
      return;
    }
    entry.geometry.dispose();
    const materials = Array.isArray(entry.material) ? entry.material : [entry.material];
    materials.forEach(disposeMaterial);
  });
  root.removeFromParent();
}
