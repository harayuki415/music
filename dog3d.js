import * as THREE from "./vendor/three/build/three.module.js";
import { FBXLoader } from "./vendor/three/examples/jsm/loaders/FBXLoader.js";

const canvas = document.querySelector("#dogScene");
const wrap = document.querySelector(".stage-wrap");
const statusEl = document.querySelector("#modelStatus");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x101113, 8, 22);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 2.1, 8.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const fbxLoader = new FBXLoader();
const root = new THREE.Group();
scene.add(root);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x2de3d0, 1.35);
rimLight.position.set(-5, 3, -4);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0xfff2da, 0.85));

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(7.5, 80),
  new THREE.MeshStandardMaterial({
    color: 0x17191d,
    metalness: 0.08,
    roughness: 0.8,
    transparent: true,
    opacity: 0.72,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.25;
scene.add(floor);

const rings = new THREE.Group();
for (let i = 0; i < 5; i += 1) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7 + i * 0.9, 0.01, 8, 96),
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xff4f8b : 0x2de3d0,
      transparent: true,
      opacity: 0.22,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.18 + i * 0.006;
  rings.add(ring);
}
scene.add(rings);

function makeFallbackDog() {
  const dog = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xd8a35d, roughness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b211b, roughness: 0.7 });
  const collar = new THREE.MeshStandardMaterial({ color: 0x2de3d0, roughness: 0.35, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.5, 7, 14), fur);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0, 0);
  dog.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), fur);
  chest.position.set(0.88, 0.25, 0);
  dog.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), fur);
  head.position.set(1.35, 0.9, 0);
  dog.add(head);

  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 6, 12), fur);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.78, 0.82, 0);
  dog.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), dark);
  nose.position.set(2.02, 0.86, 0);
  dog.add(nose);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 4), fur);
    ear.position.set(1.17, 1.28, side * 0.28);
    ear.rotation.set(0.4, 0, side * 0.55);
    dog.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dark);
    eye.position.set(1.72, 0.98, side * 0.2);
    dog.add(eye);

    const legFront = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.75, 5, 10), fur);
    legFront.position.set(0.72, -0.78, side * 0.42);
    dog.add(legFront);

    const legBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.75, 5, 10), fur);
    legBack.position.set(-0.72, -0.78, side * 0.42);
    dog.add(legBack);
  }

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.9, 5, 10), fur);
  tail.position.set(-1.08, 0.38, 0);
  tail.rotation.z = -0.85;
  dog.add(tail);

  const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 32), collar);
  collarMesh.position.set(1.04, 0.58, 0);
  collarMesh.rotation.y = Math.PI / 2;
  dog.add(collarMesh);

  dog.scale.setScalar(1.15);
  dog.position.set(-0.3, -0.58, 0);
  dog.userData.tail = tail;
  return dog;
}

function setStatus(text, state = "") {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `model-status ${state}`.trim();
}

function prepareMaterials(object) {
  const texture = new THREE.TextureLoader().load("./assets/Meshy_AI_Snowy_Scarf_Pup_biped_texture_0.png");
  texture.colorSpace = THREE.SRGBColorSpace;

  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;
    child.material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.03,
      side: THREE.DoubleSide,
    });
  });
}

function normalizeModel(object, options = {}) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = options.scale || 2.65 / maxAxis;

  object.position.set(-center.x, -center.y, -center.z);
  const holder = new THREE.Group();
  holder.add(object);
  holder.scale.setScalar(scale);
  holder.position.y = 1.9;
  holder.rotation.y = Math.PI;

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      if (child.material) child.material.side = THREE.DoubleSide;
    }
  });

  return holder;
}

function setDog(object, options = {}) {
  root.clear();
  if (options.applyTexture) prepareMaterials(object);
  root.add(normalizeModel(object, options));
  setStatus(options.label || "3D model loaded", "ready");
}

setStatus("Loading assets/dog.fbx...");
fbxLoader.load(
  "./assets/dog.fbx",
  (object) => setDog(object, { applyTexture: true, label: "assets/dog.fbx loaded" }),
  undefined,
  () => {
    setStatus("dog.fbx failed. Showing fallback.", "error");
    setDog(makeFallbackDog());
  },
);

function resize() {
  const rect = wrap.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height, false);
}

function animate(time = 0) {
  const t = time * 0.001;
  root.rotation.y = t * 0.55;
  root.position.set(0, Math.sin(t * 1.4) * 0.05, 0);
  rings.rotation.z = t * 0.18;
  rings.children.forEach((ring, index) => {
    ring.scale.setScalar(1 + Math.sin(t * 1.4 + index) * 0.04);
  });
  const dog = root.children[0];
  const tail = dog?.userData?.tail;
  if (tail) tail.rotation.z = -0.85 + Math.sin(t * 7) * 0.26;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
window.addEventListener("resize", resize);
animate();
