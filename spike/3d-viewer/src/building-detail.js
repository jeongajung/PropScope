import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildingsGeoJSON } from './sample-buildings.js';

const params = new URLSearchParams(location.search);
const requestedId = Number(params.get('id') ?? 0);
const feature =
  buildingsGeoJSON.features.find((f) => f.properties.id === requestedId) ??
  buildingsGeoJSON.features[0];
const p = feature.properties;

document.getElementById('p-type').textContent = p.type;
document.getElementById('p-name').textContent = p.name;
document.getElementById('p-year').textContent = `${p.builtYear}년`;
document.getElementById('p-floors').textContent = `${p.floors}층`;
document.getElementById('p-price').textContent = `${p.priceEok}억`;
document.getElementById('p-jeonse').textContent = `${p.jeonseEok}억`;

// --- 가격 추이 스파크라인 (합성 데이터) ---
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rand = seededRandom(p.id * 17 + 3);
const months = 12;
let v = p.priceEok * 0.88;
const series = [];
for (let i = 0; i < months; i++) {
  v += (rand() - 0.35) * (p.priceEok * 0.03);
  series.push(Math.max(v, p.priceEok * 0.6));
}
series[months - 1] = p.priceEok;
const min = Math.min(...series);
const max = Math.max(...series);
const pointsAttr = series
  .map((val, i) => {
    const x = (i / (months - 1)) * 280;
    const y = 56 - ((val - min) / (max - min || 1)) * 48;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  })
  .join(' ');
const svg = document.getElementById('trend-chart');
svg.innerHTML = `
  <polyline points="${pointsAttr}" fill="none" stroke="#2c6e7f" stroke-width="2" />
  <circle cx="280" cy="${(56 - ((series[months - 1] - min) / (max - min || 1)) * 48).toFixed(1)}" r="3" fill="#9a7830" />
`;

// --- Three.js 씬 ---
const container = document.getElementById('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e2d0);
scene.fog = new THREE.Fog(0xe8e2d0, 60, 220);

const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const targetHeight = p.heightMeters / 8; // 씬 스케일 축소
camera.position.set(28, targetHeight * 0.6 + 10, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, targetHeight / 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(40, 60, 20);
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(160, 160);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xd8d0b8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 선택 건물 (메인 매스)
const mainColor = p.type === '아파트' ? 0x2c6e7f : 0x9a7830;
const mainGeo = new THREE.BoxGeometry(10, targetHeight, 10);
const mainMat = new THREE.MeshStandardMaterial({ color: mainColor });
const mainMesh = new THREE.Mesh(mainGeo, mainMat);
mainMesh.position.y = targetHeight / 2;
scene.add(mainMesh);

// 층 구분선(간단한 와이어프레임 오버레이)
const edges = new THREE.EdgesGeometry(mainGeo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x1b4750, opacity: 0.4, transparent: true });
const wireframe = new THREE.LineSegments(edges, lineMat);
wireframe.position.copy(mainMesh.position);
scene.add(wireframe);

// 주변 컨텍스트 건물 (합성 데이터의 나머지 필지를 상대 배치)
const others = buildingsGeoJSON.features.filter((f) => f.properties.id !== p.id).slice(0, 8);
others.forEach((f, i) => {
  const op = f.properties;
  const h = op.heightMeters / 8;
  const angle = (i / others.length) * Math.PI * 2;
  const radius = 22 + (i % 3) * 6;
  const geo = new THREE.BoxGeometry(7, h, 7);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8570, opacity: 0.85, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
  scene.add(mesh);
});

function onResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.__spike = { scene, camera, renderer }; // Playwright 검증용 훅
