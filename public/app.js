const stepsRange = document.getElementById("stepsRange");
const minutesRange = document.getElementById("minutesRange");
const caloriesRange = document.getElementById("caloriesRange");

const stepsValue = document.getElementById("stepsValue");
const minutesValue = document.getElementById("minutesValue");
const caloriesValue = document.getElementById("caloriesValue");
const stageName = document.getElementById("stageName");
const stageText = document.getElementById("stageText");
const progressValue = document.getElementById("progressValue");
const progressFill = document.getElementById("progressFill");

const creature = document.getElementById("creature");
const zebraShell = document.getElementById("zebraShell");
const fatPit = document.getElementById("fatPit");
const boostButton = document.getElementById("boostButton");
const finishButton = document.getElementById("finishButton");

const midMilestone = document.getElementById("midMilestone");
const finalMilestone = document.getElementById("finalMilestone");
const unlockBurst = document.getElementById("unlockBurst");
const unlockFinal = document.getElementById("unlockFinal");

let lastProgress = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function computeProgress() {
  const stepsScore = (Number(stepsRange.value) / 20000) * 52;
  const minutesScore = (Number(minutesRange.value) / 140) * 23;
  const caloriesScore = (Number(caloriesRange.value) / 1200) * 25;

  return Math.round(clamp(stepsScore + minutesScore + caloriesScore, 0, 100));
}

function dropFatChunks(amount) {
  const chunkCount = clamp(Math.ceil(amount / 8), 1, 7);

  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = document.createElement("div");
    const size = 16 + Math.random() * 22;
    const offset = -110 + Math.random() * 220;
    const spin = `${-120 + Math.random() * 240}deg`;

    chunk.className = "fat-chunk";
    chunk.style.setProperty("--size", `${size}px`);
    chunk.style.setProperty("--drift-x", `${offset}px`);
    chunk.style.setProperty("--spin", spin);
    chunk.style.left = `${48 + Math.random() * 12}%`;

    fatPit.appendChild(chunk);
    window.setTimeout(() => {
      chunk.remove();
    }, 1500);
  }
}

function applyStage(progress) {
  let name = "超重斑馬";
  let text = "剛起跑，脂肪還黏在身上";
  let bodyScale = 1.16;
  let shellX = 0;
  let shellY = 0;
  let shellRotate = 0;
  let shellScale = 1;

  creature.classList.remove("is-mid", "is-bursting", "is-final");

  if (progress >= 82) {
    name = "鴨嘴獸";
    text = "外殼剝離完成，真正的進化生物已經出現";
    bodyScale = 0.86;
    shellX = 68;
    shellY = -16;
    shellRotate = 20;
    shellScale = 0.72;
    creature.classList.add("is-final");
  } else if (progress >= 52) {
    name = "裂殼斑馬";
    text = "每次同步都在甩脂，外殼已開始鬆動";
    bodyScale = 0.98;
    creature.classList.add("is-mid", "is-bursting");
  } else {
    bodyScale = 1.16 - progress * 0.0035;
  }

  if (progress >= 52 && progress < 82) {
    shellX = progress * 0.8;
    shellY = progress * -0.2;
    shellRotate = progress * 0.22;
    shellScale = 1 - progress * 0.0014;
  }

  zebraShell.style.setProperty("--shell-x", `${shellX}px`);
  zebraShell.style.setProperty("--shell-y", `${shellY}px`);
  zebraShell.style.setProperty("--shell-rotate", `${shellRotate}deg`);
  zebraShell.style.setProperty("--shell-scale", shellScale.toString());
  creature.style.setProperty("--creature-scale", bodyScale.toString());

  stageName.textContent = name;
  stageText.textContent = text;

  midMilestone.classList.toggle("active", progress >= 52);
  finalMilestone.classList.toggle("active", progress >= 82);
  unlockBurst.classList.toggle("active", progress >= 52);
  unlockFinal.classList.toggle("active", progress >= 82);
}

function updateDashboard() {
  const progress = computeProgress();
  const delta = progress - lastProgress;

  stepsValue.textContent = formatNumber(Number(stepsRange.value));
  minutesValue.textContent = formatNumber(Number(minutesRange.value));
  caloriesValue.textContent = formatNumber(Number(caloriesRange.value));

  progressValue.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;

  applyStage(progress);

  if (delta > 0) {
    dropFatChunks(delta);
  }

  lastProgress = progress;
}

function addBurst() {
  stepsRange.value = clamp(Number(stepsRange.value) + 1800, 0, 20000);
  minutesRange.value = clamp(Number(minutesRange.value) + 12, 0, 140);
  caloriesRange.value = clamp(Number(caloriesRange.value) + 110, 0, 1200);
  updateDashboard();
}

function jumpToFinal() {
  stepsRange.value = 18800;
  minutesRange.value = 126;
  caloriesRange.value = 1080;
  updateDashboard();
}

[stepsRange, minutesRange, caloriesRange].forEach((input) => {
  input.addEventListener("input", updateDashboard);
});

boostButton.addEventListener("click", addBurst);
finishButton.addEventListener("click", jumpToFinal);

lastProgress = computeProgress();
updateDashboard();
