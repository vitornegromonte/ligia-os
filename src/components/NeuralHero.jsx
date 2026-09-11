import { useEffect, useRef } from "react";

export default function NeuralHero() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const visibleRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;
    const isMobile = window.matchMedia("(max-width: 820px)").matches;
    if (prefersReduced) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let edges = [];
    let pulses = [];
    let lastTime = performance.now();
    let glowSprite = null;
    let time = 0;

    function makeGlowSprite() {
      const size = 36;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(255, 75, 31, 0.32)");
      grad.addColorStop(0.28, "rgba(255, 144, 104, 0.12)");
      grad.addColorStop(0.58, "rgba(255, 75, 31, 0.05)");
      grad.addColorStop(1, "rgba(255, 75, 31, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }
    glowSprite = makeGlowSprite();

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, isMobile || isLowEnd ? 1 : 1.35);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      buildGraph();
    }

    function buildGraph() {
      nodes = [];
      edges = [];
      pulses = [];

      const layers = 4;
      const counts = isMobile ? [3, 5, 5, 3] : [4, 6, 6, 3];
      const padX = Math.max(36, width * 0.06);
      const padY = Math.max(44, height * 0.12);
      const usableW = Math.max(0, width - padX * 2);
      const usableH = Math.max(0, height - padY * 2);

      for (let l = 0; l < layers; l++) {
        const n = counts[l];
        const x = padX + (usableW * l) / Math.max(1, layers - 1);
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const yBase = padY + t * usableH;
          // jitter orgânico, não uniforme
          const jitter = (Math.random() - 0.5) * 14 + Math.sin(i * 1.7) * 4;
          const seed = Math.random() * Math.PI * 2;
          nodes.push({
            x, y: yBase + jitter, x0: x, y0: yBase + jitter,
            r: l === 0 || l === layers - 1 ? 3.6 : 3.0,
            layer: l,
            phase: seed,
            phase2: seed * 1.3,
            speed: 0.00022 + Math.random() * 0.00016, // ~50% mais lento
            speed2: 0.00013 + Math.random() * 0.00009,
            breathPhase: Math.random() * Math.PI * 2,
          });
        }
      }

      // Curvas orgânicas com semente por aresta
      for (let l = 0; l < layers - 1; l++) {
        const aNodes = nodes.filter(n => n.layer === l);
        const bNodes = nodes.filter(n => n.layer === l + 1);
        aNodes.forEach(a => {
          const sorted = [...bNodes].sort((x, y) => Math.abs(x.y - a.y) - Math.abs(y.y - a.y));
          const take = Math.min(2, sorted.length);
          for (let k = 0; k < take; k++) {
            if (Math.random() < 0.88) {
              const b = sorted[k];
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              const baseOffset = (Math.random() - 0.5) * 22;
              edges.push({
                a, b,
                baseOffset,
                seed: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.00018 + Math.random() * 0.00012,
                cp: { x: mx + nx * baseOffset, y: my + ny * baseOffset * 0.6 },
                mx, my, nx, ny,
              });
            }
          }
        });
      }

      const pulseCount = Math.min(isMobile ? 5 : 8, edges.length);
      const shuffled = [...edges].sort(() => Math.random() - 0.5).slice(0, pulseCount);
      shuffled.forEach(edge => {
        pulses.push({
          edge,
          p: Math.random(),
          speed: 0.00018 + Math.random() * 0.00014, // ~4.2s média, 45% mais lento
          size: 0.9 + Math.random() * 0.35,
        });
      });
    }

    function draw(now) {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const delta = Math.min(32, now - lastTime);
      lastTime = now;
      time = now;

      // Mouse parallax suave (lerp)
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.04;
      const parallaxX = mouseRef.current.x * 6;
      const parallaxY = mouseRef.current.y * 4;
      // Cursor em pixels (para repulsão e boost de pulsos)
      const pmx = (mouseRef.current.x * 0.5 + 0.5) * width;
      const pmy = (mouseRef.current.y * 0.5 + 0.5) * height;
      const layerDepth = [0.1, 0.22, 0.3, 0.38];

      // Respiração humana: duas ondas sobrepostas + leve deriva X
      nodes.forEach(n => {
        const breath1 = Math.sin(now * n.speed + n.phase) * 1.1;
        const breath2 = Math.cos(now * n.speed2 + n.phase2) * 0.55;
        const depth = layerDepth[Math.min(n.layer, 3)];
        n.y = n.y0 + breath1 + breath2;
        n.x = n.x0 + Math.sin(now * n.speed * 0.58 + n.phase) * 0.7 + parallaxX * depth;
        // Repulsão suave do cursor (raio 140px, clamp 10px)
        const rdx = n.x - pmx;
        const rdy = n.y - pmy;
        const dist = Math.hypot(rdx, rdy);
        if (dist < 140 && dist > 0.01) {
          const push = (1 - dist / 140) * 10;
          n.x += (rdx / dist) * push;
          n.y += (rdy / dist) * push;
        }
        // leve variação de escala orgânica
        n._scale = 1 + Math.sin(now * 0.00028 + n.breathPhase) * 0.06;
      });

      // Curvas respiram
      edges.forEach(e => {
        e.cp.x = e.mx + e.nx * (e.baseOffset + Math.sin(now * e.wobbleSpeed + e.seed) * 4);
        e.cp.y = e.my + e.ny * (e.baseOffset * 0.6 + Math.cos(now * e.wobbleSpeed * 0.8 + e.seed) * 3);
      });

      pulses.forEach(p => {
        // Boost perto do cursor: arestas próximas aceleram e brilham
        const ex = (p.edge.a.x + p.edge.b.x) / 2;
        const ey = (p.edge.a.y + p.edge.b.y) / 2;
        const ed = Math.hypot(ex - pmx, ey - pmy);
        const near = ed < 220 ? (1 - ed / 220) : 0;
        p._boost = near;
        p.p += p.speed * delta * (1 + near * 0.6);
        if (p.p > 1) p.p -= 1;
      });

      ctx.clearRect(0, 0, width, height);

      // Sutil brilho de fundo que pulsa com a rede
      const bgPulse = 0.03 + Math.sin(now * 0.00018) * 0.008;
      ctx.fillStyle = `rgba(255, 75, 31, ${bgPulse})`;
      // não preenche tudo, só deixa o clear com tom quente muito sutil
      // Edges — Bézier orgânicas com opacidade que respira
      const edgeBreath = 0.06 + Math.sin(now * 0.00021) * 0.01;
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = `rgba(168, 155, 138, ${edgeBreath})`;
      ctx.beginPath();
      edges.forEach(e => {
        // leve variação de opacidade por profundidade
        ctx.moveTo(e.a.x, e.a.y);
        ctx.quadraticCurveTo(e.cp.x + parallaxX * 0.1, e.cp.y + parallaxY * 0.08, e.b.x, e.b.y);
      });
      ctx.stroke();

      // Pulsos — fade etéreo com cauda sutil
      pulses.forEach(pulse => {
        const { a, b, cp } = pulse.edge;
        const t = pulse.p;
        const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cp.x + t * t * b.x;
        const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cp.y + t * t * b.y;
        const fade = Math.sin(t * Math.PI);
        const easedFade = Math.pow(fade, 1.15); // entrada/saída mais suave
        const alpha = easedFade;
        if (alpha < 0.015) return;

        const s = 36 * pulse.size * (0.82 + easedFade * 0.45);
        // halo pré-renderizado (intensifica perto do cursor)
        const boost = pulse._boost || 0;
        ctx.globalAlpha = Math.min(1, alpha * (0.72 + boost * 0.28));
        ctx.drawImage(glowSprite, x - s / 2, y - s / 2, s, s);
        ctx.globalAlpha = 1;

        // cauda: pequeno traço atrás do pulso
        const t2 = Math.max(0, t - 0.035);
        const x2 = (1 - t2) * (1 - t2) * a.x + 2 * (1 - t2) * t2 * cp.x + t2 * t2 * b.x;
        const y2 = (1 - t2) * (1 - t2) * a.y + 2 * (1 - t2) * t2 * cp.y + t2 * t2 * b.y;
        ctx.globalAlpha = alpha * 0.14;
        ctx.strokeStyle = "rgba(255, 75, 31, 0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // núcleo
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255, 75, 31, 0.96)";
        ctx.beginPath();
        ctx.arc(x, y, 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.88 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Inovação: sinapse brilha quando pulso chega ao nó
        if (t > 0.92) {
          const reach = (t - 0.92) / 0.08; // 0→1
          const glow = Math.sin(reach * Math.PI) * 0.55;
          b._glow = Math.max(b._glow || 0, glow);
        }
      });

      // Nodes — com respiração de escala e brilho sináptico
      nodes.forEach(n => {
        const isEdge = n.layer === 0 || n.layer === 3;
        const glow = n._glow || 0;
        if (glow > 0) {
          // dissipa
          n._glow = glow * 0.92;
          if (n._glow < 0.01) n._glow = 0;
        }
        const scale = (n._scale || 1) + glow * 0.18;
        const r = n.r * scale;

        ctx.fillStyle = isEdge
          ? `rgba(255, 75, 31, ${0.13 + glow * 0.18})`
          : `rgba(39, 33, 25, ${0.96 - glow * 0.1})`;
        ctx.strokeStyle = isEdge
          ? `rgba(255, 75, 31, ${0.36 + glow * 0.42})`
          : `rgba(168, 155, 138, ${0.16 + glow * 0.18})`;
        ctx.lineWidth = isEdge ? 1.1 + glow * 0.6 : 0.9;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isEdge
          ? `rgba(255, 255, 255, ${0.92 + glow * 0.08})`
          : `rgba(242, 237, 225, ${0.88 + glow * 0.1})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, isEdge ? 1 * scale : 0.8 * scale, 0, Math.PI * 2);
        ctx.fill();

        if (glow > 0.12) {
          ctx.globalAlpha = glow * 0.5;
          ctx.drawImage(glowSprite, n.x - 14, n.y - 14, 28, 28);
          ctx.globalAlpha = 1;
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver(
      entries => { visibleRef.current = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5);
      const y = ((e.clientY - rect.top) / rect.height - 0.5);
      mouseRef.current.tx = x;
      mouseRef.current.ty = y;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const start = () => {
      resize();
      lastTime = performance.now();
      rafRef.current = requestAnimationFrame(draw);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 700 });
    } else {
      setTimeout(start, 100);
    }

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      resize();
      lastTime = performance.now();
      rafRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
