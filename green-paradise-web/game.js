(function () {
  const GAME_VERSION = "0.1.2";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const STORAGE_KEY = "greenParadiseSaveV1";
  const GRAVITY = 0.52;
  const FLOOR_Y = 430;
  const WORLD_HEIGHT = 540;
  const TREE_WIDTH = 84;

  const screens = {
    title: document.getElementById("titleScreen"),
    stageSelect: document.getElementById("stageSelectScreen"),
    shop: document.getElementById("shopScreen"),
    clear: document.getElementById("clearScreen"),
    gameOver: document.getElementById("gameOverScreen"),
    ending: document.getElementById("endingScreen"),
  };

  const ui = {
    message: document.getElementById("messageBox"),
    points: document.getElementById("pointsValue"),
    pointsMenu: document.getElementById("pointsValueMenu"),
    highestStage: document.getElementById("highestStageValue"),
    highestStageMenu: document.getElementById("highestStageValueMenu"),
    energy: document.getElementById("energyValue"),
    energyMenu: document.getElementById("energyValueMenu"),
    clearSummary: document.getElementById("clearSummary"),
    gameOverSummary: document.getElementById("gameOverSummary"),
    endingText: document.getElementById("endingText"),
    dailyButton: document.getElementById("dailyBonusButton"),
    adButton: document.getElementById("adBonusButton"),
    tapButton: document.getElementById("bonusTapButton"),
    stageMap: document.getElementById("stageMap"),
    shopItems: document.getElementById("shopItems"),
    unlockItems: document.getElementById("unlockItems"),
    menuToggleButton: document.getElementById("menuToggleButton"),
    menuCloseButton: document.getElementById("menuCloseButton"),
    sideMenu: document.getElementById("sideMenu"),
    menuBackdrop: document.getElementById("menuBackdrop"),
    leafTouchButton: document.getElementById("leafTouchButton"),
    rotateHint: document.getElementById("rotateHint"),
    gameVersion: document.getElementById("gameVersion"),
  };

  const input = {
    left: false,
    right: false,
    jumpPressed: false,
    divePressed: false,
    shootPressed: false,
  };

  const worldState = {
    screen: "title",
    currentStage: null,
    game: null,
    cameraX: 0,
    rewardTapReadyAt: 0,
    audioReady: false,
    endingPulse: 0,
  };

  const save = loadSave();
  const audio = createAudioSystem();
  const stages = createStages();
  const stageMapLayout = [
    { x: 120, y: 240 },
    { x: 320, y: 150 },
    { x: 560, y: 250 },
    { x: 810, y: 130 },
    { x: 1040, y: 240 },
  ];
  const upgrades = [
    {
      id: "jump",
      label: "ジャンプ力アップ",
      description: "少し高くジャンプできる",
      baseCost: 90,
      maxLevel: 4,
    },
    {
      id: "speed",
      label: "スピードアップ",
      description: "右に進む速さが上がる",
      baseCost: 80,
      maxLevel: 4,
    },
    {
      id: "energy",
      label: "エネルギーアップ",
      description: "ダメージに強くなる",
      baseCost: 110,
      maxLevel: 4,
    },
    {
      id: "dropRate",
      label: "アイテムドロップりつアップ",
      description: "葉っぱアイテムが出やすくなる",
      baseCost: 120,
      maxLevel: 4,
    },
    {
      id: "damage",
      label: "ダメージアップ",
      description: "急降下と葉っぱの威力が上がる",
      baseCost: 140,
      maxLevel: 4,
    },
  ];

  function loadSave() {
    const fallback = {
      points: 0,
      highestCleared: 0,
      unlockedStages: 1,
      upgrades: { jump: 0, speed: 0, energy: 0, dropRate: 0, damage: 0 },
      lastDailyBonus: "",
      endingSeen: false,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        upgrades: { ...fallback.upgrades, ...(parsed.upgrades || {}) },
      };
    } catch (error) {
      return fallback;
    }
  }

  function persistSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    renderMeta();
  }

  function createStages() {
    return [
      {
        id: 1,
        name: "ステージ1 チュートリアル",
        unlockCost: 0,
        clearBonus: 80,
        length: 2150,
        goalX: 1940,
        tutorial: [
          { x: 120, text: "→ で右へ進もう" },
          { x: 420, text: "Space でジャンプしよう" },
          { x: 720, text: "空中で ↓ を押すと急降下" },
          { x: 1120, text: "急降下で敵の上をふむと倒せる" },
        ],
        platforms: [
          { x: 0, y: FLOOR_Y, width: 520, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 640, y: FLOOR_Y, width: 620, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1360, y: FLOOR_Y, width: 770, height: WORLD_HEIGHT - FLOOR_Y },
        ],
        enemies: [{ type: "smogling", x: 960, y: FLOOR_Y - 26, patrol: 100 }],
      },
      {
        id: 2,
        name: "ステージ2 くもる谷",
        unlockCost: 120,
        clearBonus: 140,
        length: 2550,
        goalX: 2320,
        tutorial: [],
        platforms: [
          { x: 0, y: FLOOR_Y, width: 440, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 560, y: FLOOR_Y, width: 440, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1080, y: 388, width: 220, height: WORLD_HEIGHT - 388 },
          { x: 1420, y: FLOOR_Y, width: 420, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1930, y: FLOOR_Y, width: 650, height: WORLD_HEIGHT - FLOOR_Y },
        ],
        enemies: [
          { type: "smogling", x: 720, y: FLOOR_Y - 26, patrol: 120 },
          { type: "scrubber", x: 1520, y: FLOOR_Y - 36, patrol: 150 },
          { type: "smogling", x: 2060, y: FLOOR_Y - 26, patrol: 90 },
        ],
      },
      {
        id: 3,
        name: "ステージ3 さびた工場",
        unlockCost: 180,
        clearBonus: 220,
        length: 2920,
        goalX: 2680,
        tutorial: [],
        platforms: [
          { x: 0, y: FLOOR_Y, width: 350, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 440, y: 392, width: 220, height: WORLD_HEIGHT - 392 },
          { x: 760, y: FLOOR_Y, width: 380, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1250, y: 360, width: 190, height: WORLD_HEIGHT - 360 },
          { x: 1540, y: FLOOR_Y, width: 400, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 2060, y: 370, width: 180, height: WORLD_HEIGHT - 370 },
          { x: 2360, y: FLOOR_Y, width: 560, height: WORLD_HEIGHT - FLOOR_Y },
        ],
        enemies: [
          { type: "drone", x: 560, y: 260, patrol: 120 },
          { type: "scrubber", x: 930, y: FLOOR_Y - 36, patrol: 140 },
          { type: "smogling", x: 1680, y: FLOOR_Y - 26, patrol: 120 },
          { type: "drone", x: 2150, y: 250, patrol: 110 },
        ],
      },
      {
        id: 4,
        name: "ステージ4 どくぬま回廊",
        unlockCost: 260,
        clearBonus: 320,
        length: 3350,
        goalX: 3070,
        tutorial: [],
        platforms: [
          { x: 0, y: FLOOR_Y, width: 320, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 420, y: 395, width: 180, height: WORLD_HEIGHT - 395 },
          { x: 690, y: FLOOR_Y, width: 260, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1040, y: 360, width: 200, height: WORLD_HEIGHT - 360 },
          { x: 1350, y: FLOOR_Y, width: 280, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1710, y: 380, width: 180, height: WORLD_HEIGHT - 380 },
          { x: 1980, y: FLOOR_Y, width: 260, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 2350, y: 340, width: 220, height: WORLD_HEIGHT - 340 },
          { x: 2680, y: FLOOR_Y, width: 700, height: WORLD_HEIGHT - FLOOR_Y },
        ],
        enemies: [
          { type: "scrubber", x: 770, y: FLOOR_Y - 36, patrol: 120 },
          { type: "drone", x: 1140, y: 220, patrol: 120 },
          { type: "thornbeast", x: 1460, y: FLOOR_Y - 44, patrol: 90 },
          { type: "smogling", x: 2100, y: FLOOR_Y - 26, patrol: 100 },
          { type: "drone", x: 2480, y: 220, patrol: 150 },
        ],
      },
      {
        id: 5,
        name: "ステージ5 ボスの樹海跡",
        unlockCost: 360,
        clearBonus: 500,
        length: 3740,
        goalX: 3490,
        tutorial: [],
        platforms: [
          { x: 0, y: FLOOR_Y, width: 360, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 470, y: FLOOR_Y, width: 420, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1030, y: 370, width: 210, height: WORLD_HEIGHT - 370 },
          { x: 1360, y: FLOOR_Y, width: 360, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 1870, y: 360, width: 220, height: WORLD_HEIGHT - 360 },
          { x: 2210, y: FLOOR_Y, width: 420, height: WORLD_HEIGHT - FLOOR_Y },
          { x: 2790, y: FLOOR_Y, width: 950, height: WORLD_HEIGHT - FLOOR_Y },
        ],
        enemies: [
          { type: "drone", x: 1200, y: 220, patrol: 150 },
          { type: "thornbeast", x: 1530, y: FLOOR_Y - 44, patrol: 100 },
          { type: "scrubber", x: 2350, y: FLOOR_Y - 36, patrol: 120 },
          { type: "boss", x: 3170, y: FLOOR_Y - 96, patrol: 160, hp: 4 },
        ],
      },
    ];
  }

  function enemyTemplate(type) {
    const base = {
      smogling: { width: 44, height: 26, points: 25, speed: 1.2, color: "#483b3b" },
      scrubber: { width: 56, height: 36, points: 45, speed: 0.95, color: "#6a4f42" },
      drone: { width: 48, height: 28, points: 55, speed: 1.5, color: "#4a5774", flying: true },
      thornbeast: { width: 64, height: 44, points: 70, speed: 1.05, color: "#7e4736" },
      boss: { width: 116, height: 96, points: 220, speed: 1.25, color: "#552b2b", boss: true },
    };
    return base[type];
  }

  function stageById(id) {
    return stages.find((stage) => stage.id === id);
  }

  function getDropChance() {
    return Math.min(0.3, 0.1 + save.upgrades.dropRate * 0.03);
  }

  function getStompDamage() {
    return 2 + save.upgrades.damage;
  }

  function getLeafDamage() {
    return 1 + Math.floor(save.upgrades.damage / 2);
  }

  function createGame(stage) {
    const maxEnergy = 3 + save.upgrades.energy;
    const player = {
      x: 80,
      y: FLOOR_Y - 54,
      width: 38,
      height: 54,
      vx: 0,
      vy: 0,
      speed: 2.8 + save.upgrades.speed * 0.38,
      jumpStrength: 10.8 + save.upgrades.jump * 0.85,
      onGround: false,
      diving: false,
      facing: 1,
      energy: maxEnergy,
      maxEnergy,
      invulnerableUntil: 0,
      walkingTick: 0,
    };
    const enemies = stage.enemies.map((enemy, index) => {
      const template = enemyTemplate(enemy.type);
      const baseHp = enemy.hp || 1;
      return {
        id: `${enemy.type}-${index}`,
        ...template,
        x: enemy.x,
        y: enemy.y,
        baseX: enemy.x,
        baseY: enemy.y,
        direction: -1,
        patrol: enemy.patrol,
        hp: baseHp * 2,
        maxHp: baseHp * 2,
        alive: true,
        phase: index * 22,
      };
    });
    return {
      stage,
      player,
      enemies,
      drops: [],
      leafUnlocked: false,
      projectiles: [],
      effects: [],
      grownPatches: new Set(),
      score: 0,
      messageIndex: 0,
      startedAt: performance.now(),
      bossCleared: false,
    };
  }

  function renderMeta() {
    ui.points.textContent = String(save.points);
    ui.pointsMenu.textContent = String(save.points);
    ui.highestStage.textContent = String(Math.max(1, save.unlockedStages));
    ui.highestStageMenu.textContent = String(Math.max(1, save.unlockedStages));
    ui.energy.textContent = String(3 + save.upgrades.energy);
    ui.energyMenu.textContent = String(3 + save.upgrades.energy);
    syncLeafTouchButton(!!worldState.game && worldState.game.leafUnlocked);
    renderStageMap();
    renderShop();
  }

  function showMessage(text) {
    ui.message.textContent = text;
  }

  function renderStageMap() {
    ui.stageMap.innerHTML = "";

    for (let index = 0; index < stageMapLayout.length - 1; index += 1) {
      const from = stageMapLayout[index];
      const to = stageMapLayout[index + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const path = document.createElement("div");
      path.className = "stage-path";
      path.style.left = `${from.x}px`;
      path.style.top = `${from.y}px`;
      path.style.width = `${Math.sqrt(dx * dx + dy * dy)}px`;
      path.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      ui.stageMap.append(path);
    }

    stages.forEach((stage) => {
      const unlocked = stage.id <= save.unlockedStages;
      const node = document.createElement("div");
      node.className = "stage-node";
      const position = stageMapLayout[stage.id - 1] || {
        x: 120 + (stage.id - 1) * 230,
        y: stage.id % 2 === 0 ? 150 : 240,
      };
      node.style.left = `${position.x}px`;
      node.style.top = `${position.y}px`;

      const button = document.createElement("button");
      button.className = `stage-node-button${unlocked ? "" : " locked"}`;
      button.disabled = !unlocked;
      const bodyText =
        stage.id === 1
          ? "移動、ジャンプ、急降下、敵の倒し方を学ぼう。"
          : `クリア報酬 ${stage.clearBonus} ポイント`;
      button.innerHTML = `
        <span class="stage-node-number">${stage.id}</span>
        <span class="stage-node-title">${stage.name}</span>
        <span class="stage-node-text">${unlocked ? bodyText : `未解放 ${stage.unlockCost}pt`}</span>
      `;
      button.addEventListener("click", () => startStage(stage.id));
      node.append(button);
      ui.stageMap.append(node);
    });
  }

  function renderShop() {
    ui.shopItems.innerHTML = "";
    upgrades.forEach((upgrade) => {
      const level = save.upgrades[upgrade.id];
      const cost = upgrade.baseCost + level * 60;
      const card = document.createElement("div");
      card.className = "shop-card";
      const title = document.createElement("h3");
      title.textContent = `${upgrade.label} Lv.${level}`;
      const body = document.createElement("p");
      body.textContent = `${upgrade.description} / 価格 ${cost}pt`;
      const button = document.createElement("button");
      button.className = "menu-button";
      button.disabled = level >= upgrade.maxLevel || save.points < cost;
      button.textContent = level >= upgrade.maxLevel ? "最大レベル" : `買う (${cost}pt)`;
      button.addEventListener("click", () => {
        if (save.points < cost || level >= upgrade.maxLevel) {
          return;
        }
        save.points -= cost;
        save.upgrades[upgrade.id] += 1;
        persistSave();
        audio.sfx("purchase");
        showMessage(`${upgrade.label} を買ったよ。`);
      });
      card.append(title, body, button);
      ui.shopItems.append(card);
    });

    ui.unlockItems.innerHTML = "";
    stages
      .filter((stage) => stage.id > 1)
      .forEach((stage) => {
        const card = document.createElement("div");
        card.className = "shop-card";
        const title = document.createElement("h3");
        title.textContent = `${stage.name} を解放`;
        const body = document.createElement("p");
        body.textContent = `価格 ${stage.unlockCost}pt`;
        const button = document.createElement("button");
        button.className = "menu-button";
        const alreadyUnlocked = stage.id <= save.unlockedStages;
        button.disabled = alreadyUnlocked || save.points < stage.unlockCost || stage.id !== save.unlockedStages + 1;
        button.textContent = alreadyUnlocked ? "解放ずみ" : `解放する (${stage.unlockCost}pt)`;
        button.addEventListener("click", () => {
          if (alreadyUnlocked || save.points < stage.unlockCost || stage.id !== save.unlockedStages + 1) {
            return;
          }
          save.points -= stage.unlockCost;
          save.unlockedStages = stage.id;
          persistSave();
          audio.sfx("purchase");
          showMessage(`${stage.name} が遊べるようになったよ。`);
        });
        card.append(title, body, button);
        ui.unlockItems.append(card);
      });
  }

  function startStage(stageId) {
    const stage = stageById(stageId);
    if (!stage || stage.id > save.unlockedStages) {
      return;
    }
    ensureAudio();
    worldState.game = createGame(stage);
    worldState.currentStage = stageId;
    worldState.cameraX = 0;
    clearOverlays();
    closeMenu();
    syncLeafTouchButton(false);
    showMessage(stage.id === 1 ? "まずは右へ進もう。" : `${stage.name} スタート。大きな木まで進もう。`);
    audio.bgm("stage");
  }

  function syncLeafTouchButton(visible) {
    ui.leafTouchButton.classList.toggle("hidden-touch", !visible);
  }

  async function enterMobilePlayMode() {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      return;
    }

    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (error) {
      return;
    }
  }

  function syncRotateHint() {
    const portraitMobile = window.innerHeight > window.innerWidth && window.innerWidth <= 900;
    ui.rotateHint.classList.toggle("show", portraitMobile);
  }

  function openMenu() {
    ui.sideMenu.classList.add("open");
    ui.menuBackdrop.classList.add("open");
  }

  function closeMenu() {
    ui.sideMenu.classList.remove("open");
    ui.menuBackdrop.classList.remove("open");
  }

  function ensureAudio() {
    if (worldState.audioReady) {
      return;
    }
    audio.init();
    worldState.audioReady = true;
  }

  function clearOverlays() {
    worldState.screen = "game";
    Object.values(screens).forEach((element) => element.classList.remove("active"));
  }

  function setScreen(name) {
    worldState.screen = name;
    Object.entries(screens).forEach(([key, element]) => {
      element.classList.toggle("active", key === name);
    });
    if (name === "title") {
      audio.bgm("title");
    } else if (name === "shop") {
      audio.bgm("shop");
    } else if (name === "ending") {
      audio.bgm("ending");
    } else if (name === "clear") {
      audio.bgm("clear");
    } else if (name === "gameOver") {
      audio.bgm("gameOver");
    } else if (name === "stageSelect") {
      audio.bgm("title");
    }
  }

  function update(dt) {
    if (!worldState.game) {
      worldState.endingPulse += dt * 0.001;
      return;
    }
    const game = worldState.game;
    const player = game.player;
    const stage = game.stage;
    const now = performance.now();

    if (input.left && !input.right) {
      player.vx = -player.speed;
      player.facing = -1;
      player.walkingTick += dt;
      if (player.onGround && player.walkingTick > 220) {
        player.walkingTick = 0;
        audio.sfx("step");
      }
    } else if (input.right && !input.left) {
      player.vx = player.speed;
      player.facing = 1;
      player.walkingTick += dt;
      if (player.onGround && player.walkingTick > 220) {
        player.walkingTick = 0;
        audio.sfx("step");
      }
    } else {
      player.vx *= 0.74;
      player.walkingTick = 0;
    }

    if (input.jumpPressed) {
      if (player.onGround) {
        player.vy = -player.jumpStrength;
        player.onGround = false;
        player.diving = false;
        audio.sfx("jump");
      }
      input.jumpPressed = false;
    }

    if (input.shootPressed) {
      shootLeaf(game);
      input.shootPressed = false;
    }

    if (input.divePressed) {
      if (!player.onGround) {
        player.vy = Math.max(player.vy, 8.5);
        player.diving = true;
      }
      input.divePressed = false;
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.x = Math.max(0, Math.min(stage.length - player.width, player.x));
    player.y += player.vy;

    let standingOn = null;
    const wasOnGround = player.onGround;
    const wasDiving = player.diving;
    player.onGround = false;
    for (const platform of stage.platforms) {
      if (
        player.x + player.width > platform.x &&
        player.x < platform.x + platform.width &&
        player.y + player.height >= platform.y &&
        player.y + player.height <= platform.y + 28 &&
        player.vy >= 0
      ) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
        player.diving = false;
        standingOn = platform;
        if (!wasOnGround) {
          audio.sfx("land");
          if (wasDiving) {
            bloomDiveGrass(game, player, platform);
          }
        }
        break;
      }
    }

    if (!standingOn && player.y > WORLD_HEIGHT + 40) {
      finishStage(false, "穴に落ちてしまった。");
      return;
    }

    growGrass(game, standingOn);
    updateTutorial(game);
    updateDrops(game, dt);
    updateProjectiles(game, dt);
    updateEnemies(game);
    updateEffects(game, dt);
    updateCamera(player, stage);

    const bossAlive = game.enemies.some((enemy) => enemy.boss && enemy.alive);
    if (!bossAlive) {
      game.bossCleared = true;
    }

    if (player.x + player.width >= stage.goalX && player.y + player.height >= FLOOR_Y - 4) {
      if (stage.id === 5 && !game.bossCleared) {
        showMessage("ボスを倒してから大きな木へ向かおう。");
      } else {
        finishStage(true);
      }
    }
  }

  function growGrass(game, standingOn) {
    if (!standingOn) {
      return;
    }
    const player = game.player;
    const patchSize = 20;
    const patchStart = Math.floor(player.x / patchSize) * patchSize;
    const key = `${patchStart}:${standingOn.y}`;
    if (!game.grownPatches.has(key)) {
      game.grownPatches.add(key);
      if (game.grownPatches.size % 3 === 0) {
        audio.sfx("grass");
      }
      save.points += 1;
      persistSave();
    }
  }

  function bloomDiveGrass(game, player, platform) {
    const patchSize = 20;
    const centerPatch = Math.floor((player.x + player.width * 0.5) / patchSize) * patchSize;
    let grownCount = 0;
    for (let offset = -3; offset <= 3; offset += 1) {
      const patchX = centerPatch + offset * patchSize;
      if (patchX < platform.x || patchX >= platform.x + platform.width) {
        continue;
      }
      const key = `${patchX}:${platform.y}`;
      if (!game.grownPatches.has(key)) {
        game.grownPatches.add(key);
        grownCount += 1;
      }
    }
    if (grownCount > 0) {
      save.points += grownCount;
      persistSave();
      audio.sfx("grass");
      showMessage(`急降下で着地。草がいっきに広がった。+${grownCount}pt`);
    }
  }

  function shootLeaf(game) {
    if (!game.leafUnlocked) {
      showMessage("敵が落とした葉っぱアイテムを拾うと、このステージ中だけ E で発射できるよ。");
      return;
    }
    if (save.points < 1) {
      showMessage("ポイントが 1 あると葉っぱを発射できるよ。");
      return;
    }

    const player = game.player;
    const direction = player.facing || 1;
    save.points -= 1;
    persistSave();
    game.projectiles.push({
      x: player.x + (direction > 0 ? player.width + 6 : -20),
      y: player.y + 22,
      width: 18,
      height: 12,
      vx: direction * 7.2,
      life: 90,
    });
    audio.sfx("grass");
    showMessage("葉っぱを発射した。-1pt");
  }

  function updateDrops(game, dt) {
    const step = dt / 16;
    const player = game.player;
    game.drops = game.drops.filter((drop) => {
      drop.y += Math.sin((performance.now() + drop.phase) / 180) * 0.2 * step;
      if (intersects(player, drop)) {
        game.leafUnlocked = true;
        syncLeafTouchButton(true);
        spawnPickupEffect(game, drop);
        audio.sfx("purchase");
        showMessage("葉っぱアイテムを拾った。このステージ中だけ E で発射できる。");
        return false;
      }
      return true;
    });
  }

  function updateProjectiles(game, dt) {
    const step = dt / 16;
    game.projectiles = game.projectiles.filter((projectile) => {
      projectile.x += projectile.vx * step;
      projectile.life -= step;

      const enemy = game.enemies.find((candidate) => candidate.alive && intersects(projectile, candidate));
      if (enemy) {
        hitEnemyWithLeaf(game, enemy);
        return false;
      }

      return projectile.life > 0 && projectile.x > -40 && projectile.x < game.stage.length + 40;
    });
  }

  function updateTutorial(game) {
    const tutorial = game.stage.tutorial;
    if (!tutorial.length) {
      return;
    }
    const next = tutorial[game.messageIndex];
    if (next && game.player.x >= next.x) {
      showMessage(next.text);
      game.messageIndex += 1;
    }
  }

  function updateEnemies(game) {
    const player = game.player;
    const now = performance.now();
    for (const enemy of game.enemies) {
      if (!enemy.alive) {
        continue;
      }

      if (enemy.flying) {
        enemy.x += enemy.speed * enemy.direction;
        enemy.y = enemy.baseY + Math.sin((now + enemy.phase * 10) / 280) * 34;
      } else {
        enemy.x += enemy.speed * enemy.direction;
      }

      if (Math.abs(enemy.x - enemy.baseX) > enemy.patrol) {
        enemy.direction *= -1;
      }

      if (!enemy.flying) {
        const support = game.stage.platforms.find(
          (platform) =>
            enemy.x + enemy.width > platform.x &&
            enemy.x < platform.x + platform.width &&
            enemy.y + enemy.height >= platform.y - 6 &&
            enemy.y + enemy.height <= platform.y + 24,
        );
        if (support) {
          enemy.y = support.y - enemy.height;
        }
      }

      if (intersects(player, enemy)) {
        const stomped = player.vy > 1 && player.y + player.height - enemy.y < 24;
        if (player.diving && stomped) {
          hitEnemy(game, enemy);
          player.vy = -5.8;
          player.diving = false;
        } else if (now > player.invulnerableUntil) {
          player.energy -= 1;
          player.invulnerableUntil = now + 1200;
          player.vx = -4;
          player.vy = -4.2;
          showMessage("通常ジャンプでは敵にぶつかるとダメージ。急降下で上からたおそう。");
          if (player.energy <= 0) {
            finishStage(false, "エネルギーがなくなってしまった。");
            return;
          }
        }
      }
    }
  }

  function hitEnemy(game, enemy) {
    enemy.hp -= getStompDamage();
    audio.sfx("enemy");
    spawnStompEffect(game, enemy);
    if (enemy.hp <= 0) {
      defeatEnemy(game, enemy, enemy.boss ? "ボスをたおした。大きな木まで進もう。" : `敵をたおした。+${enemy.points}pt`);
    } else if (enemy.boss) {
      showMessage(`ボスにダメージ。あと ${Math.ceil(enemy.hp / getStompDamage())} 回。`);
    }
  }

  function spawnStompEffect(game, enemy) {
    const centerX = enemy.x + enemy.width * 0.5;
    const centerY = enemy.y + enemy.height * 0.4;
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      const speed = 1.6 + (index % 4) * 0.7;
      game.effects.push({
        kind: index % 3 === 0 ? "flash" : "leaf",
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        life: 34 + (index % 3) * 6,
        maxLife: 34 + (index % 3) * 6,
        size: index % 3 === 0 ? 14 : 8 + (index % 2) * 3,
      });
    }
  }

  function hitEnemyWithLeaf(game, enemy) {
    enemy.hp -= getLeafDamage();
    spawnStompEffect(game, enemy);
    spawnDefeatEffect(game, enemy);
    audio.sfx("grass");
    if (enemy.hp <= 0) {
      defeatEnemy(
        game,
        enemy,
        enemy.boss ? "葉っぱでボスをたおした。" : `葉っぱで敵をたおした。+${enemy.points}pt`,
      );
    } else if (enemy.boss) {
      showMessage(`葉っぱがボスに当たった。あと ${Math.ceil(enemy.hp / getLeafDamage())} 回。`);
    } else {
      showMessage("葉っぱが敵に当たった。");
    }
  }

  function defeatEnemy(game, enemy, message) {
    enemy.alive = false;
    growGrassAroundEnemy(game, enemy);
    spawnDefeatEffect(game, enemy);
    maybeDropLeafItem(game, enemy);
    game.score += enemy.points;
    save.points += enemy.points;
    persistSave();
    showMessage(message);
  }

  function maybeDropLeafItem(game, enemy) {
    if (Math.random() > getDropChance()) {
      return;
    }
    const drop = {
      kind: "leafUnlock",
      x: enemy.x + enemy.width * 0.5 - 12,
      y: enemy.y + enemy.height * 0.5 - 12,
      width: 24,
      height: 24,
      phase: Math.random() * 1000,
    };
    game.drops.push(drop);
    spawnDropEffect(game, drop);
    showMessage("葉っぱアイテムが落ちた。近づいて拾おう。");
  }

  function spawnPickupEffect(game, drop) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      game.effects.push({
        kind: "leaf",
        x: drop.x + drop.width * 0.5,
        y: drop.y + drop.height * 0.5,
        vx: Math.cos(angle) * 2.1,
        vy: Math.sin(angle) * 2.1 - 1,
        life: 24,
        maxLife: 24,
        size: 9,
      });
    }
  }

  function spawnDropEffect(game, drop) {
    const centerX = drop.x + drop.width * 0.5;
    const centerY = drop.y + drop.height * 0.5;
    game.effects.push({
      kind: "dropGlow",
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      life: 28,
      maxLife: 28,
      size: 28,
    });
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      game.effects.push({
        kind: "spark",
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 1.8,
        vy: Math.sin(angle) * 1.8 - 0.4,
        life: 20,
        maxLife: 20,
        size: 6,
      });
    }
  }

  function growGrassAroundEnemy(game, enemy) {
    const patchSize = 20;
    const centerX = Math.floor((enemy.x + enemy.width * 0.5) / patchSize) * patchSize;
    let grownCount = 0;

    game.stage.platforms.forEach((platform) => {
      const enemyBottom = enemy.y + enemy.height;
      const onSameGround = enemyBottom >= platform.y - 18 && enemyBottom <= platform.y + 40;
      const nearPlatform =
        centerX >= platform.x - patchSize * 2 && centerX <= platform.x + platform.width + patchSize * 2;

      if (!onSameGround || !nearPlatform) {
        return;
      }

      for (let offset = -2; offset <= 2; offset += 1) {
        const patchX = centerX + offset * patchSize;
        if (patchX < platform.x || patchX >= platform.x + platform.width) {
          continue;
        }
        const key = `${patchX}:${platform.y}`;
        if (!game.grownPatches.has(key)) {
          game.grownPatches.add(key);
          grownCount += 1;
        }
      }
    });

    if (grownCount > 0) {
      save.points += grownCount;
      persistSave();
      audio.sfx("grass");
    }
  }

  function spawnDefeatEffect(game, enemy) {
    const centerX = enemy.x + enemy.width * 0.5;
    const centerY = enemy.y + enemy.height * 0.4;
    game.effects.push({
      kind: "burst",
      x: centerX,
      y: centerY,
      vx: 0,
      vy: -0.2,
      life: 20,
      maxLife: 20,
      size: enemy.boss ? 48 : 30,
    });
    game.effects.push({
      kind: "score",
      x: centerX,
      y: enemy.y - 8,
      vx: 0,
      vy: -1.2,
      life: 34,
      maxLife: 34,
      size: enemy.boss ? 24 : 18,
      text: `+${enemy.points}`,
    });
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      const speed = enemy.boss ? 3.8 : 2.8;
      game.effects.push({
        kind: "spark",
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        life: 24 + (index % 3) * 4,
        maxLife: 24 + (index % 3) * 4,
        size: enemy.boss ? 10 : 7,
      });
    }
  }

  function updateEffects(game, dt) {
    const step = dt / 16;
    game.effects = game.effects.filter((effect) => {
      effect.x += effect.vx * step;
      effect.y += effect.vy * step;
      effect.vy += (effect.kind === "score" ? 0.02 : 0.16) * step;
      effect.life -= step;
      return effect.life > 0;
    });
  }

  function finishStage(cleared, failureReason) {
    const game = worldState.game;
    if (!game) {
      return;
    }
    worldState.game = null;
    syncLeafTouchButton(false);
    if (cleared) {
      const bonus = game.stage.clearBonus + Math.min(120, game.grownPatches.size);
      save.points += bonus;
      save.highestCleared = Math.max(save.highestCleared, game.stage.id);
      save.unlockedStages = Math.max(save.unlockedStages, Math.min(5, game.stage.id + 1));
      if (game.stage.id === 5) {
        save.endingSeen = true;
      }
      persistSave();
      ui.clearSummary.textContent = `${game.stage.name} をクリア。クリア報酬 ${bonus} ポイントをもらったよ。`;
      setScreen("clear");
      showMessage("ステージクリア。ショップで強化するのもおすすめ。");
      if (game.stage.id === 5) {
        setTimeout(() => showEnding(true), 700);
      }
    } else {
      ui.gameOverSummary.textContent = failureReason || "もう一回チャレンジしよう。";
      setScreen("gameOver");
      showMessage("少しずつ強くなれば大丈夫。");
    }
  }

  function showEnding(fromBoss) {
    setScreen("ending");
    ui.endingText.textContent = fromBoss
      ? "最後の敵が消えると、グリーンの足あとから草と花が広がり、世界に大きな木と光がよみがえった。"
      : "グリーンが育てたみどりは、今も世界を少しずつ明るく元気にしている。";
    showMessage("クリアおめでとう。グリーンが世界を救った。");
  }

  function updateCamera(player, stage) {
    const target = player.x + player.width * 0.5 - canvas.width * 0.5;
    const nextCamera = Math.max(0, Math.min(stage.length - canvas.width, target));
    worldState.cameraX += (nextCamera - worldState.cameraX) * 0.16;
  }

  function intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function draw() {
    drawBackground();
    if (worldState.game) {
      drawGame(worldState.game);
    } else if (worldState.screen === "ending") {
      drawEndingBackdrop();
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#8dd6f6");
    sky.addColorStop(0.7, "#eefad8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      const baseX = ((i * 220 - worldState.cameraX * 0.18) % (canvas.width + 280)) - 120;
      ctx.ellipse(baseX, 90 + i * 26, 90, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#95af78";
    ctx.fillRect(0, 430, canvas.width, 110);
  }

  function drawGame(game) {
    const stage = game.stage;
    const cameraX = worldState.cameraX;

    drawParallax();

    for (const platform of stage.platforms) {
      drawPlatform(platform, game);
    }

    drawGoal(stage.goalX - cameraX, FLOOR_Y);

    for (const enemy of game.enemies) {
      if (enemy.alive) {
        drawEnemy(enemy, cameraX);
      }
    }

    drawDrops(game, cameraX);
    drawProjectiles(game, cameraX);
    drawEffects(game, cameraX);
    drawPlayer(game.player, cameraX);
    drawGameHud(game);
  }

  function drawParallax() {
    ctx.fillStyle = "rgba(70, 113, 79, 0.24)";
    for (let i = 0; i < 5; i += 1) {
      const x = i * 230 - (worldState.cameraX * 0.35) % 230;
      ctx.beginPath();
      ctx.moveTo(x, 430);
      ctx.lineTo(x + 120, 250);
      ctx.lineTo(x + 260, 430);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPlatform(platform, game) {
    const x = platform.x - worldState.cameraX;
    ctx.fillStyle = "#84684d";
    ctx.fillRect(x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#6d533e";
    ctx.fillRect(x, platform.y + 26, platform.width, 8);
    drawGrassPatches(platform, game);
  }

  function drawGrassPatches(platform, game) {
    ctx.fillStyle = "#29ab55";
    for (let x = platform.x; x < platform.x + platform.width; x += 20) {
      if (game.grownPatches.has(`${x}:${platform.y}`)) {
        const screenX = x - worldState.cameraX;
        ctx.beginPath();
        ctx.moveTo(screenX + 5, platform.y);
        ctx.lineTo(screenX + 11, platform.y - 14);
        ctx.lineTo(screenX + 17, platform.y);
        ctx.fill();
      }
    }
  }

  function drawGoal(x, y) {
    ctx.fillStyle = "#78573c";
    ctx.fillRect(x + 28, y - 112, 28, 112);
    ctx.fillStyle = "#36a444";
    ctx.beginPath();
    ctx.arc(x + 42, y - 132, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(229,255,206,0.45)";
    ctx.beginPath();
    ctx.arc(x + 26, y - 145, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEffects(game, cameraX) {
    for (const effect of game.effects) {
      const x = effect.x - cameraX;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (effect.kind === "flash") {
        ctx.fillStyle = "#fff7b8";
        ctx.beginPath();
        ctx.arc(x, effect.y, effect.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.kind === "dropGlow") {
        ctx.strokeStyle = `rgba(137, 255, 161, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, effect.y, effect.size * (1 - alpha * 0.25), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.kind === "burst") {
        ctx.strokeStyle = `rgba(255, 245, 170, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, effect.y, effect.size * (1 - alpha * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.kind === "score") {
        ctx.fillStyle = `rgba(255, 246, 186, ${alpha})`;
        ctx.font = `900 ${effect.size}px Trebuchet MS`;
        ctx.textAlign = "center";
        ctx.fillText(effect.text, x, effect.y);
      } else if (effect.kind === "spark") {
        ctx.fillStyle = "#fff2a0";
        ctx.beginPath();
        ctx.arc(x, effect.y, effect.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(x, effect.y);
        ctx.rotate((1 - alpha) * 2.8);
        ctx.fillStyle = "#49c86d";
        ctx.beginPath();
        ctx.moveTo(0, -effect.size);
        ctx.lineTo(effect.size * 0.7, 0);
        ctx.lineTo(0, effect.size);
        ctx.lineTo(-effect.size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawProjectiles(game, cameraX) {
    game.projectiles.forEach((projectile) => {
      const x = projectile.x - cameraX;
      ctx.save();
      ctx.translate(x + projectile.width * 0.5, projectile.y + projectile.height * 0.5);
      ctx.rotate(projectile.vx > 0 ? 0.3 : -2.85);
      ctx.fillStyle = "#60de79";
      ctx.beginPath();
      ctx.ellipse(0, 0, projectile.width * 0.5, projectile.height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(-2, -1, 8, 2);
      ctx.restore();
    });
  }

  function drawDrops(game, cameraX) {
    game.drops.forEach((drop) => {
      const x = drop.x - cameraX;
      const pulse = 0.9 + Math.sin((performance.now() + drop.phase) / 220) * 0.08;
      ctx.save();
      ctx.translate(x + drop.width * 0.5, drop.y + drop.height * 0.5);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(145, 255, 166, 0.28)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#77e98d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 8, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(-1, -1, 8, 2);
      ctx.restore();
    });
  }

  function drawPlayer(player, cameraX) {
    const x = player.x - cameraX;
    ctx.save();
    if (performance.now() < player.invulnerableUntil && Math.floor(performance.now() / 90) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }
    ctx.translate(x + player.width * 0.5, player.y);
    ctx.scale(player.facing, 1);
    ctx.fillStyle = "#38be68";
    ctx.fillRect(-player.width * 0.5, 0, player.width, player.height);
    ctx.fillStyle = "#d7fff0";
    ctx.fillRect(-player.width * 0.5 + 7, 8, 24, 14);
    ctx.fillStyle = "#194f34";
    ctx.fillRect(-player.width * 0.5 + 10, 36, 6, 18);
    ctx.fillRect(-player.width * 0.5 + 22, 36, 6, 18);
    ctx.fillStyle = "#2d7f4f";
    ctx.fillRect(-player.width * 0.5 + 28, 24, 8, 6);
    if (player.diving) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-7, -10, 14, 8);
    }
    ctx.restore();
  }

  function drawEnemy(enemy, cameraX) {
    const x = enemy.x - cameraX;
    ctx.fillStyle = enemy.color;
    ctx.fillRect(x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = "#f7d9a3";
    ctx.fillRect(x + 8, enemy.y + 8, enemy.width - 16, 10);
    if (enemy.flying) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x - 8, enemy.y + 8, 10, 6);
      ctx.fillRect(x + enemy.width - 2, enemy.y + 8, 10, 6);
    }
    if (enemy.boss) {
      ctx.fillStyle = "#1d1d1d";
      ctx.fillRect(x + 10, enemy.y - 12, enemy.width - 20, 8);
      ctx.fillStyle = "#d75f5f";
      ctx.fillRect(x + 10, enemy.y - 12, ((enemy.width - 20) * enemy.hp) / enemy.maxHp, 8);
    }
  }

  function drawGameHud(game) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(20, 20, 280, 138);
    ctx.fillStyle = "#16301e";
    ctx.font = "700 18px Trebuchet MS";
    ctx.fillText(`ステージ ${game.stage.id}`, 34, 48);
    ctx.fillText(`ポイント +${game.score}`, 34, 74);
    ctx.fillText(`エネルギー ${"●".repeat(game.player.energy)}`, 34, 98);
    ctx.fillText(game.leafUnlocked ? "Eで葉っぱ -1pt" : "葉っぱアイテムを拾うとE解放", 34, 122);
    ctx.fillText(`ダメージ ${getStompDamage()} / ドロップ ${Math.round(getDropChance() * 100)}%`, 34, 146);
  }

  function drawEndingBackdrop() {
    const pulse = (Math.sin(worldState.endingPulse) + 1) * 0.5;
    ctx.fillStyle = "#7bb96a";
    ctx.fillRect(0, 380, canvas.width, 160);
    for (let i = 0; i < 80; i += 1) {
      const x = (i * 121) % canvas.width;
      const y = 420 + ((i * 47) % 80);
      ctx.fillStyle = `rgba(53, 166, 76, ${0.15 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    drawGoal(canvas.width / 2 - TREE_WIDTH / 2, FLOOR_Y);
    ctx.fillStyle = "#38be68";
    ctx.fillRect(canvas.width / 2 - 150, FLOOR_Y - 54, 38, 54);
    ctx.fillStyle = "#d7fff0";
    ctx.fillRect(canvas.width / 2 - 143, FLOOR_Y - 46, 24, 14);
  }

  function createAudioSystem() {
    let context = null;
    let bgmTimer = null;

    function init() {
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (context.state === "suspended") {
        context.resume();
      }
    }

    function tone(freq, duration, type, volume, whenOffset) {
      if (!context) {
        return;
      }
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(context.destination);
      const start = context.currentTime + (whenOffset || 0);
      const end = start + duration;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end);
    }

    function sfx(kind) {
      init();
      const map = {
        step: () => tone(180, 0.08, "square", 0.03),
        jump: () => {
          tone(420, 0.16, "square", 0.07);
          tone(640, 0.1, "triangle", 0.04, 0.05);
        },
        land: () => tone(120, 0.12, "triangle", 0.06),
        enemy: () => {
          tone(180, 0.18, "sawtooth", 0.06);
          tone(130, 0.22, "triangle", 0.04, 0.04);
        },
        grass: () => {
          tone(660, 0.09, "sine", 0.04);
          tone(880, 0.11, "sine", 0.03, 0.03);
        },
        purchase: () => {
          tone(520, 0.12, "triangle", 0.06);
          tone(780, 0.2, "triangle", 0.05, 0.05);
        },
      };
      if (map[kind]) {
        map[kind]();
      }
    }

    function bgm(kind) {
      init();
      if (bgmTimer) {
        clearTimeout(bgmTimer);
      }
      const themes = {
        title: [261.63, 329.63, 392.0, 523.25],
        stage: [220.0, 277.18, 329.63, 392.0],
        clear: [392.0, 523.25, 659.25, 783.99],
        gameOver: [196.0, 174.61, 146.83, 130.81],
        shop: [293.66, 369.99, 440.0, 587.33],
        ending: [261.63, 349.23, 440.0, 659.25],
      };
      const notes = themes[kind] || themes.title;
      notes.forEach((note, index) => {
        tone(note, 1.4, kind === "gameOver" ? "triangle" : "sine", 0.025, index * 0.15);
      });
      bgmTimer = setTimeout(() => {
        const shouldLoop =
          (kind === "stage" && !!worldState.game) ||
          (kind === "title" && (worldState.screen === "title" || worldState.screen === "stageSelect")) ||
          worldState.screen === kind;
        if (shouldLoop) {
          bgm(kind);
        }
      }, 1500);
    }

    return { init, sfx, bgm };
  }

  function grantPoints(amount, reason) {
    ensureAudio();
    save.points += amount;
    persistSave();
    audio.sfx("purchase");
    showMessage(`${reason} +${amount}pt`);
  }

  function canClaimDaily() {
    const today = new Date().toISOString().slice(0, 10);
    return save.lastDailyBonus !== today;
  }

  function setupEvents() {
    let lastMenuPressAt = 0;

    const suppressUiGesture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (
        target.closest(".touch-controls") ||
        target.closest("#gameCanvas") ||
        target.closest(".touch-button") ||
        target.closest(".touch-image")
      ) {
        event.preventDefault();
      }
    };

    const bindPress = (element, handler) => {
      if (!element) {
        return;
      }

      const run = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - lastMenuPressAt < 250) {
          return;
        }
        lastMenuPressAt = now;
        handler();
      };

      element.addEventListener("click", run);
      element.addEventListener("touchend", run, { passive: false });
      element.addEventListener("pointerup", run);
    };

    const attachTouchSuppressor = (element) => {
      if (!element) {
        return;
      }
      const preventTouchDefault = (event) => {
        event.preventDefault();
      };
      element.addEventListener("touchstart", preventTouchDefault, { passive: false });
      element.addEventListener("touchmove", preventTouchDefault, { passive: false });
      element.addEventListener("touchend", preventTouchDefault, { passive: false });
    };

    bindPress(document.getElementById("startButton"), () => {
      ensureAudio();
      void enterMobilePlayMode();
      setScreen("stageSelect");
      closeMenu();
      showMessage("遊ぶステージをえらぼう。");
    });
    bindPress(ui.menuToggleButton, () => {
      if (ui.sideMenu.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    bindPress(ui.menuCloseButton, closeMenu);
    bindPress(ui.menuBackdrop, closeMenu);
    bindPress(document.getElementById("openShopButton"), () => {
      setScreen("shop");
      showMessage("ポイントでパワーアップできるよ。");
    });
    bindPress(document.getElementById("closeShopButton"), () => {
      setScreen("stageSelect");
      showMessage("どのステージにする？");
    });
    bindPress(document.getElementById("retryButton"), () => startStage(worldState.currentStage || 1));
    bindPress(document.getElementById("gameOverToSelectButton"), () => {
      setScreen("stageSelect");
      showMessage("ステージをえらんで、また挑戦しよう。");
    });
    bindPress(document.getElementById("clearToSelectButton"), () => {
      setScreen("stageSelect");
      showMessage("クリアおめでとう。ショップにも行けるよ。");
    });
    bindPress(document.getElementById("openEndingButton"), () => showEnding(false));
    bindPress(document.getElementById("endingToSelectButton"), () => {
      setScreen("stageSelect");
      showMessage("世界はみどりを取りもどした。");
    });

    bindPress(ui.tapButton, () => {
      const now = Date.now();
      if (now < worldState.rewardTapReadyAt) {
        showMessage("応援ボタンは少し待つともう一回押せるよ。");
        return;
      }
      worldState.rewardTapReadyAt = now + 10000;
      grantPoints(5, "応援ポイント");
    });

    bindPress(ui.dailyButton, () => {
      if (!canClaimDaily()) {
        showMessage("デイリーボーナスは今日はもう受け取ったよ。");
        return;
      }
      save.lastDailyBonus = new Date().toISOString().slice(0, 10);
      grantPoints(50, "デイリーボーナス");
    });

    bindPress(ui.adButton, () => {
      grantPoints(30, "広告ボーナス");
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        input.left = true;
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        input.right = true;
      }
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        input.jumpPressed = true;
      }
      if (event.key === "e" || event.key === "E") {
        input.shootPressed = true;
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        input.divePressed = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        input.left = false;
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        input.right = false;
      }
    });

    document.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.getAttribute("data-control");
      attachTouchSuppressor(button);

      const activate = (event) => {
        if (event) {
          event.preventDefault();
        }
        ensureAudio();
        if (control === "left") {
          input.left = true;
        }
        if (control === "right") {
          input.right = true;
        }
        if (control === "jump") {
          input.jumpPressed = true;
        }
        if (control === "dive") {
          input.divePressed = true;
        }
        if (control === "leaf") {
          input.shootPressed = true;
        }
      };
      const release = (event) => {
        if (event) {
          event.preventDefault();
        }
        if (control === "left") {
          input.left = false;
        }
        if (control === "right") {
          input.right = false;
        }
      };
      button.addEventListener("pointerdown", activate);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });

    attachTouchSuppressor(document.querySelector(".touch-controls"));
    attachTouchSuppressor(document.getElementById("gameCanvas"));
    document.addEventListener("contextmenu", suppressUiGesture);
    document.addEventListener("selectstart", suppressUiGesture);
    document.addEventListener("dragstart", suppressUiGesture);
    document.addEventListener("gesturestart", suppressUiGesture);
    document.addEventListener("gesturechange", suppressUiGesture);

    window.addEventListener("resize", syncRotateHint);
    window.addEventListener("orientationchange", syncRotateHint);
    syncRotateHint();
  }

  function loop(lastTime) {
    const now = performance.now();
    const dt = Math.min(32, now - lastTime);
    update(dt);
    draw();
    requestAnimationFrame(() => loop(now));
  }

  renderMeta();
  if (ui.gameVersion) {
    ui.gameVersion.textContent = GAME_VERSION;
  }
  setupEvents();
  setScreen("title");
  showMessage("スタートを押すと冒険が始まるよ。");
  requestAnimationFrame((time) => loop(time));
})();
