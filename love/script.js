(() => {
  const canvas = document.querySelector("#heart");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.querySelector(".stage");
  const replayButton = document.querySelector("#replay");
  const pauseButton = document.querySelector("#pause");
  const speedInput = document.querySelector("#speed");
  const glowInput = document.querySelector("#glow");
  const paletteInput = document.querySelector("#palette");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const translations = [
    "Я люблю тебя", "I love you", "Te amo", "Te quiero", "Je t’aime", "Ich liebe dich", "Ti amo", "Eu te amo",
    "我爱你", "愛してる", "사랑해", "أحبك", "मुझे तुमसे प्यार है", "আমি তোমাকে ভালোবাসি", "Tôi yêu bạn", "ฉันรักคุณ",
    "Seni seviyorum", "دوستت دارم", "אני אוהב אותך", "Ik hou van jou", "Kocham cię", "Я тебе кохаю", "Σ’ αγαπώ",
    "Rakastan sinua", "Jag älskar dig", "Nakupenda", "Mahal kita", "Te iubesc", "Miluji tě", "Szeretlek", "Volim te",
    "Ljubim te", "Ngiyakuthanda", "Mo nífẹ̀ẹ́ rẹ", "A hụrụ m gị n’anya", "Мен сені жақсы көремін", "Seni sevaman",
    "მიყვარხარ", "Ես քեզ սիրում եմ", "Би чамд хайртай", "म तिमीलाई माया गर्छु", "நான் உன்னை காதலிக்கிறேன்",
    "నేను నిన్ను ప్రేమిస్తున్నాను", "હું તને પ્રેમ કરું છું", "مجھے تم سے محبت ہے", "Waan ku jeclahay", "እወድሃለሁ"
  ];
  const colors = {
    violet: ["#A855F7", "#7C3AED", "#C084FC"],
    green: ["#39FF88", "#00FFB3", "#B4FF65"]
  };
  let particles = [];
  let width = 0;
  let height = 0;
  let scale = 1;
  let startTime = performance.now();
  let lastTime = startTime;
  let elapsed = 0;
  let paused = false;
  let animationFrame = 0;
  let controlsTimer = 0;
  let currentDpr = 1;
  const duration = 10000;

  function heartEquation(x, y) {
    const sum = x * x + y * y - 1;
    return sum * sum * sum - x * x * y * y * y;
  }

  function insideHeart(x, y) {
    return heartEquation(x, y) <= 0;
  }

  function makeParticles() {
    const fontSize = Math.max(7, Math.min(11, scale * 0.034));
    const rowStep = fontSize * 1.38;
    const rows = [];

    for (let screenY = -scale * 1.22; screenY <= scale * 0.98; screenY += rowStep) {
      const normalizedY = -screenY / scale;
      const intervals = [];
      let intervalStart = null;
      for (let x = -1.2; x <= 1.2; x += 0.006) {
        const isInside = insideHeart(x, normalizedY);
        if (isInside && intervalStart === null) intervalStart = x;
        if (!isInside && intervalStart !== null) {
          intervals.push([intervalStart, x]);
          intervalStart = null;
        }
      }
      if (intervalStart !== null) intervals.push([intervalStart, 1.2]);
      intervals.forEach(([left, right]) => {
        if ((right - left) * scale > fontSize * 0.6) {
          rows.push({ y: screenY, left: left * scale, right: right * scale });
        }
      });
    }

    const baseSize = Math.max(5, fontSize * 0.82);
    ctx.font = `400 ${baseSize}px "JetBrains Mono", "Fira Code", Consolas, monospace`;
    const shortestWidth = Math.min(...translations.map(text => ctx.measureText(text).width));
    const result = [];
    let phraseCursor = 0;
    const placedTranslations = new Set();

    rows.forEach((row, rowIndex) => {
      const rowWidth = row.right - row.left;
      const padding = Math.min(fontSize * 0.22, rowWidth * 0.08);
      const availableWidth = rowWidth - padding * 2;
      const rowSize = Math.max(3.2, Math.min(baseSize, baseSize * availableWidth / (shortestWidth + baseSize * 0.7)));
      const gap = rowSize * 0.42;
      ctx.font = `400 ${rowSize}px "JetBrains Mono", "Fira Code", Consolas, monospace`;
      const line = [];
      let usedWidth = 0;
      let attempts = 0;

      while (attempts < translations.length * 2) {
        let next = null;
        for (let offset = 0; offset < translations.length; offset += 1) {
          const index = (phraseCursor + offset) % translations.length;
          if (placedTranslations.has(index)) continue;
          const text = translations[index];
          const textWidth = ctx.measureText(text).width;
          const leadingGap = line.length ? gap : 0;
          if (usedWidth + leadingGap + textWidth <= availableWidth) {
            next = { text, width: textWidth, index };
            break;
          }
        }
        if (!next) {
          for (let offset = 0; offset < translations.length; offset += 1) {
            const index = (phraseCursor + offset) % translations.length;
            const text = translations[index];
            const textWidth = ctx.measureText(text).width;
            const leadingGap = line.length ? gap : 0;
            if (usedWidth + leadingGap + textWidth <= availableWidth) {
              next = { text, width: textWidth, index };
              break;
            }
          }
        }
        if (!next) break;

        if (line.length) usedWidth += gap;
        line.push(next);
        usedWidth += next.width;
        placedTranslations.add(next.index);
        phraseCursor = (next.index + 1) % translations.length;
        attempts += 1;
      }

      let x = row.left + (rowWidth - usedWidth) / 2;
      line.forEach((phrase, phraseIndex) => {
        if (phraseIndex) x += gap;
        const normalizedX = (x + phrase.width / 2) / scale;
        const rowY = -row.y / scale;
        const centerDepth = 1 - Math.min(1, Math.abs(normalizedX) / 1.17);
        const verticalDepth = 1 - Math.min(1, Math.abs(rowY - 0.08) / 1.05);
        const innerness = Math.max(0, Math.min(1, (centerDepth * 0.57 + verticalDepth * 0.43)));
        const colorGroup = Math.random() < 0.58 ? "violet" : "green";
        result.push({
          text: phrase.text,
          x: x + phrase.width / 2,
          y: row.y,
          size: rowSize,
          color: colors[colorGroup][Math.floor(Math.random() * colors[colorGroup].length)],
          colorGroup,
          delay: 450 + (innerness * 0.34 + Math.random() * 0.66) * 8300 + Math.random() * 550,
          drift: Math.random() * Math.PI * 2,
          flicker: Math.random() * Math.PI * 2,
          brightness: 0.76 + Math.random() * 0.24
        });
        x += phrase.width;
      });
    });
    return result;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    currentDpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * currentDpr);
    canvas.height = Math.round(height * currentDpr);
    ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    const heartHeight = Math.min(height * 0.69, width * 0.94 / 1.3);
    scale = heartHeight / 2.2;
    particles = makeParticles();
    draw(elapsed, performance.now());
  }

  function particleColor(particle, time) {
    if (paletteInput.value === "violet") return particle.colorGroup === "green" ? "#A855F7" : particle.color;
    if (particle.colorGroup === "green" && particle.color === "#B4FF65") return "#B4FF65";
    return particle.color;
  }

  function draw(timeElapsed, now) {
    ctx.fillStyle = "#030305";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    const speed = Number(speedInput.value);
    const glow = Number(glowInput.value);
    const motionScale = reducedMotion.matches ? 0 : 1;
    const heartGlow = Math.min(1, Math.max(0, (timeElapsed - duration * 0.55) / (duration * 0.45)));

    for (const particle of particles) {
      const localTime = (timeElapsed * speed - particle.delay) / 500;
      if (localTime <= 0) continue;
      const reveal = Math.min(1, localTime);
      const fade = reveal * reveal * (3 - 2 * reveal);
      const flicker = 0.88 + Math.sin(now * 0.0022 + particle.flicker) * 0.12 * motionScale;
      const drift = Math.sin(now * 0.0007 + particle.drift) * 0.65 * motionScale;
      const alpha = Math.min(1, fade * particle.brightness * flicker);
      const color = particleColor(particle, now);
      ctx.font = `400 ${particle.size}px "JetBrains Mono", "Fira Code", Consolas, monospace`;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow * (4 + heartGlow * 7) * (0.55 + particle.brightness * 0.45);
      ctx.fillText(particle.text, width / 2 + particle.x + drift, height / 2 + particle.y);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
  }

  function animate(now) {
    animationFrame = 0;
    if (paused) return;
    const delta = Math.min(48, now - lastTime);
    lastTime = now;
    elapsed += delta;
    draw(elapsed, now);
    if (elapsed >= duration && !reducedMotion.matches) {
      animationFrame = requestAnimationFrame(animate);
    } else if (elapsed < duration) {
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function restart() {
    elapsed = 0;
    startTime = performance.now();
    lastTime = startTime;
    if (paused) setPaused(false);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    draw(elapsed, startTime);
    animationFrame = requestAnimationFrame(animate);
    status.textContent = "Анимация формируется";
  }

  function setPaused(value) {
    paused = value;
    pauseButton.classList.toggle("is-paused", paused);
    pauseButton.setAttribute("aria-label", paused ? "Продолжить анимацию" : "Остановить анимацию");
    pauseButton.title = paused ? "Продолжить" : "Пауза";
    if (!paused) {
      lastTime = performance.now();
      if (!animationFrame) animationFrame = requestAnimationFrame(animate);
    } else if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function revealControls() {
    stage.classList.add("controls-visible");
    clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(() => {
      if (!stage.querySelector(".controls:focus-within")) stage.classList.remove("controls-visible");
    }, 2600);
  }

  replayButton.addEventListener("click", restart);
  pauseButton.addEventListener("click", () => setPaused(!paused));
  paletteInput.addEventListener("change", () => draw(elapsed, performance.now()));
  speedInput.addEventListener("input", revealControls);
  glowInput.addEventListener("input", () => draw(elapsed, performance.now()));
  window.addEventListener("pointermove", revealControls, { passive: true });
  window.addEventListener("pointerdown", revealControls, { passive: true });
  window.addEventListener("keydown", revealControls);
  window.addEventListener("resize", resize, { passive: true });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      elapsed = duration;
      draw(elapsed, performance.now());
    } else if (!paused) {
      lastTime = performance.now();
      if (!animationFrame) animationFrame = requestAnimationFrame(animate);
    }
  });

  resize();
  if (reducedMotion.matches) {
    elapsed = duration;
    draw(elapsed, performance.now());
  } else {
    animationFrame = requestAnimationFrame(animate);
  }
})();
