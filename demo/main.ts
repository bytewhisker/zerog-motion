/**
 * zerog-motion Interactive Demo
 * Full feature showcase: Text Motion Suite, Timeline, Magnetic, Spring, Scroll Reveal, autoMorph
 */

import {
  animate,
  animateText,
  scrambleText,
  timeline,
  autoMorph,
  scrollReveal,
  magnetic,
  type TextPreset,
  type ScrambleCharset,
} from 'zerog-motion';

// ─── Helpers ────────────────────────────────────────────────────────────────

function qs<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
}

function qsa<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

// ─── 1. Hero Timeline Entrance ────────────────────────────────────────────────
function initHeroEntrance(): void {
  timeline()
    .add('#hero-title',  { y: [50, 0], opacity: [0, 1] }, { spring: 'snappy', delay: 100 })
    .add('#hero-sub',    { y: [30, 0], opacity: [0, 1] }, { spring: 'smooth', at: '+=80' })
    .add('#hero-badges', { y: [20, 0], opacity: [0, 1] }, { spring: 'bouncy', at: '+=60' })
    .add('.cta-row',     { y: [15, 0], opacity: [0, 1] }, { spring: 'snappy', at: '+=60' })
    .play();
}

// ─── 2. Text Motion Studio ────────────────────────────────────────────────────
function initTextStudio(): void {
  let currentPreset: TextPreset = 'mask-up';
  let activeTextHandle: ReturnType<typeof animateText> | null = null;

  const textEl = qs<HTMLParagraphElement>('#demo-text');
  const textInput = qs<HTMLInputElement>('#custom-text-input');
  const presetNameBadge = qs('#preset-name-badge');
  const presetCodeSnippet = qs('#preset-code-snippet');

  const codeSnippets: Record<TextPreset, string> = {
    'mask-up':    "animateText(el, { preset: 'mask-up',    spring: 'snappy',  stagger: 40 })",
    'blur-in':    "animateText(el, { preset: 'blur-in',    spring: 'gentle',  stagger: 25 })",
    'flip-3d':    "animateText(el, { preset: 'flip-3d',    spring: 'bouncy',  stagger: 45 })",
    'wave':       "animateText(el, { preset: 'wave',        spring: 'snappy',  stagger: 35 })",
    'glitch':     "animateText(el, { preset: 'glitch',     spring: 'snappy',  stagger: 20 })",
    'typewriter': "animateText(el, { preset: 'typewriter', spring: 'bouncy',  stagger: 60 })",
    'rise':       "animateText(el, { preset: 'rise',       spring: 'smooth',  stagger: 80 })",
    'fade-up':    "animateText(el, { preset: 'fade-up',    spring: 'smooth',  stagger: 50 })",
  };

  const springMap: Record<TextPreset, string> = {
    'mask-up': 'snappy', 'blur-in': 'gentle', 'flip-3d': 'bouncy',
    'wave': 'snappy', 'glitch': 'snappy', 'typewriter': 'bouncy',
    'rise': 'smooth', 'fade-up': 'smooth',
  };

  const staggerMap: Record<TextPreset, number> = {
    'mask-up': 40, 'blur-in': 25, 'flip-3d': 45,
    'wave': 35, 'glitch': 20, 'typewriter': 60,
    'rise': 80, 'fade-up': 50,
  };

  function playTextPreset(preset: TextPreset): void {
    // Cancel previous
    activeTextHandle?.revert();

    // Restore original text
    textEl.textContent = textInput.value || 'Motion so smooth it feels weightless';

    setTimeout(() => {
      activeTextHandle = animateText(textEl, {
        preset,
        spring: springMap[preset] as any,
        stagger: staggerMap[preset],
      });

      presetNameBadge.textContent = preset;
      presetCodeSnippet.textContent = codeSnippets[preset] ?? '';
    }, 50);
  }

  // Tab buttons
  qsa('.tab-btn', qs('#text-tabs')).forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPreset = btn.dataset.preset as TextPreset;
      playTextPreset(currentPreset);
    });
  });

  // Replay button
  qs('#btn-replay-text').addEventListener('click', () => playTextPreset(currentPreset));

  // Custom text input
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') playTextPreset(currentPreset);
  });

  // Initial play after hero entrance
  setTimeout(() => playTextPreset('mask-up'), 1200);
}

// ─── 3. ScrambleText ──────────────────────────────────────────────────────────
function initScrambleText(): void {
  const scrambleEl = qs<HTMLParagraphElement>('#scramble-text');
  const scrambleInput = qs<HTMLInputElement>('#scramble-input');
  let currentCharset: ScrambleCharset = 'default';
  let activeScramble: ReturnType<typeof scrambleText> | null = null;

  function runScramble(): void {
    const text = scrambleInput.value || 'Initializing quantum entanglement protocol...';
    scrambleEl.textContent = text;
    activeScramble?.cancel();

    scrambleEl.textContent = text;
    activeScramble = scrambleText(scrambleEl, {
      charset: currentCharset,
      duration: 1800,
      fps: currentCharset === 'binary' ? 30 : 20,
      direction: 'ltr',
    });
  }

  qs('#btn-scramble').addEventListener('click', runScramble);
  qs('#btn-scramble-skip').addEventListener('click', () => activeScramble?.finish());

  qsa('.charset-btn', qs('#scramble-charsets')).forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.charset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCharset = btn.dataset.charset as ScrambleCharset;
    });
  });

  // Auto-run on view
  setTimeout(runScramble, 2000);
}

// ─── 4. Spring Physics Playground ────────────────────────────────────────────
function initSpringPlayground(): void {
  const orb = qs<HTMLDivElement>('#spring-orb');
  let stiffness = 400;
  let damping = 30;
  let mass = 1.0;
  let isAnimating = false;

  function getSpringConfig() {
    return { stiffness, damping, mass };
  }

  function updateLiveCode(preset: string | null): void {
    const codeEl = qs('#live-code');
    if (preset) {
      codeEl.innerHTML = `<code><span class="keyword">animate</span>(target, { <span class="prop">y</span>: [<span class="number">-50</span>, <span class="number">0</span>] }, {\n  <span class="prop">spring</span>: <span class="string">'${preset}'</span>\n});</code>`;
    } else {
      codeEl.innerHTML = `<code><span class="keyword">animate</span>(target, { <span class="prop">y</span>: [<span class="number">-50</span>, <span class="number">0</span>] }, {\n  <span class="prop">spring</span>: { <span class="prop">stiffness</span>: <span class="number">${stiffness}</span>, <span class="prop">damping</span>: <span class="number">${damping}</span>, <span class="prop">mass</span>: <span class="number">${mass}</span> }\n});</code>`;
    }
  }

  // Sliders
  const sliderStiffness = qs<HTMLInputElement>('#slider-stiffness');
  const sliderDamping = qs<HTMLInputElement>('#slider-damping');
  const sliderMass = qs<HTMLInputElement>('#slider-mass');

  sliderStiffness.addEventListener('input', () => {
    stiffness = parseInt(sliderStiffness.value);
    qs('#val-stiffness').textContent = String(stiffness);
    qsa('.btn-preset').forEach((b) => b.classList.remove('active'));
    updateLiveCode(null);
  });

  sliderDamping.addEventListener('input', () => {
    damping = parseInt(sliderDamping.value);
    qs('#val-damping').textContent = String(damping);
    qsa('.btn-preset').forEach((b) => b.classList.remove('active'));
    updateLiveCode(null);
  });

  sliderMass.addEventListener('input', () => {
    mass = parseFloat(sliderMass.value);
    qs('#val-mass').textContent = mass.toFixed(1);
    qsa('.btn-preset').forEach((b) => b.classList.remove('active'));
    updateLiveCode(null);
  });

  // Preset buttons
  const presetConfigs: Record<string, { stiffness: number; damping: number; mass: number }> = {
    snappy:  { stiffness: 400, damping: 30, mass: 1 },
    bouncy:  { stiffness: 200, damping: 10, mass: 1 },
    smooth:  { stiffness: 120, damping: 20, mass: 1 },
    gentle:  { stiffness: 80,  damping: 14, mass: 1 },
  };

  qsa('.btn-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset as string;
      const cfg = presetConfigs[preset];
      if (!cfg) return;

      stiffness = cfg.stiffness;
      damping = cfg.damping;
      mass = cfg.mass;

      sliderStiffness.value = String(stiffness);
      sliderDamping.value = String(damping);
      sliderMass.value = String(mass);
      qs('#val-stiffness').textContent = String(stiffness);
      qs('#val-damping').textContent = String(damping);
      qs('#val-mass').textContent = mass.toFixed(1);

      qsa('.btn-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateLiveCode(preset);

      if (!isAnimating) triggerSpring();
    });
  });

  function triggerSpring(): void {
    isAnimating = true;
    animate(orb, { y: ['-60px', '0px'] }, {
      spring: getSpringConfig(),
      onFinish: () => { isAnimating = false; },
    });
  }

  function pulseScale(): void {
    isAnimating = true;
    animate(orb, { scale: [1.4, 1] }, {
      spring: getSpringConfig(),
      onFinish: () => { isAnimating = false; },
    });
  }

  function rotateOrb(): void {
    isAnimating = true;
    animate(orb, { rotate: [0, 360] }, {
      duration: 700,
      easing: 'ease-out',
      onFinish: () => {
        isAnimating = false;
        animate(orb, { rotate: [360, 0] }, { duration: 1, easing: 'linear' });
      },
    });
  }

  orb.addEventListener('click', triggerSpring);
  qs('#btn-trigger-spring').addEventListener('click', triggerSpring);
  qs('#btn-scale-spring').addEventListener('click', pulseScale);
  qs('#btn-rotate-spring').addEventListener('click', rotateOrb);

  updateLiveCode('snappy');
}

// ─── 5. Timeline Demo ─────────────────────────────────────────────────────────
function initTimelineDemo(): void {
  const items = [
    qs('#tl-item-1'),
    qs('#tl-item-2'),
    qs('#tl-item-3'),
    qs('#tl-item-4'),
  ];

  // Set initial state
  items.forEach((item) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
  });

  function playTimeline(): void {
    // Reset
    items.forEach((item) => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
    });

    setTimeout(() => {
      timeline()
        .add('#tl-item-1', { x: [-20, 0], opacity: [0, 1] }, { spring: 'snappy' })
        .add('#tl-item-2', { x: [-20, 0], opacity: [0, 1] }, { spring: 'smooth', at: '+=80' })
        .add('#tl-item-3', { x: [-20, 0], opacity: [0, 1] }, { spring: 'bouncy', at: '+=80' })
        .add('#tl-item-4', { x: [-20, 0], opacity: [0, 1] }, { spring: 'snappy', at: '+=80' })
        .play();
    }, 50);
  }

  qs('#btn-timeline-play').addEventListener('click', playTimeline);
  playTimeline();
}

// ─── 6. Magnetic Buttons ─────────────────────────────────────────────────────
function initMagnetic(): void {
  const magneticEls: Array<{ id: string; strength: number; spring: string }> = [
    { id: '#mag-1', strength: 0.4, spring: 'snappy' },
    { id: '#mag-2', strength: 0.35, spring: 'bouncy' },
    { id: '#mag-3', strength: 0.3, spring: 'smooth' },
    { id: '#mag-4', strength: 0.45, spring: 'gentle' },
    { id: '#mag-5', strength: 0.5, spring: 'snappy' },
    { id: '#mag-6', strength: 0.5, spring: 'bouncy' },
  ];

  for (const cfg of magneticEls) {
    try {
      const el = qs<HTMLButtonElement>(cfg.id);
      magnetic(el, {
        strength: cfg.strength,
        spring: cfg.spring as any,
        scaleOnHover: true,
        scale: 1.08,
      });
    } catch {
      // Element may not exist in some views
    }
  }
}

// ─── 7. AI Streaming Demo ─────────────────────────────────────────────────────
function initStreamingDemo(): void {
  const morphBox = qs<HTMLDivElement>('#box-morph');
  const rawBox = qs<HTMLDivElement>('#box-raw');
  const morphText = qs<HTMLSpanElement>('#text-morph');
  const rawText = qs<HTMLSpanElement>('#text-raw');
  const morphCursor = qs('#cursor-morph');
  const rawCursor = qs('#cursor-raw');
  const counterMorph = qs('#counter-morph');
  const counterRaw = qs('#counter-raw');

  const cleanupMorph = autoMorph(morphBox, { spring: 'smooth' });

  const AI_RESPONSES = [
    `zerog-motion uses the Web Animations API (WAAPI) to offload animation execution directly to the browser's compositor thread — the same GPU thread that handles page painting. This means your animations run completely independently of JavaScript execution. When your AI model streams 200 tokens per second, resizes DOM elements, or runs WebWorkers, the animations keep running at silky 60fps without a single dropped frame. That's the zero-gravity difference.`,
    `The analytical spring ODE solver in zerog-motion computes the exact position of a spring at any time t without stepping through simulation. This means: no update loops, no polling, no rAF accumulation. It simply generates a burst of keyframes from the closed-form spring equation, hands them to WAAPI, and walks away. The browser's GPU does the rest. Traditional libraries like GSAP run their animation engine on every requestAnimationFrame callback — if your JS is busy, they stall.`,
    `Building for the AI era means your UI needs to handle constant, unpredictable DOM mutations. LLM streaming causes height changes 50-100x per second. Without autoMorph, each height change triggers a synchronous layout reflow. With autoMorph, a ResizeObserver batches those changes and drives smooth height transitions through WAAPI — entirely off the main thread.`,
  ];

  let streamTimer: ReturnType<typeof setTimeout> | null = null;
  let isStreaming = false;
  let responseIndex = 0;

  qs('#btn-stream').addEventListener('click', () => {
    if (isStreaming) return;
    isStreaming = true;

    const response = AI_RESPONSES[responseIndex % AI_RESPONSES.length]!;
    responseIndex++;

    morphText.textContent = '';
    rawText.textContent = '';
    morphCursor.style.display = 'inline';
    rawCursor.style.display = 'inline';
    counterMorph.textContent = '0 tokens';
    counterRaw.textContent = '0 tokens';

    const words = response.split(' ');
    let wordIndex = 0;

    function streamNext(): void {
      if (wordIndex >= words.length) {
        morphCursor.style.display = 'none';
        rawCursor.style.display = 'none';
        isStreaming = false;
        return;
      }

      const chunk = (words[wordIndex] ?? '') + (wordIndex < words.length - 1 ? ' ' : '');
      wordIndex++;

      morphText.textContent += chunk;
      rawText.textContent += chunk;

      counterMorph.textContent = `${wordIndex} tokens`;
      counterRaw.textContent = `${wordIndex} tokens`;

      const delay = 40 + Math.random() * 60;
      streamTimer = setTimeout(streamNext, delay);
    }

    streamNext();
  });

  return () => {
    if (streamTimer) clearTimeout(streamTimer);
    cleanupMorph();
  };
}

// ─── 8. Scroll Reveal ────────────────────────────────────────────────────────
function initScrollReveal(): void {
  const cards = qsa('.scroll-reveal-card');

  cards.forEach((card) => {
    const preset = (card.dataset.reveal ?? 'fade-up') as any;
    scrollReveal(card, {
      preset,
      spring: 'snappy',
      threshold: 0.1,
    });
  });
}

// ─── 9. Install Copy ─────────────────────────────────────────────────────────
function initCopyInstall(): void {
  const copyBox = qs('#copy-install');
  const hint = qs('#copy-hint');

  copyBox.addEventListener('click', () => {
    navigator.clipboard?.writeText('npm i zerog-motion').catch(() => {});
    hint.textContent = '✓ Copied!';
    animate(copyBox, { scale: [0.97, 1] }, { spring: 'bouncy' });
    setTimeout(() => { hint.textContent = 'Copy'; }, 2000);
  });
}

// ─── 10. Section Header Animations ───────────────────────────────────────────
function initSectionHeaders(): void {
  scrollReveal('.section-title', {
    preset: 'fade-up',
    spring: 'snappy',
    threshold: 0.2,
  });
  scrollReveal('.section-desc', {
    preset: 'fade-up',
    spring: 'smooth',
    threshold: 0.2,
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeroEntrance();
  initTextStudio();
  initScrambleText();
  initSpringPlayground();
  initTimelineDemo();
  initMagnetic();
  initStreamingDemo();
  initScrollReveal();
  initCopyInstall();
  initSectionHeaders();
});
