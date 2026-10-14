import * as THREE from 'three';

export function createAssets() {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const remember = geometry => { geometries.add(geometry); return geometry; };
  const standard = options => { const value = new THREE.MeshStandardMaterial(options); materials.add(value); return value; };
  const physical = options => { const value = new THREE.MeshPhysicalMaterial(options); materials.add(value); return value; };
  const keepMaterial = value => { materials.add(value); return value; };
  const boxGeometry = remember(new THREE.BoxGeometry(1, 1, 1));
  function block(parent, position, dimensions, material) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.copy(position); mesh.scale.set(...dimensions);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function texture(seed, base, variation, size = 128) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const pixels = ctx.createImageData(size, size);
    let random = seed;
    for (let i = 0; i < pixels.data.length; i += 4) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const noise = (random / 4294967296 - .5) * variation;
      for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = base + noise;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const value = new THREE.CanvasTexture(canvas);
    value.wrapS = value.wrapT = THREE.RepeatWrapping;
    textures.add(value); return value;
  }
  return {remember, standard, physical, keepMaterial, block, texture,
    keepTexture(value) { textures.add(value); return value; },
    dispose() { for (const value of geometries) value.dispose(); for (const value of materials) value.dispose(); for (const value of textures) value.dispose(); }
  };
}
