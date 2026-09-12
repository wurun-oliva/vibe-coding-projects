// 兴趣 · 3D 章鱼画廊（嵌入式）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

const wrap = document.getElementById('galleryWrap');
const canvas = document.getElementById('galleryCanvas');
if (!wrap || !canvas) throw new Error('gallery elements missing');

// 容器尺寸
function getSize() {
  return { w: wrap.clientWidth, h: wrap.clientHeight };
}
let { w, h } = getSize();

/* 场景 / 相机 / 渲染器 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020029);
scene.fog = new THREE.FogExp2(0x020029, 0.035);

const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
camera.position.set(0, 3.5, 9);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

window.addEventListener('resize', () => {
  const s = getSize();
  w = s.w; h = s.h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

/* OrbitControls */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 14;
controls.minPolarAngle = Math.PI * 0.15;
controls.maxPolarAngle = Math.PI * 0.55;
controls.autoRotate = false;

/* 灯光 */
scene.add(new THREE.AmbientLight(0x3a2a1a, 0.8));
const keyLight = new THREE.DirectionalLight(0xfff0e0, 2.0);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff0e0, 0.6);
fillLight.position.set(-3, 2, 2);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0x00ffff, 0.4);
rimLight.position.set(0, -2, -3);
scene.add(rimLight);
const underGlow = new THREE.PointLight(0x8A2BE2, 0.6, 8);
underGlow.position.set(0, -2, 0);
scene.add(underGlow);

/* 中心章鱼 GLB */
const octopus = new THREE.Group();
scene.add(octopus);
const gltfLoader = new GLTFLoader();
let octopusMesh = null;

gltfLoader.load(
  'octopus-new.glb',
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        const oldMat = child.material;
        ['map', 'emissiveMap', 'roughnessMap', 'normalMap'].forEach((key) => {
          if (oldMat[key]) {
            oldMat[key].colorSpace = THREE.SRGBColorSpace;
            oldMat[key].needsUpdate = true;
          }
        });
        const mat = new THREE.MeshPhysicalMaterial({
          map: oldMat.map || null,
          color: oldMat.color || new THREE.Color(0xffffff),
          normalMap: oldMat.normalMap || null,
          roughnessMap: oldMat.roughnessMap || null,
        });
        ['map', 'normalMap', 'roughnessMap'].forEach((key) => {
          if (mat[key]) {
            mat[key].colorSpace = THREE.SRGBColorSpace;
            mat[key].needsUpdate = true;
          }
        });
        mat.roughness = 0.55;
        mat.metalness = 0.0;
        mat.sheen = 1.0;
        mat.sheenColor = new THREE.Color(0xFFB380);
        mat.sheenRoughness = 0.35;
        mat.clearcoat = 0.4;
        mat.clearcoatRoughness = 0.5;
        if (mat.map) {
          mat.emissiveMap = mat.map;
          mat.emissive = new THREE.Color(0xFF7710);
          mat.emissiveIntensity = 0.4;
        }
        mat.transparent = true;
        mat.opacity = 0.92;
        mat.depthWrite = true;
        mat.needsUpdate = true;
        child.material = mat;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5.2 / maxDim;
    model.scale.setScalar(scale);
    model.position.y = -1.0;
    octopus.add(model);
    octopusMesh = model;
  },
  (xhr) => { console.log(`章鱼加载: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`); },
  (err) => { console.error('章鱼加载失败:', err); }
);

/* 椭圆环轨道：6 张图 */
const ring = new THREE.Group();
scene.add(ring);
const ORBIT_A = 4.5;
const ORBIT_B = 4.5;
const IMAGE_COUNT = 6;
const IMAGE_W = 1.6;
const IMAGE_H = 1.6;
const imageMeshes = [];
const planeGeo = new THREE.PlaneGeometry(IMAGE_W, IMAGE_H);
const texLoader = new THREE.TextureLoader();
const imageFiles = [
  'octopus-1.png', 'octopus-2.png', 'octopus-3.png',
  'octopus-4.png', 'octopus-5.png', 'octopus-6.png',
];
const imageLabels = ['健身', '烘焙', '种植', '阅读', '陶艺', '绘画'];

imageFiles.forEach((file, i) => {
  const angle = (i / IMAGE_COUNT) * Math.PI * 2;
  const x = Math.cos(angle) * ORBIT_A;
  const z = Math.sin(angle) * ORBIT_B;
  const texture = texLoader.load(file);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(planeGeo, mat);
  mesh.position.set(x, 0, z);
  mesh.lookAt(camera.position);
  mesh.userData = {
    index: i, baseScale: 1.0, targetScale: 1.0,
    angle: angle, label: imageLabels[i], labelVisible: false,
  };
  ring.add(mesh);
  imageMeshes.push(mesh);
});

/* 文字标签 */
const labelEl = document.createElement('div');
labelEl.id = 'image-label';
labelEl.style.cssText = `
  position: fixed; top: 0; left: 0;
  padding: 6px 16px;
  background: rgba(255, 119, 16, 0.45);
  color: #fff; font-size: 18px; font-weight: 500;
  letter-spacing: 0.15em; border-radius: 20px;
  pointer-events: none; opacity: 0;
  transform: translate(-50%, -100%) scale(0.8);
  transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 100; white-space: nowrap;
  box-shadow: 0 4px 20px rgba(255, 119, 16, 0.4);
`;
document.body.appendChild(labelEl);

let activeLabelMesh = null;
function showLabel(mesh) {
  activeLabelMesh = mesh;
  labelEl.textContent = mesh.userData.label;
  labelEl.style.opacity = '1';
  labelEl.style.transform = 'translate(-50%, -100%) scale(1)';
}
function hideLabel() {
  activeLabelMesh = null;
  labelEl.style.opacity = '0';
  labelEl.style.transform = 'translate(-50%, -100%) scale(0.8)';
}
function updateLabelPosition() {
  if (!activeLabelMesh) return;
  const worldPos = new THREE.Vector3();
  activeLabelMesh.getWorldPosition(worldPos);
  worldPos.y += IMAGE_H / 2 + 0.1;
  const projected = worldPos.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  const x = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
  const y = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;
  labelEl.style.left = `${x}px`;
  labelEl.style.top = `${y}px`;
}

/* 射线检测 hover / click */
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
let hoveredMesh = null;

function updateMouseNDC(e) {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener('mousemove', updateMouseNDC);
canvas.addEventListener('click', (e) => {
  updateMouseNDC(e);
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(imageMeshes, false);
  if (hits.length > 0) {
    const hit = hits[0].object;
    if (activeLabelMesh === hit) hideLabel();
    else showLabel(hit);
  } else {
    hideLabel();
  }
});

/* 阴影 */
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000010, transparent: true, opacity: 0.45, depthWrite: false,
});
const shadowGeo = new THREE.CircleGeometry(2.0, 32);
const shadow = new THREE.Mesh(shadowGeo, shadowMat);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -2.0;
scene.add(shadow);

/* 动画循环 */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  ring.rotation.y = t * 0.15;
  imageMeshes.forEach((mesh) => {
    mesh.lookAt(camera.position);
    const target = mesh.userData.targetScale;
    const current = mesh.scale.x;
    const next = current + (target - current) * 0.1;
    mesh.scale.setScalar(next);
    mesh.renderOrder = target > 1.05 ? 10 : 0;
  });
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(imageMeshes, false);
  const newHovered = hits.length > 0 ? hits[0].object : null;
  if (newHovered !== hoveredMesh) {
    if (hoveredMesh) hoveredMesh.userData.targetScale = 1.0;
    if (newHovered) newHovered.userData.targetScale = 1.35;
    hoveredMesh = newHovered;
    canvas.style.cursor = newHovered ? 'pointer' : 'grab';
  }
  if (octopusMesh) {
    octopus.rotation.y = t * 0.25;
    octopus.position.y = Math.sin(t * 0.9) * 0.4;
    const breath = 1.0 + Math.sin(t * 1.8) * 0.06;
    octopus.scale.setScalar(breath);
  }
  shadow.scale.setScalar(1.0 + Math.sin(t * 0.9) * 0.05);
  shadowMat.opacity = 0.4 + Math.sin(t * 0.9) * 0.05;
  updateLabelPosition();
  controls.update();
  renderer.render(scene, camera);
}
animate();
