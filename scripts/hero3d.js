/* ══════════════════════════════════════════════════════════════
   ECW — hero3d.js
   Le logo recomposé en verre 3D : rotation lente + parallaxe souris.
   Ne se charge que sur desktop, sans préférence de mouvement réduit,
   et laisse l'aplat SVG en place si WebGL échoue.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('hero3d');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (container && !reduced) {
  try { init(); } catch (e) { /* on garde l'aplat SVG */ }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0, 7);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-5, -2, 4);
  scene.add(rim);

  const glass = (hex, opacity = 0.36) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    transparent: true, opacity,
    roughness: 0.02, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 0.35, iridescenceIOR: 1.3,
    specularIntensity: 1.2,
    envMapIntensity: 2.4,
  });

  // Mêmes tracés que les symboles SVG de la page
  const PATHS = {
    blob: 'M78 2c38-6 78 30 80 76 2 44-30 84-72 90C42 174 4 142 1 96 -2 52 34 9 78 2Z',
    drop: 'M52 2c26 34 42 78 32 116-9 34-40 56-64 50C-4 162-4 120 8 84 18 52 34 22 52 2Z',
    bean: 'M18 22C40-4 84-6 122 12c40 20 56 62 40 92-16 30-60 34-100 18C22 106-6 62 18 22Z',
  };

  const loader = new SVGLoader();
  const extrude = (d, targetWidth) => {
    const shapes = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`)
      .paths.flatMap(p => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 42, curveSegments: 28,
      bevelEnabled: true, bevelThickness: 14, bevelSize: 14, bevelSegments: 6,
    });
    geo.center();
    geo.computeBoundingBox();
    const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
    const s = targetWidth / w;
    geo.scale(s, s, s);
    geo.rotateX(Math.PI); // le repère SVG a l'axe Y vers le bas ; une rotation évite de retourner les faces
    return geo;
  };

  // Passe additive : uniquement les reflets, à pleine puissance —
  // sinon ils sont éteints par l'opacité du verre.
  const shineMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.02, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02,
    ior: 2.3, specularIntensity: 1.5,
    envMapIntensity: 4,
    transparent: true, depthWrite: false,
    // Additif sur la couleur seulement : l'alpha du canvas ne bouge pas,
    // sinon les reflets rendent la forme opaque sur la page.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });

  const group = new THREE.Group();
  const drift = []; // { mesh, phase, amp, spin }
  const add = (mesh, phase, amp, spin) => {
    mesh.add(new THREE.Mesh(mesh.geometry, shineMat));
    group.add(mesh);
    drift.push({ mesh, base: mesh.position.clone(), phase, amp, spin });
  };

  // Composition fidèle au logo : goutte olive en haut à gauche, deux pastilles
  // corail, grand blob teal à droite, haricot navy en bas à gauche.
  const TINT = 0xbfdfe6; // verre uni très pâle, à peine teal

  // Trio libre, pas une copie du logo : blob au centre, goutte en haut,
  // haricot en contrepoint bas — profondeurs et inclinaisons variées.
  const blob = new THREE.Mesh(extrude(PATHS.blob, 1.6), glass(TINT));
  blob.position.set(0.5, 0.05, 0); blob.rotation.z = 0.18;
  add(blob, 0.0, 0.07, 0.10);

  const bean = new THREE.Mesh(extrude(PATHS.bean, 1.6), glass(TINT, 0.32));
  bean.position.set(-0.55, -0.9, 0.35); bean.rotation.z = -0.2;
  add(bean, 1.6, 0.06, -0.08);

  const drop = new THREE.Mesh(extrude(PATHS.drop, 0.66), glass(TINT));
  drop.position.set(-0.75, 0.85, -0.25); drop.rotation.z = -0.35;
  add(drop, 3.1, 0.09, 0.12);

  const dotGeo = new THREE.SphereGeometry(1, 48, 32);
  const dotA = new THREE.Mesh(dotGeo, glass(TINT));
  dotA.scale.setScalar(0.26); dotA.position.set(1.05, 0.95, 0.2);
  add(dotA, 4.4, 0.12, 0);
  const dotB = new THREE.Mesh(dotGeo, glass(TINT));
  dotB.scale.setScalar(0.32); dotB.position.set(-0.55, 0.1, 0.45);
  add(dotB, 2.2, 0.1, 0);

  group.rotation.x = 0.05;
  group.position.set(0.75, -0.55, 0); // le bouquet s'ancre sur le coin de la photo
  group.scale.setScalar(0.88);
  scene.add(group);

  // Parallaxe souris, très amortie
  const target = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const size = () => {
    const w = container.clientWidth || 400;
    renderer.setSize(w, w, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
  };
  size();
  window.addEventListener('resize', size);

  // Rendu seulement quand le bloc est visible et l'onglet actif
  let inView = true, raf = 0;
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; loop(); });
  io.observe(container);
  document.addEventListener('visibilitychange', loop);

  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    raf = 0;
    if (!inView || document.hidden) return;
    t += Math.min(clock.getDelta(), 0.05);

    group.rotation.y += ((Math.sin(t * 0.22) * 0.24 + target.x * 0.2) - group.rotation.y) * 0.04;
    group.rotation.x += ((0.05 + Math.sin(t * 0.17) * 0.06 + target.y * 0.1) - group.rotation.x) * 0.04;

    for (const d of drift) {
      d.mesh.position.y = d.base.y + Math.sin(t * 0.5 + d.phase) * d.amp;
      if (d.spin) d.mesh.rotation.z += d.spin * 0.0015;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function loop() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  loop();

  container.classList.add('is-live'); // masque l'aplat SVG de secours
}
