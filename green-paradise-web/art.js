(function () {
  const P = window.Paradise;
  function round(c, x, y, w, h, r, color) {
    c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
  }
  function ellipse(c, x, y, rx, ry, color, angle = 0) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); c.fill();
  }
  function leaf(c, x, y, size, color, angle = -.6) {
    c.save(); c.translate(x, y); c.rotate(angle);
    ellipse(c, 0, 0, size, size * .48, color);
    c.strokeStyle = "#ffffff88"; c.lineWidth = 1; c.beginPath(); c.moveTo(-size * .7, 0); c.lineTo(size * .7, 0); c.stroke(); c.restore();
  }
  function tree(c, x, ground, scale, color, time = 0) {
    c.save(); c.translate(x, ground); c.scale(scale, scale);
    ellipse(c, 0, 0, 74, 12, "#143c3122");
    c.strokeStyle = "#6a5b3a"; c.lineWidth = 19; c.lineCap = "round";
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(14, -60, -8, -97, 5, -138); c.stroke();
    c.lineWidth = 9; c.beginPath(); c.moveTo(6, -72); c.lineTo(-33, -111); c.moveTo(6, -89); c.lineTo(37, -120); c.stroke();
    const sway = Math.sin(time) * 2;
    ellipse(c, -28 + sway, -139, 49, 45, color);
    ellipse(c, 38 + sway, -147, 48, 47, color);
    ellipse(c, 1 + sway, -181, 52, 43, color);
    ellipse(c, -19 + sway, -191, 31, 21, "#e0f0a644");
    for (let i = 0; i < 9; i++) leaf(c, -52 + i * 13, -142 - Math.sin(i * 2) * 34, 7, "#ddf4b344");
    c.restore();
  }
  function robot(c, p, time, scale = 1) {
    c.save(); c.translate(p.x + 18, p.y + 52); c.scale(scale * (p.facing || 1), scale);
    if (p.invincible > 0 && Math.floor(time * 14) % 2) c.globalAlpha = .45;
    const walk = p.grounded && Math.abs(p.vx) > 0 ? Math.sin(time * 17) * 4 : 0;
    round(c, -18, -13 + walk, 15, 13, 5, "#1d4d3b"); round(c, 4, -13 - walk, 15, 13, 5, "#1d4d3b");
    round(c, -18, -37, 36, 29, 10, "#4d9c5d"); round(c, -13, -36, 26, 18, 6, "#8eda86");
    round(c, -23, -50, 45, 27, 10, "#b9e995"); round(c, -19, -47, 38, 20, 7, "#164d43");
    round(c, -10, -41, 5, 7, 2, "#ebffc4"); round(c, 5, -41, 5, 7, 2, "#ebffc4");
    round(c, -24, -30, 7, 20, 3, "#62ae6a"); round(c, 18, -30, 7, 20, 3, "#62ae6a");
    ellipse(c, 0, -21, 4, 4, "#fcdf87");
    c.strokeStyle = "#46734d"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -50); c.lineTo(1, -61); c.stroke();
    leaf(c, 7, -62, 9, "#b5e875", -.5); leaf(c, -4, -59, 6, "#71b874", .5);
    if (p.dive) {
      c.strokeStyle = "#edffb9"; c.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 13, -78); c.lineTo(i * 13, -62); c.stroke(); }
    }
    c.restore();
  }
  function scenery(c, b, width, time, camera) {
    const gradient = c.createLinearGradient(0, 0, 0, 540);
    gradient.addColorStop(0, b.sky); gradient.addColorStop(1, b.light);
    c.fillStyle = gradient; c.fillRect(0, 0, width, 540);
    const night = ["night", "crystal"].includes(b.decor);
    if (b.decor !== "crystal") {
      ellipse(c, width * .77, 95, 65, 65, "#fff7c51a"); ellipse(c, width * .77, 95, 42, 42, night ? "#ebf0c3" : "#fff2c6");
    } else {
      c.fillStyle = b.near; c.beginPath(); c.moveTo(0, 0);
      for (let x = 0; x <= width + 80; x += 80) { c.lineTo(x, 40); c.lineTo(x + 24, 70 + (x % 3) * 30); c.lineTo(x + 52, 30); }
      c.lineTo(width, 0); c.closePath(); c.fill();
    }
    if (night) for (let i = 0; i < 50; i++) ellipse(c, (i * 137.8) % width, 24 + (i * 37) % 230, 1.2, 1.2, "#ffffda88");
    for (let layer = 0; layer < 3; layer++) {
      c.fillStyle = layer === 0 ? b.far : b.near;
      c.globalAlpha = .25 + layer * .15;
      const base = 310 + layer * 70, offset = camera * (.12 + layer * .12);
      c.beginPath(); c.moveTo(0, 540);
      for (let x = -10; x <= width + 10; x += 10) {
        const h = Math.sin((x + offset) / 170 + layer) * 32 + Math.cos((x + offset) / 91) * 17;
        c.lineTo(x, base + h);
      }
      c.lineTo(width, 540); c.closePath(); c.fill();
    }
    c.globalAlpha = .6;
    for (let i = -1; i < width / 210 + 2; i++) {
      const x = i * 210 - (camera * .32 % 210), y = 370 + Math.sin(i * 3) * 20;
      if (["forest", "night", "ancient"].includes(b.decor)) tree(c, x, y, .55 + (i % 2) * .12, b.near, time * .4);
      else if (b.decor === "mushroom") {
        round(c, x - 5, y - 75, 14, 78, 4, b.far); ellipse(c, x, y - 73, 50, 23, b.near);
        for (let j = -1; j <= 1; j++) ellipse(c, x + j * 22, y - 80, 4, 3, b.accent);
      } else if (b.decor === "desert") {
        round(c, x, y - 95, 18, 98, 8, b.near);
        round(c, x - 27, y - 67, 35, 12, 5, b.near); round(c, x - 27, y - 90, 12, 35, 5, b.near);
        round(c, x + 8, y - 48, 33, 12, 5, b.near); round(c, x + 29, y - 78, 12, 40, 5, b.near);
      } else if (b.decor === "ruins") {
        round(c, x, y - 125, 35, 128, 3, b.near); round(c, x - 8, y - 133, 51, 16, 2, b.near);
        round(c, x - 10, y - 8, 55, 13, 2, b.near);
        for (let j = 0; j < 3; j++) round(c, x + 6 + j * 10, y - 110, 3, 95, 1, b.far);
      } else if (b.decor === "factory") {
        round(c, x, y - 105, 50, 110, 3, b.near); round(c, x + 12, y - 160, 12, 65, 2, b.near);
        for (let j = 0; j < 3; j++) round(c, x + 10, y - 85 + j * 25, 30, 6, 0, b.far);
      } else {
        c.fillStyle = b.near; c.beginPath(); c.moveTo(x - 60, y); c.lineTo(x - 20, y - 120); c.lineTo(x + 15, y - 160); c.lineTo(x + 65, y); c.fill();
        if (b.decor === "snow" || b.decor === "crystal") { c.fillStyle = b.edge; c.beginPath(); c.moveTo(x - 20, y - 120); c.lineTo(x + 15, y - 160); c.lineTo(x + 30, y - 115); c.fill(); }
      }
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 20; i++) {
      const x = ((i * 173 + time * (b.decor === "snow" ? 15 : 6)) % (width + 30)) - 15;
      const y = (i * 73 + time * (b.decor === "snow" ? 23 : -5) + 5400) % 520;
      ellipse(c, x, y, b.decor === "snow" ? 2 : 1.5, 2, "#fffae16a");
    }
  }
  function enemy(c, e, time, b) {
    c.save(); c.translate(e.x, e.y);
    if (e.hit > 0 || (e.boss && e.recovery > 0)) c.globalAlpha = .6;
    const color = e.boss ? b.near : "#46575a", w = e.w, h = e.h;
    if (e.boss) {
      const aura = e.phase === 2 ? "#f1a45a" : b.accent;
      ellipse(c, w / 2, h / 2, 77 + Math.sin(time * 3) * 4, 65, `${aura}22`);
      c.strokeStyle = aura; c.lineWidth = e.phase === 2 ? 3 : 1.5;
      c.beginPath(); c.ellipse(w / 2, h / 2, 68, 60, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < (e.phase === 2 ? 10 : 5); i++) {
        const angle = time * (e.phase === 2 ? 1.8 : .5) + i * Math.PI * 2 / (e.phase === 2 ? 10 : 5);
        leaf(c, w / 2 + Math.cos(angle) * 70, h / 2 + Math.sin(angle) * 62, 5, aura, angle);
      }
    }
    if (e.intangible) {
      if (e.type === "burrower") ellipse(c, w / 2, h - 1, w * .65, 9, "#b59164");
      else {
        c.strokeStyle = "#e8efb0"; c.lineWidth = 2; c.setLineDash([4, 4]);
        c.beginPath(); c.ellipse(e.teleportX - e.x + w / 2, h / 2, 24, 25, 0, 0, Math.PI * 2); c.stroke();
      }
      if (e.warning) { c.fillStyle = "#fff1b9"; c.font = "bold 22px sans-serif"; c.fillText("!", w / 2, -10); }
      c.restore(); return;
    }
    ellipse(c, w / 2, h + 4, w * .55, 7, "#1c33322e");
    for (let i = 0; i < 3; i++) {
      const drift = (time * 24 + i * 15) % 44;
      ellipse(c, w * .5 + Math.sin(i + time) * 14, -drift, 4 + drift * .08, 4 + drift * .08, "#35474725");
    }
    if (e.boss) {
      round(c, -8, 25, 20, h - 20, 7, color); round(c, w - 12, 25, 20, h - 20, 7, color);
      round(c, 0, 0, w, h, 24, color); round(c, 8, 7, w - 16, h * .45, 17, b.edge);
      for (let i = 0; i < 3; i++) { c.fillStyle = b.accent; c.beginPath(); c.moveTo(14 + i * 30, 3); c.lineTo(22 + i * 30, -18); c.lineTo(30 + i * 30, 3); c.fill(); }
      ellipse(c, w / 2, h * .7, 13, 13, e.warning ? "#fff3a1" : "#de9174");
      const skill = b.skill;
      if (skill === "wave") {
        ellipse(c, w / 2, 15, 49, 30, "#7e9984");
        for (let i = 0; i < 5; i++) round(c, 10 + i * 18, 3 + Math.abs(i - 2) * 5, 14, 15, 4, "#4e7260");
      } else if (skill === "charge") {
        round(c, -15, h - 16, w + 30, 24, 10, "#5e5044");
        for (let i = 0; i < 5; i++) ellipse(c, i * 23 + 3, h - 4, 9, 9, "#a9966d");
        round(c, e.dir < 0 ? -26 : w - 2, 18, 28, h - 22, 5, "#d9b67a");
      } else if (skill === "shield") {
        for (let i = 0; i < 5; i++) {
          const x = i * 23 + 4;
          c.fillStyle = i % 2 ? "#c0f9eb" : "#74c8d2";
          c.beginPath(); c.moveTo(x - 12, 11); c.lineTo(x, -18 - (i % 2) * 15); c.lineTo(x + 12, 11); c.fill();
        }
      } else if (skill === "rain") {
        round(c, 10, -26, 18, 38, 3, "#6f7670"); round(c, 69, -40, 20, 50, 3, "#6f7670");
        for (let i = 0; i < 3; i++) round(c, 23, 51 + i * 7, 54, 3, 1, "#ffc27a");
      } else if (skill === "poison") {
        ellipse(c, w / 2, 4, 65, 26, "#a5ac71");
        for (let i = 0; i < 5; i++) ellipse(c, 5 + i * 23, -1 - (i % 2) * 9, 6, 4, "#efe5b6");
      } else if (skill === "jump") {
        round(c, -19, 19, 29, 55, 11, "#e3eeeb"); round(c, 90, 19, 29, 55, 11, "#e3eeeb");
        for (let i = 0; i < 7; i++) leaf(c, 7 + i * 14, 7, 15, "#edf7ef", -1.3);
      } else if (skill === "storm" || skill === "fan") {
        const flap = Math.sin(time * 6) * 9;
        for (const side of [-1, 1]) {
          const x = side < 0 ? 0 : w;
          ellipse(c, x + side * 22, 22, 38, 15, skill === "fan" ? "#91aebb" : "#c69674", side * (.5 + flap / 50));
          leaf(c, x + side * 24, 36, 28, b.edge, side * .7);
        }
      } else if (skill === "quake") {
        round(c, -23, 22, 30, 56, 3, "#9baa95"); round(c, 93, 22, 30, 56, 3, "#9baa95");
        round(c, 1, -16, 98, 23, 3, "#d9dcc3");
        round(c, 22, 53, 56, 8, 1, "#efeaba");
      } else if (skill === "final") {
        c.strokeStyle = "#eadd9b"; c.lineWidth = 3;
        c.beginPath(); c.ellipse(w / 2, 25, 65, 65, time * .25, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5 + time * .4;
          ellipse(c, w / 2 + Math.cos(a) * 65, 25 + Math.sin(a) * 65, 6, 6, "#f4e6a5");
        }
      }
    } else if (P.REGION_ENEMIES.includes(e.type)) {
      if (e.type === "stump") {
        round(c, 2, 0, w - 4, h, 5, "#997454"); ellipse(c, w / 2, 3, 20, 7, "#d7b58a"); ellipse(c, w / 2, 3, 12, 4, "#9f805c");
        round(c, -6, 14, 12, 8, 2, "#75563e"); round(c, w - 6, 10, 12, 8, 2, "#75563e");
      } else if (e.type === "burrower") {
        ellipse(c, w / 2, h / 2, w / 2, h / 2, "#bca479");
        for (const x of [0, w - 6]) round(c, x, h - 12, 10, 14, 4, "#e7dbc2");
        ellipse(c, w / 2, h - 4, 7, 5, "#69564c");
      } else if (e.type === "prism" || e.type === "swooper") {
        for (const side of [-1, 1]) {
          c.fillStyle = e.type === "prism" ? "#8fd9da" : "#ba8868";
          c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + side * 40, -8 + Math.sin(time * 9) * 9); c.lineTo(w / 2 + side * 26, h - 2); c.fill();
        }
        ellipse(c, w / 2, h / 2, 17, h / 2, e.type === "prism" ? "#547e9a" : "#655b60");
      } else if (e.type === "piston") {
        round(c, 12, h - 18, 24, 18, 2, "#a6aca3");
        for (let i = 0; i < 4; i++) round(c, 8, h - 19 + i * 5, 32, 2, 1, "#4d5556");
        round(c, 0, 0, w, h - 14, 5, "#cc9c59"); round(c, -5, h - 3, w + 10, 8, 2, "#596363");
      } else if (e.type === "spore") {
        round(c, 13, 12, 20, h - 12, 5, "#d8d0ab"); ellipse(c, w / 2, 10, 29, 17, "#987c75");
        for (let i = 0; i < 4; i++) ellipse(c, i * 12 + 5, 5 + i % 2 * 7, 4, 3, "#ddd4a4");
      } else if (e.type === "skater") {
        round(c, 3, 0, w - 6, h - 4, 12, "#99c4cf");
        round(c, -5, h - 3, w + 10, 4, 2, "#edf4e9"); leaf(c, w / 2, -5, 12, "#d5f0ed", -1.5);
      } else if (e.type === "blink") {
        ellipse(c, w / 2, h / 2, 27, 25, "#eef5a52a"); round(c, 0, 0, w, h, 16, "#687a85");
        ellipse(c, w / 2, h - 5, 10, 8, "#edf2ad"); leaf(c, 2, 5, 16, "#9cafb0", -1); leaf(c, w - 2, 5, 16, "#9cafb0", 1);
      } else if (e.type === "sentinel") {
        round(c, 2, 0, w - 4, h, 3, "#929a83"); round(c, -5, 16, 12, 30, 3, "#788671"); round(c, w - 7, 16, 12, 30, 3, "#788671");
        round(c, 0, 0, w, 9, 2, "#d4d2b2"); round(c, 16, h - 15, 22, 5, 1, "#c1bf8e");
      } else {
        round(c, 4, 17, w - 8, 28, 6, "#85958c"); round(c, 0, 0, w, 25, 8, "#b4b8a8");
        round(c, 1, h - 10, 12, 10, 3, "#52655e"); round(c, w - 13, h - 10, 12, 10, 3, "#52655e");
        leaf(c, w / 2, -6, 10, "#b1a282", -.7);
      }
    } else if (e.type === "roller") {
      ellipse(c, w / 2, h / 2, 23, 21, color); ellipse(c, w / 2, h / 2, 15, 14, "#859084");
      c.save(); c.translate(w / 2, h / 2); c.rotate(time * 5); round(c, -18, -3, 36, 6, 2, color); c.restore();
    } else {
      round(c, 0, 3, w, h - 3, e.type === "tank" ? 6 : 15, color);
      for (let i = 0; i < 3; i++) round(c, i * 16, h - 6 + Math.sin(time * 8 + i) * 2, 12, 9, 4, "#344947");
      if (e.type === "drone") { round(c, -10, -4, w + 20, 5, 3, "#7e9b90"); round(c, w / 2 - 2, -9, 4, 12, 2, color); }
      if (e.type === "hopper") { leaf(c, 5, -6, 13, "#8c7770", -1); leaf(c, w - 5, -6, 13, "#8c7770", 1); }
      if (e.type === "tank") round(c, 8, -5, 42, 12, 4, "#8a9787");
    }
    round(c, w * .22, h * .32, w * .56, 11, 5, "#1a3034");
    ellipse(c, w * .36, h * .32 + 5, 3, 3, "#ffcc92"); ellipse(c, w * .66, h * .32 + 5, 3, 3, "#ffcc92");
    if (e.boss && !e.shield) {
      ellipse(c, w / 2, h * .7, 16, 16, e.openTime > 0 ? "#f7ee95" : "#8d9485");
      if (e.openTime > 0) leaf(c, w / 2, h * .7, 10, "#70aa6c", time * 4);
      else { round(c, w / 2 - 12, h * .7 - 8, 24, 5, 2, "#535f59"); round(c, w / 2 - 12, h * .7 + 4, 24, 5, 2, "#535f59"); }
    }
    if (!e.boss && P.ENEMIES[e.type].name) {
      c.font = "bold 10px sans-serif"; c.textAlign = "center"; c.fillStyle = "#fbf4d8";
      c.strokeStyle = "#263d35"; c.lineWidth = 3;
      c.strokeText(P.ENEMIES[e.type].name, w / 2, -27); c.fillText(P.ENEMIES[e.type].name, w / 2, -27); c.textAlign = "start";
    }
    if (!e.boss && e.maxHp > 2) for (let i = 0; i < e.maxHp / 2; i++) ellipse(c, w / 2 - 7 + i * 14, -14, 4, 4, e.hp > i * 2 ? "#eeca95" : "#48645b");
    if (e.shield) { c.strokeStyle = "#a9f2ff"; c.lineWidth = 4; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 + 12, h / 2 + 18, 0, 0, Math.PI * 2); c.stroke(); }
    if (e.warning) { c.fillStyle = "#fff2c2"; c.font = "bold 26px sans-serif"; c.fillText("!", w / 2 - 4, e.boss ? -28 : -43); }
    c.restore();
  }
  function gimmick(c, a, time) {
    c.save();
    const { x, y, w, kind } = a;
    const arrow = (ax, ay, angle = 0) => {
      c.save(); c.translate(ax, ay); c.rotate(angle); c.strokeStyle = "#ffefb8"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.lineTo(3, -6); c.moveTo(9, 0); c.lineTo(3, 6); c.stroke(); c.restore();
    };
    if (["moving", "lift", "phase", "crumble", "bridge"].includes(kind)) {
      if (kind === "moving" || kind === "lift") {
        c.strokeStyle = "#f1f4c860"; c.lineWidth = 2; c.setLineDash([3, 7]);
        c.beginPath();
        if (kind === "moving") { c.moveTo(a.baseX - a.range, y + 8); c.lineTo(a.baseX + w + a.range, y + 8); }
        else { c.moveTo(x + w / 2, a.baseY + 12); c.lineTo(x + w / 2, a.baseY - a.range * 2); }
        c.stroke(); c.setLineDash([]);
      }
      if (!a.active) {
        c.strokeStyle = "#dbefc377"; c.setLineDash([5, 6]); c.strokeRect(x, y, w, 14); c.setLineDash([]);
      } else {
        const color = { moving: "#957850", lift: "#6bbec5", phase: "#c4d890", crumble: "#aa9580", bridge: "#80be6a" }[kind];
        c.globalAlpha = a.warning && Math.floor(time * 12) % 2 ? .4 : 1;
        round(c, x, y, w, 17, 7, color); round(c, x + 4, y + 2, w - 8, 4, 2, "#fff8d580");
        if (kind === "crumble") {
          c.strokeStyle = "#5f6252"; c.lineWidth = 2;
          for (let i = 16; i < w; i += 30) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i - 6, y + 8); c.lineTo(x + i + 5, y + 16); c.stroke(); }
        } else if (kind === "bridge") for (let i = 8; i < w; i += 16) leaf(c, x + i, y + 3, 13, "#c2e79a", -.5);
        else if (kind === "phase") for (let i = 12; i < w; i += 22) ellipse(c, x + i, y - 5 + Math.sin(time * 3 + i) * 3, 3, 3, "#f1f7c4");
        else arrow(x + w / 2, y + 10, kind === "lift" ? -Math.PI / 2 : 0);
        c.globalAlpha = 1;
      }
    } else if (kind === "brittle" && a.active) {
      round(c, x, y, w, a.h, 6, "#a3a98b"); round(c, x + 3, y + 2, w - 6, 8, 3, "#dadabb");
      c.strokeStyle = "#627562"; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 38, y); c.lineTo(x + 26, y + 24); c.lineTo(x + 48, y + 38); c.lineTo(x + 30, y + a.h); c.stroke();
      arrow(x + w / 2, y - 24, Math.PI / 2);
    } else if (kind === "spring" || kind === "mushroom") {
      const squash = a.cooldown > 0 ? 5 : 0;
      round(c, x + 20, y - 23 + squash, 16, 25 - squash, 5, "#e1d5a7");
      if (kind === "spring") {
        c.strokeStyle = "#50734e"; c.lineWidth = 3; c.beginPath();
        c.moveTo(x + 16, y - 2); c.lineTo(x + 40, y - 8); c.lineTo(x + 16, y - 14); c.lineTo(x + 40, y - 20); c.stroke();
        leaf(c, x + 28, y - 24 + squash, 29, "#95cc7d");
      } else {
        ellipse(c, x + 28, y - 23 + squash, 34, 14, "#d68778");
        for (const i of [-1, 0, 1]) ellipse(c, x + 28 + i * 17, y - 27 + squash, 5, 3, "#fff0c6");
      }
      arrow(x + 28, y - 49, -Math.PI / 2);
    } else if (["ice", "sand", "conveyor"].includes(kind)) {
      round(c, x, y - 3, w, 17, 4, kind === "ice" ? "#b8ebef" : kind === "sand" ? "#e6bf7a" : "#526c69");
      c.save(); c.beginPath(); c.rect(x + 3, y - 3, w - 6, 20); c.clip();
      for (let i = -1; i < w / 28 + 1; i++) {
        const dx = x + i * 28 + (time * (kind === "conveyor" ? a.force : 12) % 28);
        if (kind === "conveyor") arrow(dx, y + 6, a.force < 0 ? Math.PI : 0);
        else { c.strokeStyle = kind === "ice" ? "#ffffffaa" : "#b8915966"; c.beginPath(); c.moveTo(dx, y + 1); c.lineTo(dx + 12, y + 10); c.stroke(); }
      }
      c.restore();
    } else if (kind === "wind" || kind === "updraft") {
      const gradient = c.createLinearGradient(x, y, x, y + a.h);
      gradient.addColorStop(0, "#fff5c005"); gradient.addColorStop(1, "#c7ebba50");
      c.fillStyle = gradient; c.fillRect(x, y, w, a.h);
      for (let i = 0; i < 8; i++) {
        const ax = x + 15 + (i * 29 + (kind === "wind" ? time * 65 : 0)) % (w - 30);
        const ay = y + 18 + ((i * 41 - time * 65) % (a.h - 36) + a.h - 36) % (a.h - 36);
        c.globalAlpha = .65; arrow(ax, ay, kind === "updraft" ? -Math.PI / 2 : 0);
      }
      c.globalAlpha = 1;
    } else if (kind === "switch") {
      round(c, x - 4, y - 5, w + 8, 11, 4, "#60796a");
      round(c, x + 3, y - (a.activated ? 10 : 20), w - 6, a.activated ? 8 : 18, 6, a.activated ? "#b6e78b" : "#ecc987");
      leaf(c, x + w / 2, y - (a.activated ? 8 : 17), 10, "#4f855c");
      if (!a.activated) arrow(x + w / 2, y - 47, Math.PI / 2);
    } else if (kind === "steam") {
      round(c, x, y - 8, w, 16, 4, "#637570");
      for (let i = 8; i < w; i += 12) round(c, x + i, y - 7, 5, 10, 2, "#263e3b");
      if (a.blasting) for (let i = 0; i < 8; i++) {
        const rise = (time * 100 + i * 13) % 88;
        ellipse(c, x + w / 2 + Math.sin(i + time * 5) * 10, y - rise, 9 + rise * .12, 12, "#fff3d8aa");
      }
    } else if (kind === "icicle" && a.cooldown === 0) {
      c.fillStyle = "#cbf4f3"; c.beginPath(); c.moveTo(x + 15, y - 220); c.lineTo(x + 41, y - 220); c.lineTo(x + 28 + (a.warning ? Math.sin(time * 30) * 2 : 0), y - 184); c.fill();
    }
    if (a.warning && ["steam", "icicle"].includes(kind)) {
      round(c, x - 6, y - 4, w + 12, 6, 3, Math.floor(time * 10) % 2 ? "#ffce84" : "#dc7255");
      c.fillStyle = "#fff0b2"; c.font = "bold 23px sans-serif"; c.fillText("!", x + w / 2 - 4, y - 32);
    }
    c.restore();
  }
  function render(c, g, time, width, ending = false) {
    const b = g ? g.stage.biome : P.BIOMES[0], camera = g ? g.camera : time * 6;
    scenery(c, b, width, time, camera);
    if (!g) {
      const x = width * .72;
      round(c, 0, 440, width, 110, 0, "#567454");
      if (ending) {
        // The restoration sweeps from left to right, followed by a shower of leaves.
        c.fillStyle = "#8bbd7e55";
        c.fillRect(0, 0, Math.min(width, time * width / 4), 540);
        for (let i = 0; i < 9; i++) {
          const growth = P.clamp((time - i * .3) / 2, 0, 1);
          tree(c, i * width / 8, 458, growth * (.42 + i % 3 * .1), "#7fad72", time);
        }
        for (let i = 0; i < 55; i++) {
          const y = (time * (28 + i % 20) + i * 61) % 620 - 80;
          leaf(c, (i * 137 + Math.sin(time + i) * 30) % width, y, 4 + i % 5, i % 2 ? "#e6dda0" : "#a9d581", time + i);
        }
      }
      tree(c, x, 442, 1.45, ending ? "#78b873" : "#55946c", time);
      robot(c, { x: x - 142, y: 392, facing: 1 }, time, 1.35);
      for (let i = 0; i < 60; i++) leaf(c, i * width / 60, 443 + i % 3 * 7, 9, i % 2 ? "#a7cd7a" : "#75b56a", -1);
      return;
    }
    c.save(); c.translate(-camera, 0);
    for (const f of g.stage.platforms) {
      if (f.x + f.w < camera || f.x > camera + width) continue;
      round(c, f.x, f.y, f.w, f.h, 5, b.soil); round(c, f.x, f.y, f.w, 9, 3, b.edge);
      c.strokeStyle = "#ffffff12"; c.lineWidth = 2;
      for (let x = f.x + 18; x < f.x + f.w; x += 43) { c.beginPath(); c.moveTo(x, f.y + 26); c.lineTo(x + 8, f.y + 33); c.lineTo(x + 2, f.y + 43); c.stroke(); }
    }
    for (const key of g.grass) {
      const [x, y] = key.split(":").map(Number);
      if (x < camera - 20 || x > camera + width) continue;
      round(c, x, y - 3, 20, 7, 2, "#70b978");
      const sway = Math.sin(time * 2 + x) * .13;
      leaf(c, x + 6, y - 8, 9, "#b2d983", -1 + sway); leaf(c, x + 14, y - 6, 8, "#80c777", 1 + sway);
      if (x % 80 === 0) { ellipse(c, x + 10, y - 15, 4, 4, "#fae0ac"); ellipse(c, x + 10, y - 15, 1.8, 1.8, "#c39a53"); }
    }
    for (const a of g.gimmicks) if (a.x + a.w > camera - 80 && a.x < camera + width + 80) gimmick(c, a, time);
    if (g.stage.boss) {
      const arena = g.stage.platforms.at(-1);
      for (const x of [arena.x + 12, arena.x + arena.w - 35]) {
        round(c, x, P.FLOOR - 180, 22, 180, 3, b.near);
        round(c, x - 7, P.FLOOR - 188, 36, 15, 3, b.edge);
        c.fillStyle = b.accent; c.beginPath(); c.moveTo(x + 22, P.FLOOR - 167); c.lineTo(x + 70, P.FLOOR - 153); c.lineTo(x + 22, P.FLOOR - 132); c.fill();
      }
      if (g.enemies.some(e => e.boss && e.alive)) {
        const x = g.stage.goalX - 90;
        c.strokeStyle = `${b.accent}aa`; c.lineWidth = 3;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + Math.sin(time * 3 + i) * 7, P.FLOOR - i * 35); c.lineTo(x + Math.sin(time * 3 + i + 1) * 7, P.FLOOR - (i + 1) * 35); c.stroke(); }
      }
    }
    tree(c, g.stage.goalX + 30, P.FLOOR, .9, "#76b16b", time);
    for (const gem of g.crystals) {
      c.fillStyle = "#ffdc8e"; c.beginPath(); c.moveTo(gem.x + 8, gem.y - 2); c.lineTo(gem.x + 16, gem.y + 9); c.lineTo(gem.x + 8, gem.y + 20); c.lineTo(gem.x, gem.y + 9); c.fill();
    }
    for (const e of g.enemies) if (e.alive && e.x > camera - 120 && e.x < camera + width + 120) enemy(c, e, time, b);
    for (const h of g.hazards) {
      if (h.delay > 0) { round(c, h.x - 8, P.FLOOR - 4, h.w + 16, 6, 3, Math.floor(time * 8) % 2 ? "#f9c065" : "#e47759"); continue; }
      if (h.kind === "icicle") { c.fillStyle = "#d0f8f3"; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + h.w, h.y); c.lineTo(h.x + h.w / 2, h.y + h.h); c.fill(); }
      else if (h.kind === "storm") round(c, h.x, h.y, h.w, h.h, 5, "#fff4a8");
      else if (h.kind === "poison") ellipse(c, h.x + h.w / 2, h.y + 5, h.w / 2, 10, "#b0c950bb");
      else { ellipse(c, h.x + h.w / 2, h.y + h.h / 2, h.w / 2 + 5, h.h / 2 + 5, "#f4d18b44"); ellipse(c, h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2, "#e5aa68"); }
    }
    for (const d of g.drops) { ellipse(c, d.x + 13, d.y + 13, 22 + Math.sin(time * 5) * 3, 22, "#ebffb144"); leaf(c, d.x + 13, d.y + 13, 14, "#e4f6a7"); }
    for (const s of g.shots) leaf(c, s.x + 9, s.y + 6, 12, "#d5ee93", time * 8);
    robot(c, pForRender(g.player), time);
    for (const a of g.particles) { c.globalAlpha = Math.min(1, a.life * 2); leaf(c, a.x, a.y, a.size, a.color, a.life * 8); }
    c.globalAlpha = 1; c.restore();
  }
  function pForRender(p) { return p; }
  window.ParadiseArt = { render, tree, robot, leaf };
})();
