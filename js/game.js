/* Batman Team Presentation Tour — Gotham 3D
 * A lightweight third-person Three.js scene, GTA-style chase camera, driving
 * Batman between neon Gotham checkpoints. Presentation content is entirely
 * data-driven from data/dialogue.json — see README for editing instructions.
 */

const MOVE_SPEED = 26; // world units / second
const CAMERA_LERP = 0.08;

// Route through the Gotham block, alternating sides of the avenue like the
// original tour so each teammate gets their own corner of the city.
const CHECKPOINT_POINTS = [
  { x: -70, z: 46 },
  { x: -46, z: 18 },
  { x: -14, z: 40 },
  { x: 16, z: 8 },
  { x: 48, z: 34 },
  { x: 74, z: 2 },
  { x: 104, z: 30 },
  { x: 132, z: -4 }
];

const CHARACTER_STYLES = {
  Batman: { primary: 0x1a1d2d, secondary: 0x454b62, accent: 0xf0d869, skin: 0xe2c39e },
  Bane: { primary: 0x395c39, secondary: 0xbcc6ce, accent: 0xd3564d, skin: 0xbb845f },
  Joker: { primary: 0x65308f, secondary: 0x53b46a, accent: 0xf6f7ff, skin: 0xf4f4f1 },
  "Harley Quinn": { primary: 0x161616, secondary: 0xc1374b, accent: 0xf0f1f5, skin: 0xf3d1bf },
  Scarecrow: { primary: 0x7b6845, secondary: 0x4a3b25, accent: 0xd8c18e, skin: 0xd8c18e },
  Robin: { primary: 0xc63835, secondary: 0x217340, accent: 0xf1d14e, skin: 0xf0c5a8 },
  Catwoman: { primary: 0x141414, secondary: 0x434650, accent: 0x8ee1ff, skin: 0xe6cab3 },
  "Arkham Knight": { primary: 0x3f414f, secondary: 0x8b8f9b, accent: 0xcf3e40, skin: 0xd9b99f }
};

const EMBLEMS = {
  Batman: "🦇",
  Bane: "✦",
  Joker: "♦",
  "Harley Quinn": "♥",
  Scarecrow: "✕",
  Robin: "R",
  Catwoman: "⌒",
  "Arkham Knight": "▲"
};

class GothamTourScene {
  constructor(container, hud, checkpoints) {
    this.container = container;
    this.hud = hud;
    this.checkpoints = checkpoints;
    this.route = CHECKPOINT_POINTS.slice(0, checkpoints.length);

    this.currentIndex = 0;
    this.destinationIndex = 0;
    this.movingToIndex = null;
    this.visited = new Array(checkpoints.length).fill(false);
    this.activeBubble = null;
    this.bubbleCanDismiss = false;
    this.endOverlay = false;
    this.clock = new THREE.Clock();
    this.labels = [];
    this.heading = 0;

    this.initRenderer();
    this.initScene();
    this.buildCity();
    this.buildRoute();
    this.buildCheckpoints();
    this.buildCharacters();
    this.initControls();
    this.initCamera();

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();

    this.showArrivalBanner(this.checkpoints[0].city);
    window.setTimeout(() => this.openDialogue(0), 350);

    this.renderer.setAnimationLoop(() => this.tick());
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.prepend(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b1c, 0.0105);

    const moon = new THREE.PointLight(0xd7dfff, 1.1, 400);
    moon.position.set(120, 140, -60);
    this.scene.add(moon);

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xf3f6ff })
    );
    moonMesh.position.copy(moon.position);
    this.scene.add(moonMesh);

    this.scene.add(new THREE.AmbientLight(0x3b4680, 1.15));
    this.scene.add(new THREE.HemisphereLight(0x364a8f, 0x05070f, 0.6));

    const key = new THREE.DirectionalLight(0x8aa2ff, 0.55);
    key.position.set(-40, 80, 40);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.5, 800);
  }

  buildCity() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ color: 0x0a0d1c, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(1200, 80, 0x1c2550, 0x11162c);
    grid.position.y = 0.02;
    this.scene.add(grid);

    const buildingMat = (hue) =>
      new THREE.MeshStandardMaterial({ color: hue, roughness: 0.85, metalness: 0.1 });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x14183a,
      emissive: 0xffe58a,
      emissiveIntensity: 0.85,
      roughness: 0.6
    });

    const blockPalette = [0x11142a, 0x161a33, 0x0d1024, 0x191d3a];
    const rng = mulberry32(1337);

    for (let i = 0; i < 90; i += 1) {
      const side = rng() > 0.5 ? 1 : -1;
      const along = rng() * 260 - 60;
      const offset = 24 + rng() * 70;
      const x = along;
      const z = side * offset + (rng() - 0.5) * 20;

      if (this.isNearRoute(x, z, 16)) {
        continue;
      }

      const width = 6 + rng() * 10;
      const depth = 6 + rng() * 10;
      const height = 12 + rng() * 70;

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        buildingMat(blockPalette[Math.floor(rng() * blockPalette.length)])
      );
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);

      const windowStrip = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, height * 0.85, depth * 0.9),
        windowMat
      );
      windowStrip.position.copy(building.position);
      windowStrip.scale.set(1.001, 1, 1.001);
      if (rng() > 0.35) {
        this.scene.add(windowStrip);
      }
    }

    // Distant skyline silhouettes for depth, fading into the fog.
    const skylineMat = new THREE.MeshStandardMaterial({ color: 0x0b0f24, emissive: 0x0a0e22, emissiveIntensity: 0.4 });
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2;
      const radius = 260 + rng() * 60;
      const height = 40 + rng() * 140;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(18, height, 18), skylineMat);
      tower.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      this.scene.add(tower);
    }
  }

  isNearRoute(x, z, margin) {
    for (let i = 0; i < this.route.length - 1; i += 1) {
      const a = this.route[i];
      const b = this.route[i + 1];
      if (distanceToSegment(x, z, a.x, a.z, b.x, b.z) < margin) {
        return true;
      }
    }
    return false;
  }

  buildRoute() {
    const shape = new THREE.Shape();
    const width = 6;
    const points = this.route;
    const left = [];
    const right = [];

    for (let i = 0; i < points.length; i += 1) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dir = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize();
      const normal = new THREE.Vector2(-dir.y, dir.x);
      left.push(new THREE.Vector2(points[i].x + normal.x * width, points[i].z + normal.y * width));
      right.push(new THREE.Vector2(points[i].x - normal.x * width, points[i].z - normal.y * width));
    }

    shape.moveTo(left[0].x, left[0].y);
    left.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
    right
      .slice()
      .reverse()
      .forEach((p) => shape.lineTo(p.x, p.y));
    shape.closePath();

    const roadGeometry = new THREE.ShapeGeometry(shape);
    roadGeometry.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(
      roadGeometry,
      new THREE.MeshStandardMaterial({ color: 0x161d40, roughness: 0.7 })
    );
    road.position.y = 0.03;
    road.receiveShadow = true;
    this.scene.add(road);

    const glowLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, 0.1, p.z))),
      new THREE.LineBasicMaterial({ color: 0x86a4ff, transparent: true, opacity: 0.9 })
    );
    this.scene.add(glowLine);
  }

  buildCheckpoints() {
    this.markerNodes = this.route.map((point, index) => {
      const checkpoint = this.checkpoints[index];
      const style = CHARACTER_STYLES[checkpoint.character] || CHARACTER_STYLES.Batman;
      const group = new THREE.Group();
      group.position.set(point.x, 0, point.z);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.35, 12, 32),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0xffd95c : 0xa5b8ff,
          emissive: index === 0 ? 0xffd95c : 0x3a4d9c,
          emissiveIntensity: 0.7
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      group.add(ring);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.9, 26, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: style.accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
      );
      beam.position.y = 13;
      group.add(beam);

      const beacon = new THREE.PointLight(style.accent, 1.1, 40);
      beacon.position.y = 2;
      group.add(beacon);

      const hitArea = new THREE.Mesh(
        new THREE.CylinderGeometry(4.5, 4.5, 4, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitArea.position.y = 2;
      hitArea.userData.checkpointIndex = index;
      group.add(hitArea);

      this.scene.add(group);

      const cityLabel = this.createLabel(checkpoint.city, "world-label world-label--city");
      cityLabel.anchor = group;
      cityLabel.offset = new THREE.Vector3(0, -1.4, 0);

      return { group, ring, hitArea, cityLabel };
    });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener("click", (event) => this.handleClick(event));
  }

  buildCharacters() {
    this.characterGroups = this.checkpoints.map((checkpoint, index) => {
      const isPlayer = index === 0;
      const point = this.route[index];
      const avatar = buildCharacterAvatar(checkpoint.character, isPlayer);

      if (isPlayer) {
        avatar.position.set(point.x, 0, point.z);
        this.player = avatar;
      } else {
        const direction = index % 2 === 0 ? 1 : -1;
        avatar.position.set(point.x + direction * 5, 0, point.z - 1);
        avatar.rotation.y = Math.PI;

        const nameLabel = this.createLabel(checkpoint.character, "world-label world-label--name");
        nameLabel.anchor = avatar;
        nameLabel.offset = new THREE.Vector3(0, 5.4, 0);
      }

      this.scene.add(avatar);
      return avatar;
    });

    const youLabel = this.createLabel("YOU", "world-label world-label--you");
    youLabel.anchor = this.player;
    youLabel.offset = new THREE.Vector3(0, 5.6, 0);
  }

  initControls() {
    this.keys = {};
    window.addEventListener("keydown", (event) => {
      this.keys[event.code] = true;
      this.handleKeyboardInput(event);
    });
    window.addEventListener("keyup", (event) => {
      this.keys[event.code] = false;
    });

    this.hud.speechBubble.addEventListener("click", () => {
      if (this.bubbleCanDismiss) {
        this.closeDialogue();
      }
    });
    this.hud.restartButton.addEventListener("click", () => this.restartTour());
  }

  initCamera() {
    this.cameraOffset = new THREE.Vector3(0, 7.5, -14);
    this.upAxis = new THREE.Vector3(0, 1, 0);
    const start = this.route[0];
    this.camera.position.set(start.x, 8, start.z - 16);
    this.camera.lookAt(start.x, 3, start.z);
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  createLabel(text, className) {
    const el = document.createElement("div");
    el.className = className;
    el.textContent = text;
    this.hud.worldLabelLayer.appendChild(el);
    const label = { el, anchor: null, offset: new THREE.Vector3() };
    this.labels.push(label);
    return label;
  }

  handleClick(event) {
    if (this.activeBubble || this.endOverlay) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.markerNodes.map((m) => m.hitArea));
    if (hits.length > 0) {
      this.queueMovement(hits[0].object.userData.checkpointIndex);
    }
  }

  handleKeyboardInput(event) {
    if (this.endOverlay) {
      if (event.code === "Space" || event.code === "Enter") {
        this.restartTour();
      }
      return;
    }

    if (this.activeBubble) {
      if (this.bubbleCanDismiss && (event.code === "Space" || event.code === "Enter")) {
        this.closeDialogue();
      }
      return;
    }

    if (this.movingToIndex !== null) {
      return;
    }

    if (["ArrowRight", "ArrowDown", "KeyD", "KeyS"].includes(event.code)) {
      this.queueMovement(Math.min(this.checkpoints.length - 1, this.currentIndex + 1));
    }

    if (["ArrowLeft", "ArrowUp", "KeyA", "KeyW"].includes(event.code)) {
      this.queueMovement(Math.max(0, this.currentIndex - 1));
    }
  }

  queueMovement(targetIndex) {
    this.destinationIndex = targetIndex;

    if (this.destinationIndex === this.currentIndex) {
      this.openDialogue(this.currentIndex);
      return;
    }

    this.beginNextLeg();
  }

  beginNextLeg() {
    if (this.destinationIndex === this.currentIndex) {
      return;
    }
    const step = Math.sign(this.destinationIndex - this.currentIndex);
    this.movingToIndex = this.currentIndex + step;
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.updateMovement(delta);
    this.updateCamera(delta);
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  updateMovement(delta) {
    if (this.movingToIndex === null) {
      this.player.position.y = Math.sin(performance.now() * 0.0018) * 0.15;
      return;
    }

    const target = this.route[this.movingToIndex];
    const dx = target.x - this.player.position.x;
    const dz = target.z - this.player.position.z;
    const distance = Math.hypot(dx, dz);
    const step = MOVE_SPEED * delta;

    if (distance <= step) {
      this.player.position.x = target.x;
      this.player.position.z = target.z;
      this.movingToIndex = null;
      this.currentIndex = this.destinationIndex;
      this.showArrivalBanner(this.checkpoints[this.currentIndex].city);
      this.openDialogue(this.currentIndex);
      return;
    }

    const nx = dx / distance;
    const nz = dz / distance;
    this.player.position.x += nx * step;
    this.player.position.z += nz * step;
    this.heading = Math.atan2(nx, nz);
    this.player.rotation.y = this.heading;
  }

  updateCamera(delta) {
    const rotatedOffset = this.cameraOffset.clone().applyAxisAngle(this.upAxis, this.heading);
    const desired = new THREE.Vector3(
      this.player.position.x + rotatedOffset.x,
      rotatedOffset.y,
      this.player.position.z + rotatedOffset.z
    );

    this.camera.position.lerp(desired, 1 - Math.pow(1 - CAMERA_LERP, delta * 60));
    const lookTarget = new THREE.Vector3(this.player.position.x, 3.2, this.player.position.z);
    this.camera.lookAt(lookTarget);
  }

  updateLabels() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;

    this.labels.forEach((label) => {
      if (!label.anchor) {
        return;
      }
      const worldPos = label.anchor.position.clone().add(label.offset);
      const projected = worldPos.project(this.camera);
      const behindCamera = projected.z > 1;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      label.el.style.display = behindCamera ? "none" : "block";
      label.el.style.left = `${x}px`;
      label.el.style.top = `${y}px`;
    });

    if (this.activeBubble) {
      const worldPos = this.activeBubble.speaker.position.clone().add(new THREE.Vector3(0, 6.2, 0));
      const projected = worldPos.project(this.camera);
      const behindCamera = projected.z > 1;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      this.hud.speechBubble.style.display = behindCamera ? "none" : "";
      this.hud.speechBubble.style.left = `${x}px`;
      this.hud.speechBubble.style.top = `${y}px`;
    }
  }

  openDialogue(index) {
    if (this.activeBubble || this.endOverlay) {
      return;
    }

    this.visited[index] = true;
    this.refreshProgress();
    this.highlightCheckpoint(index);

    const checkpoint = this.checkpoints[index];
    const speaker = index === 0 ? this.player : this.characterGroups[index];
    const isLast = index === this.checkpoints.length - 1;

    this.hud.speechBubbleText.textContent = `${checkpoint.character}\n${checkpoint.message}`;
    this.hud.speechBubbleHint.textContent = isLast
      ? "Press Space, Enter, or click to finish"
      : "Press Space, Enter, or click to continue";
    this.hud.speechBubble.hidden = false;
    this.hud.speechBubble.style.display = "";
    this.bubbleCanDismiss = false;
    this.activeBubble = { speaker };

    window.setTimeout(() => {
      this.bubbleCanDismiss = true;
    }, 220);
  }

  closeDialogue() {
    if (!this.activeBubble) {
      return;
    }

    this.hud.speechBubble.hidden = true;
    this.activeBubble = null;
    this.bubbleCanDismiss = false;

    if (this.currentIndex === this.checkpoints.length - 1) {
      window.setTimeout(() => this.showEndScreen(), 180);
      return;
    }

    if (this.currentIndex !== this.destinationIndex) {
      window.setTimeout(() => this.beginNextLeg(), 120);
    }
  }

  showEndScreen() {
    if (this.endOverlay) {
      return;
    }
    this.endOverlay = true;
    this.hud.endOverlay.hidden = false;
  }

  restartTour() {
    this.hud.endOverlay.hidden = true;
    this.endOverlay = false;

    this.hud.speechBubble.hidden = true;
    this.activeBubble = null;
    this.bubbleCanDismiss = false;

    this.currentIndex = 0;
    this.destinationIndex = 0;
    this.movingToIndex = null;
    this.visited = new Array(this.checkpoints.length).fill(false);

    this.player.position.set(this.route[0].x, 0, this.route[0].z);
    this.player.rotation.y = 0;
    this.heading = 0;

    this.markerNodes.forEach(({ ring }) => {
      ring.material.color.set(0xa5b8ff);
      ring.material.emissive.set(0x3a4d9c);
    });
    this.markerNodes[0].ring.material.color.set(0xffd95c);
    this.markerNodes[0].ring.material.emissive.set(0xffd95c);

    this.showArrivalBanner(this.checkpoints[0].city);
    this.refreshProgress();
    window.setTimeout(() => this.openDialogue(0), 250);
  }

  showArrivalBanner(cityName) {
    this.hud.arrivalBanner.textContent = `Now arriving: ${cityName}`;
    this.hud.arrivalBanner.style.opacity = "0";
    requestAnimationFrame(() => {
      this.hud.arrivalBanner.style.opacity = "1";
    });
  }

  refreshProgress() {
    const visitedCount = this.visited.filter(Boolean).length;
    this.hud.progressText.textContent = `Checkpoint ${Math.max(1, this.currentIndex + 1)} / ${this.checkpoints.length}  •  Visited ${visitedCount}`;
  }

  highlightCheckpoint(index) {
    this.markerNodes.forEach(({ ring }, nodeIndex) => {
      if (nodeIndex === index) {
        ring.material.color.set(0xffd95c);
        ring.material.emissive.set(0xffd95c);
      } else if (this.visited[nodeIndex]) {
        ring.material.color.set(0xb4c3ff);
        ring.material.emissive.set(0x4a5db0);
      } else {
        ring.material.color.set(0xa5b8ff);
        ring.material.emissive.set(0x3a4d9c);
      }
    });
  }
}

function buildCharacterAvatar(name, isPlayer) {
  const style = CHARACTER_STYLES[name] || CHARACTER_STYLES.Batman;
  const group = new THREE.Group();
  const scale = isPlayer ? 1.12 : 1;

  const bodyMat = new THREE.MeshStandardMaterial({ color: style.primary, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: style.skin, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.accent, emissiveIntensity: 0.3 });
  const secondaryMat = new THREE.MeshStandardMaterial({ color: style.secondary, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9 * scale, 1.7 * scale, 4, 8), bodyMat);
  body.position.y = 1.7 * scale;
  body.castShadow = true;
  group.add(body);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.92 * scale, 0.12, 8, 16), accentMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.05 * scale;
  group.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62 * scale, 16, 16), skinMat);
  head.position.y = 2.95 * scale;
  group.add(head);

  const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.68 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), bodyMat);
  cowl.position.y = 3.05 * scale;
  group.add(cowl);

  const cape = new THREE.Mesh(
    new THREE.ConeGeometry(1.3 * scale, 2.6 * scale, 4, 1, true),
    secondaryMat
  );
  cape.rotation.x = Math.PI;
  cape.position.set(0, 1.9 * scale, 0.55 * scale);
  cape.scale.set(1, 1, 0.4);
  group.add(cape);

  if (name === "Batman" || name === "Catwoman" || name === "Arkham Knight") {
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.55 * scale, 8), bodyMat);
      ear.position.set(side * 0.32 * scale, 3.55 * scale, 0.05);
      group.add(ear);
    });
  }

  if (name === "Joker") {
    const hair = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.22, 8, 16, Math.PI), secondaryMat);
    hair.position.y = 3.15;
    hair.rotation.z = Math.PI;
    group.add(hair);
  }

  if (name === "Harley Quinn") {
    [-1, 1].forEach((side) => {
      const pigtail = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: side < 0 ? style.secondary : style.primary })
      );
      pigtail.position.set(side * 0.62, 3.1, 0);
      group.add(pigtail);
    });
  }

  if (name === "Bane") {
    [-1, 1].forEach((side) => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), accentMat);
      tube.position.set(side * 0.4, 3.2, -0.3);
      tube.rotation.x = 0.4;
      group.add(tube);
    });
  }

  if (name === "Scarecrow") {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1, 12, 1, true), bodyMat);
    hood.position.y = 3.3;
    group.add(hood);
  }

  if (name === "Robin") {
    const capeTail = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4, 1, true), accentMat);
    capeTail.rotation.x = Math.PI;
    capeTail.position.set(0, 1.3, 0.4);
    capeTail.scale.set(1, 1, 0.3);
    group.add(capeTail);
  }

  if (name === "Bane" || name === "Arkham Knight") {
    const visor = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 16, Math.PI), accentMat);
    visor.position.set(0, 3.05 * scale, 0.55 * scale);
    group.add(visor);
  }

  if (name === "Catwoman") {
    const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 16), accentMat);
    goggles.position.set(0, 3.05 * scale, 0.55 * scale);
    group.add(goggles);
  }

  group.userData.emblem = EMBLEMS[name] || "•";
  return group;
}

function distanceToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

// Deterministic PRNG so the skyline layout is stable across reloads.
function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function boot() {
  const container = document.getElementById("game-container");
  const hud = {
    worldLabelLayer: document.getElementById("hud-layer"),
    arrivalBanner: document.getElementById("arrival-banner"),
    progressText: document.getElementById("progress-text"),
    speechBubble: document.getElementById("speech-bubble"),
    speechBubbleText: document.getElementById("speech-bubble-text"),
    speechBubbleHint: document.getElementById("speech-bubble-hint"),
    endOverlay: document.getElementById("end-overlay"),
    restartButton: document.getElementById("restart-button")
  };

  const response = await fetch("data/dialogue.json");
  const data = await response.json();
  const checkpoints = Array.isArray(data?.checkpoints) ? data.checkpoints : [];

  if (checkpoints.length < 2) {
    throw new Error("data/dialogue.json must include at least two checkpoints.");
  }

  new GothamTourScene(container, hud, checkpoints);
}

window.addEventListener("load", () => {
  boot().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start Gotham 3D tour:", error);
  });
});
