// 兴趣 · 3D 章鱼画廊（嵌入式）
// 兼容性：直接相对路径导入，不依赖 Import Map（旧浏览器/微信 WebView 可能不支持）
import * as THREE from './libs/three/three.module.js';
import { OrbitControls } from './libs/three/OrbitControls.js';
import { GLTFLoader } from './libs/three/GLTFLoader.js';

const wrap = document.getElementById('galleryWrap');
const canvas = document.getElementById('galleryCanvas');
const interestBrowser = document.getElementById('interestBrowser');
if (!wrap || !canvas || !interestBrowser) throw new Error('gallery elements missing');
const interestButtons = Array.from(interestBrowser.querySelectorAll('button[aria-controls]'));

// 移动端 / 微信内置浏览器：降低材质复杂度（MeshPhysicalMaterial 的 sheen/clearcoat 在部分 GPU/WebView 上兼容性差）
const ua = navigator.userAgent;
const useLightMat = /Android|iPhone|iPad|iPod|MicroMessenger/i.test(ua);

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

// 3D 场景就绪前，页面会显示静态插画。
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(w, h);
// 性能优化：限制像素比。桌面 1.5 封顶；移动端/微信 1.2（高 DPR 折叠屏掉帧明显）
renderer.setPixelRatio(Math.min(window.devicePixelRatio, useLightMat ? 1.2 : 1.5));
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
        let mat;
        if (useLightMat) {
          // 移动端/微信：MeshStandardMaterial，去掉 sheen/clearcoat，兼容性优先
          mat = new THREE.MeshStandardMaterial({
            map: oldMat.map || null,
            color: oldMat.color || new THREE.Color(0xffffff),
            normalMap: oldMat.normalMap || null,
            roughnessMap: oldMat.roughnessMap || null,
            roughness: 0.55,
            metalness: 0.0,
          });
          ['map', 'normalMap', 'roughnessMap'].forEach((key) => {
            if (mat[key]) {
              mat[key].colorSpace = THREE.SRGBColorSpace;
              mat[key].needsUpdate = true;
            }
          });
          if (mat.map) {
            mat.emissiveMap = mat.map;
            mat.emissive = new THREE.Color(0xFF7710);
            mat.emissiveIntensity = 0.3;
          }
        } else {
          // 桌面端：保留毛茸茸质感（MeshPhysicalMaterial + sheen/clearcoat）
          mat = new THREE.MeshPhysicalMaterial({
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
    wrap.classList.add('is-3d-ready');
  },
  (xhr) => { console.log(`章鱼加载: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`); },
  (err) => {
    console.error('章鱼 GLB 加载失败，已降级为静态展示:', err);
  }
);

/* 椭圆环轨道：6 张图 */
const ring = new THREE.Group();
scene.add(ring);
const ORBIT_A = 4.5;
const ORBIT_B = 4.5;
const IMAGE_W = 1.6;
const IMAGE_H = 1.6;
const imageMeshes = [];
const planeGeo = new THREE.PlaneGeometry(IMAGE_W, IMAGE_H);
const texLoader = new THREE.TextureLoader();
interestButtons.forEach((button, i) => {
  const detail = document.getElementById(button.getAttribute('aria-controls'));
  const illustration = detail.querySelector('img');
  const angle = (i / interestButtons.length) * Math.PI * 2;
  const x = Math.cos(angle) * ORBIT_A;
  const z = Math.sin(angle) * ORBIT_B;
  const texture = texLoader.load(illustration.getAttribute('src'));
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
  mesh.userData = { interestIndex: i, targetScale: 1.0 };
  ring.add(mesh);
  imageMeshes.push(mesh);
});

/* 射线检测 hover / click */
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
let hoveredMesh = null;
let press = null;
const dragThreshold = 8;

function updateMouseNDC(e) {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener('mousemove', updateMouseNDC);
canvas.addEventListener('pointerdown', (e) => {
  press = e.isPrimary && e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
});
canvas.addEventListener('pointermove', (e) => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > dragThreshold) {
    press = null;
  }
});
canvas.addEventListener('pointercancel', () => { press = null; });
canvas.addEventListener('click', (e) => {
  if (!press) return;
  const distance = Math.hypot(e.clientX - press.x, e.clientY - press.y);
  press = null;
  if (distance > dragThreshold) return;

  updateMouseNDC(e);
  raycaster.setFromCamera(mouseNDC, camera);
  const [hit] = raycaster.intersectObjects(imageMeshes, false);
  if (!hit) return;

  interestButtons[hit.object.userData.interestIndex].click();
  interestBrowser.scrollIntoView({ block: 'nearest' });
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

/* 动画循环：帧率自适应（桌面 60 FPS / 移动端 40 FPS，低端设备自动降帧），
   通过跳过帧减轻 GPU 负担，避免微信 WebView 掉帧 */
const TARGET_FPS = useLightMat ? 40 : 60;
const FRAME_MS = 1000 / TARGET_FPS;
const clock = new THREE.Clock();
let _lastFrame = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = now - _lastFrame;
  if (dt < FRAME_MS) return; // 未到渲染间隔，跳过本帧
  _lastFrame = now;
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
  controls.update();
  renderer.render(scene, camera);
}
animate();
