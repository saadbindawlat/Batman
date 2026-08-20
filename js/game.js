const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const MOVE_SPEED = 260;
const CHECKPOINT_POINTS = [
  { x: 110, y: 580 },
  { x: 245, y: 470 },
  { x: 410, y: 560 },
  { x: 565, y: 430 },
  { x: 725, y: 535 },
  { x: 895, y: 375 },
  { x: 1045, y: 495 },
  { x: 1165, y: 285 }
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

class PresentationScene extends Phaser.Scene {
  constructor() {
    super('presentation-scene');
    this.route = [];
    this.currentIndex = 0;
    this.destinationIndex = 0;
    this.movingToIndex = null;
    this.activeBubble = null;
    this.endOverlay = null;
    this.bubbleCanDismiss = false;
  }

  preload() {
    this.load.json('dialogue', 'data/dialogue.json');
  }

  create() {
    const data = this.cache.json.get('dialogue');
    this.checkpoints = Array.isArray(data?.checkpoints) ? data.checkpoints : [];

    if (this.checkpoints.length < 2) {
      throw new Error('data/dialogue.json must include at least two checkpoints.');
    }

    this.route = CHECKPOINT_POINTS.slice(0, this.checkpoints.length);
    this.visited = new Array(this.checkpoints.length).fill(false);

    this.drawBackdrop();
    this.drawRoute();
    this.createHUD();
    this.createCheckpoints();
    this.createCharacters();
    this.createControls();

    this.showArrivalBanner(this.checkpoints[0].city);
    this.time.delayedCall(350, () => this.openDialogue(0));
  }

  update(_, delta) {
    this.handleKeyboardInput();

    if (this.movingToIndex === null) {
      this.applyIdleFloat(this.player, 0.0018);
      return;
    }

    const target = this.route[this.movingToIndex];
    const vector = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y);
    const distance = vector.length();

    if (distance <= MOVE_SPEED * (delta / 1000)) {
      this.player.setPosition(target.x, target.y);
      this.movingToIndex = null;
      this.currentIndex = this.destinationIndex;
      this.player.baseY = target.y;
      this.showArrivalBanner(this.checkpoints[this.currentIndex].city);
      this.openDialogue(this.currentIndex);
      return;
    }

    vector.normalize().scale(MOVE_SPEED * (delta / 1000));
    this.player.x += vector.x;
    this.player.y += vector.y;
    this.player.baseY = this.player.y;
  }

  drawBackdrop() {
    const background = this.add.graphics();
    const stripes = [0x09111f, 0x0b1630, 0x0d1a3f, 0x111f4d, 0x182555];

    stripes.forEach((color, index) => {
      background.fillStyle(color, 1 - index * 0.04);
      background.fillRect(0, index * 150, GAME_WIDTH, 180);
    });

    background.fillStyle(0xd7dfff, 0.12);
    background.fillCircle(1080, 120, 58);

    for (let i = 0; i < 55; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(30, 240),
        Phaser.Math.Between(1, 2),
        0xf8fbff,
        Phaser.Math.FloatBetween(0.25, 0.95)
      );
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: Math.max(0.15, star.alpha - 0.35) },
        duration: Phaser.Math.Between(1800, 3200),
        yoyo: true,
        repeat: -1
      });
    }

    const skyline = this.add.graphics();
    skyline.fillStyle(0x05070f, 0.95);
    [
      { x: 0, w: 120, h: 170 },
      { x: 90, w: 70, h: 230 },
      { x: 150, w: 120, h: 160 },
      { x: 265, w: 95, h: 260 },
      { x: 350, w: 80, h: 190 },
      { x: 430, w: 140, h: 280 },
      { x: 560, w: 70, h: 210 },
      { x: 635, w: 120, h: 170 },
      { x: 748, w: 120, h: 245 },
      { x: 855, w: 95, h: 180 },
      { x: 940, w: 120, h: 290 },
      { x: 1055, w: 95, h: 220 },
      { x: 1140, w: 140, h: 190 }
    ].forEach((building) => {
      skyline.fillRect(building.x, GAME_HEIGHT - building.h, building.w, building.h);
    });

    const windowDots = this.add.graphics();
    windowDots.fillStyle(0xffef96, 0.55);
    for (let x = 30; x < GAME_WIDTH; x += 58) {
      for (let y = 450; y < GAME_HEIGHT - 20; y += 32) {
        if (Math.random() > 0.45) {
          windowDots.fillRoundedRect(x, y, 10, 14, 2);
        }
      }
    }

    const fog = this.add.graphics();
    fog.fillStyle(0x6472d9, 0.08);
    fog.fillEllipse(420, 620, 540, 120);
    fog.fillEllipse(960, 610, 620, 130);
  }

  drawRoute() {
    const route = this.add.graphics();
    route.lineStyle(14, 0x1b2250, 0.8);
    route.beginPath();
    route.moveTo(this.route[0].x, this.route[0].y);
    this.route.slice(1).forEach((point) => route.lineTo(point.x, point.y));
    route.strokePath();

    const glow = this.add.graphics();
    glow.lineStyle(4, 0x86a4ff, 0.92);
    glow.beginPath();
    glow.moveTo(this.route[0].x, this.route[0].y);
    this.route.slice(1).forEach((point) => glow.lineTo(point.x, point.y));
    glow.strokePath();

    for (let i = 0; i < this.route.length - 1; i += 1) {
      const start = this.route[i];
      const end = this.route[i + 1];
      const length = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
      const steps = Math.floor(length / 32);

      for (let step = 1; step < steps; step += 1) {
        const t = step / steps;
        const x = Phaser.Math.Interpolation.Linear([start.x, end.x], t);
        const y = Phaser.Math.Interpolation.Linear([start.y, end.y], t);
        this.add.circle(x, y, 3, 0xcad3ff, 0.35);
      }
    }
  }

  createHUD() {
    this.arrivalBanner = this.add.container(640, 52);
    const plate = this.add.graphics();
    plate.fillStyle(0x101736, 0.92);
    plate.lineStyle(2, 0x8aa2ff, 0.9);
    plate.fillRoundedRect(-185, -24, 370, 48, 18);
    plate.strokeRoundedRect(-185, -24, 370, 48, 18);
    this.arrivalText = this.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#f8fbff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.arrivalBanner.add([plate, this.arrivalText]);

    this.progressText = this.add.text(26, 28, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffd95c'
    });

    this.helpText = this.add.text(26, 670, 'Move: A / D / W / S / ← / → or click a checkpoint marker', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#dbe4ff'
    });
  }

  createCheckpoints() {
    this.markerNodes = this.route.map((point, index) => {
      const halo = this.add.circle(point.x, point.y, 22, 0x8aa2ff, 0.16);
      const ring = this.add.circle(point.x, point.y, 15, 0x203067, 1).setStrokeStyle(3, 0xa5b8ff, 0.85);
      const dot = this.add.circle(point.x, point.y, 8, index === 0 ? 0xffd95c : 0xeff2ff);
      const marker = this.add.container(0, 0, [halo, ring, dot]);

      const hitArea = this.add.zone(point.x, point.y, 56, 56).setOrigin(0.5).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        if (!this.activeBubble && !this.endOverlay) {
          this.queueMovement(index);
        }
      });

      const cityLabel = this.add.text(point.x, point.y + 34, this.checkpoints[index].city, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#edf2ff',
        align: 'center',
        wordWrap: { width: 150 }
      }).setOrigin(0.5, 0);

      return { halo, ring, dot, marker, cityLabel };
    });
  }

  createCharacters() {
    this.characterSprites = [];

    this.checkpoints.forEach((checkpoint, index) => {
      if (index === 0) {
        this.player = this.buildCharacterAvatar(checkpoint.character, this.route[0].x, this.route[0].y, true);
        this.player.setDepth(12);
        this.characterSprites.push(this.player);
        return;
      }

      const direction = index % 2 === 0 ? 1 : -1;
      const x = this.route[index].x + direction * 56;
      const y = this.route[index].y - 10;
      const avatar = this.buildCharacterAvatar(checkpoint.character, x, y, false);
      avatar.setDepth(8);
      this.characterSprites.push(avatar);

      this.add.text(x, y - 72, checkpoint.character, {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fefefe'
      }).setOrigin(0.5);
    });
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });

    this.input.on('pointerdown', () => {
      if (this.activeBubble && this.bubbleCanDismiss) {
        this.closeDialogue();
      }
    });
  }

  handleKeyboardInput() {
    if (this.endOverlay) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.restartTour();
      }
      return;
    }

    if (this.activeBubble) {
      if (this.bubbleCanDismiss && (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter))) {
        this.closeDialogue();
      }
      return;
    }

    if (this.movingToIndex !== null) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.right) ||
      Phaser.Input.Keyboard.JustDown(this.keys.d) ||
      Phaser.Input.Keyboard.JustDown(this.keys.down) ||
      Phaser.Input.Keyboard.JustDown(this.keys.s)
    ) {
      this.queueMovement(Math.min(this.checkpoints.length - 1, this.currentIndex + 1));
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.left) ||
      Phaser.Input.Keyboard.JustDown(this.keys.a) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w)
    ) {
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

  openDialogue(index) {
    if (this.activeBubble || this.endOverlay) {
      return;
    }

    this.visited[index] = true;
    this.refreshProgress();
    this.highlightCheckpoint(index);

    const checkpoint = this.checkpoints[index];
    const speaker = index === 0 ? this.player : this.characterSprites[index];
    const bubbleWidth = 360;
    const text = `${checkpoint.character}\n${checkpoint.message}`;
    const bodyText = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#1b2033',
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    const hint = this.add.text(0, bodyText.height / 2 + 26, index === this.checkpoints.length - 1 ? 'Press Space, Enter, or click to finish' : 'Press Space, Enter, or click to continue', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#4b5170',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    const bubbleHeight = bodyText.height + 86;
    const background = this.add.graphics();
    background.fillStyle(0xfafcff, 0.98);
    background.lineStyle(4, 0x20253e, 0.92);
    background.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 26);
    background.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 26);
    background.fillTriangle(-18, bubbleHeight / 2 - 2, 18, bubbleHeight / 2 - 2, 0, bubbleHeight / 2 + 24);

    const bubbleX = Phaser.Math.Clamp(speaker.x, 215, GAME_WIDTH - 215);
    const bubbleY = Phaser.Math.Clamp(speaker.y - 136, 116, GAME_HEIGHT - 220);

    this.activeBubble = this.add.container(bubbleX, bubbleY, [background, bodyText, hint]);
    this.activeBubble.setDepth(30);
    this.activeBubble.setAlpha(0);
    this.activeBubble.setScale(0.86);
    this.bubbleCanDismiss = false;

    this.tweens.add({
      targets: this.activeBubble,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.Out'
    });

    this.time.delayedCall(220, () => {
      this.bubbleCanDismiss = true;
    });
  }

  closeDialogue() {
    if (!this.activeBubble) {
      return;
    }

    const bubble = this.activeBubble;
    this.activeBubble = null;
    this.bubbleCanDismiss = false;

    this.tweens.add({
      targets: bubble,
      alpha: 0,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 160,
      onComplete: () => bubble.destroy()
    });

    if (this.currentIndex === this.checkpoints.length - 1) {
      this.time.delayedCall(180, () => this.showEndScreen());
      return;
    }

    if (this.currentIndex !== this.destinationIndex) {
      this.time.delayedCall(120, () => this.beginNextLeg());
    }
  }

  showEndScreen() {
    if (this.endOverlay) {
      return;
    }

    const dim = this.add.rectangle(640, 360, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 0.68);
    const card = this.add.graphics();
    card.fillStyle(0x101736, 0.97);
    card.lineStyle(3, 0x9bb0ff, 0.95);
    card.fillRoundedRect(-240, -150, 480, 300, 26);
    card.strokeRoundedRect(-240, -150, 480, 300, 26);
    const title = this.add.text(0, -82, 'Thank You', {
      fontFamily: 'Arial',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    const body = this.add.text(0, -10, 'You reached Knightfall Keep and completed the presentation tour.\nReplay the route any time for another run-through.', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#dfe7ff',
      align: 'center'
    }).setOrigin(0.5);
    const button = this.add.graphics();
    button.fillStyle(0xffd95c, 1);
    button.fillRoundedRect(-120, 58, 240, 56, 18);
    const buttonText = this.add.text(0, 86, 'Restart Tour', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#1a1f33'
    }).setOrigin(0.5);

    this.endOverlay = this.add.container(640, 360, [dim, card, title, body, button, buttonText]).setDepth(40);
    this.endOverlay.setAlpha(0);
    this.tweens.add({ targets: this.endOverlay, alpha: 1, duration: 220 });

    const restartZone = this.add.zone(640, 446, 240, 56).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartZone.setDepth(41);
    restartZone.once('pointerdown', () => this.restartTour());
    this.endOverlay.restartZone = restartZone;
  }

  restartTour() {
    if (this.endOverlay?.restartZone) {
      this.endOverlay.restartZone.destroy();
    }

    if (this.endOverlay) {
      this.endOverlay.destroy();
      this.endOverlay = null;
    }

    if (this.activeBubble) {
      this.activeBubble.destroy();
      this.activeBubble = null;
    }

    this.currentIndex = 0;
    this.destinationIndex = 0;
    this.movingToIndex = null;
    this.bubbleCanDismiss = false;
    this.visited = new Array(this.checkpoints.length).fill(false);
    this.player.setPosition(this.route[0].x, this.route[0].y);
    this.player.baseY = this.route[0].y;
    this.markerNodes.forEach(({ halo, ring, dot }) => {
      halo.setFillStyle(0x8aa2ff, 0.16);
      ring.setStrokeStyle(3, 0xa5b8ff, 0.85);
      dot.setFillStyle(0xeff2ff, 1);
    });
    this.markerNodes[0].dot.setFillStyle(0xffd95c, 1);
    this.showArrivalBanner(this.checkpoints[0].city);
    this.refreshProgress();
    this.time.delayedCall(250, () => this.openDialogue(0));
  }

  showArrivalBanner(cityName) {
    this.arrivalText.setText(`Now arriving: ${cityName}`);
    this.arrivalBanner.setAlpha(0);
    this.arrivalBanner.y = 40;
    this.tweens.add({
      targets: this.arrivalBanner,
      alpha: 1,
      y: 52,
      duration: 240,
      ease: 'Sine.Out'
    });
  }

  refreshProgress() {
    const visitedCount = this.visited.filter(Boolean).length;
    this.progressText.setText(`Checkpoint ${Math.max(1, this.currentIndex + 1)} / ${this.checkpoints.length}  •  Visited ${visitedCount}`);
  }

  highlightCheckpoint(index) {
    this.markerNodes.forEach(({ halo, ring, dot }, nodeIndex) => {
      if (nodeIndex === index) {
        halo.setFillStyle(0xffd95c, 0.28);
        ring.setStrokeStyle(3, 0xffe995, 1);
        dot.setFillStyle(0xffd95c, 1);
      } else if (this.visited[nodeIndex]) {
        halo.setFillStyle(0x8aa2ff, 0.2);
        ring.setStrokeStyle(3, 0xb4c3ff, 1);
        dot.setFillStyle(0xa8baff, 1);
      } else {
        halo.setFillStyle(0x8aa2ff, 0.16);
        ring.setStrokeStyle(3, 0xa5b8ff, 0.85);
        dot.setFillStyle(0xeff2ff, 1);
      }
    });
  }

  buildCharacterAvatar(name, x, y, isPlayer) {
    const style = CHARACTER_STYLES[name] || CHARACTER_STYLES.Batman;
    const container = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 12, isPlayer ? 48 : 42, 14, 0x000000, 0.28);
    const cape = this.add.triangle(0, 8, -20, 20, 20, 20, 0, -28, style.secondary, 0.92).setScale(isPlayer ? 1.1 : 1);
    const body = this.add.graphics();
    body.fillStyle(style.primary, 1);
    body.fillRoundedRect(isPlayer ? -17 : -15, isPlayer ? -28 : -24, isPlayer ? 34 : 30, isPlayer ? 52 : 46, 10);
    const belt = this.add.rectangle(0, 9, isPlayer ? 30 : 26, 7, style.accent, 1);
    const head = this.add.circle(0, -40, isPlayer ? 18 : 16, style.skin, 1);
    const mask = this.add.graphics();
    mask.fillStyle(style.primary, 1);
    mask.fillEllipse(0, -44, isPlayer ? 40 : 36, isPlayer ? 30 : 28);

    if (name === 'Batman' || name === 'Catwoman' || name === 'Arkham Knight') {
      const ears = this.add.graphics();
      ears.fillStyle(style.primary, 1);
      ears.fillTriangle(-14, -56, -6, -82, 0, -54);
      ears.fillTriangle(14, -56, 6, -82, 0, -54);
      container.add(ears);
    }

    if (name === 'Joker') {
      const hair = this.add.graphics();
      hair.fillStyle(style.secondary, 1);
      hair.fillEllipse(0, -56, 40, 20);
      hair.fillTriangle(-18, -54, -2, -70, 10, -52);
      hair.fillTriangle(18, -54, 2, -70, -10, -52);
      container.add(hair);
    }

    if (name === 'Harley Quinn') {
      const leftPigtail = this.add.circle(-22, -46, 7, style.secondary, 1);
      const rightPigtail = this.add.circle(22, -46, 7, style.primary, 1);
      const collar = this.add.triangle(0, -16, -14, 0, 14, 0, 0, 16, 0xf0f1f5, 1);
      container.add([leftPigtail, rightPigtail, collar]);
    }

    if (name === 'Bane') {
      const tubes = this.add.graphics();
      tubes.lineStyle(3, style.accent, 1);
      tubes.beginPath();
      tubes.moveTo(-10, -44);
      tubes.lineTo(-20, -58);
      tubes.moveTo(10, -44);
      tubes.lineTo(20, -58);
      tubes.strokePath();
      container.add(tubes);
    }

    if (name === 'Scarecrow') {
      const hood = this.add.graphics();
      hood.fillStyle(style.primary, 1);
      hood.fillEllipse(0, -46, 42, 34);
      hood.fillTriangle(-20, -48, 0, -74, 20, -48);
      container.add(hood);
    }

    if (name === 'Robin') {
      const capeTail = this.add.triangle(0, 12, -18, 16, 18, 16, 0, 42, style.accent, 0.95);
      container.add(capeTail);
    }

    const eyes = this.add.graphics();
    eyes.fillStyle(name === 'Joker' ? 0x272b42 : 0xf7fbff, 1);
    eyes.fillEllipse(-6, -42, 5, 4);
    eyes.fillEllipse(6, -42, 5, 4);
    const mouth = this.add.graphics();
    mouth.lineStyle(2, name === 'Joker' ? 0xbf3f45 : 0x2a3045, 1);
    mouth.beginPath();
    mouth.arc(0, -34, 6, 0, Math.PI, false);
    mouth.strokePath();

    if (name === 'Bane' || name === 'Arkham Knight') {
      const visor = this.add.graphics();
      visor.lineStyle(3, style.accent, 1);
      visor.beginPath();
      visor.moveTo(-11, -45);
      visor.lineTo(0, -39);
      visor.lineTo(11, -45);
      visor.strokePath();
      container.add(visor);
    }

    if (name === 'Catwoman') {
      const goggles = this.add.graphics();
      goggles.lineStyle(2, style.accent, 1);
      goggles.strokeEllipse(-6, -43, 8, 7);
      goggles.strokeEllipse(6, -43, 8, 7);
      container.add(goggles);
    }

    const emblem = this.add.text(0, -2, this.getEmblem(name), {
      fontFamily: 'Arial',
      fontSize: isPlayer ? '18px' : '16px',
      fontStyle: 'bold',
      color: '#f7f8ff'
    }).setOrigin(0.5);

    container.add([shadow, cape, body, belt, head, mask, eyes, mouth, emblem]);
    if (isPlayer) {
      const playerTag = this.add.text(0, -84, 'YOU', {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffd95c',
        backgroundColor: '#0f1534',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5);
      container.add(playerTag);
    }
    container.baseY = y;
    return container;
  }

  getEmblem(name) {
    switch (name) {
      case 'Batman':
        return '🦇';
      case 'Bane':
        return '✦';
      case 'Joker':
        return '♦';
      case 'Harley Quinn':
        return '♥';
      case 'Scarecrow':
        return '✕';
      case 'Robin':
        return 'R';
      case 'Catwoman':
        return '⌒';
      case 'Arkham Knight':
        return '▲';
      default:
        return '•';
    }
  }

  applyIdleFloat(target, speed) {
    target.y = target.baseY + Math.sin(this.time.now * speed) * 2;
  }
}

window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#060814',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PresentationScene]
  };

  new Phaser.Game(config);
});
