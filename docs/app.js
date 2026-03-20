/* ─────────────────────────────────────────────
   Chubby Go — app.js
   Requires GSAP 3 (loaded via CDN before this file)
───────────────────────────────────────────── */

// ── Constants ──────────────────────────────────

const CAL_PER_STAGE   = 600;
const CAL_PER_NOTCH   = 200;   // zipper sub-steps within stage 4
const CAL_PER_FAT_BIT = 50;
const BITS_PER_EGG    = 10;

const WORKOUT_RATE = {
  walk: 3.6, run: 7.2, bike: 5.7, swim: 6.3, hiit: 9.3, gym: 5.1,
};

const STAGE_META = [
  null,
  { name: "超肥斑馬",   label: "Stage 1" },
  { name: "中型斑馬",   label: "Stage 2" },
  { name: "瘦斑馬",     label: "Stage 3" },
  { name: "拉鍊鬆開",   label: "Stage 4" },
  { name: "完整鴨嘴獸", label: "Stage 5" },
];

// px each half shifts outward at each zipper notch level (0–3)
const NOTCH_OFFSET = [0, 10, 22, 36];

// ── DOM refs ────────────────────────────────────

const scene            = document.getElementById("scene");
const fatLayer         = document.getElementById("fatLayer");
const fatPile          = document.getElementById("fatPile");
const pileCount        = document.getElementById("pileCount");
const flashOverlay     = document.getElementById("flashOverlay");

const stageBadge       = document.getElementById("stageBadge");
const stageName        = document.getElementById("stageName");
const progressBar      = document.getElementById("progressBar");
const progressLabel    = document.getElementById("progressLabel");
const zipperMarks      = document.getElementById("zipperMarks");

const fatBitCount      = document.getElementById("fatBitCount");
const fatEggCount      = document.getElementById("fatEggCount");
const collectionCount  = document.getElementById("collectionCount");
const fatEggCell       = document.getElementById("fatEggCell");
const collectionCell   = document.getElementById("collectionCell");

const workoutType      = document.getElementById("workoutType");
const minutesInput     = document.getElementById("minutesInput");
const minutesValue     = document.getElementById("minutesValue");
const calPreview       = document.getElementById("calPreview");
const syncButton       = document.getElementById("syncButton");

const eggModal         = document.getElementById("eggModal");
const eggSvg           = document.getElementById("eggSvg");
const eggCracks        = document.getElementById("eggCracks");
const eggArea          = document.getElementById("eggArea");
const hippoArea        = document.getElementById("hippoArea");
const openEggBtn       = document.getElementById("openEggBtn");
const closeEggBtn      = document.getElementById("closeEggBtn");

const collectionModal     = document.getElementById("collectionModal");
const collectionGrid      = document.getElementById("collectionGrid");
const closeCollectionBtn  = document.getElementById("closeCollectionBtn");

// ── State ───────────────────────────────────────

const DEFAULT_STATE = {
  totalCal:    0,
  fatBits:     0,    // current balance 0–9
  fatEggs:     0,
  collection:  [],   // array of timestamps (one per hippo unlocked)
};

function loadState() {
  try {
    const raw = localStorage.getItem("chubbygo_v2");
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (_) { /* ignore */ }
  return { ...DEFAULT_STATE };
}

function saveState() {
  localStorage.setItem("chubbygo_v2", JSON.stringify(state));
}

let state = loadState();

// ── Calculation helpers ─────────────────────────

function getStage(cal) {
  if (cal >= 2400) return 5;
  if (cal >= 1800) return 4;
  if (cal >= 1200) return 3;
  if (cal >= 600)  return 2;
  return 1;
}

function getStageProgress(cal, stage) {
  if (stage === 5) return 1;
  const stageStart = (stage - 1) * CAL_PER_STAGE;
  return Math.min((cal - stageStart) / CAL_PER_STAGE, 1);
}

function getZipperNotch(cal) {
  if (cal < 1800) return 0;
  return Math.min(Math.floor((cal - 1800) / CAL_PER_NOTCH), 3);
}

// ── Idle breathing ──────────────────────────────

let idleTween = null;

function startIdleBreathing(el) {
  if (idleTween) { idleTween.kill(); }
  if (!el || typeof gsap === "undefined") return;
  idleTween = gsap.to(el, {
    y: -5,
    duration: 1.8,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
}

// ── Show/hide stage groups ──────────────────────

let currentStageEl = null;

function showStage(num) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById("stage" + i);
    if (el) {
      el.style.display = i === num ? "" : "none";
      if (i === num) gsap.set(el, { x: 0, y: 0, scale: 1, opacity: 1 });
    }
  }
  currentStageEl = document.getElementById("stage" + num);
  startIdleBreathing(currentStageEl);
}

// ── Zipper (stage 4) ────────────────────────────

function applyZipperNotch(notch, animate) {
  const left  = document.getElementById("onesieHalfLeft");
  const right = document.getElementById("onesieHalfRight");
  const bill  = document.getElementById("billReveal");
  if (!left || !right) return;

  const offset = NOTCH_OFFSET[notch] || 0;
  const showBill = notch >= 2;

  if (animate) {
    gsap.to(left,  { x: -offset, duration: 0.45, ease: "back.out(1.5)" });
    gsap.to(right, { x:  offset, duration: 0.45, ease: "back.out(1.5)" });
    if (bill) gsap.to(bill, { opacity: showBill ? 1 : 0, duration: 0.4 });
  } else {
    gsap.set(left,  { x: -offset });
    gsap.set(right, { x:  offset });
    if (bill) gsap.set(bill, { opacity: showBill ? 1 : 0 });
  }
}

// ── Progress UI ─────────────────────────────────

function updateProgressUI() {
  const stage = getStage(state.totalCal);
  const meta  = STAGE_META[stage];
  stageBadge.textContent = meta.label;
  stageName.textContent  = meta.name;

  if (stage === 5) {
    progressBar.style.width      = "100%";
    progressLabel.textContent    = `${state.totalCal} kcal 🎉 蛻變完成！`;
    zipperMarks.style.display    = "none";
    return;
  }

  const fraction = getStageProgress(state.totalCal, stage);
  progressBar.style.width = `${(fraction * 100).toFixed(1)}%`;

  if (stage === 4) {
    zipperMarks.style.display = "";
    const notch = getZipperNotch(state.totalCal);
    const calInStage = state.totalCal - 1800;
    progressLabel.textContent = `${calInStage} / 600 kcal · 拉鍊 ${notch}/3`;
  } else {
    zipperMarks.style.display = "none";
    const stageStart  = (stage - 1) * CAL_PER_STAGE;
    const calInStage  = state.totalCal - stageStart;
    progressLabel.textContent = `${calInStage} / 600 kcal`;
  }
}

// ── Inventory UI ────────────────────────────────

function updateInventoryUI() {
  fatBitCount.textContent    = state.fatBits;
  fatEggCount.textContent    = state.fatEggs;
  collectionCount.textContent = state.collection.length;

  pileCount.textContent = `${state.totalCal} kcal`;
  const scale = Math.min(0.8 + state.totalCal / 3000, 2.0);
  fatPile.style.setProperty("--fat-scale", scale.toFixed(2));
}

// ── Full render (used on page load) ─────────────

function renderAll() {
  const stage = getStage(state.totalCal);
  showStage(stage);
  updateProgressUI();
  updateInventoryUI();
  if (stage === 4) {
    applyZipperNotch(getZipperNotch(state.totalCal), false);
  }
}

// ── Stage transition ────────────────────────────

function playStageTransition(fromStage, toStage, onDone) {
  // Screen flash
  gsap.fromTo(flashOverlay,
    { opacity: 0 },
    { opacity: 0.7, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => gsap.set(flashOverlay, { opacity: 0 }) }
  );

  // Burst fat bits outward from character center
  const svgRect   = document.getElementById("charSvg").getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();
  const cx = svgRect.left + svgRect.width  / 2 - sceneRect.left;
  const cy = svgRect.top  + svgRect.height / 2 - sceneRect.top;

  for (let i = 0; i < 14; i++) {
    const bit  = document.createElement("span");
    bit.className = "fat-bit";
    const size = 12 + Math.random() * 10;
    Object.assign(bit.style, {
      width:  size + "px",
      height: (size * 0.82) + "px",
      left:   cx + "px",
      top:    cy + "px",
    });
    fatLayer.appendChild(bit);

    const angle = (i / 14) * Math.PI * 2;
    const dist  = 55 + Math.random() * 45;
    gsap.fromTo(bit,
      { x: 0, y: 0, opacity: 1, scale: 0.5 },
      {
        x:        Math.cos(angle) * dist,
        y:        Math.sin(angle) * dist,
        opacity:  0,
        scale:    1,
        duration: 0.55 + Math.random() * 0.25,
        delay:    i * 0.03,
        ease:     "power2.out",
        onComplete: () => bit.remove(),
      }
    );
  }

  // Scale out old, swap, scale in new
  const fromEl = document.getElementById("stage" + fromStage);
  if (idleTween) { idleTween.kill(); }

  gsap.to(fromEl, {
    scale:    0.5,
    opacity:  0,
    duration: 0.35,
    ease:     "power2.in",
    onComplete() {
      gsap.set(fromEl, { scale: 1, opacity: 1, y: 0 });
      showStage(toStage);
      const toEl = document.getElementById("stage" + toStage);
      gsap.fromTo(toEl,
        { scale: 0.5, opacity: 0 },
        {
          scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)",
          onComplete: onDone,
        }
      );
    },
  });
}

// ── Zipper notch transition ─────────────────────

function playZipperNotch(notch, onDone) {
  // A few fat bits pop from center
  const svgRect   = document.getElementById("charSvg").getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();
  const cx = svgRect.left + svgRect.width  / 2 - sceneRect.left;
  const cy = svgRect.top  + svgRect.height * 0.45 - sceneRect.top;

  for (let i = 0; i < 5; i++) {
    const bit  = document.createElement("span");
    bit.className = "fat-bit";
    const size = 10 + Math.random() * 8;
    Object.assign(bit.style, {
      width:  size + "px",
      height: (size * 0.82) + "px",
      left:   cx + "px",
      top:    cy + "px",
    });
    fatLayer.appendChild(bit);
    gsap.fromTo(bit,
      { x: 0, y: 0, opacity: 1 },
      {
        x:        (Math.random() - 0.5) * 80,
        y:        -30 - Math.random() * 40,
        opacity:  0,
        duration: 0.6,
        ease:     "power2.out",
        onComplete: () => bit.remove(),
      }
    );
  }

  applyZipperNotch(notch, true);
  if (onDone) setTimeout(onDone, 500);
}

// ── Fat bits flying to pile ─────────────────────

function flyFatBits(count) {
  const svgRect   = document.getElementById("charSvg").getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();
  const startX = svgRect.left + svgRect.width  / 2 - sceneRect.left;
  const startY = svgRect.top  + svgRect.height / 2 - sceneRect.top;
  const endX   = sceneRect.width  * 0.84;
  const endY   = sceneRect.height * 0.86;

  const n = Math.min(count, 12);
  for (let i = 0; i < n; i++) {
    const bit  = document.createElement("span");
    bit.className = "fat-bit";
    const size = 14 + Math.random() * 10;
    Object.assign(bit.style, {
      width:  size + "px",
      height: (size * 0.82) + "px",
      left:   startX + "px",
      top:    startY + "px",
    });
    fatLayer.appendChild(bit);

    gsap.fromTo(bit,
      { x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, opacity: 0, scale: 0.4 },
      {
        delay:    i * 0.08,
        x:        endX - startX + (Math.random() - 0.5) * 24,
        y:        endY - startY + (Math.random() - 0.5) * 16,
        opacity:  1,
        scale:    1,
        duration: 0.85 + Math.random() * 0.3,
        ease:     "power2.inOut",
        onComplete: () => bit.remove(),
      }
    );
  }
}

// ── Workout input ───────────────────────────────

function computeCalories() {
  const mins = Number(minutesInput.value);
  const rate = WORKOUT_RATE[workoutType.value] || 3.6;
  return Math.round(mins * rate);
}

function updateCalPreview() {
  const cal  = computeCalories();
  const bits = Math.floor(cal / CAL_PER_FAT_BIT);
  if (cal <= 0) {
    calPreview.textContent = "請拖曳設定運動時間";
  } else {
    calPreview.textContent = `預計燃燒 ${cal} kcal，賺取 ${bits} 粒脂肪粒`;
  }
}

minutesInput.addEventListener("input", () => {
  minutesValue.textContent = minutesInput.value;
  updateCalPreview();
});

workoutType.addEventListener("change", updateCalPreview);

// ── Core: sync workout ──────────────────────────

function syncWorkout() {
  const cal = computeCalories();
  if (cal <= 0) return;

  const prevStage = getStage(state.totalCal);
  const prevNotch = getZipperNotch(state.totalCal);

  state.totalCal += cal;

  // Fat bits: count how many NEW bits were earned this workout
  const prevBitTotal = Math.floor((state.totalCal - cal) / CAL_PER_FAT_BIT);
  const newBitTotal  = Math.floor(state.totalCal / CAL_PER_FAT_BIT);
  const earnedBits   = newBitTotal - prevBitTotal;
  state.fatBits     += earnedBits;

  // Auto-convert full sets into eggs
  const eggsGained = Math.floor(state.fatBits / BITS_PER_EGG);
  if (eggsGained > 0) {
    state.fatBits  = state.fatBits % BITS_PER_EGG;
    state.fatEggs += eggsGained;
  }

  const newStage = getStage(state.totalCal);
  const newNotch = getZipperNotch(state.totalCal);

  saveState();

  // Fly fat bits toward pile
  if (earnedBits > 0) flyFatBits(earnedBits);

  if (newStage !== prevStage) {
    playStageTransition(prevStage, newStage, () => {
      updateProgressUI();
      updateInventoryUI();
      if (newStage === 4) applyZipperNotch(newNotch, false);
    });
  } else if (newStage === 4 && newNotch !== prevNotch) {
    playZipperNotch(newNotch, () => {
      updateProgressUI();
      updateInventoryUI();
    });
  } else {
    // Same stage — gentle bounce
    if (currentStageEl) {
      if (idleTween) idleTween.kill();
      gsap.fromTo(currentStageEl,
        { y: 0 },
        {
          y: -10, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1,
          onComplete: () => startIdleBreathing(currentStageEl),
        }
      );
    }
    updateProgressUI();
    updateInventoryUI();
  }
}

syncButton.addEventListener("click", syncWorkout);

// ── Fat egg modal ───────────────────────────────

function openEggModal() {
  if (state.fatEggs <= 0) return;
  // Reset visuals
  eggArea.style.display  = "block";
  hippoArea.style.display = "none";
  gsap.set(eggSvg,    { opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, x: 0 });
  gsap.set(eggCracks, { opacity: 0 });
  openEggBtn.disabled = false;
  eggModal.style.display = "flex";
  gsap.fromTo(".modal-box", { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.7)" });
}

openEggBtn.addEventListener("click", () => {
  openEggBtn.disabled = true;

  const tl = gsap.timeline();
  tl.to(eggSvg, { rotation: -10, duration: 0.08, ease: "none" })
    .to(eggSvg, { rotation:  10, duration: 0.08, ease: "none" })
    .to(eggSvg, { rotation: -14, duration: 0.10, ease: "none" })
    .to(eggSvg, { rotation:   0, duration: 0.10, ease: "power1.out" })
    .to(eggCracks, { opacity: 1, duration: 0.2 })
    .to(eggSvg, { scaleX: 1.2, scaleY: 0.85, duration: 0.12, ease: "power2.in" })
    .to(eggSvg, { opacity: 0, scaleY: 0, duration: 0.18, ease: "power2.in" })
    .call(() => {
      eggArea.style.display   = "none";
      hippoArea.style.display = "block";
      gsap.fromTo(hippoArea,
        { opacity: 0, scale: 0.4, y: 20 },
        { opacity: 1, scale: 1,   y:  0, duration: 0.55, ease: "back.out(1.8)" }
      );
      // Consume egg + add to collection
      state.fatEggs--;
      state.collection.push(Date.now());
      saveState();
      updateInventoryUI();
    });
});

closeEggBtn.addEventListener("click", () => {
  gsap.set(eggSvg, { opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 });
  eggModal.style.display = "none";
});

fatEggCell.addEventListener("click", openEggModal);

// ── Collection modal ────────────────────────────

function openCollectionModal() {
  collectionGrid.innerHTML = "";

  if (state.collection.length === 0) {
    collectionGrid.innerHTML =
      `<p class="empty-msg">還沒有收藏！<br>運動賺取脂肪粒，10 粒合成 1 顆蛋，打開後出現在這裡。</p>`;
  } else {
    state.collection.forEach((ts, idx) => {
      const item = document.createElement("div");
      item.className = "collection-item";
      item.innerHTML = `
        <svg viewBox="0 0 60 60" width="48" height="48">
          <ellipse cx="30" cy="38" rx="22" ry="17" fill="#9b78b8"/>
          <circle  cx="30" cy="22" r="14"           fill="#9b78b8"/>
          <circle  cx="25" cy="15" r="4"            fill="#7a58a0"/>
          <circle  cx="35" cy="15" r="4"            fill="#7a58a0"/>
          <circle  cx="24" cy="22" r="3"            fill="#1a1a1a"/>
          <circle  cx="36" cy="22" r="3"            fill="#1a1a1a"/>
          <circle  cx="25" cy="21" r="1"            fill="#fff"/>
          <circle  cx="37" cy="21" r="1"            fill="#fff"/>
        </svg>
        <span>肥河馬 #${idx + 1}</span>`;
      collectionGrid.appendChild(item);
    });
  }

  collectionModal.style.display = "flex";
  gsap.fromTo(".collection-modal .modal-box, #collectionModal .modal-box",
    { scale: 0.8, opacity: 0 },
    { scale: 1,   opacity: 1, duration: 0.3, ease: "back.out(1.5)" }
  );
}

closeCollectionBtn.addEventListener("click", () => {
  collectionModal.style.display = "none";
});

collectionCell.addEventListener("click", openCollectionModal);

// ── Init ────────────────────────────────────────

renderAll();
updateCalPreview();

// Entrance animation
gsap.from(".app-shell", { opacity: 0, y: 16, duration: 0.55, ease: "power2.out" });
