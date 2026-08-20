// Batman Team Presentation Tour - simple 3D scene built with Three.js.
// No build step, no server-side logic: everything runs in the browser.
(function () {
  "use strict";

  const CONTAINER_ID = "game-container";
  const DIALOGUE_URL = "data/dialogue.json";
  const CHECKPOINT_RADIUS = 5;
  const VEHICLE_ENTER_RADIUS = 5;
  const MOVE_SPEED = 9;
  const VEHICLE_MOVE_SPEED = 22;
  const TURN_SPEED = 10;
  const VEHICLE_TURN_SPEED = 3.5;
  const WORLD_HALF_SIZE = 60;

  // Vehicle spawn position (near Wayne Plaza hub)
  const VEHICLE_SPAWN = { x: 6, z: 0 };

  const state = {
    checkpoints: [],
    markers: null,
    activeCheckpointIndex: -1,
    nearVehicle: false,
    inVehicle: false,
    collectedSet: new Set(),
    promptTarget: null, // 'vehicle' | 'vehicle_exit' | checkpoint index | null
    keys: Object.create(null),
    clock: null,
    ringTime: 0,
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
    const vehicle = buildVehicle(scene);
    buildGround(scene);
    buildBuildings(scene);
    buildDistrictLabels(scene);

    state.clock = new THREE.Clock();

    window.addEventListener("keydown", (event) => {
      state.keys[event.code] = true;
      if (event.code === "KeyE") {
        handleInteract(player, vehicle);
      }
    });
    window.addEventListener("keyup", (event) => {
      state.keys[event.code] = false;
    });
    window.addEventListener("resize", () => resizeRenderer(container, camera, renderer));
    resizeRenderer(container, camera, renderer);

    loadDialogue().then((checkpoints) => {
      state.checkpoints = checkpoints;
      buildCheckpointMarkers(scene, checkpoints);
      buildProgressList(checkpoints);
    });

    animate(scene, camera, renderer, player, vehicle);
  }

  function buildScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050815);
    scene.fog = new THREE.Fog(0x050815, 50, 180);

    const ambient = new THREE.AmbientLight(0x33406b, 1.1);
    scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x9fb3ff, 0.8);
    moonLight.position.set(-30, 45, -20);
    scene.add(moonLight);

    addBatSignal(scene);

    return scene;
  }

  function addBatSignal(scene) {
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
      600
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
    const sz = WORLD_HALF_SIZE * 2.4;
    const groundGeometry = new THREE.PlaneGeometry(sz, sz);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x14182a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2338 });

    // Main N-S road
    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(6, sz), roadMaterial);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.y = 0.01;
    scene.add(roadNS);

    // Main E-W road
    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(sz, 6), roadMaterial);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.y = 0.01;
    scene.add(roadEW);

    // Diagonal road toward Arkham Square (NW)
    const diagLen = 80;
    const diagNW = new THREE.Mesh(new THREE.PlaneGeometry(5, diagLen), roadMaterial);
    diagNW.rotation.x = -Math.PI / 2;
    diagNW.rotation.z = Math.PI / 4;
    diagNW.position.set(-20, 0.01, -20);
    scene.add(diagNW);

    // Diagonal road toward Gotham Docks (SE)
    const diagSE = new THREE.Mesh(new THREE.PlaneGeometry(5, diagLen), roadMaterial);
    diagSE.rotation.x = -Math.PI / 2;
    diagSE.rotation.z = Math.PI / 4;
    diagSE.position.set(20, 0.01, 20);
    scene.add(diagSE);
  }

  function buildBuildings(scene) {
    const palette = [0x1c2440, 0x232c4d, 0x2a3557, 0x181e33];
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0xffe08a,
      emissiveIntensity: 0.6,
    });

    const layout = [
      // Wayne Plaza area
      { x: 16, z: -18, w: 8, d: 8, h: 18 },
      { x: -18, z: -16, w: 9, d: 7, h: 24 },
      { x: 18, z: 14, w: 7, d: 9, h: 15 },
      { x: -16, z: 16, w: 8, d: 8, h: 20 },
      { x: 8, z: -20, w: 6, d: 6, h: 12 },
      // Arkham Square area (NW)
      { x: -30, z: -30, w: 9, d: 9, h: 22 },
      { x: -50, z: -24, w: 7, d: 7, h: 16 },
      { x: -24, z: -50, w: 8, d: 6, h: 19 },
      { x: -46, z: -46, w: 6, d: 8, h: 13 },
      // Gotham Docks area (SE)
      { x: 30, z: 30, w: 9, d: 9, h: 20 },
      { x: 50, z: 24, w: 7, d: 6, h: 14 },
      { x: 24, z: 50, w: 8, d: 7, h: 18 },
      { x: 48, z: 48, w: 6, d: 6, h: 11 },
    ];

    layout.forEach((spec, index) => {
      const color = palette[index % palette.length];
      const material = new THREE.MeshStandardMaterial({ color });
      const geometry = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const building = new THREE.Mesh(geometry, material);
      building.position.set(spec.x, spec.h / 2, spec.z);
      scene.add(building);

      const rows = Math.max(2, Math.floor(spec.h / 4));
      for (let row = 0; row < rows; row += 1) {
        const windowGeometry = new THREE.PlaneGeometry(spec.w * 0.6, 0.6);
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(spec.x, 2 + row * 3.2, spec.z + spec.d / 2 + 0.05);
        scene.add(windowMesh);
      }
    });
  }

  // Simple flat text-substitute district marker — a glowing plane with
  // a colored point light so districts are visually identifiable on the map.
  function buildDistrictLabels(scene) {
    const districts = [
      { label: "Wayne Plaza", x: 0, z: -2, color: 0xffd54a },
      { label: "Arkham Square", x: -38, z: -38, color: 0xff5a5a },
      { label: "Gotham Docks", x: 40, z: 40, color: 0x5ad1ff },
    ];

    districts.forEach(({ x, z, color }) => {
      const light = new THREE.PointLight(color, 0.5, 35);
      light.position.set(x, 10, z);
      scene.add(light);
    });
  }

  function buildCheckpointMarkers(scene, checkpoints) {
    const markers = checkpoints.map((cp, index) => {
      const group = new THREE.Group();
      group.position.set(cp.x, 0, cp.z);

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

      return { group, index, position: { x: cp.x, z: cp.z } };
    });

    state.markers = markers;
    return markers;
  }

  function buildVehicle(scene) {
    const vehicle = new THREE.Group();
    vehicle.position.set(VEHICLE_SPAWN.x, 0, VEHICLE_SPAWN.z);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x101218 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a4a8a, transparent: true, opacity: 0.6 });

    // Main body
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.55, 5.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    vehicle.add(body);

    // Cockpit canopy
    const canopyGeo = new THREE.BoxGeometry(1.4, 0.5, 2.0);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 1.15, -0.3);
    vehicle.add(canopy);

    // Front wing fins
    const finGeo = new THREE.BoxGeometry(3.8, 0.15, 1.2);
    const fins = new THREE.Mesh(finGeo, bodyMat);
    fins.position.set(0, 0.55, -1.8);
    vehicle.add(fins);

    // Rear stabilizer
    const stabGeo = new THREE.BoxGeometry(2.0, 0.8, 0.3);
    const stab = new THREE.Mesh(stabGeo, bodyMat);
    stab.position.set(0, 1.0, 2.2);
    vehicle.add(stab);

    // Exhaust glow strip
    const exhaustGeo = new THREE.BoxGeometry(0.25, 0.18, 0.5);
    const exhaustL = new THREE.Mesh(exhaustGeo, accentMat);
    exhaustL.position.set(-0.7, 0.7, 2.5);
    vehicle.add(exhaustL);
    const exhaustR = new THREE.Mesh(exhaustGeo, accentMat);
    exhaustR.position.set(0.7, 0.7, 2.5);
    vehicle.add(exhaustR);

    // Wheels (4x)
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22 });
    const wheelPositions = [
      { x: -1.3, z: -1.6 },
      { x: 1.3, z: -1.6 },
      { x: -1.3, z: 1.6 },
      { x: 1.3, z: 1.6 },
    ];
    wheelPositions.forEach(({ x, z }) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      vehicle.add(wheel);
    });

    // Light
    const vLight = new THREE.PointLight(0xffd54a, 0.6, 12);
    vLight.position.set(0, 1.2, -2.2);
    vehicle.add(vLight);

    scene.add(vehicle);

    return { root: vehicle, facing: 0 };
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

  function buildProgressList(checkpoints) {
    const list = document.getElementById("progress-list");
    if (!list) return;
    list.innerHTML = "";
    checkpoints.forEach((cp, index) => {
      const li = document.createElement("li");
      li.id = "progress-item-" + index;
      li.textContent = cp.character;
      list.appendChild(li);
    });
  }

  function handleInteract(player, vehicle) {
    if (state.inVehicle) {
      // Exit vehicle: place player next to vehicle
      state.inVehicle = false;
      player.root.position.set(
        vehicle.root.position.x + 2.5,
        0,
        vehicle.root.position.z
      );
      player.root.visible = true;
      state.promptTarget = null;
      hideInteractPrompt();
      return;
    }

    if (state.promptTarget === "vehicle") {
      // Enter vehicle — promptTarget will be updated to vehicle_exit by updateProximity on next frame
      state.inVehicle = true;
      player.root.visible = false;
      return;
    }

    if (typeof state.promptTarget === "number") {
      triggerCheckpoint(state.promptTarget);
    }
  }

  function triggerCheckpoint(index) {
    const checkpoint = state.checkpoints[index];
    if (!checkpoint) return;

    state.collectedSet.add(index);
    markCollected(index);
    showCheckpointMessage(index);
  }

  function markCollected(index) {
    const li = document.getElementById("progress-item-" + index);
    if (li) li.classList.add("collected");
  }

  function animate(scene, camera, renderer, player, vehicle) {
    const delta = Math.min(state.clock.getDelta(), 0.1);

    if (state.inVehicle) {
      updateVehicleMovement(vehicle, delta);
      // Keep player hidden inside vehicle
      player.root.position.copy(vehicle.root.position);
      player.facing = vehicle.facing;
      updateCamera(camera, vehicle);
    } else {
      updatePlayerMovement(player, delta);
      updateCamera(camera, player);
    }

    updateProximity(player, vehicle);
    updateCheckpointRingAnimation(delta);

    renderer.render(scene, camera);
    requestAnimationFrame(() => animate(scene, camera, renderer, player, vehicle));
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

  function updateVehicleMovement(vehicle, delta) {
    const forward = isKeyDown("KeyW", "ArrowUp");
    const backward = isKeyDown("KeyS", "ArrowDown");
    const left = isKeyDown("KeyA", "ArrowLeft");
    const right = isKeyDown("KeyD", "ArrowRight");

    let throttle = 0;
    if (forward) throttle = -1;
    if (backward) throttle = 1;

    if (throttle !== 0) {
      vehicle.root.position.x += Math.sin(vehicle.facing) * throttle * VEHICLE_MOVE_SPEED * delta;
      vehicle.root.position.z += Math.cos(vehicle.facing) * throttle * VEHICLE_MOVE_SPEED * delta;
      vehicle.root.position.x = clamp(vehicle.root.position.x, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);
      vehicle.root.position.z = clamp(vehicle.root.position.z, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);
    }

    if (left) {
      vehicle.facing -= VEHICLE_TURN_SPEED * delta * (throttle !== 0 ? 1 : 0.4);
    }
    if (right) {
      vehicle.facing += VEHICLE_TURN_SPEED * delta * (throttle !== 0 ? 1 : 0.4);
    }

    vehicle.root.rotation.y = -vehicle.facing;
  }

  function updateCamera(camera, target) {
    const distance = state.inVehicle ? 12 : 8;
    const height = state.inVehicle ? 6 : 4.5;
    const targetPosition = new THREE.Vector3(
      target.root.position.x - Math.sin(target.facing) * distance,
      height,
      target.root.position.z - Math.cos(target.facing) * distance
    );
    camera.position.lerp(targetPosition, 0.08);

    const lookTarget = new THREE.Vector3(
      target.root.position.x,
      1.4,
      target.root.position.z
    );
    camera.lookAt(lookTarget);
  }

  function updateProximity(player, vehicle) {
    // The reference point for proximity is player when on foot, vehicle when driving
    const refPos = state.inVehicle ? vehicle.root.position : player.root.position;

    let newPromptTarget = null;

    if (state.inVehicle) {
      // Always show exit prompt while in vehicle
      newPromptTarget = "vehicle_exit";
    } else {
      // Check vehicle proximity
      const dvx = refPos.x - vehicle.root.position.x;
      const dvz = refPos.z - vehicle.root.position.z;
      if (Math.hypot(dvx, dvz) < VEHICLE_ENTER_RADIUS) {
        newPromptTarget = "vehicle";
      }

      // Check checkpoint proximity (only on foot)
      if (newPromptTarget === null && state.markers) {
        let closestIndex = -1;
        let closestDist = CHECKPOINT_RADIUS;
        state.markers.forEach((marker) => {
          const dx = refPos.x - marker.position.x;
          const dz = refPos.z - marker.position.z;
          const d = Math.hypot(dx, dz);
          if (d < closestDist) {
            closestDist = d;
            closestIndex = marker.index;
          }
        });
        if (closestIndex >= 0) {
          newPromptTarget = closestIndex;
        }
      }
    }

    if (newPromptTarget !== state.promptTarget) {
      state.promptTarget = newPromptTarget;
      updateInteractPrompt(newPromptTarget);

      // Hide speech bubble when leaving a checkpoint area
      if (newPromptTarget === null || newPromptTarget === "vehicle") {
        hideSpeechBubble();
      }
    }
  }

  function updateInteractPrompt(target) {
    const prompt = document.getElementById("interact-prompt");
    const hint = document.getElementById("hud-hint");
    if (!prompt) return;

    if (target === null) {
      prompt.classList.add("hidden");
      if (hint) hint.classList.remove("hidden");
      return;
    }

    if (hint) hint.classList.add("hidden");

    if (target === "vehicle") {
      prompt.textContent = "Press E to enter Batmobile";
    } else if (target === "vehicle_exit") {
      prompt.textContent = "Press E to exit Batmobile";
    } else {
      const cp = state.checkpoints[target];
      const name = cp ? cp.character : "teammate";
      prompt.textContent = "Press E to talk to " + name;
    }
    prompt.classList.remove("hidden");
  }

  function hideInteractPrompt() {
    const prompt = document.getElementById("interact-prompt");
    const hint = document.getElementById("hud-hint");
    if (prompt) prompt.classList.add("hidden");
    if (hint) hint.classList.remove("hidden");
  }

  function showCheckpointMessage(index) {
    const bubble = document.getElementById("speech-bubble");
    if (!bubble) return;
    const checkpoint = state.checkpoints[index];
    if (!checkpoint) return;

    document.getElementById("speech-character").textContent = checkpoint.character || "";
    document.getElementById("speech-city").textContent = checkpoint.city || "";
    document.getElementById("speech-message").textContent = checkpoint.message || "";
    bubble.classList.remove("hidden");
  }

  function hideSpeechBubble() {
    const bubble = document.getElementById("speech-bubble");
    if (bubble) bubble.classList.add("hidden");
  }

  function updateCheckpointRingAnimation(delta) {
    state.ringTime += delta;
    if (!state.markers) return;
    state.markers.forEach((marker) => {
      // Pulse ring emissive intensity
      const ring = marker.group.children[0];
      if (ring && ring.material) {
        const base = state.collectedSet.has(marker.index) ? 1.2 : 0.7;
        ring.material.emissiveIntensity = base + Math.sin(state.ringTime * 2.5 + marker.index) * 0.3;
      }
    });
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
