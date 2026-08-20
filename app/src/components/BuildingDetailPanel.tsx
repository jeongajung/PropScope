import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Building } from "../types";

interface BuildingDetailPanelProps {
  building: Building | null;
}

// Three.js 커스텀 매스 모델 — 근거는 docs/technical-spike.md 참고.
function ThreeScene({ building }: { building: Building }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e2d0);
    scene.fog = new THREE.Fog(0xe8e2d0, 60, 220);

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const targetHeight = (building.floors * 3.1) / 8;
    camera.position.set(26, targetHeight * 0.6 + 9, 26);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0xd8d0b8 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const mainColor = building.type === "아파트" ? 0x2c6e7f : 0x9a7830;
    const mainGeo = new THREE.BoxGeometry(10, targetHeight, 10);
    const mainMesh = new THREE.Mesh(mainGeo, new THREE.MeshStandardMaterial({ color: mainColor }));
    mainMesh.position.y = targetHeight / 2;
    scene.add(mainMesh);

    const edges = new THREE.EdgesGeometry(mainGeo);
    const wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x1b4750, opacity: 0.4, transparent: true }),
    );
    wireframe.position.copy(mainMesh.position);
    scene.add(wireframe);

    for (let i = 0; i < 6; i++) {
      const h = 12 + ((i * 37) % 20);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 20 + (i % 3) * 5;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(6, h, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a8570, opacity: 0.85, transparent: true }),
      );
      mesh.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
      scene.add(mesh);
    }

    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [building.id]);

  return <div ref={containerRef} className="building-scene" />;
}

function TrendSparkline({ trend, priceEok }: { trend: number[]; priceEok: number }) {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const points = trend
    .map((v, i) => {
      const x = (i / (trend.length - 1)) * 240;
      const y = 48 - ((v - min) / (max - min || 1)) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastY = 48 - ((trend[trend.length - 1] - min) / (max - min || 1)) * 40;
  return (
    <svg viewBox="0 0 240 52" className="trend-sparkline" aria-label={`최근 12개월 매매가 추이, 현재 ${priceEok}억`}>
      <polyline points={points} fill="none" stroke="#2c6e7f" strokeWidth="2" />
      <circle cx={240} cy={lastY} r={3} fill="#9a7830" />
    </svg>
  );
}

export function BuildingDetailPanel({ building }: BuildingDetailPanelProps) {
  if (!building) {
    return (
      <div className="building-detail building-detail--empty">
        지도에서 건물을 클릭하거나, 결과 목록에서 항목을 선택하면 상세 정보가 여기 표시됩니다.
      </div>
    );
  }

  return (
    <div className="building-detail">
      <div className="building-detail__header">
        <span className="building-detail__type">{building.type}</span>
        <h3>{building.name}</h3>
        <div className="building-detail__meta">
          {building.district} · {building.builtYear}년 · {building.floors}층 · {building.areaPyeong}평
        </div>
      </div>
      <ThreeScene building={building} />
      <div className="building-detail__prices">
        <div>
          <span className="label">매매 추정가</span>
          <span className="value">{building.priceEok}억</span>
        </div>
        <div>
          <span className="label">전세 추정가</span>
          <span className="value">{building.jeonseEok}억</span>
        </div>
      </div>
      <div className="building-detail__trend">
        <div className="label">최근 12개월 매매가 추이 (합성 데이터)</div>
        <TrendSparkline trend={building.priceTrend} priceEok={building.priceEok} />
      </div>
    </div>
  );
}
