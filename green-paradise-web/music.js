(function (root) {
  "use strict";
  // Original short scores: each region has its own melody, rhythm and voicing.
  const TRACKS = [
    { name: "芽ぶきのマーチ", stepMs: 260, wave: "triangle", bass: [48,53,55,48], notes: [72,76,79,null,76,74,72,67,69,72,76,null,74,71,67,null] },
    { name: "砂のキャラバン", stepMs: 310, wave: "triangle", bass: [45,45,46,52], notes: [69,70,73,76,null,73,70,69,64,null,69,73,70,64,65,null] },
    { name: "水晶のこだま", stepMs: 380, wave: "sine", bass: [48,51,56,55], notes: [84,null,79,75,null,82,79,null,87,null,82,79,75,null,74,null] },
    { name: "歯車ビート", stepMs: 185, wave: "square", bass: [40,40,43,47], notes: [64,64,null,67,64,71,null,67,62,62,null,65,62,69,67,null] },
    { name: "きのこワルツ", stepMs: 340, wave: "triangle", bass: [50,53,55,57], meter: 3, notes: [74,77,81,77,null,74,72,76,79,76,null,72,70,74,77,76,74,null] },
    { name: "雪のランタン", stepMs: 410, wave: "sine", bass: [53,48,50,55], notes: [77,null,81,84,86,null,84,81,79,null,77,74,76,79,77,null] },
    { name: "峡谷の追い風", stepMs: 210, wave: "sawtooth", bass: [43,48,46,50], notes: [79,74,77,79,82,null,81,79,77,74,72,74,77,79,74,null] },
    { name: "ほたるの星図", stepMs: 360, wave: "sine", bass: [45,48,53,52], notes: [81,null,76,79,83,null,81,76,84,null,83,79,76,null,74,76] },
    { name: "空の神殿", stepMs: 300, wave: "triangle", bass: [48,55,57,53], notes: [72,79,84,null,83,79,76,72,77,84,89,null,88,84,79,null] },
    { name: "さいごの希望", stepMs: 230, wave: "triangle", bass: [45,53,48,55], notes: [69,72,76,81,79,76,74,72,77,81,84,88,86,84,81,null,79,76,72,74,76,79,81,null] },
  ];
  const common = {
    title: [60,64,67,72,71,67,64,62], shop: [65,69,72,69,67,64,62,64],
    clear: [60,64,67,72,76,74,72,79], lost: [64,62,60,55,57,55,52,48], ending: [60,64,67,72,69,72,76,79],
  };
  function select(theme, region = 0) {
    if (theme === "stage") return TRACKS[region] || TRACKS[0];
    const notes = common[theme] || common.title;
    return { name: theme, notes, stepMs: 360, wave: "triangle", bass: [notes[0] - 24] };
  }
  const api = { TRACKS, select };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParadiseMusic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
