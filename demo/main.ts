import { animate, autoMorph, presets, type SpringConfig, type PresetName } from 'zerog-motion';

// --- State ---
let currentPreset: PresetName | 'custom' = 'snappy';
let currentConfig: SpringConfig = {
  stiffness: 400,
  damping: 30,
  mass: 1.0,
};

// --- DOM Elements ---
const springOrb = document.getElementById('spring-orb') as HTMLElement;
const sliderStiffness = document.getElementById('slider-stiffness') as HTMLInputElement;
const sliderDamping = document.getElementById('slider-damping') as HTMLInputElement;
const sliderMass = document.getElementById('slider-mass') as HTMLInputElement;

const valStiffness = document.getElementById('val-stiffness') as HTMLElement;
const valDamping = document.getElementById('val-damping') as HTMLElement;
const valMass = document.getElementById('val-mass') as HTMLElement;

const presetButtons = document.querySelectorAll<HTMLButtonElement>('.btn-preset');
const liveCode = document.getElementById('live-code') as HTMLElement;

// Copy Install Button
const copyBox = document.getElementById('copy-install') as HTMLElement;
const copyHint = document.getElementById('copy-hint') as HTMLElement;

copyBox?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('npm i zerog-motion');
    copyHint.textContent = 'Copied!';
    copyHint.style.color = '#34d399';
    setTimeout(() => {
      copyHint.textContent = 'Copy';
      copyHint.style.color = '';
    }, 2000);
  } catch {
    // Fallback if clipboard API restricted
    copyHint.textContent = 'Copied!';
  }
});

// Update Code Display
function updateCodeDisplay() {
  if (!liveCode) return;

  if (currentPreset !== 'custom') {
    liveCode.innerHTML = `<code><span class="keyword">animate</span>(target, { <span class="prop">y</span>: [<span class="number">-50</span>, <span class="number">0</span>] }, {
  <span class="prop">spring</span>: <span class="string">'${currentPreset}'</span>
});</code>`;
  } else {
    liveCode.innerHTML = `<code><span class="keyword">animate</span>(target, { <span class="prop">y</span>: [<span class="number">-50</span>, <span class="number">0</span>] }, {
  <span class="prop">spring</span>: {
    <span class="prop">stiffness</span>: <span class="number">${currentConfig.stiffness}</span>,
    <span class="prop">damping</span>: <span class="number">${currentConfig.damping}</span>,
    <span class="prop">mass</span>: <span class="number">${currentConfig.mass}</span>
  }
});</code>`;
  }
}

// Trigger Spring on Orb
function bounceOrb(type: 'bounce' | 'scale' | 'rotate' = 'bounce') {
  if (!springOrb) return;

  const spring = currentPreset !== 'custom' ? currentPreset : currentConfig;

  if (type === 'bounce') {
    animate(
      springOrb,
      {
        y: [-65, 0],
        scale: [0.92, 1],
      },
      { spring }
    );
  } else if (type === 'scale') {
    animate(
      springOrb,
      {
        scale: [0.65, 1.18, 1],
      },
      { spring }
    );
  } else if (type === 'rotate') {
    animate(
      springOrb,
      {
        rotate: [0, 360],
        scale: [0.85, 1],
      },
      { spring }
    );
  }
}

// Preset selection
presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const presetKey = btn.dataset.preset as PresetName;
    if (!presetKey || !presets[presetKey]) return;

    currentPreset = presetKey;
    const p = presets[presetKey];
    currentConfig = { stiffness: p.stiffness, damping: p.damping, mass: p.mass };

    // Update buttons UI
    presetButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // Update sliders
    sliderStiffness.value = String(p.stiffness);
    sliderDamping.value = String(p.damping);
    sliderMass.value = String(p.mass);

    valStiffness.textContent = String(p.stiffness);
    valDamping.textContent = String(p.damping);
    valMass.textContent = String(p.mass);

    updateCodeDisplay();
    bounceOrb('bounce');
  });
});

// Slider events
function handleSliderChange() {
  currentPreset = 'custom';
  presetButtons.forEach((b) => b.classList.remove('active'));

  const k = Number(sliderStiffness.value);
  const c = Number(sliderDamping.value);
  const m = Number(sliderMass.value);

  currentConfig = { stiffness: k, damping: c, mass: m };

  valStiffness.textContent = String(k);
  valDamping.textContent = String(c);
  valMass.textContent = m.toFixed(1);

  updateCodeDisplay();
  bounceOrb('bounce');
}

sliderStiffness?.addEventListener('input', handleSliderChange);
sliderDamping?.addEventListener('input', handleSliderChange);
sliderMass?.addEventListener('input', handleSliderChange);

// Action buttons
document.getElementById('spring-orb')?.addEventListener('click', () => bounceOrb('bounce'));
document.getElementById('btn-trigger-spring')?.addEventListener('click', () => bounceOrb('bounce'));
document.getElementById('btn-scale-spring')?.addEventListener('click', () => bounceOrb('scale'));
document.getElementById('btn-rotate-spring')?.addEventListener('click', () => bounceOrb('rotate'));

// --- Section 2: AI Streaming Simulator ---
const btnStream = document.getElementById('btn-stream') as HTMLButtonElement;
const textMorph = document.getElementById('text-morph') as HTMLElement;
const textRaw = document.getElementById('text-raw') as HTMLElement;
const cursorMorph = document.getElementById('cursor-morph') as HTMLElement;
const cursorRaw = document.getElementById('cursor-raw') as HTMLElement;
const counterMorph = document.getElementById('counter-morph') as HTMLElement;
const counterRaw = document.getElementById('counter-raw') as HTMLElement;
const boxMorph = document.getElementById('box-morph') as HTMLElement;

// Enable autoMorph on the smooth chat card
if (boxMorph) {
  autoMorph(boxMorph, { spring: 'smooth' });
}

const sampleParagraph =
  'zerog-motion computes the exact closed-form analytical ODE physics of damped harmonic oscillators once, and feeds precalculated spring trajectories directly to the browser native Web Animations API. Even with rapid token updates and continuous layout resizing, container morphing remains buttery smooth at 60 to 120 FPS without blocking the JavaScript main thread or dropping layout frames.';

let isStreaming = false;

btnStream?.addEventListener('click', () => {
  if (isStreaming) return;
  isStreaming = true;
  btnStream.disabled = true;

  textMorph.textContent = '';
  textRaw.textContent = '';
  cursorMorph.style.display = 'inline-block';
  cursorRaw.style.display = 'inline-block';

  const tokens = sampleParagraph.split(' ');
  let index = 0;

  const interval = setInterval(() => {
    if (index < tokens.length) {
      const nextWord = (index === 0 ? '' : ' ') + tokens[index];
      textMorph.textContent += nextWord;
      textRaw.textContent += nextWord;
      index++;

      const countText = `${index} / ${tokens.length} tokens`;
      counterMorph.textContent = countText;
      counterRaw.textContent = countText;
    } else {
      clearInterval(interval);
      isStreaming = false;
      btnStream.disabled = false;
      cursorMorph.style.display = 'none';
      cursorRaw.style.display = 'none';
    }
  }, 32);
});

// --- Section 3: Bento Grid Staggered Reveal ---
const btnBento = document.getElementById('btn-bento-reveal') as HTMLButtonElement;

function triggerBentoReveal() {
  const cards = document.querySelectorAll('.bento-card');
  if (cards.length === 0) return;

  // Stagger reveal with bouncy spring
  animate(
    cards as unknown as Element[],
    {
      opacity: [0, 1],
      y: [35, 0],
      scale: [0.93, 1],
    },
    {
      spring: 'bouncy',
      stagger: 60,
    }
  );
}

btnBento?.addEventListener('click', triggerBentoReveal);

// Initial entrance animations
window.addEventListener('DOMContentLoaded', () => {
  updateCodeDisplay();
  triggerBentoReveal();
  // Hero entry bounce
  animate(springOrb, { scale: [0, 1.1, 1], rotate: [-45, 0] }, { spring: 'bouncy', delay: 100 });
});
