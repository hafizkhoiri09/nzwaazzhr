const scene = document.getElementById("scene");
      const lightSwitch = document.getElementById("light-switch");
      const switchState = document.getElementById("switch-state");
      const status = document.getElementById("status");
      const canvas = document.getElementById("stars");
      const context = canvas.getContext("2d");
      const loveCanvas = document.getElementById("love-animation");
      const loveContext = loveCanvas.getContext("2d");
      const loveHeading = document.querySelector(".heading h1");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let particles = [];
      let width = 0;
      let height = 0;
      let frameId = 0;
      let loveFrameId = 0;
      let lovePhase = "reveal";
      let lovePhaseStarted = 0;
      let loveActive = false;
      let textDebris = [];
      let textDebrisStarted = 0;
      let impactParticles = [];

      const lovePhases = {
        reveal: { duration: 1100, next: "glow" },
        glow: { duration: 1800, next: "shatter" },
        shatter: { duration: 1100, next: "beam" },
        beam: { duration: 420, next: "impact" },
        impact: { duration: 850, next: "linger" },
        linger: { duration: 450, next: "return" },
        return: { duration: 1100, next: "glow" },
      };

      function setLight(isOn) {
        scene.classList.toggle("is-on", isOn);
        document.body.classList.toggle("is-on", isOn);
        lightSwitch.setAttribute("aria-checked", String(isOn));
        lightSwitch.setAttribute("aria-label", isOn ? "Matikan lampu" : "Nyalakan lampu");
        switchState.textContent = isOn ? "ON" : "OFF";
        status.textContent = isOn ? "Lampu menyala. I LOVE YOU ♥" : "Lampu sedang mati.";
        if (isOn && !reduceMotion.matches) {
          startLoveAnimation();
        } else {
          stopLoveAnimation();
        }
      }

      function startLoveAnimation() {
        if (loveActive) return;
        loveActive = true;
        lovePhase = "reveal";
        lovePhaseStarted = performance.now();
        textDebris = [];
        impactParticles = [];
        loveFrameId = window.requestAnimationFrame(renderLoveAnimation);
      }

      function stopLoveAnimation() {
        loveActive = false;
        window.cancelAnimationFrame(loveFrameId);
        loveContext.clearRect(0, 0, width, height);
        textDebris = [];
        impactParticles = [];
      }

      function enterLovePhase(nextPhase, timestamp) {
        lovePhase = nextPhase;
        lovePhaseStarted = timestamp;
        if (nextPhase === "shatter") createTextDebris();
        if (nextPhase === "impact") createImpactParticles();
      }

      function createTextDebris() {
        textDebrisStarted = lovePhaseStarted;
        const bounds = loveHeading.getBoundingClientRect();
        const style = window.getComputedStyle(loveHeading);
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const fontSize = parseFloat(style.fontSize);
        const buffer = document.createElement("canvas");
        const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
        if (!bufferContext) throw new Error("Unable to create the text particle canvas.");

        bufferContext.font = font;
        bufferContext.textAlign = "center";
        bufferContext.textBaseline = "middle";
        if ("letterSpacing" in bufferContext) bufferContext.letterSpacing = style.letterSpacing;
        const textWidth = Math.ceil(bufferContext.measureText("I LOVE YOU").width + fontSize);
        const textHeight = Math.ceil(fontSize * 1.55);
        buffer.width = textWidth;
        buffer.height = textHeight;
        bufferContext.font = font;
        bufferContext.textAlign = "center";
        bufferContext.textBaseline = "middle";
        if ("letterSpacing" in bufferContext) bufferContext.letterSpacing = style.letterSpacing;
        bufferContext.fillStyle = "#fff";
        bufferContext.fillText("I LOVE YOU", textWidth / 2, textHeight / 2);

        const pixels = bufferContext.getImageData(0, 0, textWidth, textHeight).data;
        const points = [];
        for (let y = 0; y < textHeight; y += 4) {
          for (let x = 0; x < textWidth; x += 4) {
            if (pixels[(y * textWidth + x) * 4 + 3] > 100) points.push({ x, y });
          }
        }

        const originX = bounds.left + bounds.width / 2 - textWidth / 2;
        const originY = bounds.top + bounds.height / 2 - textHeight / 2;
        textDebris = points.map((point) => {
          const angle = Math.atan2(point.y - textHeight / 2, point.x - textWidth / 2) + (Math.random() - 0.5) * 1.6;
          const speed = 35 + Math.random() * 145;
          return {
            x: originX + point.x,
            y: originY + point.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 16,
            size: 1 + Math.random() * 2.1,
            alpha: 0.55 + Math.random() * 0.45,
          };
        });
      }

      function createImpactParticles() {
        const x = width / 2;
        const y = height / 2;
        impactParticles = Array.from({ length: 64 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 45 + Math.random() * 220;
          return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.2 + Math.random() * 2.5,
            alpha: 0.55 + Math.random() * 0.45,
            hue: Math.random() < 0.72 ? 42 : 330,
          };
        });
      }

      function drawText(timestamp, phaseProgress) {
        const bounds = loveHeading.getBoundingClientRect();
        const style = window.getComputedStyle(loveHeading);
        const phaseTime = timestamp - lovePhaseStarted;
        let alpha = 0;
        let glow = 0.55;

        if (lovePhase === "reveal") {
          alpha = Math.min(1, phaseProgress * 1.35);
        } else if (lovePhase === "glow") {
          alpha = 1;
          glow = 0.7 + Math.sin(phaseTime / 160) * 0.3;
        } else if (lovePhase === "shatter") {
          alpha = 1 - Math.min(1, Math.max(0, (phaseProgress - 0.28) / 0.72));
          glow = 1 - phaseProgress;
        } else if (lovePhase === "return") {
          alpha = Math.min(1, phaseProgress * 1.2);
          glow = 0.45 + phaseProgress * 0.5;
        } else if (lovePhase === "beam" || lovePhase === "impact" || lovePhase === "linger") {
          alpha = 0;
        }

        if (alpha > 0) {
          loveContext.save();
          loveContext.globalAlpha = alpha;
          loveContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          loveContext.textAlign = "center";
          loveContext.textBaseline = "middle";
          if ("letterSpacing" in loveContext) loveContext.letterSpacing = style.letterSpacing;
          loveContext.fillStyle = "#ffb84d";
          loveContext.shadowColor = "#ff9d35";
          loveContext.shadowBlur = 10 + glow * 28;
          loveContext.fillText("I LOVE YOU", bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
          loveContext.restore();
        }

        if (lovePhase === "shatter" || lovePhase === "beam" || lovePhase === "impact" || lovePhase === "linger") {
          const debrisAge = Math.max(0, (timestamp - textDebrisStarted - 250) / 1000);
          for (const particle of textDebris) {
            const fade = Math.max(0, 1 - debrisAge / 1.9);
            if (fade <= 0) continue;
            loveContext.beginPath();
            loveContext.fillStyle = `rgba(255, ${Math.round(174 + 55 * particle.alpha)}, 91, ${fade * particle.alpha})`;
            loveContext.shadowColor = "rgba(255, 176, 65, 0.9)";
            loveContext.shadowBlur = 8;
            loveContext.arc(
              particle.x + particle.vx * debrisAge,
              particle.y + particle.vy * debrisAge + 25 * debrisAge * debrisAge,
              particle.size * fade,
              0,
              Math.PI * 2,
            );
            loveContext.fill();
          }
          loveContext.shadowBlur = 0;
        }
      }

      function drawHeart(x, y, size, alpha, shake = 0, pulse = 1) {
        loveContext.save();
        loveContext.translate(x + (Math.random() - 0.5) * shake, y + (Math.random() - 0.5) * shake);
        loveContext.scale((size * pulse) / 32, (size * pulse) / 32);
        loveContext.globalAlpha = alpha;
        loveContext.beginPath();
        loveContext.moveTo(0, 27);
        loveContext.bezierCurveTo(-4, 23, -25, 10, -25, -3);
        loveContext.bezierCurveTo(-25, -20, -5, -24, 0, -10);
        loveContext.bezierCurveTo(5, -24, 25, -20, 25, -3);
        loveContext.bezierCurveTo(25, 10, 4, 23, 0, 27);
        loveContext.closePath();
        loveContext.fillStyle = "#ff70a6";
        loveContext.shadowColor = "#ff3c8b";
        loveContext.shadowBlur = 25 * alpha;
        loveContext.fill();
        loveContext.restore();
      }

      function drawBeam(progress) {
        const heartX = width / 2;
        const heartY = height / 2;
        const eased = 1 - Math.pow(1 - progress, 3);
        const headX = -width * 0.1 + (heartX + width * 0.1) * eased;
        loveContext.save();
        loveContext.lineCap = "round";
        loveContext.strokeStyle = "rgba(255, 188, 79, 0.45)";
        loveContext.lineWidth = 13;
        loveContext.shadowColor = "#ffe6a2";
        loveContext.shadowBlur = 26;
        loveContext.beginPath();
        loveContext.moveTo(-width * 0.1, heartY);
        loveContext.lineTo(headX, heartY);
        loveContext.stroke();
        loveContext.strokeStyle = "#fff8d9";
        loveContext.lineWidth = 3;
        loveContext.shadowBlur = 14;
        loveContext.beginPath();
        loveContext.moveTo(-width * 0.1, heartY);
        loveContext.lineTo(headX, heartY);
        loveContext.stroke();
        loveContext.restore();
      }

      function drawImpact(timestamp, progress) {
        const x = width / 2;
        const y = height / 2;
        const strength = Math.max(0, 1 - progress);
        const shake = strength * 12;

        loveContext.save();
        loveContext.globalAlpha = strength * 0.6;
        loveContext.fillStyle = "#fff2c7";
        loveContext.shadowColor = "#ffbd4f";
        loveContext.shadowBlur = 45;
        loveContext.beginPath();
        loveContext.arc(x, y, 22 + progress * 45, 0, Math.PI * 2);
        loveContext.fill();
        loveContext.restore();

        for (let ring = 0; ring < 3; ring += 1) {
          const ringProgress = Math.min(1, progress * 1.35 - ring * 0.18);
          if (ringProgress <= 0) continue;
          loveContext.beginPath();
          loveContext.strokeStyle = `rgba(255, ${210 - ring * 22}, ${244 - ring * 10}, ${(1 - ringProgress) * 0.8})`;
          loveContext.lineWidth = 3 - ringProgress * 2;
          loveContext.shadowColor = "#ffb3da";
          loveContext.shadowBlur = 15;
          loveContext.ellipse(x, y, 22 + ringProgress * 130, 12 + ringProgress * 60, 0, 0, Math.PI * 2);
          loveContext.stroke();
        }
        loveContext.shadowBlur = 0;

        drawHeart(x, y, 52, 1, shake, 1 + strength * 0.45);
        const particleAge = Math.max(0, (timestamp - lovePhaseStarted) / 1000);
        for (const particle of impactParticles) {
          const fade = Math.max(0, 1 - particleAge / 1.25);
          if (fade <= 0) continue;
          loveContext.beginPath();
          loveContext.fillStyle = `hsla(${particle.hue}, 100%, 76%, ${fade * particle.alpha})`;
          loveContext.shadowColor = `hsla(${particle.hue}, 100%, 70%, 0.9)`;
          loveContext.shadowBlur = 11;
          loveContext.arc(
            particle.x + particle.vx * particleAge,
            particle.y + particle.vy * particleAge + 34 * particleAge * particleAge,
            particle.size * fade,
            0,
            Math.PI * 2,
          );
          loveContext.fill();
        }
        loveContext.shadowBlur = 0;
      }

      function renderLoveAnimation(timestamp) {
        if (!loveActive) return;
        let phaseDuration = lovePhases[lovePhase].duration;
        while (timestamp - lovePhaseStarted >= phaseDuration) {
          const nextPhase = lovePhases[lovePhase].next;
          lovePhaseStarted += phaseDuration;
          enterLovePhase(nextPhase, lovePhaseStarted);
          phaseDuration = lovePhases[lovePhase].duration;
        }

        const progress = Math.min(1, (timestamp - lovePhaseStarted) / phaseDuration);
        loveContext.clearRect(0, 0, width, height);
        drawText(timestamp, progress);

        const heartX = width / 2;
        const heartY = height / 2;
        if (lovePhase === "beam") {
          drawHeart(heartX, heartY, 43, 0.9);
          drawBeam(progress);
        } else if (lovePhase === "impact") {
          drawImpact(timestamp, progress);
        } else if (lovePhase === "linger") {
          drawHeart(heartX, heartY, 48, 0.95);
        } else {
          drawHeart(heartX, heartY, 38, 0.52);
        }

        loveFrameId = window.requestAnimationFrame(renderLoveAnimation);
      }

      function resizeCanvas() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        loveCanvas.width = Math.round(width * pixelRatio);
        loveCanvas.height = Math.round(height * pixelRatio);
        loveContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const count = Math.min(90, Math.max(32, Math.round((width * height) / 14000)));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.5 + Math.random() * 1.15,
          alpha: 0.22 + Math.random() * 0.65,
          speed: 0.08 + Math.random() * 0.22,
          drift: (Math.random() - 0.5) * 0.12,
        }));
        drawParticles(!reduceMotion.matches);
      }

      function drawParticles(animate) {
        context.clearRect(0, 0, width, height);
        for (const particle of particles) {
          context.beginPath();
          context.fillStyle = `rgba(255, ${178 + Math.round(particle.alpha * 45)}, 92, ${particle.alpha})`;
          context.shadowColor = "rgba(255, 179, 78, 0.55)";
          context.shadowBlur = 7;
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();

          if (animate) {
            particle.y -= particle.speed;
            particle.x += particle.drift;
            if (particle.y < -3) {
              particle.y = height + 3;
              particle.x = Math.random() * width;
            }
            if (particle.x < -3) particle.x = width + 3;
            if (particle.x > width + 3) particle.x = -3;
          }
        }
        context.shadowBlur = 0;

        if (animate) {
          frameId = window.requestAnimationFrame(() => drawParticles(true));
        }
      }

      function updateMotionPreference() {
        window.cancelAnimationFrame(frameId);
        drawParticles(!reduceMotion.matches);
        if (scene.classList.contains("is-on") && !reduceMotion.matches) {
          stopLoveAnimation();
          startLoveAnimation();
        } else {
          stopLoveAnimation();
        }
      }

      lightSwitch.addEventListener("click", () => {
        setLight(lightSwitch.getAttribute("aria-checked") !== "true");
      });
      window.addEventListener("resize", resizeCanvas);
      reduceMotion.addEventListener("change", updateMotionPreference);
      resizeCanvas();
