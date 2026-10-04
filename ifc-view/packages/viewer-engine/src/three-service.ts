import * as THREE from 'three';

export interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export function initThreeScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  backgroundColor = '#1B1B1B',
): ThreeContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    10000,
  );
  camera.position.set(30, 30, 30);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(50, 100, 50);
  scene.add(directional);

  const directional2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directional2.position.set(-50, 50, -50);
  scene.add(directional2);

  // Grid
  const grid = new THREE.GridHelper(100, 50, 0x3A3A3A, 0x181818);
  grid.name = 'spanvision-grid';
  scene.add(grid);
  setSceneBackground(scene, backgroundColor);

  return { scene, camera, renderer };
}

export function setSceneBackground(scene: THREE.Scene, color: string): void {
  const background = new THREE.Color(color);
  scene.background = background;
  const grid = scene.getObjectByName('spanvision-grid') as THREE.GridHelper | undefined;
  if (!grid) return;
  const light = background.getHSL({h:0,s:0,l:0}).l > 0.35;
  const minor = new THREE.Color(light ? 0xafb9c6 : 0x566172);
  const major = new THREE.Color(light ? 0x718096 : 0x8b97a8);
  const colors = grid.geometry.getAttribute('color') as THREE.BufferAttribute;
  // GridHelper emits four vertices per division; the center division is the major axis.
  for (let i=0;i<colors.count;i++) {
    const ink = Math.floor(i/4) === 25 ? major : minor;
    colors.setXYZ(i,ink.r,ink.g,ink.b);
  }
  colors.needsUpdate = true;
}

export function zoomFitCamera(
  allMeshes: THREE.Mesh[],
  target: THREE.Vector3,
  spherical: { theta: number; phi: number; radius: number },
  updateCamera: () => void,
): void {
  const box = new THREE.Box3();
  let hasVisibleMesh = false;

  for (const mesh of allMeshes) {
    if (mesh.visible && (mesh.material as THREE.MeshLambertMaterial).opacity > 0.2) {
      box.expandByObject(mesh);
      hasVisibleMesh = true;
    }
  }

  if (!hasVisibleMesh || box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  target.copy(center);
  spherical.radius = maxDim * 1.5;
  updateCamera();
}

export function disposeThreeScene(
  scene: THREE.Scene,
  allMeshes: THREE.Mesh[],
  renderer: THREE.WebGLRenderer,
): void {
  for (const mesh of allMeshes) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  renderer.dispose();
}
