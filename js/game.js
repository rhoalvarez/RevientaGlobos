
const COLORS = [
  "#62f3e5",
  "#a98bff",
  "#ff6b9a",
  "#ffd166",
  "#7dd3fc"
];

const rand = (min, max) =>
  Math.random() * (max - min) + min;

export class BalloonGame {

  constructor(canvas, duration = 30) {

    this.canvas = canvas;

    this.ctx = canvas.getContext(
      "2d",
      { alpha: false }
    );

    this.duration = duration;
    this.timeLeft = duration;

    this.score = 0;
    this.popped = 0;
    this.badHits = 0;

    this.state = "ready";

    this.balloons = [];
    this.particles = [];

    this.spawnTimer = 0;

    this.pointer = null;
    this.previousPointer = null;

    this.lastHit = 0;
    this.hitCooldown = 45;

    this.combo = 0;
    this.comboUntil = 0;

    this.flash = "";
    this.flashColor = "#ffffff";
    this.flashUntil = 0;

    this.bgStars = Array.from(
      { length: 55 },
      () => ({
        x: Math.random(),
        y: Math.random(),
        r: rand(0.4, 1.6),
        a: rand(0.1, 0.45)
      })
    );
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  start() {

    this.state = "playing";

    this.timeLeft = this.duration;

    this.spawnTimer = 0;

    this.balloons = [];
    this.particles = [];

    this.pointer = null;
    this.previousPointer = null;

    this.combo = 0;
  }

  stop() {
    this.state = "done";
  }

  update(dt, hand) {

    if (this.state !== "playing") return;

    dt = Math.min(dt, 0.04);

    this.timeLeft = Math.max(
      0,
      this.timeLeft - dt
    );

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.previousPointer = this.pointer;

    this.pointer = hand
      ? {
          x: hand.x * w,
          y: hand.y * h
        }
      : null;

    // Aparición rápida de globos.
    this.spawnTimer -= dt;

    if (
      this.spawnTimer <= 0 &&
      this.balloons.length < 16
    ) {

      this.spawnBalloon();

      this.spawnTimer = rand(
        0.22,
        0.40
      );

      if (
        this.balloons.length < 16 &&
        Math.random() < 0.45
      ) {
        this.spawnBalloon();
      }
    }

    // Movimiento de globos.
    for (
      let i = this.balloons.length - 1;
      i >= 0;
      i--
    ) {

      const b = this.balloons[i];

      b.y -= b.speed * dt;

      b.x +=
        Math.sin(
          (performance.now() / 1000 + b.phase) * 1.8
        ) * b.drift * dt;

      b.wobble += dt * 4;

      if (b.y + b.r < -30) {
        this.balloons.splice(i, 1);
      }
    }

    // Actualizar partículas.
    for (
      let i = this.particles.length - 1;
      i >= 0;
      i--
    ) {

      const p = this.particles[i];

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vy += 110 * dt;

      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.checkHit();
  }

  spawnBalloon() {

    const w = this.canvas.width;
    const h = this.canvas.height;

    const bad = Math.random() < 0.20;

    const r = rand(
      Math.max(25, w * 0.025),
      Math.max(34, w * 0.038)
    );

    this.balloons.push({

      x: rand(r + 8, w - r - 8),

      y: h + r + 10,

      r,

      speed: rand(170, 270),

      drift: rand(10, 28),

      phase: rand(0, 6),

      wobble: 0,

      color:
        COLORS[
          Math.floor(
            Math.random() * COLORS.length
          )
        ],

      bad

    });
  }

  checkHit() {

    if (!this.pointer) return;

    const now = performance.now();

    if (
      now - this.lastHit <
      this.hitCooldown
    ) return;

    const p = this.pointer;

    for (
      let i = this.balloons.length - 1;
      i >= 0;
      i--
    ) {

      const b = this.balloons[i];

      // Colisión entre la punta y el globo.
      const dx = p.x - b.x;
      const dy = p.y - b.y;

      const radius = b.r + 12;

      const directHit =
        dx * dx + dy * dy <= radius * radius;

      // También comprobar el recorrido del dedo
      // entre dos detecciones consecutivas.
      let sweptHit = false;

      if (this.previousPointer) {

        const a = this.previousPointer;

        const vx = p.x - a.x;
        const vy = p.y - a.y;

        const length = vx * vx + vy * vy;

        const t = length > 0
          ? Math.max(
              0,
              Math.min(
                1,
                ((b.x - a.x) * vx +
                  (b.y - a.y) * vy) / length
              )
            )
          : 0;

        const closestX = a.x + t * vx;
        const closestY = a.y + t * vy;

        const sx = b.x - closestX;
        const sy = b.y - closestY;

        sweptHit =
          sx * sx + sy * sy <= radius * radius;
      }

      if (directHit || sweptHit) {

        this.balloons.splice(i, 1);

        this.lastHit = now;

        if (b.bad) {

          this.score = Math.max(
            0,
            this.score - 150
          );

          this.badHits++;

          this.combo = 0;

          this.burst(
            b.x,
            b.y,
            "#ff304f",
            22
          );

          this.flash = "-150";
          this.flashColor = "#ff4f6d";

        } else {

          this.combo++;

          const bonus =
            this.combo >= 5 ? 50 :
            this.combo >= 3 ? 25 : 0;

          const points = 100 + bonus;

          this.score += points;

          this.popped++;

          this.burst(
            b.x,
            b.y,
            b.color,
            25
          );

          this.flash =
            bonus > 0
              ? `COMBO x${this.combo} +${points}`
              : "+100";

          this.flashColor = b.color;

          this.comboUntil = now + 1500;
        }

        this.flashUntil = now + 450;

        break;
      }
    }
  }

  burst(x, y, color, count) {

    for (let i = 0; i < count; i++) {

      const angle = rand(
        0,
        Math.PI * 2
      );

      const speed = rand(70, 280);

      this.particles.push({

        x,
        y,

        vx: Math.cos(angle) * speed,

        vy: Math.sin(angle) * speed,

        life: rand(0.3, 0.7),

        max: 0.7,

        size: rand(2, 6),

        color
      });
    }
  }

  draw() {

    const ctx = this.ctx;

    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = "#0a0e1c";

    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.45,
      10,
      w * 0.5,
      h * 0.45,
      Math.max(w, h) * 0.7
    );

    grad.addColorStop(0, "#192142");
    grad.addColorStop(1, "#080b16");

    ctx.fillStyle = grad;

    ctx.fillRect(0, 0, w, h);

    // Estrellas.
    for (const s of this.bgStars) {

      ctx.globalAlpha = s.a;

      ctx.fillStyle = "#d6e5ff";

      ctx.beginPath();

      ctx.arc(
        s.x * w,
        s.y * h,
        s.r * (Math.min(w, h) / 500),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Líneas de fondo.
    ctx.strokeStyle = "#a3b4ff0c";

    ctx.lineWidth = 1;

    for (let x = 0; x < w; x += 70) {

      ctx.beginPath();

      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);

      ctx.stroke();
    }

    // Globos.
    this.balloons.forEach(
      b => this.drawBalloon(b)
    );

    // Explosiones.
    this.particles.forEach(p => {

      ctx.globalAlpha = Math.max(
        0,
        p.life / p.max
      );

      ctx.fillStyle = p.color;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Cursor.
    if (this.pointer) {

      const p = this.pointer;

      ctx.save();

      ctx.shadowBlur = 22;
      ctx.shadowColor = "#61f2e5";

      ctx.strokeStyle = "#eaffff";
      ctx.lineWidth = 3;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        12,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.fillStyle = "#61f2e5";

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        4,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.restore();
    }

    // Mensajes de puntos y combos.
    if (
      this.flashUntil &&
      performance.now() < this.flashUntil
    ) {

      ctx.save();

      ctx.font =
        `700 ${Math.max(22, w * 0.035)}px sans-serif`;

      ctx.textAlign = "center";

      ctx.fillStyle = this.flashColor;

      ctx.shadowBlur = 18;
      ctx.shadowColor = this.flashColor;

      ctx.fillText(
        this.flash,
        w * 0.5,
        h * 0.19
      );

      ctx.restore();
    }

    // Combo activo.
    if (
      this.combo >= 3 &&
      performance.now() < this.comboUntil
    ) {

      ctx.save();

      ctx.font = "bold 17px sans-serif";

      ctx.fillStyle = "#ffd166";

      ctx.textAlign = "center";

      ctx.fillText(
        `RACHA: x${this.combo}`,
        w / 2,
        55
      );

      ctx.restore();
    }

    if (this.state === "ready") {

      ctx.fillStyle = "#fff";

      ctx.font = "700 28px sans-serif";

      ctx.textAlign = "center";

      ctx.fillText(
        "Preparados…",
        w / 2,
        h / 2
      );
    }
  }

  drawBalloon(b) {

    const ctx = this.ctx;

    ctx.save();

    ctx.translate(b.x, b.y);

    ctx.rotate(
      Math.sin(b.wobble + b.phase) * 0.06
    );

    const r = b.r;

    // Hilo.
    ctx.strokeStyle = "#ffffff70";

    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.moveTo(0, r * 0.85);

    ctx.quadraticCurveTo(
      8,
      r + 18,
      Math.sin(b.wobble) * 4,
      r + 35
    );

    ctx.stroke();

    // Degradado.
    const g = ctx.createRadialGradient(
      -r * 0.35,
      -r * 0.4,
      r * 0.08,
      0,
      0,
      r * 1.2
    );

    if (b.bad) {

      g.addColorStop(0, "#4b1b2b");
      g.addColorStop(0.55, "#17151f");
      g.addColorStop(1, "#03050b");

    } else {

      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.13, b.color);
      g.addColorStop(1, shade(b.color, -40));
    }

    ctx.shadowBlur = b.bad ? 20 : 24;

    ctx.shadowColor = b.bad
      ? "#ff294c"
      : b.color;

    ctx.fillStyle = g;

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      r * 0.78,
      r,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    // Nudo.
    ctx.beginPath();

    ctx.moveTo(-r * 0.12, r * 0.88);
    ctx.lineTo(0, r * 1.04);
    ctx.lineTo(r * 0.12, r * 0.88);

    ctx.closePath();

    ctx.fillStyle = b.bad
      ? "#17151f"
      : b.color;

    ctx.fill();

    if (b.bad) {

      // Calavera.
      ctx.strokeStyle = "#ff3856";

      ctx.lineWidth = Math.max(
        2,
        r * 0.07
      );

      ctx.lineCap = "round";

      ctx.beginPath();

      ctx.moveTo(-r * 0.32, -r * 0.15);
      ctx.lineTo(-r * 0.12, r * 0.05);

      ctx.moveTo(-r * 0.12, -r * 0.15);
      ctx.lineTo(-r * 0.32, r * 0.05);

      ctx.moveTo(r * 0.12, -r * 0.15);
      ctx.lineTo(r * 0.32, r * 0.05);

      ctx.moveTo(r * 0.32, -r * 0.15);
      ctx.lineTo(r * 0.12, r * 0.05);

      ctx.stroke();

      ctx.beginPath();

      ctx.arc(
        0,
        r * 0.3,
        r * 0.22,
        Math.PI,
        0
      );

      ctx.stroke();

    } else {

      // Brillo.
      ctx.globalAlpha = 0.7;

      ctx.fillStyle = "#fff";

      ctx.beginPath();

      ctx.ellipse(
        -r * 0.27,
        -r * 0.42,
        r * 0.12,
        r * 0.23,
        -0.4,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffffffd9";

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        r * 0.08,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }
}

function shade(hex, percent) {

  const n = parseInt(hex.slice(1), 16);

  const t = percent < 0 ? 0 : 255;

  const p = Math.abs(percent) / 100;

  const R = n >> 16;
  const G = n >> 8 & 255;
  const B = n & 255;

  return "#" +
    (
      0x1000000 +
      (Math.round((t - R) * p) + R) * 0x10000 +
      (Math.round((t - G) * p) + G) * 0x100 +
      (Math.round((t - B) * p) + B)
    ).toString(16).slice(1);
}
