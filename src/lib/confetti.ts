/**
 * Canvas Confetti nativo (zero dependências externas).
 * Dispara partículas douradas e festivas quando um campeão é coroado.
 */

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const DEFAULT_COLORS = [
  '#d4af37',
  '#facc15',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#ffffff',
];

export function fireConfetti(options?: {
  colors?: string[];
  particleCount?: number;
  durationMs?: number;
}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const colors = options?.colors && options.colors.length > 0 ? options.colors : DEFAULT_COLORS;
  const particleCount = options?.particleCount ?? 140;
  const durationMs = options?.durationMs ?? 3200;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Particle[] = [];
  const startX = canvas.width / 2;
  const startY = canvas.height * 0.42;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 5;
    particles.push({
      x: startX + (Math.random() - 0.5) * 80,
      y: startY + (Math.random() - 0.5) * 40,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      opacity: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    });
  }

  const start = performance.now();
  const animate = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.34;
      p.vx *= 0.985;
      p.rotation += p.vRot;
      if (elapsed > durationMs * 0.65) {
        p.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.65) / (durationMs * 0.35));
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < durationMs) {
      requestAnimationFrame(animate);
    } else if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };

  requestAnimationFrame(animate);
}
