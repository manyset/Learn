import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------- SCENE SETUP ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0xdfe9f0, 10, 55);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.3, 80);
camera.position.set(8, 2.8, 12);
camera.lookAt(0, 1.5, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// CSS2 Renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// Pointer Lock Controls for FPS movement
const controls = new PointerLockControls(camera, document.body);

// Movement state
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3()
};

// Click to start controls
renderer.domElement.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  document.getElementById('controls-hint').style.opacity = '0.5';
});

controls.addEventListener('unlock', () => {
  document.getElementById('controls-hint').style.opacity = '1';
});

// Keyboard controls
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
  }
});

// ---------- LIGHTING ----------
const ambientLight = new THREE.AmbientLight(0x8899aa, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
sunLight.position.set(15, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 60;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -15;
sunLight.shadow.bias = -0.0001;
scene.add(sunLight);

const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5a40, 0.4);
scene.add(hemisphereLight);

// Interior lights
const interiorLights = [];
function addInteriorLight(x, y, z, color = 0xfff5e6, intensity = 0.8) {
  const light = new THREE.PointLight(color, intensity, 8);
  light.position.set(x, y, z);
  light.castShadow = true;
  light.shadow.mapSize.width = 512;
  light.shadow.mapSize.height = 512;
  scene.add(light);
  interiorLights.push(light);
  return light;
}

// Ceiling lights throughout building
addInteriorLight(0, 3.8, 0, 0xfff8e7, 1.0);
addInteriorLight(-4, 3.8, -3, 0xfff8e7, 0.7);
addInteriorLight(4, 3.8, -3, 0xfff8e7, 0.7);
addInteriorLight(-4, 3.8, 4, 0xfff8e7, 0.7);
addInteriorLight(4, 3.8, 4, 0xfff8e7, 0.7);
addInteriorLight(0, 3.8, -7, 0xffe8d0, 0.6);
addInteriorLight(-7, 3.8, 0, 0xffe8d0, 0.6);

// ---------- GROUND & EXTERIOR ----------
const groundGeometry = new THREE.PlaneGeometry(40, 40);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a7c4f,
  roughness: 0.8,
  metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
ground.receiveShadow = true;
scene.add(ground);

// Garden path
const pathGeometry = new THREE.PlaneGeometry(2, 8);
const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.6 });
const path = new THREE.Mesh(pathGeometry, pathMaterial);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0, 6);
path.receiveShadow = true;
scene.add(path);

// Trees
function createTree(x, z) {
  const treeGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
  const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4e3d, roughness: 0.8 }));
  trunk.position.y = 1;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  for (let i = 0; i < 3; i++) {
    const foliageGeo = new THREE.ConeGeometry(0.6 - i * 0.15, 0.8, 8);
    const foliage = new THREE.Mesh(foliageGeo, new THREE.MeshStandardMaterial({ color: 0x2d5a27 + i * 0x111100, roughness: 0.6 }));
    foliage.position.y = 1.8 + i * 0.6;
    foliage.castShadow = true;
    treeGroup.add(foliage);
  }
  treeGroup.position.set(x, 0, z);
  scene.add(treeGroup);
}

// Place trees around building
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const radius = 10 + Math.random() * 4;
  createTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

// ---------- MAIN BUILDING STRUCTURE ----------
const buildingGroup = new THREE.Group();

// Floor
const floorGeo = new THREE.PlaneGeometry(12, 14);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0xd4c5b9,
  roughness: 0.4,
  metalness: 0.2
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.01;
floor.receiveShadow = true;
buildingGroup.add(floor);

// Ceiling
const ceilingGeo = new THREE.PlaneGeometry(12, 14);
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.5 });
const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;
ceiling.receiveShadow = true;
buildingGroup.add(ceiling);

// Walls
function createWall(width, height, depth, x, y, z, color = 0xf5f0e8) {
  const wallGeo = new THREE.BoxGeometry(width, height, depth);
  const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  buildingGroup.add(wall);
  return wall;
}

// Exterior walls
createWall(12, 4, 0.3, 0, 2, -7, 0xf0ebe0);
createWall(12, 4, 0.3, 0, 2, 7, 0xf0ebe0);
createWall(0.3, 4, 14, -6, 2, 0, 0xf0ebe0);
createWall(0.3, 4, 14, 6, 2, 0, 0xf0ebe0);

// Interior walls - creating rooms
createWall(0.2, 4, 5, -2.5, 2, -4.5, 0xe8e0d5);
createWall(0.2, 4, 5, 2.5, 2, -4.5, 0xe8e0d5);
createWall(0.2, 4, 4, -3, 2, 2, 0xe8e0d5);
createWall(0.2, 4, 4, 3, 2, 2, 0xe8e0d5);
createWall(5, 4, 0.2, 0, 2, 0, 0xe8e0d5);
createWall(3, 4, 0.2, -4, 2, -2, 0xe8e0d5);
createWall(3, 4, 0.2, 4, 2, -2, 0xe8e0d5);

// Windows
function createWindow(x, y, z, rotY = 0) {
  const windowGroup = new THREE.Group();
  const frameGeo = new THREE.BoxGeometry(1.2, 1.5, 0.08);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.4 }));
  frame.castShadow = true;
  windowGroup.add(frame);

  const glassGeo = new THREE.PlaneGeometry(0.9, 1.2);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({
    color: 0xa8d8ea,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.4
  }));
  glass.position.z = 0.05;
  windowGroup.add(glass);

  windowGroup.position.set(x, y, z);
  windowGroup.rotation.y = rotY;
  buildingGroup.add(windowGroup);
}

// Place windows
createWindow(-2, 2.3, -6.85);
createWindow(0, 2.3, -6.85);
createWindow(2, 2.3, -6.85);
createWindow(-2, 2.3, 6.85, Math.PI);
createWindow(0, 2.3, 6.85, Math.PI);
createWindow(2, 2.3, 6.85, Math.PI);
createWindow(-5.85, 2.3, -2);
createWindow(-5.85, 2.3, 2);
createWindow(5.85, 2.3, -2, Math.PI);
createWindow(5.85, 2.3, 2, Math.PI);

// Doors
function createDoor(x, y, z, rotY = 0) {
  const doorGroup = new THREE.Group();
  const doorGeo = new THREE.BoxGeometry(1, 2.2, 0.1);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.4 }));
  door.position.y = 1.1;
  door.castShadow = true;
  doorGroup.add(door);

  const handleGeo = new THREE.SphereGeometry(0.06);
  const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.8 }));
  handle.position.set(0.3, 1.2, 0.06);
  doorGroup.add(handle);

  doorGroup.position.set(x, 0, z);
  doorGroup.rotation.y = rotY;
  buildingGroup.add(doorGroup);
}

createDoor(0, 0, -6.85);
createDoor(-2.5, 0, 6.85, Math.PI);
createDoor(2.5, 0, 6.85, Math.PI);

// ---------- FURNITURE & DECOR ----------
// Central table
const tableGroup = new THREE.Group();
const tableTopGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 32);
const tableTop = new THREE.Mesh(tableTopGeo, new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.3, metalness: 0.4 }));
tableTop.position.y = 0.8;
tableTop.castShadow = true;
tableGroup.add(tableTop);

const tableLegGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.76, 8);
for (let i = 0; i < 4; i++) {
  const leg = new THREE.Mesh(tableLegGeo, new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.5 }));
  leg.position.set(Math.cos(i * Math.PI / 2) * 0.8, 0.38, Math.sin(i * Math.PI / 2) * 0.8);
  leg.castShadow = true;
  tableGroup.add(leg);
}
tableGroup.position.set(0, 0, 1);
buildingGroup.add(tableGroup);

// Vase on table
const vaseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.4, 12);
const vase = new THREE.Mesh(vaseGeo, new THREE.MeshStandardMaterial({ color: 0xc4924a, roughness: 0.3, metalness: 0.6 }));
vase.position.set(0, 1.05, 1);
vase.castShadow = true;
buildingGroup.add(vase);

// Flowers in vase
for (let i = 0; i < 5; i++) {
  const stemGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.3, 6);
  const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
  stem.position.set((Math.random() - 0.5) * 0.15, 1.35, 1 + (Math.random() - 0.5) * 0.15);
  buildingGroup.add(stem);

  const flowerGeo = new THREE.SphereGeometry(0.05, 6);
  const flower = new THREE.Mesh(flowerGeo, new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.9, 0.8, 0.6)
  }));
  flower.position.copy(stem.position);
  flower.position.y += 0.15;
  buildingGroup.add(flower);
}

// Sofa in living area
function createSofa(x, y, z, rotY = 0) {
  const sofaGroup = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(2, 0.5, 0.8);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.6 }));
  base.position.y = 0.4;
  base.castShadow = true;
  sofaGroup.add(base);

  const backGeo = new THREE.BoxGeometry(2, 0.6, 0.15);
  const back = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.6 }));
  back.position.set(0, 0.85, -0.32);
  back.castShadow = true;
  sofaGroup.add(back);

  const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.8);
  const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.6 }));
  leftArm.position.set(-1, 0.5, 0);
  leftArm.castShadow = true;
  sofaGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.6 }));
  rightArm.position.set(1, 0.5, 0);
  rightArm.castShadow = true;
  sofaGroup.add(rightArm);

  sofaGroup.position.set(x, y, z);
  sofaGroup.rotation.y = rotY;
  buildingGroup.add(sofaGroup);
}

createSofa(-3.5, 0, -4);
createSofa(3.5, 0, 4, Math.PI);

// Bookshelf
function createBookshelf(x, y, z, rotY = 0) {
  const shelfGroup = new THREE.Group();
  const frameGeo = new THREE.BoxGeometry(1.5, 2.5, 0.4);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.4 }));
  frame.position.y = 1.25;
  frame.castShadow = true;
  shelfGroup.add(frame);

  for (let i = 0; i < 4; i++) {
    const shelfGeo = new THREE.BoxGeometry(1.3, 0.05, 0.35);
    const shelf = new THREE.Mesh(shelfGeo, new THREE.MeshStandardMaterial({ color: 0x8b6b4a }));
    shelf.position.y = 0.4 + i * 0.6;
    shelf.castShadow = true;
    shelfGroup.add(shelf);

    // Books
    for (let j = 0; j < 5; j++) {
      const bookGeo = new THREE.BoxGeometry(0.1, 0.45, 0.15);
      const book = new THREE.Mesh(bookGeo, new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
      }));
      book.position.set((j - 2) * 0.22, 0.4 + i * 0.6 + 0.25, 0);
      book.castShadow = true;
      shelfGroup.add(book);
    }
  }

  shelfGroup.position.set(x, y, z);
  shelfGroup.rotation.y = rotY;
  buildingGroup.add(shelfGroup);
}

createBookshelf(-5, 0, -3);
createBookshelf(5, 0, 3, Math.PI);

// Art on walls
function createPainting(x, y, z, rotY = 0) {
  const paintingGroup = new THREE.Group();
  const frameGeo = new THREE.BoxGeometry(0.8, 1, 0.05);
  const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.7 }));
  paintingGroup.add(frame);

  const canvasGeo = new THREE.PlaneGeometry(0.6, 0.8);
  const canvas = new THREE.Mesh(canvasGeo, new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.7, 0.6)
  }));
  canvas.position.z = 0.03;
  paintingGroup.add(canvas);

  paintingGroup.position.set(x, y, z);
  paintingGroup.rotation.y = rotY;
  buildingGroup.add(paintingGroup);
}

createPainting(-2, 2.2, -6.7);
createPainting(2, 2.2, -6.7);
createPainting(0, 2.2, 6.7, Math.PI);

// Rug
const rugGeo = new THREE.PlaneGeometry(3, 2);
const rug = new THREE.Mesh(rugGeo, new THREE.MeshStandardMaterial({ color: 0xc4924a, roughness: 0.8 }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.02, 1);
rug.receiveShadow = true;
buildingGroup.add(rug);

scene.add(buildingGroup);

// ---------- LABELS ----------
function addLabel(text, x, y, z) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = '#5c3d2e';
  div.style.fontSize = '10px';
  div.style.fontWeight = 'bold';
  div.style.background = 'rgba(255,255,255,0.8)';
  div.style.padding = '2px 8px';
  div.style.borderRadius = '10px';
  const label = new CSS2DObject(div);
  label.position.set(x, y, z);
  scene.add(label);
}

addLabel('Living Room', 0, 3.2, -3);
addLabel('Study', -4, 3.2, 3);
addLabel('Dining', 4, 3.2, -3);
addLabel('Entrance', 0, 3.2, 5);

// ---------- UI CONTROLS ----------
let lightingMode = 0;
let fogEnabled = true;
let shadowsEnabled = true;
let wireframeMode = false;
let autoWalkEnabled = false;

const btnLighting = document.getElementById('btn-lighting');
const btnFog = document.getElementById('btn-fog');
const btnShadows = document.getElementById('btn-shadows');
const btnWireframe = document.getElementById('btn-wireframe');
const btnAutoWalk = document.getElementById('btn-auto-walk');
const timeSlider = document.getElementById('time-slider');
const brightnessSlider = document.getElementById('brightness-slider');
const fogSlider = document.getElementById('fog-slider');

// Lighting modes: 0=Day, 1=Sunset, 2=Night
const lightingPresets = [
  { sky: 0x87CEEB, sun: 0xfff5e6, sunIntensity: 1.2, ambient: 0.5, fog: 0xdfe9f0 },
  { sky: 0xffa07a, sun: 0xff8844, sunIntensity: 0.8, ambient: 0.4, fog: 0xffccaa },
  { sky: 0x1a1a3a, sun: 0x6688cc, sunIntensity: 0.2, ambient: 0.2, fog: 0x1a1a3a }
];

btnLighting.addEventListener('click', () => {
  lightingMode = (lightingMode + 1) % 3;
  const preset = lightingPresets[lightingMode];
  scene.background = new THREE.Color(preset.sky);
  scene.fog = new THREE.Fog(preset.fog, 10, 55);
  sunLight.color.set(preset.sun);
  sunLight.intensity = preset.sunIntensity;
  ambientLight.intensity = preset.ambient;

  const modeNames = ['☀️ Day Mode', '🌅 Sunset Mode', '🌙 Night Mode'];
  btnLighting.textContent = modeNames[lightingMode];
});

btnFog.addEventListener('click', () => {
  fogEnabled = !fogEnabled;
  scene.fog = fogEnabled ? new THREE.Fog(lightingPresets[lightingMode].fog, 10, 55) : null;
  btnFog.classList.toggle('active', fogEnabled);
  btnFog.textContent = fogEnabled ? '🌫️ Atmospheric Fog' : '🌫️ Fog (Off)';
});

btnShadows.addEventListener('click', () => {
  shadowsEnabled = !shadowsEnabled;
  renderer.shadowMap.enabled = shadowsEnabled;
  btnShadows.classList.toggle('active', shadowsEnabled);
  btnShadows.textContent = shadowsEnabled ? '👤 Real-time Shadows' : '👤 Shadows (Off)';
});

btnWireframe.addEventListener('click', () => {
  wireframeMode = !wireframeMode;
  buildingGroup.traverse((child) => {
    if (child.material && child.material.wireframe !== undefined) {
      child.material.wireframe = wireframeMode;
    }
  });
  btnWireframe.classList.toggle('active', wireframeMode);
  btnWireframe.textContent = wireframeMode ? '🔍 Wireframe (On)' : '🔍 Wireframe View';
});

btnAutoWalk.addEventListener('click', () => {
  autoWalkEnabled = !autoWalkEnabled;
  btnAutoWalk.classList.toggle('active', autoWalkEnabled);
  btnAutoWalk.textContent = autoWalkEnabled ? '🚶 Auto Walk (On)' : '🚶 Auto Walk';
});

// Sliders
timeSlider.addEventListener('input', (e) => {
  const val = e.target.value / 100;
  const preset = lightingPresets[Math.floor(val * 2.99)];
  scene.background = new THREE.Color(preset.sky);
  sunLight.color.set(preset.sun);
  sunLight.intensity = preset.sunIntensity;
  ambientLight.intensity = preset.ambient;
});

brightnessSlider.addEventListener('input', (e) => {
  const val = e.target.value / 100;
  interiorLights.forEach(light => {
    light.intensity = val * 1.5;
  });
  renderer.toneMappingExposure = 0.5 + val;
});

fogSlider.addEventListener('input', (e) => {
  const val = e.target.value / 100;
  if (fogEnabled) {
    scene.fog = new THREE.Fog(lightingPresets[lightingMode].fog, 5, 20 + val * 50);
  }
});

// ---------- ANIMATION LOOP ----------
const clock = new THREE.Clock();
let autoWalkAngle = 0;

function animate() {
  const delta = clock.getDelta();
  const time = performance.now() * 0.001;

  // Auto walk
  if (autoWalkEnabled) {
    autoWalkAngle += delta * 0.5;
    camera.position.x = Math.cos(autoWalkAngle) * 5;
    camera.position.z = Math.sin(autoWalkAngle) * 4 + 1;
    camera.lookAt(0, 1.5, 0);
  } else if (controls.isLocked) {
    // Manual movement
    moveState.velocity.x -= moveState.velocity.x * 10 * delta;
    moveState.velocity.z -= moveState.velocity.z * 10 * delta;

    moveState.direction.z = Number(moveState.forward) - Number(moveState.backward);
    moveState.direction.x = Number(moveState.right) - Number(moveState.left);
    moveState.direction.normalize();

    const speed = 4.0;
    if (moveState.forward || moveState.backward) {
      moveState.velocity.z -= moveState.direction.z * speed * delta;
    }
    if (moveState.left || moveState.right) {
      moveState.velocity.x -= moveState.direction.x * speed * delta;
    }

    controls.moveRight(-moveState.velocity.x * delta * 20);
    controls.moveForward(-moveState.velocity.z * delta * 20);
  }

  // Subtle ceiling light flicker
  interiorLights.forEach((light, i) => {
    light.intensity += Math.sin(time * 3 + i) * 0.02;
  });

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// Hide loading screen
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.style.opacity = '0';
  setTimeout(() => loadingScreen.style.display = 'none', 500);
}, 1500);

renderer.setAnimationLoop(animate);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('🏛️ Villa Moderna ready! Click to start walking.');
console.log('🖱️ WASD to move • Mouse to look • Use buttons for effects');