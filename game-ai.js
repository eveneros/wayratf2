/* =========================================================================
   NEURO-AVIATOR — Deep Neuroevolution Training Platform
   - Feedforward NN (Float32Array weights) → fast real-time inference
   - Genetic algorithm: elitism + tournament + uniform crossover + gaussian mutation
   - 3D corridor, random obstacles, LIDAR rays, level difficulty scaling
   - Watchdog: restart generation after 20s of no improvement
   ========================================================================= */
(() => {
'use strict';

/* ───────────────────────── CONFIG ───────────────────────── */
const CFG = {
  popSize: 24,
  eliteCount: 3,
  tournamentSize: 4,
  mutationRate: 0.15,
  mutationAmount: 0.35,
  crossoverRate: 0.75,

  brain: { layers: [12, 16, 12, 2] },

  world: {
    corridorHalfWidth: 12,
    minY: 3,
    maxY: 32,
    droneZ: 0,
    spawnZ: -420,
    despawnZ: 60,
    visualSpeed: 90,         // m/s para movimiento de obstáculos (visual)
    obstacleCount: 26,       // pool reutilizable
  },

  sim: {
    kmPerSecond: 5,
    levelDuration: 6,        // segundos mínimo por nivel
    maxGoalKm: 50000,
    generationMaxSeconds: 70,
    stagnationTimeout: 20,   // segundos sin mejora → nueva gen
  },

  physics: {
    lateralSpeed: 14,
    verticalSpeed: 10,
  },

  lidar: {
    hAngles: [-60, -30, 0, 30, 60],
    vAngles: [-40, 40],
    maxRange: 160,
  },
};

/* ───────────────────────── UTIL ───────────────────────── */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* ───────────────────────── BRAIN (NN) ───────────────────────── */
class Brain {
  constructor(sizes) {
    this.sizes = sizes.slice();
    this.W = [];   // Float32Array por capa
    this.B = [];
    for (let i = 0; i < sizes.length - 1; i++) {
      const inN = sizes[i], outN = sizes[i + 1];
      const scale = Math.sqrt(2 / inN);
      const w = new Float32Array(inN * outN);
      for (let j = 0; j < w.length; j++) w[j] = gauss() * scale;
      const b = new Float32Array(outN);
      this.W.push(w); this.B.push(b);
    }
  }

  forward(inputs) {
    let x = inputs;
    const L = this.W.length;
    for (let i = 0; i < L; i++) {
      const w = this.W[i], b = this.B[i];
      const inN = this.sizes[i], outN = this.sizes[i + 1];
      const out = new Float32Array(outN);
      for (let j = 0; j < outN; j++) {
        let sum = b[j];
        // w está guardada row-major: w[k*outN + j]
        const off = j;
        for (let k = 0; k < inN; k++) sum += x[k] * w[k * outN + off];
        out[j] = Math.tanh(sum);
      }
      x = out;
    }
    return x;
  }

  copy() {
    const c = Object.create(Brain.prototype);
    c.sizes = this.sizes.slice();
    c.W = this.W.map(w => new Float32Array(w));
    c.B = this.B.map(b => new Float32Array(b));
    return c;
  }

  mutate(rate, amount) {
    for (let i = 0; i < this.W.length; i++) {
      const w = this.W[i];
      for (let j = 0; j < w.length; j++)
        if (Math.random() < rate) w[j] = clamp(w[j] + gauss() * amount, -3, 3);
      const b = this.B[i];
      for (let j = 0; j < b.length; j++)
        if (Math.random() < rate) b[j] = clamp(b[j] + gauss() * amount, -3, 3);
    }
  }

  static crossover(a, b) {
    const child = new Brain(a.sizes);
    for (let i = 0; i < child.W.length; i++) {
      const wa = a.W[i], wb = b.W[i], wc = child.W[i];
      // Crossover uniforme
      for (let j = 0; j < wc.length; j++) wc[j] = Math.random() < 0.5 ? wa[j] : wb[j];
      const ba = a.B[i], bb = b.B[i], bc = child.B[i];
      for (let j = 0; j < bc.length; j++) bc[j] = Math.random() < 0.5 ? ba[j] : bb[j];
    }
    return child;
  }

  serialize() {
    return {
      sizes: this.sizes,
      W: this.W.map(w => Array.from(w)),
      B: this.B.map(b => Array.from(b)),
    };
  }

  static deserialize(o) {
    const brain = new Brain(o.sizes);
    for (let i = 0; i < o.W.length; i++) {
      brain.W[i] = Float32Array.from(o.W[i]);
      brain.B[i] = Float32Array.from(o.B[i]);
    }
    return brain;
  }
}

/* ───────────────────────── THREE.JS SETUP ───────────────────────── */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05070d, 1);
renderer.shadowMap.enabled = false; // sin sombras → +rendimiento

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05070d, 90, 480);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2000);
camera.position.set(0, 22, 38);
camera.lookAt(0, 12, -10);

// Luces
scene.add(new THREE.HemisphereLight(0x88ccff, 0x0a0e1a, 0.9));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(30, 80, 40);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xa855f7, 0.7);
rimLight.position.set(-40, 30, -60);
scene.add(rimLight);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ───────────────────────── ENTORNO VISUAL ───────────────────────── */
const HALF_W = CFG.world.corridorHalfWidth;
const LANE_W = (HALF_W * 2) / 3;

// Corredor — suelo con líneas de carril
const corridorGeo = new THREE.PlaneGeometry(HALF_W * 2, 1200, 1, 1);
corridorGeo.rotateX(-Math.PI / 2);
const corridorMat = new THREE.MeshBasicMaterial({ color: 0x0a1424 });
const corridor = new THREE.Mesh(corridorGeo, corridorMat);
corridor.position.set(0, 0, -300);
scene.add(corridor);

// Líneas de carril (4 líneas: -HALF, -LANE/2, +LANE/2, +HALF)
const laneMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 });
[-HALF_W, -LANE_W / 2, LANE_W / 2, HALF_W].forEach(x => {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 0.02, 60),
    new THREE.Vector3(x, 0.02, -700),
  ]);
  scene.add(new THREE.Line(g, laneMat));
});

// Rejilla transversal (para sensación de velocidad)
const gridMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.12 });
const gridLines = new THREE.Group();
for (let z = 40; z > -700; z -= 20) {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-HALF_W, 0.015, z),
    new THREE.Vector3(HALF_W, 0.015, z),
  ]);
  gridLines.add(new THREE.Line(g, gridMat));
}
scene.add(gridLines);

// Paredes laterales suaves
const wallMat = new THREE.MeshBasicMaterial({ color: 0x0f1830, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const wallGeo = new THREE.PlaneGeometry(1200, CFG.world.maxY + 6);
const wallL = new THREE.Mesh(wallGeo, wallMat);
wallL.position.set(-HALF_W, (CFG.world.maxY + 6) / 2, -300);
wallL.rotation.y = Math.PI / 2;
scene.add(wallL);
const wallR = wallL.clone();
wallR.position.x = HALF_W;
wallR.rotation.y = -Math.PI / 2;
scene.add(wallR);

// Techo suave (visible si suben)
const ceilingMat = new THREE.MeshBasicMaterial({ color: 0x1a1040, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 1200), ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, CFG.world.maxY + 6, -300);
scene.add(ceiling);

// Estrellas
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(400 * 3);
for (let i = 0; i < 400; i++) {
  starPos[i * 3] = rand(-400, 400);
  starPos[i * 3 + 1] = rand(40, 200);
  starPos[i * 3 + 2] = rand(-800, 100);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x88ccff, size: 0.8, transparent: true, opacity: 0.6 })));

/* ───────────────────────── DRONE ───────────────────────── */
const DRONE_BODY_GEO = new THREE.ConeGeometry(1.6, 5, 6);
DRONE_BODY_GEO.rotateX(-Math.PI / 2); // apuntar hacia -Z
const DRONE_WING_GEO = new THREE.BoxGeometry(6, 0.3, 1.8);
const DRONE_ROTOR_GEO = new THREE.BoxGeometry(1.4, 0.25, 1.4);
const DRONE_LED_GEO = new THREE.SphereGeometry(0.45, 6, 6);

const LIDAR_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
const LIDAR_HIT_MAT = new THREE.LineBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.9 });

class Drone {
  constructor(brain, index) {
    this.brain = brain;
    this.index = index;
    this.alive = true;
    this.distance = 0;              // km
    this.fitness = 0;
    this.x = rand(-6, 6);
    this.y = rand(10, 22);
    this.vx = 0; this.vy = 0;
    this.age = 0;

    // Mesh
    this.group = new THREE.Group();
    const hue = (index / CFG.popSize) * 360;
    this.colorHex = new THREE.Color().setHSL(hue / 360, 0.85, 0.55);

    const bodyMat = new THREE.MeshLambertMaterial({ color: this.colorHex });
    const body = new THREE.Mesh(DRONE_BODY_GEO, bodyMat);
    body.position.z = -0.8;
    this.group.add(body);

    const wingMat = new THREE.MeshLambertMaterial({ color: 0x111a2e });
    const wings = new THREE.Mesh(DRONE_WING_GEO, wingMat);
    this.group.add(wings);

    const rotorL = new THREE.Mesh(DRONE_ROTOR_GEO, wingMat);
    rotorL.position.set(-2.6, 0, 0);
    this.group.add(rotorL);
    const rotorR = rotorL.clone();
    rotorR.position.x = 2.6;
    this.group.add(rotorR);
    this.rotors = [rotorL, rotorR];

    const ledMat = new THREE.MeshBasicMaterial({ color: this.colorHex });
    const led = new THREE.Mesh(DRONE_LED_GEO, ledMat);
    led.position.z = 2.4;
    this.group.add(led);
    this.led = led;

    this.group.position.set(this.x, this.y, CFG.world.droneZ);
    scene.add(this.group);

    // LIDAR rays (7 líneas → 14 vértices)
    const rayCount = CFG.lidar.hAngles.length + CFG.lidar.vAngles.length;
    this.rayCount = rayCount;
    const posBuf = new Float32Array(rayCount * 2 * 3);
    const colBuf = new Float32Array(rayCount * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colBuf, 3));
    this.lidarGeo = geo;
    this.lidarLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false
    }));
    this.lidarLines.frustumCulled = false;
    scene.add(this.lidarLines);
  }

  reset() {
    this.alive = true;
    this.distance = 0;
    this.fitness = 0;
    this.x = rand(-6, 6);
    this.y = rand(10, 22);
    this.vx = 0; this.vy = 0;
    this.age = 0;
    this.group.visible = true;
    this.lidarLines.visible = true;
    this.group.position.set(this.x, this.y, CFG.world.droneZ);
  }

  dispose() {
    scene.remove(this.group);
    scene.remove(this.lidarLines);
    this.group.traverse(o => { if (o.geometry && o.geometry !== DRONE_BODY_GEO && o.geometry !== DRONE_WING_GEO && o.geometry !== DRONE_ROTOR_GEO && o.geometry !== DRONE_LED_GEO) o.geometry.dispose(); });
    this.lidarGeo.dispose();
  }

  // Devuelve distancia mínima de un rayo contra AABBs
  rayHit(ox, oy, oz, dx, dy, dz, obstacles, maxRange) {
    let best = maxRange;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!o.active) continue;
      const b = o.aabb;
      // slab method
      let tmin = 0, tmax = best;
      // X
      if (Math.abs(dx) < 1e-6) { if (ox < b.minX || ox > b.maxX) continue; }
      else {
        let t1 = (b.minX - ox) / dx, t2 = (b.maxX - ox) / dx;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }
      // Y
      if (Math.abs(dy) < 1e-6) { if (oy < b.minY || oy > b.maxY) continue; }
      else {
        let t1 = (b.minY - oy) / dy, t2 = (b.maxY - oy) / dy;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }
      // Z
      if (Math.abs(dz) < 1e-6) { if (oz < b.minZ || oz > b.maxZ) continue; }
      else {
        let t1 = (b.minZ - oz) / dz, t2 = (b.maxZ - oz) / dz;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }
      if (tmin < best) best = tmin;
    }
    return best;
  }

  senseAndAct(dt, obstacles) {
    const maxR = CFG.lidar.maxRange;
    const px = this.x, py = this.y, pz = CFG.world.droneZ;
    const lidarVals = new Float32Array(this.rayCount);
    const posAttr = this.lidarGeo.attributes.position;
    const colAttr = this.lidarGeo.attributes.color;
    const pArr = posAttr.array;
    const cArr = colAttr.array;

    let ri = 0;

    // Rayos horizontales en el plano XZ
    for (let a = 0; a < CFG.lidar.hAngles.length; a++) {
      const ang = CFG.lidar.hAngles[a] * Math.PI / 180;
      // Dirección hacia -Z, con rotación alrededor de Y
      const dx = Math.sin(ang);
      const dz = -Math.cos(ang);
      const dy = 0;
      const d = this.rayHit(px, py, pz, dx, dy, dz, obstacles, maxR);
      lidarVals[ri++] = d / maxR;
      // escribir línea
      const base = (a * 2) * 3;
      pArr[base] = px; pArr[base + 1] = py; pArr[base + 2] = pz;
      pArr[base + 3] = px + dx * d;
      pArr[base + 4] = py + dy * d;
      pArr[base + 5] = pz + dz * d;
      const t = 1 - d / maxR; // 0=libre,1=choque
      cArr[base] = 0.13 + t * 0.9;
      cArr[base + 1] = 0.83 - t * 0.7;
      cArr[base + 2] = 0.93 - t * 0.7;
      cArr[base + 3] = 0.13 + t * 0.9;
      cArr[base + 4] = 0.83 - t * 0.7;
      cArr[base + 5] = 0.93 - t * 0.7;
    }
    // Rayos verticales
    for (let a = 0; a < CFG.lidar.vAngles.length; a++) {
      const ang = CFG.lidar.vAngles[a] * Math.PI / 180;
      const dy = Math.sin(ang);
      const dz = -Math.cos(ang);
      const dx = 0;
      const d = this.rayHit(px, py, pz, dx, dy, dz, obstacles, maxR);
      lidarVals[ri++] = d / maxR;
      const idx = CFG.lidar.hAngles.length + a;
      const base = (idx * 2) * 3;
      pArr[base] = px; pArr[base + 1] = py; pArr[base + 2] = pz;
      pArr[base + 3] = px + dx * d;
      pArr[base + 4] = py + dy * d;
      pArr[base + 5] = pz + dz * d;
      const t = 1 - d / maxR;
      cArr[base] = 0.13 + t * 0.9;
      cArr[base + 1] = 0.83 - t * 0.7;
      cArr[base + 2] = 0.93 - t * 0.7;
      cArr[base + 3] = 0.13 + t * 0.9;
      cArr[base + 4] = 0.83 - t * 0.7;
      cArr[base + 5] = 0.93 - t * 0.7;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Inputs adicionales
    const nx = this.x / HALF_W;                             // -1..1
    const ny = (this.y - CFG.world.minY) / (CFG.world.maxY - CFG.world.minY); // 0..1
    // Buscar obstáculo más cercano en frente
    let nearestDX = 0, nearestDY = 0, nearestDZ = 1;
    let nearestD = Infinity;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!o.active) continue;
      const dz = o.position.z - pz;
      if (dz >= 0) continue; // solo delante
      const d2 = dz * dz;
      if (d2 < nearestD) {
        nearestD = d2;
        nearestDX = (o.position.x - px) / HALF_W;
        nearestDY = (o.position.y - py) / 20;
        nearestDZ = clamp(-dz / 200, 0, 1);
      }
    }

    const inputs = new Float32Array(CFG.brain.layers[0]);
    for (let i = 0; i < this.rayCount; i++) inputs[i] = lidarVals[i];
    let k = this.rayCount;
    inputs[k++] = nx;
    inputs[k++] = ny * 2 - 1;
    inputs[k++] = nearestDX;
    inputs[k++] = nearestDY;
    inputs[k++] = 1 - nearestDZ;

    const out = this.brain.forward(inputs);
    this.vx = clamp(out[0], -1, 1) * CFG.physics.lateralSpeed;
    this.vy = clamp(out[1], -1, 1) * CFG.physics.verticalSpeed;
  }

  step(dt, obstacles) {
    if (!this.alive) return;
    this.age += dt;
    this.senseAndAct(dt, obstacles);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // límites del carril
    if (this.x < -HALF_W || this.x > HALF_W) this.x = clamp(this.x, -HALF_W, HALF_W);
    if (this.y < CFG.world.minY || this.y > CFG.world.maxY) this.y = clamp(this.y, CFG.world.minY, CFG.world.maxY);

    this.group.position.set(this.x, this.y, CFG.world.droneZ);
    // Inclinación sutil según velocidad
    this.group.rotation.z = -this.vx * 0.03;
    this.group.rotation.x = this.vy * 0.03;
    // Rotores
    for (const r of this.rotors) r.rotation.y += dt * 30;

    // Colisión
    const r = 2.2;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!o.active) continue;
      const b = o.aabb;
      if (this.x + r > b.minX && this.x - r < b.maxX &&
          this.y + r > b.minY && this.y - r < b.maxY &&
          CFG.world.droneZ + r > b.minZ && CFG.world.droneZ - r < b.maxZ) {
        this.explode();
        return;
      }
    }
  }

  explode() {
    if (!this.alive) return;
    this.alive = false;
    this.group.visible = false;
    this.lidarLines.visible = false;
    spawnBurst(this.x, this.y, this.colorHex);
  }
}

/* ───────────────────────── PARTÍCULAS ───────────────────────── */
const particlePool = [];
const particleGroup = new THREE.Group();
scene.add(particleGroup);
const BURST_GEO = new THREE.TetrahedronGeometry(0.6, 0);
function spawnBurst(x, y, color) {
  for (let i = 0; i < 8; i++) {
    let p = particlePool.pop();
    if (!p) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      p = { mesh: new THREE.Mesh(BURST_GEO, mat), life: 0, vx: 0, vy: 0, vz: 0 };
      particleGroup.add(p.mesh);
    }
    p.mesh.material.color.copy(color);
    p.mesh.material.opacity = 1;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, CFG.world.droneZ);
    p.vx = rand(-8, 8);
    p.vy = rand(-8, 8);
    p.vz = rand(-6, 6);
    p.life = 0.6;
    particlePool.push(p);
  }
}
function updateParticles(dt) {
  for (const p of particlePool) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 12 * dt;
    p.mesh.material.opacity = Math.max(0, p.life / 0.6);
    p.mesh.rotation.x += dt * 8;
    p.mesh.rotation.y += dt * 8;
    if (p.life <= 0) p.mesh.visible = false;
  }
}

/* ───────────────────────── OBSTÁCULOS ───────────────────────── */
const OBSTACLE_PALETTE = [0xff3355, 0xff8800, 0xff22aa, 0xaa44ff];
const OBSTACLE_GEO_CACHE = [
  new THREE.BoxGeometry(4, 4, 4),
  new THREE.BoxGeometry(6, 3, 3),
  new THREE.BoxGeometry(3, 6, 3),
  new THREE.BoxGeometry(5, 5, 3),
];
const OBSTACLE_MATS = OBSTACLE_PALETTE.map(c =>
  new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(0.25) })
);

class Obstacle {
  constructor() {
    const gi = Math.floor(Math.random() * OBSTACLE_GEO_CACHE.length);
    this.mesh = new THREE.Mesh(OBSTACLE_GEO_CACHE[gi], OBSTACLE_MATS[gi % OBSTACLE_MATS.length]);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.active = false;
    this.position = { x: 0, y: 0, z: 0 };
    this.half = { x: 2, y: 2, z: 2 };
    this.aabb = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  }

  spawn(distanceFactor) {
    // posición aleatoria dentro del corredor
    const gi = Math.floor(Math.random() * OBSTACLE_GEO_CACHE.length);
    this.mesh.geometry = OBSTACLE_GEO_CACHE[gi];
    const geoParams = this.mesh.geometry.parameters;
    this.half.x = geoParams.width / 2;
    this.half.y = geoParams.height / 2;
    this.half.z = geoParams.depth / 2;

    const lane = Math.floor(Math.random() * 3); // 0,1,2
    const laneCenter = -HALF_W + LANE_W * (lane + 0.5);
    this.position.x = laneCenter + rand(-LANE_W * 0.2, LANE_W * 0.2);
    this.position.y = rand(CFG.world.minY + 2, CFG.world.maxY - 2);
    this.position.z = CFG.world.spawnZ;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = rand(0, Math.PI * 2);
    this.mesh.visible = true;
    this.active = true;
    this.updateAABB();
  }

  updateAABB() {
    const p = this.position, h = this.half;
    this.aabb.minX = p.x - h.x; this.aabb.maxX = p.x + h.x;
    this.aabb.minY = p.y - h.y; this.aabb.maxY = p.y + h.y;
    this.aabb.minZ = p.z - h.z; this.aabb.maxZ = p.z + h.z;
  }

  step(dt) {
    if (!this.active) return;
    this.position.z += CFG.world.visualSpeed * dt;
    this.mesh.position.z = this.position.z;
    this.mesh.rotation.x += dt * 1.2;
    this.mesh.rotation.y += dt * 1.8;
    this.updateAABB();
    if (this.position.z > CFG.world.despawnZ) this.deactivate();
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.position.z = CFG.world.spawnZ - 9999;
  }
}

/* ───────────────────────── ENVIRONMENT ───────────────────────── */
const obstacles = [];
for (let i = 0; i < CFG.world.obstacleCount; i++) obstacles.push(new Obstacle());

/* ───────────────────────── GAME STATE ───────────────────────── */
const state = {
  running: true,
  paused: false,
  speedMultiplier: 1,
  difficulty: 1,

  generation: 1,
  generationStartSim: 0,
  generationBestKm: 0,
  lastImprovementSim: 0,
  globalBestKm: 0,

  simTime: 0,
  distanceKm: 0,       // distancia del mejor agente de la generación
  level: 1,
  levelStartSim: 0,

  spawnTimer: 0,
  spawnInterval: 1.4,

  drones: [],
  alive: 0,
  bestBrain: null,

  history: { gen: [], best: [], avg: [], min: [] },
};

/* ───────────────────────── POPULATION ───────────────────────── */
function createDrone(brain, idx) {
  return new Drone(brain || new Brain(CFG.brain.layers), idx);
}

function initPopulation() {
  for (const d of state.drones) d.dispose();
  state.drones = [];
  for (let i = 0; i < CFG.popSize; i++) {
    state.drones.push(createDrone(null, i));
  }
  state.alive = CFG.popSize;
}

function resetGeneration(keepBest) {
  // Guardar stats de la generación
  const ds = state.drones.map(d => d.distance);
  const best = Math.max(...ds, 0);
  const min = Math.min(...ds);
  const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
  state.history.gen.push(state.generation);
  state.history.best.push(best);
  state.history.avg.push(avg);
  state.history.min.push(min);
  if (best > state.globalBestKm) state.globalBestKm = best;

  // Ordenar por fitness
  state.drones.sort((a, b) => b.fitness - a.fitness);

  // Guardar mejor cerebro
  if (state.drones.length > 0) {
    state.bestBrain = state.drones[0].brain.copy();
  }

  const oldDrones = state.drones;

  // Nueva población
  const newPop = [];
  // Élite
  for (let i = 0; i < CFG.eliteCount && i < oldDrones.length; i++) {
    newPop.push(createDrone(oldDrones[i].brain.copy(), i));
  }
  // Descendencia
  while (newPop.length < CFG.popSize) {
    const pA = tournament(oldDrones);
    const pB = tournament(oldDrones);
    let child;
    if (Math.random() < CFG.crossoverRate && pA && pB) {
      child = Brain.crossover(pA.brain, pB.brain);
    } else if (pA) {
      child = pA.brain.copy();
    } else {
      child = new Brain(CFG.brain.layers);
    }
    child.mutate(CFG.mutationRate, CFG.mutationAmount);
    newPop.push(createDrone(child, newPop.length));
  }

  // Disposing old
  for (const d of oldDrones) d.dispose();

  state.drones = newPop;
  state.alive = CFG.popSize;
  state.generation++;
  state.generationStartSim = state.simTime;
  state.lastImprovementSim = state.simTime;
  state.generationBestKm = 0;
  state.distanceKm = 0;
  state.level = 1;
  state.levelStartSim = state.simTime;
  state.spawnTimer = 0.6;

  // Limpiar obstáculos activos
  for (const o of obstacles) o.deactivate();

  redrawChart();
  showToast(`🧬 Generación ${state.generation} iniciada · Best prev: ${best.toFixed(1)} km`);
}

function tournament(pool) {
  if (!pool || pool.length === 0) return null;
  let best = pool[Math.floor(Math.random() * pool.length)];
  for (let i = 1; i < CFG.tournamentSize; i++) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (c.fitness > best.fitness) best = c;
  }
  return best;
}

/* ───────────────────────── SIMULATION STEP ───────────────────────── */
function simulate(dt) {
  state.simTime += dt;

  // Distancia global avanzando (basada en kmPerSecond * dt)
  state.distanceKm += CFG.sim.kmPerSecond * dt;
  // Añadir a drones vivos
  for (const d of state.drones) {
    if (!d.alive) continue;
    d.distance += CFG.sim.kmPerSecond * dt;
    d.fitness = d.distance;
  }

  // Nivel (min 6 segundos)
  if (state.simTime - state.levelStartSim >= CFG.sim.levelDuration) {
    state.level++;
    state.levelStartSim = state.simTime;
    // Ajustar dificultad de spawn con nivel
    state.spawnInterval = Math.max(0.35, 1.6 - state.level * 0.05) / state.difficulty;
  }

  // Spawn de obstáculos
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    // Buscar slot libre
    let spawned = 0;
    const targetBurst = 1 + Math.floor(state.level / 4);
    for (const o of obstacles) {
      if (!o.active) {
        o.spawn(state.level);
        spawned++;
        if (spawned >= targetBurst) break;
      }
    }
    state.spawnTimer = state.spawnInterval * rand(0.7, 1.3);
  }

  // Mover obstáculos
  for (const o of obstacles) o.step(dt);

  // Actualizar drones
  let alive = 0;
  for (const d of state.drones) {
    if (!d.alive) continue;
    d.step(dt, obstacles);
    if (d.alive) alive++;
  }
  state.alive = alive;

  // Stats
  const bestNow = state.drones.reduce((m, d) => Math.max(m, d.distance), 0);
  if (bestNow > state.generationBestKm + 0.05) {
    state.generationBestKm = bestNow;
    state.lastImprovementSim = state.simTime;
  }

  // Watchdog: sin mejora 20s
  const noImprove = state.simTime - state.lastImprovementSim;
  // Tiempo máximo por generación
  const genTime = state.simTime - state.generationStartSim;

  if (alive === 0 || noImprove > CFG.sim.stagnationTimeout || genTime > CFG.sim.generationMaxSeconds) {
    // Guardar mejor cerebro como referencia
    const sorted = state.drones.slice().sort((a, b) => b.fitness - a.fitness);
    if (sorted[0]) state.bestBrain = sorted[0].brain.copy();
    resetGeneration();
  }
}

/* ───────────────────────── RENDER LOOP ───────────────────────── */
let lastT = performance.now();
let fpsAcc = 0, fpsCount = 0, fpsVal = 60;
let uiAcc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dtReal = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  fpsAcc += dtReal; fpsCount++;
  if (fpsAcc > 0.5) { fpsVal = fpsCount / fpsAcc; fpsAcc = 0; fpsCount = 0; }

  if (state.running && !state.paused) {
    // Sub-pasos con dt máx 0.03 para evitar tunneling
    let remaining = dtReal * state.speedMultiplier;
    const maxSub = 20;
    let steps = 0;
    while (remaining > 0 && steps < maxSub) {
      const dt = Math.min(0.03, remaining);
      simulate(dt);
      remaining -= dt;
      steps++;
    }
  }

  // Partículas siempre
  updateParticles(Math.min(dtReal, 0.05));

  // Mover rejilla para sensación de velocidad
  gridLines.position.z = (state.simTime * CFG.world.visualSpeed * 0.15) % 20;

  // Cámara chase suave
  const cameraTargetZ = 38;
  camera.position.z += (cameraTargetZ - camera.position.z) * 0.05;
  // mirar levemente al mejor drone vivo
  let focus = null;
  for (const d of state.drones) if (d.alive) { focus = d; break; }
  if (focus) {
    camera.position.x += (focus.x * 0.35 - camera.position.x) * 0.05;
    camera.position.y += (focus.y * 0.35 + 12 - camera.position.y) * 0.05;
  } else {
    camera.position.x += (0 - camera.position.x) * 0.05;
    camera.position.y += (20 - camera.position.y) * 0.05;
  }
  camera.lookAt(camera.position.x * 0.4, 12, -20);

  renderer.render(scene, camera);

  // UI throttle
  uiAcc += dtReal;
  if (uiAcc > 0.15) {
    uiAcc = 0;
    updateUI();
  }
}

/* ───────────────────────── UI ───────────────────────── */
const $ = id => document.getElementById(id);

function updateUI() {
  const best = state.drones.reduce((m, d) => Math.max(m, d.distance), 0);
  const aliveList = state.drones.filter(d => d.alive);
  const distances = state.drones.map(d => d.distance);
  const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const goalPct = Math.min(100, (best / CFG.sim.maxGoalKm) * 100);

  // Topbar
  $('s-gen').textContent = state.generation;
  $('s-alive').textContent = state.alive;
  $('s-best').textContent = best.toFixed(1);
  $('s-level').textContent = state.level;
  const elapsed = Math.floor(state.simTime);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  $('s-time').textContent = `${mm}:${ss}`;
  $('s-goal').textContent = goalPct.toFixed(1) + '%';
  $('s-fps').textContent = Math.round(fpsVal);

  // Panel izquierdo
  $('p-avg').textContent = avg.toFixed(2) + ' km';
  $('p-min').textContent = min.toFixed(2) + ' km';
  $('p-max').textContent = max.toFixed(2) + ' km';
  $('p-alive').textContent = `${state.alive}/${CFG.popSize}`;
  $('p-mut').textContent = Math.round(CFG.mutationRate * 100) + '%';
  $('p-genbest').textContent = state.generationBestKm.toFixed(2) + ' km';
  $('p-globalbest').textContent = state.globalBestKm.toFixed(2) + ' km';
  $('p-bar').style.width = goalPct + '%';
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ───────────────────────── CHART ───────────────────────── */
const chartCanvas = $('chart-canvas');
const chartCtx = chartCanvas.getContext('2d');
function redrawChart() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = chartCanvas.clientWidth;
  const h = chartCanvas.clientHeight;
  chartCanvas.width = w * dpr;
  chartCanvas.height = h * dpr;
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = w, H = h;
  chartCtx.clearRect(0, 0, W, H);

  const padL = 42, padR = 10, padT = 8, padB = 20;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  chartCtx.strokeStyle = 'rgba(80,200,255,0.12)';
  chartCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch * i) / 4;
    chartCtx.beginPath();
    chartCtx.moveTo(padL, y);
    chartCtx.lineTo(padL + cw, y);
    chartCtx.stroke();
  }

  const gens = state.history.gen;
  if (gens.length < 2) {
    chartCtx.fillStyle = 'rgba(122,140,163,0.6)';
    chartCtx.font = '11px monospace';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('Esperando datos de evolución...', W / 2, H / 2);
    return;
  }
  const all = state.history.best.concat(state.history.avg, state.history.min);
  const maxY = Math.max(1, ...all) * 1.1;

  const px = i => padL + (cw * i) / (gens.length - 1);
  const py = v => padT + ch - (ch * v) / maxY;

  // labels Y
  chartCtx.fillStyle = 'rgba(122,140,163,0.8)';
  chartCtx.font = '9px monospace';
  chartCtx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (maxY * (4 - i)) / 4;
    chartCtx.fillText(v.toFixed(1), padL - 6, padT + (ch * i) / 4 + 3);
  }

  const drawSeries = (arr, color) => {
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth = 1.6;
    chartCtx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const X = px(i), Y = py(arr[i]);
      if (i === 0) chartCtx.moveTo(X, Y); else chartCtx.lineTo(X, Y);
    }
    chartCtx.stroke();
  };
  drawSeries(state.history.best, '#22d3ee');
  drawSeries(state.history.avg, '#a855f7');
  drawSeries(state.history.min, '#ef4444');

  // leyenda
  chartCtx.font = '9px monospace';
  chartCtx.textAlign = 'left';
  chartCtx.fillStyle = '#22d3ee'; chartCtx.fillText('■ Best', padL + 4, padT + 10);
  chartCtx.fillStyle = '#a855f7'; chartCtx.fillText('■ Avg', padL + 60, padT + 10);
  chartCtx.fillStyle = '#ef4444'; chartCtx.fillText('■ Min', padL + 116, padT + 10);
}

window.addEventListener('resize', redrawChart);

/* ───────────────────────── CONTROLS ───────────────────────── */
$('btn-pause').addEventListener('click', () => {
  state.paused = !state.paused;
  $('btn-pause').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
});
$('btn-reset').addEventListener('click', () => {
  state.generation = 0;
  state.history = { gen: [], best: [], avg: [], min: [] };
  state.globalBestKm = 0;
  state.simTime = 0;
  state.level = 1;
  state.levelStartSim = 0;
  state.generationStartSim = 0;
  state.lastImprovementSim = 0;
  state.generationBestKm = 0;
  state.distanceKm = 0;
  state.bestBrain = null;
  for (const o of obstacles) o.deactivate();
  initPopulation();
  state.generation = 1;
  redrawChart();
  showToast('🔄 Entrenamiento reiniciado');
});

$('in-speed').addEventListener('input', e => {
  state.speedMultiplier = parseInt(e.target.value, 10);
  $('v-speed').textContent = state.speedMultiplier + '×';
});

$('in-diff').addEventListener('change', e => {
  state.difficulty = parseFloat(e.target.value);
  const label = e.target.options[e.target.selectedIndex].text;
  $('v-diff').textContent = label;
  state.spawnInterval = Math.max(0.35, 1.6 - state.level * 0.05) / state.difficulty;
});

$('btn-save').addEventListener('click', () => {
  const brain = state.bestBrain || (state.drones[0] && state.drones[0].brain);
  if (!brain) { showToast('⚠ No hay cerebro para guardar'); return; }
  const data = {
    meta: {
      generation: state.generation,
      bestKm: state.generationBestKm,
      globalBestKm: state.globalBestKm,
      timestamp: Date.now(),
    },
    brain: brain.serialize(),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neuro-aviator-brain-gen${state.generation}-${Math.floor(state.generationBestKm)}km.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Cerebro guardado');
});

$('btn-load').addEventListener('click', () => $('file-in').click());
$('file-in').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.brain) throw new Error('Formato inválido');
      const brain = Brain.deserialize(data.brain);
      state.bestBrain = brain;

      // Cargar cerebro como élite + nueva descendencia mutada
      const oldDrones = state.drones.slice();
      const newPop = [];
      // El cerebro cargado es el primero (élite)
      newPop.push(createDrone(brain.copy(), 0));
      // Rellenar con mutaciones y cruces con el cargado
      while (newPop.length < CFG.popSize) {
        const child = brain.copy();
        child.mutate(CFG.mutationRate, CFG.mutationAmount);
        newPop.push(createDrone(child, newPop.length));
      }
      for (const d of oldDrones) d.dispose();
      state.drones = newPop;
      state.alive = CFG.popSize;
      state.generation++;
      state.generationStartSim = state.simTime;
      state.lastImprovementSim = state.simTime;
      state.generationBestKm = 0;
      state.distanceKm = 0;
      state.level = 1;
      state.levelStartSim = state.simTime;
      for (const o of obstacles) o.deactivate();
      showToast(`📁 Cerebro cargado · Gen ${state.generation} · meta=${(data.meta?.bestKm ?? 0).toFixed(1)} km`);
    } catch (err) {
      console.error(err);
      showToast('❌ Error al cargar: ' + err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
});

/* ───────────────────────── BOOTSTRAP ───────────────────────── */
initPopulation();
state.generationStartSim = 0;
state.lastImprovementSim = 0;
redrawChart();

// Frames iniciales
requestAnimationFrame(frame);

// Refresh del chart periódico
setInterval(redrawChart, 2000);

})();