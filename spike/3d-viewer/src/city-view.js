import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildingsGeoJSON, MAP_CENTER } from './sample-buildings.js';

// 스타일에 tile source가 전혀 없음 — 외부 네트워크 요청 없이 로컬 GeoJSON만으로 렌더링.
const style = {
  version: 8,
  sources: {
    buildings: { type: 'geojson', data: buildingsGeoJSON },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#e8e2d0' } },
    {
      id: 'ground',
      type: 'fill',
      source: 'buildings',
      paint: { 'fill-color': '#d8d0b8', 'fill-opacity': 0.4 },
    },
    {
      id: 'buildings-3d',
      type: 'fill-extrusion',
      source: 'buildings',
      paint: {
        'fill-extrusion-color': [
          'match', ['get', 'type'],
          '아파트', '#2c6e7f',
          '오피스텔', '#9a7830',
          '#8a8570',
        ],
        'fill-extrusion-height': ['get', 'heightMeters'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
      },
    },
  ],
};

const map = new maplibregl.Map({
  container: 'map',
  style,
  center: MAP_CENTER,
  zoom: 16.2,
  pitch: 55,
  bearing: -17,
  antialias: true,
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

const panel = document.getElementById('panel');
const els = {
  type: document.getElementById('p-type'),
  name: document.getElementById('p-name'),
  year: document.getElementById('p-year'),
  floors: document.getElementById('p-floors'),
  price: document.getElementById('p-price'),
  jeonse: document.getElementById('p-jeonse'),
  detail: document.getElementById('p-detail'),
};

map.on('load', () => {
  map.on('click', 'buildings-3d', (e) => {
    const f = e.features[0];
    if (!f) return;
    const p = f.properties;
    els.type.textContent = p.type;
    els.name.textContent = p.name;
    els.year.textContent = `${p.builtYear}년`;
    els.floors.textContent = `${p.floors}층`;
    els.price.textContent = `${p.priceEok}억`;
    els.jeonse.textContent = `${p.jeonseEok}억`;
    els.detail.href = `/building-detail.html?id=${p.id}`;
    panel.classList.add('open');
  });

  map.on('mouseenter', 'buildings-3d', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'buildings-3d', () => {
    map.getCanvas().style.cursor = '';
  });
});

window.__spike = { map }; // Playwright 검증용 훅
