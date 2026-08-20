// Batman Team Presentation Tour - simple 3D scene built with Three.js.
// No build step, no server-side logic: everything runs in the browser.
(function () {
  "use strict";

  const CONTAINER_ID = "game-container";
  const DIALOGUE_URL = "data/dialogue.json";
  const CHECKPOINT_RADIUS = 4.5;
  const MOVE_SPEED = 9;
  const TURN_SPEED = 10;
  const WORLD_HALF_SIZE = 46;

  // Fixed layout for the checkpoints along a loop through the city block.
  // Order matches data/dialogue.json.
  const CHECKPOINT_POSITIONS = [
    { x: 0, z: 0 }, // Batman / start
    { x: 30, z: -10 }, // Bane / Gotham Docks
    { x: 24, z: 22 }, // Joker / Arkham Square
    { x: -2, z: 34 }, // Harley Quinn / Diamond District
    { x: -28, z: 20 }, // Scarecrow / Feargate Labs
    { x: -32, z: -12 }, // Robin / Signal Tower
    { x: -8, z: -32 }, // Catwoman / Midnight Market
    { x: 20, z: -30 }, // Arkham Knight / Knightfall Keep
  ];

  const state = {
    checkpoints: [],
    activeCheckpointIndex: -1,
    keys: Object.create(null),
    clock: null,
  };

  function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || typeof THREE === "undefined") {
      return;
    }

    const scene = buildScene();
    const camera = buildCamera(container);
    const renderer = buildRenderer(container);
    const player = buildPlayer(scene);
    buildGround(scene);
    buildBuildings(scene);
    const markers = buildCheckpointMarkers(scene);

    state.clock = new THREE.Clock();

    window.addEventListener("keydown", (event) => {
      state.keys[event.code] = true;
    });
    window.addEventListener("keyup", (event) => {
      state.keys[event.code] = false;
    });
    window.addEventListener("resize", () => resizeRenderer(container, camera, renderer));
    resizeRenderer(container, camera, renderer);

    loadDialogue().then((checkpoints) => {
      state.checkpoints = checkpoints;
      if (state.activeCheckpointIndex !== -1) {
        showCheckpointMessage(state.activeCheckpointIndex);
      }
    });

    animate(scene, camera, renderer, player, markers);
  }

  function buildScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050815);
    scene.fog = new THREE.Fog(0x050815, 35, 130);

    const ambient = new THREE.AmbientLight(0x33406b, 1.1);
    scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x9fb3ff, 0.8);
    moonLight.position.set(-30, 45, -20);
    scene.add(moonLight);

    addBatSignal(scene);

    return scene;
  }

  function addBatSignal(scene) {
    // A simple glowing disc with a bat silhouette plus an upward light cone,
    // standing in for the iconic Gotham bat-signal without copying any art.
    const towerGeometry = new THREE.CylinderGeometry(0.6, 0.9, 14, 8);
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1d2b });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(0, 7, -6);
    scene.add(tower);

    const discGeometry = new THREE.CircleGeometry(2.2, 24);
    const discMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd54a,
      emissive: 0xffd54a,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.position.set(0, 14.2, -6);
    scene.add(disc);

    const beamGeometry = new THREE.ConeGeometry(9, 40, 24, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe98a,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.rotation.x = Math.PI;
    beam.position.set(0, 34, -6);
    scene.add(beam);

    const signalLight = new THREE.PointLight(0xffd54a, 1.4, 40);
    signalLight.position.set(0, 14, -6);
    scene.add(signalLight);
  }

  function buildCamera(container) {
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      500
    );
    camera.position.set(0, 6, 10);
    return camera;
  }

  function buildRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.insertBefore(renderer.domElement, container.firstChild);
    return renderer;
  }

  function resizeRenderer(container, camera, renderer) {
    const width = container.clientWidth;
    const height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function buildGround(scene) {
    const groundGeometry = new THREE.PlaneGeometry(WORLD_HALF_SIZE * 2.4, WORLD_HALF_SIZE * 2.4);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x14182a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2338 });
    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(6, WORLD_HALF_SIZE * 2.4), roadMaterial);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.y = 0.01;
    scene.add(roadNS);

    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF_SIZE * 2.4, 6), roadMaterial);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.y = 0.01;
    scene.add(roadEW);
  }

  function buildBuildings(scene) {
    const palette = [0x1c2440, 0x232c4d, 0x2a3557, 0x181e33];
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0xffe08a,
      emissiveIntensity: 0.6,
    });

    const layout = [
      { x: 16, z: -18, w: 8, d: 8, h: 18 },
      { x: -18, z: -16, w: 9, d: 7, h: 24 },
      { x: 18, z: 14, w: 7, d: 9, h: 15 },
      { x: -16, z: 16, w: 8, d: 8, h: 20 },
      { x: 30, z: 2, w: 6, d: 6, h: 12 },
      { x: -30, z: 4, w: 7, d: 6, h: 16 },
      { x: 8, z: -34, w: 8, d: 7, h: 22 },
      { x: -10, z: -34, w: 6, d: 6, h: 13 },
      { x: 6, z: 32, w: 7, d: 7, h: 19 },
      { x: -6, z: 32, w: 8, d: 6, h: 11 },
    ];

    layout.forEach((spec, index) => {
      const color = palette[index % palette.length];
      const material = new THREE.MeshStandardMaterial({ color });
      const geometry = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const building = new THREE.Mesh(geometry, material);
      building.position.set(spec.x, spec.h / 2, spec.z);
      scene.add(building);

      // A handful of lit windows per building face, kept intentionally simple.
      const rows = Math.max(2, Math.floor(spec.h / 4));
      for (let row = 0; row < rows; row += 1) {
        const windowGeometry = new THREE.PlaneGeometry(spec.w * 0.6, 0.6);
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(spec.x, 2 + row * 3.2, spec.z + spec.d / 2 + 0.05);
        scene.add(windowMesh);
      }
    });
  }

  function buildCheckpointMarkers(scene) {
    return CHECKPOINT_POSITIONS.map((pos, index) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      const isStart = index === 0;
      const color = isStart ? 0xffd54a : 0x5ad1ff;

      const ringGeometry = new THREE.TorusGeometry(1.6, 0.14, 8, 32);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      const beaconGeometry = new THREE.CylinderGeometry(0.18, 0.18, 3.4, 10);
      const beaconMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.55,
      });
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beacon.position.y = 1.7;
      group.add(beacon);

      const light = new THREE.PointLight(color, 0.8, 10);
      light.position.y = 2.2;
      group.add(light);

      scene.add(group);

      return { group, index, position: pos };
    });
  }

  function buildPlayer(scene) {
    const player = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1d22 });
    const graySuitMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2d33 });
    const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xffd54a });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 4, 8), graySuitMaterial);
    torso.position.y = 1.15;
    player.add(torso);

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.08, 8, 16), yellowMaterial);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.85;
    player.add(belt);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), bodyMaterial);
    head.position.y = 1.85;
    player.add(head);

    const earGeometry = new THREE.ConeGeometry(0.08, 0.28, 8);
    const earLeft = new THREE.Mesh(earGeometry, bodyMaterial);
    earLeft.position.set(-0.16, 2.15, 0);
    earLeft.rotation.z = -0.15;
    player.add(earLeft);
    const earRight = new THREE.Mesh(earGeometry, bodyMaterial);
    earRight.position.set(0.16, 2.15, 0);
    earRight.rotation.z = 0.15;
    player.add(earRight);

    const capeGeometry = new THREE.PlaneGeometry(1.1, 1.4, 4, 4);
    const capeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d0e14,
      side: THREE.DoubleSide,
    });
    const cape = new THREE.Mesh(capeGeometry, capeMaterial);
    cape.position.set(0, 1.1, -0.3);
    cape.rotation.x = 0.25;
    player.add(cape);

    const legGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.7, 8);
    const legLeft = new THREE.Mesh(legGeometry, graySuitMaterial);
    legLeft.position.set(-0.2, 0.35, 0);
    player.add(legLeft);
    const legRight = new THREE.Mesh(legGeometry, graySuitMaterial);
    legRight.position.set(0.2, 0.35, 0);
    player.add(legRight);

    player.position.set(0, 0, 4);
    scene.add(player);

    return { root: player, facing: 0 };
  }

  function loadDialogue() {
    return fetch(DIALOGUE_URL)
      .then((response) => response.json())
      .then((data) => (data && Array.isArray(data.checkpoints) ? data.checkpoints : []))
      .catch(() => []);
  }

  function animate(scene, camera, renderer, player, markers) {
    const delta = Math.min(state.clock.getDelta(), 0.1);

    updatePlayerMovement(player, delta);
    updateCamera(camera, player);
    updateCheckpointProximity(player, markers);

    renderer.render(scene, camera);
    requestAnimationFrame(() => animate(scene, camera, renderer, player, markers));
  }

  function updatePlayerMovement(player, delta) {
    const forward = isKeyDown("KeyW", "ArrowUp");
    const backward = isKeyDown("KeyS", "ArrowDown");
    const left = isKeyDown("KeyA", "ArrowLeft");
    const right = isKeyDown("KeyD", "ArrowRight");

    let moveX = 0;
    let moveZ = 0;
    if (forward) moveZ -= 1;
    if (backward) moveZ += 1;
    if (left) moveX -= 1;
    if (right) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.hypot(moveX, moveZ);
      moveX /= length;
      moveZ /= length;

      const nextX = player.root.position.x + moveX * MOVE_SPEED * delta;
      const nextZ = player.root.position.z + moveZ * MOVE_SPEED * delta;

      player.root.position.x = clamp(nextX, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);
      player.root.position.z = clamp(nextZ, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);

      const targetFacing = Math.atan2(moveX, moveZ);
      player.facing = lerpAngle(player.facing, targetFacing, TURN_SPEED * delta);
      player.root.rotation.y = player.facing;
    }
  }

  function updateCamera(camera, player) {
    const distance = 8;
    const height = 4.5;
    const targetPosition = new THREE.Vector3(
      player.root.position.x - Math.sin(player.facing) * distance,
      height,
      player.root.position.z - Math.cos(player.facing) * distance
    );
    camera.position.lerp(targetPosition, 0.08);

    const lookTarget = new THREE.Vector3(
      player.root.position.x,
      1.4,
      player.root.position.z
    );
    camera.lookAt(lookTarget);
  }

  function updateCheckpointProximity(player, markers) {
    let closestIndex = -1;
    let closestDistance = CHECKPOINT_RADIUS;

    markers.forEach((marker) => {
      const dx = player.root.position.x - marker.position.x;
      const dz = player.root.position.z - marker.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = marker.index;
      }
    });

    if (closestIndex !== state.activeCheckpointIndex) {
      state.activeCheckpointIndex = closestIndex;
      showCheckpointMessage(closestIndex);
    }
  }

  function showCheckpointMessage(index) {
    const bubble = document.getElementById("speech-bubble");
    const hint = document.getElementById("hud-hint");
    if (!bubble) return;

    const checkpoint = index >= 0 ? state.checkpoints[index] : null;

    if (!checkpoint) {
      bubble.classList.add("hidden");
      if (hint) hint.classList.remove("hidden");
      return;
    }

    if (hint) hint.classList.add("hidden");
    document.getElementById("speech-character").textContent = checkpoint.character || "";
    document.getElementById("speech-city").textContent = checkpoint.city || "";
    document.getElementById("speech-message").textContent = checkpoint.message || "";
    bubble.classList.remove("hidden");
  }

  function isKeyDown(...codes) {
    return codes.some((code) => Boolean(state.keys[code]));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerpAngle(current, target, t) {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const step = Math.min(1, t);
    return current + delta * step;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
