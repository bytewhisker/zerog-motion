/**
 * ══════════════════════════════════════════════════════════════════════════
 * ZEROG-MOTION — GSAP-TIER INTERACTIVE SHOWCASE & DOCUMENTATION ENGINE
 * ══════════════════════════════════════════════════════════════════════════
 */

import {
  animate,
  timeline,
  solveSpring,
  autoMorph,
  animateText,
  scrambleText,
  type TextPreset,
} from 'zerog-motion';

// ─── Query Utilities ────────────────────────────────────────────────────────
function qs<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Required element missing: ${sel}`);
  return el;
}

function qsa<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

// ─── 1. Navigation & Copy Badges ────────────────────────────────────────────
function initNavAndCopy(): void {
  const setupCopy = (badgeId: string, tipId?: string) => {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    badge.addEventListener('click', async () => {
      await navigator.clipboard.writeText('npm i zerog-motion');
      if (tipId) {
        const tip = document.getElementById(tipId);
        if (tip) {
          tip.textContent = 'Copied!';
          tip.classList.add('show');
          setTimeout(() => {
            tip.textContent = 'Copy';
            tip.classList.remove('show');
          }, 2000);
        }
      }
    });
  };

  setupCopy('nav-copy-npm', 'nav-copy-tip');
  setupCopy('footer-copy-npm', 'footer-copy-hint');
}

// ─── 2. Hero Interactive GSAP-Style Timeline Scrubber ───────────────────────
function initHeroScrubber(): void {
  const scrubSlider = qs<HTMLInputElement>('#hero-scrub-slider');
  const scrubFill = qs('#hero-scrub-fill');
  const timecode = qs('#hero-timecode');
  const btnPlay = qs('#btn-scrub-play');
  const btnPause = qs('#btn-scrub-pause');
  const btnReverse = qs('#btn-scrub-reverse');
  const btnRestart = qs('#btn-scrub-restart');
  const speedButtons = qsa('.btn-speed');

  const DURATION_MS = 2400;
  let isDragging = false;
  let playbackRate = 1.0;

  // Build the master timeline sequence
  let heroTl = timeline()
    .add('#act-orb', { scale: [0.3, 1], rotate: [-60, 0] }, { spring: 'bouncy' })
    .add('#act-card', { x: [100, 0], opacity: [0, 1] }, { spring: 'snappy', at: '<' })
    .add('#act-badge-1', { y: [30, 0], opacity: [0, 1] }, { spring: 'smooth', at: '-=0.2' })
    .add('#act-badge-2', { y: [30, 0], opacity: [0, 1] }, { spring: 'smooth', at: '+=0.1' })
    .add('#act-badge-3', { y: [30, 0], opacity: [0, 1] }, { spring: 'smooth', at: '+=0.1' });

  // Play immediately on mount
  heroTl.play();

  // Monitor playhead for timecode and slider sync without touching CSS properties
  function updatePlayheadUI(): void {
    if (!isDragging) {
      const current = heroTl.currentTime ?? 0;
      const progress = Math.min(1, Math.max(0, current / DURATION_MS));
      scrubSlider.value = String(Math.round(progress * 1000));
      scrubFill.style.width = `${progress * 100}%`;

      const seconds = (current / 1000).toFixed(2);
      timecode.textContent = `00:${seconds.padStart(5, '0')}s / 00:02.40s`;
    }
    requestAnimationFrame(updatePlayheadUI);
  }
  requestAnimationFrame(updatePlayheadUI);

  // Slider scrub handler
  scrubSlider.addEventListener('input', () => {
    isDragging = true;
    const progress = parseFloat(scrubSlider.value) / 1000;
    const targetMs = progress * DURATION_MS;
    heroTl.pause();
    heroTl.currentTime = targetMs;
    scrubFill.style.width = `${progress * 100}%`;
    const seconds = (targetMs / 1000).toFixed(2);
    timecode.textContent = `00:${seconds.padStart(5, '0')}s / 00:02.40s`;
  });

  scrubSlider.addEventListener('change', () => {
    isDragging = false;
  });

  btnPlay.addEventListener('click', () => heroTl.play());
  btnPause.addEventListener('click', () => heroTl.pause());
  btnReverse.addEventListener('click', () => heroTl.reverse());
  btnRestart.addEventListener('click', () => {
    heroTl.currentTime = 0;
    heroTl.play();
  });

  speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      speedButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      playbackRate = parseFloat(btn.dataset.speed || '1.0');
      heroTl.playbackRate = playbackRate;
    });
  });
}

// ─── 3. Demo 1: The Liquid AI Terminal (Streaming autoMorph) ────────────────
function initLiquidAITerminal(): void {
  const btnRun = qs('#btn-run-stream-battle');
  const btnReset = qs('#btn-reset-stream-battle');
  const textLegacy = qs('#text-legacy');
  const textZeroG = qs('#text-zerog');
  const termLegacy = qs('#terminal-legacy');
  const termZeroG = qs('#terminal-zerog');
  const fpsLegacy = qs('#fps-legacy');
  const jitterCount = qs('#jitter-count');

  const tokens = [
    'Initializing quantum intelligence matrix...',
    ' Streaming 120 FPS compositor tokens.',
    ' Compiling analytical ODE spring keyframes.',
    ' WeakMap garbage-collection active: 0 memory leaks.',
    ' Main-thread freed: GSAP rAF jank eliminated.',
    ' Liquid FLIP height reflow smoothly stabilized.'
  ];

  let streamTimer: number | null = null;
  let tokenIndex = 0;
  let isStreaming = false;

  // Initialize autoMorph on the ZeroG terminal container
  const morphHandle = autoMorph(termZeroG, {
    spring: 'snappy',
    threshold: 1,
  });

  function startStreamBattle(): void {
    if (isStreaming) return;
    isStreaming = true;
    tokenIndex = 0;
    textLegacy.textContent = '';
    textZeroG.textContent = '';

    // Animate FPS degradation on legacy side
    fpsLegacy.textContent = '28 FPS';
    jitterCount.textContent = 'Severe Reflow (14 drops)';

    streamTimer = window.setInterval(() => {
      if (tokenIndex >= tokens.length) {
        if (streamTimer) clearInterval(streamTimer);
        isStreaming = false;
        return;
      }

      const nextChunk = tokens[tokenIndex] + '\n\n';
      
      // Standard DOM (Legacy): violent height jumps
      textLegacy.textContent += nextChunk;
      termLegacy.scrollTop = termLegacy.scrollHeight;

      // ZeroG: autoMorph handles the height growth seamlessly via WAAPI
      textZeroG.textContent += nextChunk;
      termZeroG.scrollTop = termZeroG.scrollHeight;

      tokenIndex++;
    }, 450);
  }

  function resetStreamBattle(): void {
    if (streamTimer) clearInterval(streamTimer);
    isStreaming = false;
    textLegacy.textContent = 'Press "Stream LLM Tokens" to start...';
    textZeroG.textContent = 'Press "Stream LLM Tokens" to start...';
    fpsLegacy.textContent = '34 FPS';
    jitterCount.textContent = 'Severe Reflow';
  }

  btnRun.addEventListener('click', startStreamBattle);
  btnReset.addEventListener('click', resetStreamBattle);
}

// ─── 4. Demo 2: True Mass Spatial Dock (macOS Gravitational Physics) ─────────
function initSpatialDock(): void {
  const dock = qs('#spatial-dock-bar');
  const items = qsa<HTMLElement>('.dock-item', dock);

  const springSolver = solveSpring({
    stiffness: 350,
    damping: 24,
    mass: 1.2,
  });

  dock.addEventListener('mousemove', (e: MouseEvent) => {
    const mouseX = e.clientX;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - itemCenterX);
      const maxDist = 180;

      if (dist < maxDist) {
        // Physical mass displacement
        const intensity = 1 - (dist / maxDist);
        const { position } = springSolver(intensity * 0.4);
        const scaleVal = 1 + (position - 1) * 0.65;
        const liftVal = -(intensity * 26);
        const skewVal = ((mouseX - itemCenterX) / maxDist) * -12;

        item.style.transform = `translateY(${liftVal}px) scale(${scaleVal}) skewX(${skewVal}deg)`;
      } else {
        item.style.transform = 'translateY(0px) scale(1) skewX(0deg)';
      }
    });
  });

  dock.addEventListener('mouseleave', () => {
    items.forEach((item) => {
      animate(item, {
        y: [parseFloat(item.style.transform.match(/translateY\(([^)]+)px\)/)?.[1] || '0'), 0],
        scale: [1.3, 1],
        skewX: [0, 0]
      }, {
        spring: 'bouncy'
      });
      item.style.transform = '';
    });
  });
}

// ─── 5. Demo 3: Variable Font Matrix & Main-Thread Freeze ───────────────────
function initFontMatrix(): void {
  const cards = qsa<HTMLElement>('.matrix-card');
  const btnFreeze = qs('#btn-freeze-main');
  const spinner = qs('#js-spinner');
  const threadLabel = qs('#thread-status-label');

  // Trigger continuous GPU-accelerated variable font and 3D wave animation
  cards.forEach((card, index) => {
    const word = card.querySelector<HTMLElement>('.matrix-word');
    if (!word) return;

    animate(word, {
      scale: [0.95, 1.05],
      letterSpacing: ['0.02em', '0.12em'],
      rotateX: [-10, 10],
      rotateY: [-8, 8]
    }, {
      duration: 2000 + index * 200,
      direction: 'alternate',
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  });

  // Intentional Main-Thread Blocking Loop (1500ms)
  btnFreeze.addEventListener('click', () => {
    threadLabel.textContent = 'MAIN THREAD FROZEN (JS rAF Dead)';
    threadLabel.style.color = '#ef4444';
    spinner.style.borderColor = '#ef4444';

    setTimeout(() => {
      const blockStart = performance.now();
      // Block the main thread synchronously
      while (performance.now() - blockStart < 1500) {
        // Intensive math loop locking the JS engine
        Math.sqrt(Math.random() * 1000000);
      }

      threadLabel.textContent = 'Main Thread Active';
      threadLabel.style.color = '';
      spinner.style.borderColor = 'var(--neon-green)';
    }, 50);
  });
}

// ─── 6. Multi-Track Timeline Sequencer Studio ───────────────────────────────
function initTimelineStudio(): void {
  const btnPlay = qs('#btn-tl-play');
  const btnPause = qs('#btn-tl-pause');
  const btnRestart = qs('#btn-tl-restart');
  const playhead = qs('#timeline-playhead');
  const readout = qs('#tl-playhead-readout');

  let studioTl = timeline()
    .add('#tle-title', { y: [40, 0], opacity: [0, 1] }, { spring: 'snappy' })
    .add('#tle-orb',   { scale: [0.4, 1.15], rotate: [-90, 0] }, { spring: 'bouncy', at: '<' })
    .add('.tl-sub-badge', { y: [20, 0], opacity: [0, 1] }, { spring: 'smooth', stagger: 50, at: '-=0.2' })
    .add('#tle-cta',   { y: [15, 0], opacity: [0, 1] }, { spring: 'snappy', at: '+=0.2' });

  function syncNeedle(): void {
    const cur = studioTl.currentTime ?? 0;
    const progress = Math.min(1, cur / 2800);
    const needleLeft = 190 + progress * 580;
    playhead.style.transform = `translateX(${progress * 100}%)`;
    readout.textContent = `${(cur / 1000).toFixed(2)}s`;
    requestAnimationFrame(syncNeedle);
  }
  requestAnimationFrame(syncNeedle);

  btnPlay.addEventListener('click', () => studioTl.play());
  btnPause.addEventListener('click', () => studioTl.pause());
  btnRestart.addEventListener('click', () => {
    studioTl.currentTime = 0;
    studioTl.play();
  });
}

// ─── 7. Interactive Docs & Sandbox ──────────────────────────────────────────
function initDocsTabs(): void {
  const tabBtns = qsa('.doc-tab-btn');
  const tabContents = qsa('.doc-tab-content');
  const btnRunSandbox = qs('#btn-run-animate-sandbox');
  const sandboxTarget = qs('#sandbox-animate-target');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Sandbox Live Run
  btnRunSandbox.addEventListener('click', () => {
    animate(sandboxTarget, {
      x: [0, 180, 0],
      rotate: [0, 180, 360],
      scale: [0.8, 1.25, 1],
      borderRadius: ['10px', '50%', '10px']
    }, {
      spring: 'bouncy'
    });
  });
}

// ─── Master Initialization ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavAndCopy();
  initHeroScrubber();
  initLiquidAITerminal();
  initSpatialDock();
  initFontMatrix();
  initTimelineStudio();
  initDocsTabs();
});
