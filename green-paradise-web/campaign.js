(function (root) {
  "use strict";
  // Only released chapters belong here. Future chapters supply their own content.
  const PART = { id: "part1", name: "第1部：失われた緑", first: 1, last: 50 };
  const ARCHIVES = [
    ["目覚め", "起動記録：GREEN。現在地、不明。生きた植物の反応は、ほとんどない。ぼくが歩いたあとにだけ、小さな芽が出た。"],
    ["止まった時計", "街の案内板。『次の春には、ここで花まつりを』。日付の先は読めない。誰もいない広場に、約束だけが残っている。"],
    ["消えた色", "観測記録：一晩で植物の光が弱まった。水も土もある。それなのに、何かが緑から力を奪っている。"],
    ["砂の町", "砂に埋まった家から、小さな靴が見つかった。ここは初めから砂漠だったわけではない。"],
    ["給水所", "最後の放送：『給水所は閉鎖します。住民は研究施設の指示を待ってください』。その後の放送は記録されていない。"],
    ["歩く影", "遠くで動く影が、鉢植えに手を伸ばした。葉がしおれると、その体が淡く光った。彼らは何を食べている？"],
    ["洞窟の配線", "水晶の下に、人工のケーブルが走っている。行き先の表示は『生命エネルギー観測室』。"],
    ["聞こえた声", "録音の中に、短い声が残っていた。『まだ、覚えている』。ノイズの向こうで、何かが壁をたたく。"],
    ["割れた名札", "落ちていた名札には人の名前。裏側には、敵の体に刻まれたものと同じ番号があった。偶然だろうか。"],
    ["放棄された工場", "機械は止まっているのに、地下へ伸びる管だけが振動している。緑から奪った力を、どこへ送っている？"],
    ["声紋照合", "古い端末：被験者の声紋は、登録市民のものと一致。外見の変化が進行。氏名の欄は黒く塗られている。"],
    ["空の作業服", "ロッカーに残った作業服と家族の絵。隣の検査室には、植物を吸収する生命体の図が貼ってある。"],
    ["湿地の観測", "敵が通ったあと、草だけが急に色を失った。機械のような体の奥から、呼吸のような音がする。"],
    ["面会の記録", "『面会を希望します。変わってしまっても、私の家族です』。申請書には、返事がない。"],
    ["閉ざされた病室", "ベッドの番号と、敵の印が一致した。グリーンは立ち止まる。この敵たちは、かつて人間だったのかもしれない。"],
    ["雪の診療所", "治療記録の隣に、研究主任の承認印がある。『適応処置を継続』。何に適応させようとしたのか、前のページはない。"],
    ["転送通知", "被験者を中央研究所へ移送。植物由来エネルギーの吸収を確認。家族への説明は保留。"],
    ["破れた写真", "科学者と研究員が並ぶ写真。科学者の手元には、枯れた枝。表情だけでは、何を考えているのかわからない。"],
    ["峡谷の導管", "緑を失った谷から、巨大な導管が研究施設に集まっている。流れを示す矢印は、すべて内向きだ。"],
    ["主任の署名", "人体の変化と吸収能力を記した報告。最後のページに、あの科学者の署名がある。彼がこの研究を進めたのだ。"],
    ["欠けた目的", "研究の目的：［データ破損］。手段だけが残り、理由は失われている。グリーンには、まだ全体が見えない。"],
    ["夜の研究棟", "自動警報：吸収された生命エネルギーの集積を検知。中央区画への立ち入りを禁止。"],
    ["計画の名前", "極秘計画：ゼロパラダイス。研究主任承認。被験体の力は、これまでのすべてを上回る。"],
    ["届かなかった停止命令", "制御系が応答しない。吸収範囲が施設の外へ拡大。停止命令を送信……応答なし。"],
    ["空の観測所", "衛星写真には、日に日に広がる灰色の地表。中央の点には『ZERO PARADISE』と表示されている。"],
    ["計測不能", "吸収量が計測上限を超えた。奪われた力は消えていない。中央の個体に、蓄えられている。"],
    ["最後の避難", "『研究主任、中央区画を封鎖してください』。返信は破損。封鎖された扉の向こうから、低い鼓動が響く。"],
    ["ゼロの庭", "木々の根が、巨大な装置へつながっている。ここは庭ではない。世界中の緑を集める、吸収の中心だ。"],
    ["最高傑作", "科学者の研究記録：最高傑作、ゼロパラダイス。次の行は焼けている。誇りだったのか、後悔だったのか。"],
    ["帰る場所", "解析完了。奪われた植物の力は、まだゼロパラダイスの中にある。解き放てば、大地に返せる。グリーンは最後の扉へ進む。"],
  ];
  const SECTION_NAMES = [
    ["目覚めの荒野", "眠る街の上と下", "はじめの観測所"],
    ["砂に沈む街道", "給水塔の回り道", "砂の避難所"],
    ["水晶の入口", "配線をたどる洞窟", "地下観測室"],
    ["止まった搬入口", "上下の作業通路", "放棄された検査棟"],
    ["灰色の湿地", "浮かぶ病棟跡", "閉ざされた病室"],
    ["雪の避難路", "凍った診療所", "移送基地"],
    ["導管の谷", "崖の点検通路", "主任の管理室"],
    ["夜の外周路", "隠された研究棟", "停止命令の端末"],
    ["空へ続く道", "観測所の回廊", "封鎖された中枢"],
    ["ゼロの外庭", "生命を運ぶ導管", "吸収炉の心臓"],
  ];
  const SIDE_ARCHIVES = [
    [["最後の植木鉢", "窓辺の土は乾いている。そこに残った根だけが、グリーンに反応した。世界の緑は、まだ完全には消えていない。"], ["観測員の疑問", "『雨量は例年と同じ。どうして草木だけが枯れる？』。答えのない調査メモが、風に揺れていた。"]],
    [["通学路", "砂の下から、横断歩道が現れた。かつて子どもたちがここを歩いた。今は足あとさえない。"], ["吸われた芽", "かすかな緑の光が、小さな芽から敵の胸へ流れた。グリーンの力とは、逆向きだ。"]],
    [["管理番号", "敵の腕に刻まれた印と、研究室の部屋番号が似ている。自然に生まれた印ではなさそうだ。"], ["食堂の録音", "録音：『帰りたい。自分の家へ』。この声の持ち主は、まだどこかにいるのだろうか。"]],
    [["外殻の設計図", "金属に見える敵の体。図面では『適応外殻』と呼ばれている。中身についての説明は、破り取られていた。"], ["検査前の名前", "検査台の番号を調べると、市民の名簿につながった。機械の部品表ではない。人の記録だった。"]],
    [["戻らない患者", "受付票には『経過観察のため移送』。退院した人の記録は、一件も見つからなかった。"], ["記憶の断片", "古い音声：『あの歌だけは忘れない』。かすれた鼻歌と、敵の鳴き声が少しだけ重なった。"]],
    [["処置室の窓", "分厚い窓に手の跡。外からは開かない。科学者の研究は、ここで暮らしていた人たちに何をしたのだろう。"], ["削られた報告", "吸収能力の数値だけは残っている。危険性の欄にも、研究主任の承認印。その先は読めない。"]],
    [["一方向の流れ", "導管の途中には、街への出口がない。集めた力はすべて、山の向こうへ運ばれている。"], ["封じられた議事録", "『主任の判断で継続』。反対意見のあった跡だけが残る。話し合われた理由は、暗号化されていた。"]],
    [["中央区画", "この区画だけ電力が生きている。誰もいない廊下で、吸収量の数字だけが増え続ける。"], ["隔離壁", "特別な個体を隔離するための壁。内側からひびが入っている。作った人にも、止められなかったのか。"]],
    [["届かない警報", "地表の植物反応が各地で低下。観測所は何度も警報を送ったが、中央から返答はない。"], ["閉じた退路", "研究員の避難経路は途中で途切れている。最後の送信は『吸収を止めろ』。時刻だけが点滅していた。"]],
    [["鼓動の部屋", "床の向こうで、大きな鼓動がする。世界から消えた緑の光が、そのたびに管を流れる。"], ["停止装置", "制御盤は壊れている。外から停止させる方法はない。グリーンは、自分の手に芽ぶく葉を見つめた。"]],
  ];
  const recordId = (stage, n) => `part1-${stage}-${n}`;
  const STORY_AREAS = [["目をさます大地"],["砂の下の暮らし"],["地下の光"],["止まった工場"],["水面の空"],["雪の道"],["風を渡る"],["夜を照らす"],["雲の向こう"],["最後の一歩"]];
  function story(stage, trigger) {
    if (!stage || stage.part !== PART.id || !["start", "goal", "boss"].includes(trigger)) return null;
    // Events show present-tense actions. Historical evidence belongs only to archives.
    const a = STORY_AREAS[stage.region];
    const actions = [
      ["風に押された小さな種が、グリーンの足元で止まった。", "いっしょに行こう。風に負けない場所を探そう。", "グリーンが手をひらく。種が風に乗り、明るくなった道へ飛んでいった。", "よし。ここなら、根を張れるね。"],
      ["砂風が吹きつける。グリーンは腕で目をかばい、一歩を踏み出した。", "あわてず、一歩ずつ。風が弱まったら進もう。", "砂の渦がほどけた。グリーンが立てた枝に、一枚の葉が揺れる。", "これで帰り道の目印ができた。"],
      ["足音が洞窟に響く。グリーンは立ち止まり、光る石を見上げた。", "ぼくの足音が、返ってくる。……よし、怖くない。", "天井から落ちた光の粒を、グリーンが両手で受け止めた。", "きれいだな。暗い場所にも、こんな光があるんだ。"],
      ["錆びた床がきしむ。グリーンはそっと足を置き、渡れる場所を探した。", "ここはゆっくり。足元を確かめよう。", "激しく揺れていた床が静まる。グリーンは奥の道へ向き直った。", "もう渡れそうだ。今のうちに進もう。"],
      ["波紋が足元に広がった。グリーンは水面に映る自分に手を振った。", "こんにちは、もうひとりのぼく。先へ行ってくるね。", "濁った波が引き、空の色が水面に戻った。", "水の向こうまで、よく見えるようになった！"],
      ["雪が肩に積もる。グリーンは体をふるわせて、白い粉を払った。", "冷たい！ 動いていれば、きっと大丈夫。", "舞い上がった雪が静かに降りる。グリーンは小さな雪山に手を添えた。", "ここで少し休もう。次の道も、まだ歩ける。"],
      ["強い風に体が傾く。グリーンは膝を曲げ、しっかり地面を踏んだ。", "風に合わせて……今だ！", "谷を渡る風が、グリーンの頭の葉を揺らした。", "ふう、踏んばれた。向こう岸まであと少し。"],
      ["暗い道で、グリーンの胸の光が灯った。小さな輪が足元を照らす。", "全部は見えなくても、次の一歩なら見える。", "揺れていた影が消える。グリーンは胸の光を少し強くした。", "もう大丈夫。帰るときも、この道を照らそう。"],
      ["雲の切れ間から道が現れた。グリーンは背伸びをして、先を見た。", "高いなあ……。遠くより、まず足元だね。", "雲が流れ、グリーンの姿を太陽が照らした。", "届いた！ こんなところまで、自分の足で来られた。"],
      ["低い振動に頭の葉が震える。グリーンは胸に手を当てた。", "ここまで歩いてきたんだ。最後まで、あきらめない。", "床の揺れが止まる。グリーンはゆっくりと手を下ろした。", "もう少しだけ、力を貸して。みんなのために。"],
    ][stage.region];
    const line = (speaker, text) => ({ speaker, text });
    let lines;
    if (stage.id === 50) {
      lines = trigger === "start" ? [line("ナレーション", "吸収炉の中心で、ゼロパラダイスが目を開いた。奪われた緑の光が、その体の奥で渦を巻いている。"), line("グリーン", "その光は、きみだけのものじゃない。みんなの帰る場所へ、返すんだ！")]
        : [line("ナレーション", "ゼロパラダイスの鼓動が止まる。ひび割れた体から、数えきれない緑の光があふれ出した。"), line("グリーン", "もう、閉じこめなくていい。さあ、みんな……大地へ帰ろう。")];
    } else if (trigger === "boss") {
      if (!stage.boss) return null;
      lines = [line("ナレーション", `${stage.boss.name}が倒れた。${actions[2]}`), line("グリーン", actions[3])];
    } else if (trigger === "goal") {
      lines = [line("ナレーション", "グリーンが大樹に手を伸ばす。枝からこぼれた光が、足元の道をやさしく照らした。"), line("グリーン", ["この木陰で、ひとやすみ。次の道はどっちかな？", "葉っぱが手を振ってる。ぼくも、またね！", "もう一歩歩く元気、もらったよ。ありがとう。", "ここを、ぼくらの休憩場所にしよう。", "さあ、次の場所へ。この景色は忘れないよ。"][stage.local])];
    } else {
      lines = [line("ナレーション", actions[0]), line("グリーン", stage.boss ? "大きな影が待ってる……。よし、準備はできた！" : actions[1])];
    }
    return { id: `${PART.id}-${stage.id}-${trigger}`, title: a[0], stage: stage.id, trigger, effect: trigger === "start" ? "depart" : trigger === "goal" ? "bloom" : "release", lines };
  }
  function validRecord(id) { return /^part1-(?:[1-9]|[1-4][0-9]|50)-0$/.test(id); }
  function record(id) {
    if (!validRecord(id)) return null;
    const [, stage] = id.split("-");
    const r = Math.floor((Number(stage) - 1) / 5);
    const local = (Number(stage) - 1) % 5;
    const [title, text] = local % 2 ? SIDE_ARCHIVES[r][Math.floor(local / 2)] : ARCHIVES[r * 3 + local / 2];
    return { id, stage: Number(stage), title, text };
  }
  function decorate(stage) {
    const ground = stage.platforms;
    stage.part = PART.id;
    stage.sections = [0, 1, 2].map(n => {
      const f = ground[Math.floor(n * (ground.length - 1) / 3)];
      return { x: f.x, name: SECTION_NAMES[stage.region][n], index: n };
    });
    stage.records = []; stage.checkpoints = []; stage.landmarks = [];
    const add = (kind, x, y, w, extra = {}) => stage.gimmicks.push({
      id: `expedition-${stage.gimmicks.length}`, kind, x, y, w, h: 16, range: 0, ...extra,
    });
    for (let n = 1; n < ground.length - 1; n++) {
      const f = ground[n];
      // Optional upper routes reconnect to the always-reachable ground route.
      if (n >= 4 && n < ground.length - 2 && n % 3 === 1) {
        add("moving", f.x + 18, f.y - 72, 100);
        add(n % 2 ? "moving" : "lift", f.x + 130, f.y - 148, 112, { range: n % 2 ? 20 : 24 });
        add("moving", f.x + 255, f.y - 205, 125);
        add("moving", f.x + f.w - 120, f.y - 64, ground[n + 1].x - f.x - f.w + 200);
        stage.crystals.push({ x: f.x + 306, y: f.y - 233, w: 16, h: 20 });
        stage.landmarks.push({ x: f.x + 140, y: f.y, type: "tower" });
      }
      if (n >= 4 && n % 5 === 2) {
        // A roof and a walkable lower passage form a genuine two-level fork.
        add("moving", f.x + 20, f.y - 70, 100);
        add("moving", f.x + 120, f.y - 145, Math.max(160, f.w - 140));
        add("brittle", f.x + 205, f.y - 62, 54, { h: 62, solid: true });
        stage.crystals.push({ x: f.x + 275, y: f.y - 32, w: 16, h: 20 });
        stage.landmarks.push({ x: f.x + 155, y: f.y, type: "shelter" });
      }
    }
    const stops = [Math.floor(ground.length / 3), Math.floor(ground.length * 2 / 3)];
    if (stage.boss) stops.push(ground.length - 2);
    stops.forEach(i => {
      const f = ground[i];
      stage.checkpoints.push({ x: f.x + 18, y: f.y, index: i });
      stage.enemies = stage.enemies.filter(e => e.platform !== i);
      stage.gimmicks = stage.gimmicks.filter(a => !(a.x >= f.x && a.x < f.x + 120));
    });
    stage.gimmicks = stage.gimmicks.filter(a => !a.link || stage.gimmicks.some(s => s.id === a.link));
    // A guaranteed supply teaches leaf use, while an optional target grants a reward.
    const supply = ground[Math.max(4, Math.floor(ground.length / 2))];
    stage.supply = { x: supply.x + 18, y: supply.y - 32, w: 26, h: 26 };
    stage.targets = [{ x: supply.x + 210, y: supply.y - 40, w: 28, h: 28 }];
    // Reserve a whole-height alcove, including moving platforms' swept bounds.
    // Decoration runs last so later hazards cannot cover the archive again.
    const preferred = Math.max(1, Math.floor((stage.local % 3 + .55) * (ground.length - 1) / 3));
    const candidates = ground.map((f, i) => i).filter(i => i > 0 && i < ground.length - 2 &&
      !stage.enemies.some(e => e.platform === i) && ground[i] !== supply && !stops.includes(i));
    const index = candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred))[0] ?? preferred;
    const f = ground[index], x = f.x + f.w * .65;
    const left = x - 100, right = x + 128;
    stage.gimmicks = stage.gimmicks.filter(a => a.x + a.w + (a.range || 0) <= left || a.x - (a.range || 0) >= right);
    stage.gimmicks = stage.gimmicks.filter(a => !a.link || stage.gimmicks.some(s => s.id === a.link));
    stage.enemies = stage.enemies.filter(e => e.platform !== index);
    stage.crystals = stage.crystals.filter(c => c.x + c.w <= left || c.x >= right);
    stage.landmarks = stage.landmarks.filter(l => Math.abs(l.x - x) > 250);
    stage.records.push({ ...record(recordId(stage.id, 0)), x, y: f.y - 36, w: 28, h: 36 });
    return stage;
  }
  function update(g, hooks) {
    const p = g.player;
    for (const r of g.stage.records) if (!g.collectedRecords.has(r.id) &&
      (!r.coverId || !g.gimmicks.some(a => a.id === r.coverId && a.active)) &&
      p.x < r.x + r.w && p.x + p.w > r.x && p.y < r.y + r.h && p.y + p.h > r.y) {
      g.collectedRecords.add(r.id); hooks.emit(g, "record", { record: r });
      hooks.particles(g, r.x + 14, r.y + 10, "#c4f5ef", 36);
    }
    for (const cp of g.stage.checkpoints) if (p.grounded && Math.abs(p.x - cp.x) < 65 &&
      Math.abs(p.y + p.h - cp.y) < 4 && (!g.checkpoint || cp.x > g.checkpoint.x)) {
      g.checkpoint = cp; p.hp = p.maxHp; hooks.emit(g, "checkpoint");
      hooks.particles(g, cp.x, cp.y - 40, "#d5f591", 20);
    }
    const s = g.stage.supply;
    if (!g.supplyTaken && p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
      g.supplyTaken = true; g.leaf = true; g.leafCharge = 3; hooks.emit(g, "pickup", { leaf: true });
    }
  }
  function retry(g) {
    if (!g.checkpoint) return false;
    const p = g.player, cp = g.checkpoint;
    Object.assign(p, { x: cp.x, y: cp.y - p.h, vx: 0, vy: 0, grounded: true, dive: false,
      hp: p.maxHp, invincible: 2, support: null, coyote: .1, jumpBuffer: 0 });
    g.state = "playing"; g.hazards = []; g.shots = []; g.events = [];
    g.arenaEntered = false; g.bossIntro = 0;
    for (const e of g.enemies) if (e.boss && e.alive) Object.assign(e, {
      hp: e.maxHp, x: e.baseX, y: e.baseY, cycle: 0, attack: 0, phase: 1,
      shield: false, recovery: 0, openTime: 0, warning: false,
    });
    return true;
  }
  const ENDING = [
    { at: 0, title: "奪われた光が、ほどけていく。", text: "ゼロパラダイスから、植物のエネルギーが空へ。\n長い間とらわれていた光が、大地へ帰っていく。" },
    { at: 6, title: "世界に、みどりが帰ってきた。", text: "灰色だった街に草が生え、森に葉がひらく。\nグリーンときみの足あとが、世界を救った。" },
    { at: 13, title: "……いま、動いた？", text: "生まれたばかりの芽が、見る間に大きくなる。\n森の奥で、一本の巨大なツタが静かに動いた。" },
    { at: 20, title: "遠く離れた研究施設。", text: "科学者が、植物の成長を示す画面を見つめる。\n数値が跳ね上がる。彼は何も言わず、立ち上がった。" },
    { at: 27, title: "第1部 おわり", text: "緑は帰ってきた。けれど、すべての答えはまだ見つかっていない。\nグリーンの旅は、この先へつづく。" },
  ];
  const api = { PART, ARCHIVES, SECTION_NAMES, validRecord, record, decorate, update, retry, ENDING, story };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParadiseCampaign = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
