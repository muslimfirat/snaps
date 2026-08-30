/**
 * Tactile Haptic Feedback Utility (Web Vibration API + Audio-Tactile Acoustic Fallback)
 * Provides crisp, consistent physical and acoustic responsiveness across all devices,
 * confirming user inputs on buttons, toggle switches, tabs, sliders, and critical controls.
 */

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'selection' 
  | 'tap'
  | 'toggle';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  tap: 12,              // Ultra-crisp tap for buttons
  light: 15,            // Subtle feedback for micro-interactions
  selection: 18,        // Tab, filter chip, or option selection
  toggle: [10, 30, 15], // Distinct double-pulse for toggle switches
  medium: 25,           // Primary actions, saves, uploads
  heavy: 40,            // Major confirmations / destructive actions
  success: [15, 60, 25],// Double pulse for goal completion / correct answer
  warning: [25, 50, 25],// Alert, timer warning
  error: [30, 40, 30, 40, 30], // Rapid error alert
};

const STORAGE_KEY = 'snaps_haptics_enabled';

// Chrome, ilk gerçek dokunuş/tuş öncesi navigator.vibrate çağrılarını sessizce
// engelleyip konsola uyarı basar. İlk kullanıcı jestine kadar vibrate'i atla.
let hasUserGesture = false;
if (typeof window !== 'undefined') {
  const markGesture = () => {
    hasUserGesture = true;
    window.removeEventListener('pointerdown', markGesture);
    window.removeEventListener('keydown', markGesture);
    window.removeEventListener('touchstart', markGesture);
  };
  window.addEventListener('pointerdown', markGesture, { once: true });
  window.addEventListener('keydown', markGesture, { once: true });
  window.addEventListener('touchstart', markGesture, { once: true });
}

// Initialize state from localStorage with safe default
let isHapticsEnabled = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return true;
})();

// Web Audio API context for subtle acoustic-haptic click fallback (e.g. iOS / Safari / Desktop)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Generates an ultra-short, crisp acoustic click (simulated haptic feedback)
 * for platforms without navigator.vibrate support (iOS Safari, macOS, Windows).
 */
function playAcousticHaptic(type: HapticType = 'tap'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 320;
    let duration = 0.015;
    let volume = 0.025;

    switch (type) {
      case 'toggle':
      case 'selection':
        freq = 440;
        duration = 0.018;
        volume = 0.03;
        break;
      case 'success':
        freq = 587.33; // D5
        duration = 0.04;
        volume = 0.04;
        break;
      case 'warning':
      case 'error':
        freq = 220;
        duration = 0.03;
        volume = 0.035;
        break;
      case 'heavy':
        freq = 180;
        duration = 0.025;
        volume = 0.04;
        break;
      case 'light':
      case 'tap':
      default:
        freq = 320;
        duration = 0.012;
        volume = 0.02;
        break;
    }

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Check if physical haptic vibration is supported on the current device/browser.
 */
export function isHapticsSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Set haptics enabled/disabled state and persist to localStorage.
 */
export function setHapticsEnabled(enabled: boolean): void {
  isHapticsEnabled = enabled;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get current haptics enabled state.
 */
export function getHapticsEnabled(): boolean {
  return isHapticsEnabled;
}

/**
 * Trigger physical tactile feedback via navigator.vibrate()
 * with automatic acoustic click fallback on unsupported environments.
 */
export function triggerHaptic(type: HapticType = 'tap'): void {
  if (!isHapticsEnabled) return;

  const supported = isHapticsSupported();
  if (supported) {
    if (!hasUserGesture) return; // jest öncesi çağrı Chrome'da engelleniyor
    try {
      const pattern = HAPTIC_PATTERNS[type] || 12;
      navigator.vibrate(pattern);
    } catch {
      // Gracefully ignore rejected vibration
    }
  } else {
    // Provide subtle acoustic click confirmation when vibration is unavailable
    playAcousticHaptic(type);
  }
}

/**
 * Semantic helper functions for consistent tactile responsiveness
 */
export const haptics = {
  tap: () => triggerHaptic('tap'),
  light: () => triggerHaptic('light'),
  selection: () => triggerHaptic('selection'),
  toggle: () => triggerHaptic('toggle'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};

/**
 * Initializes global delegated event listeners to provide instant tactile feedback
 * on all interactive buttons, toggle switches, tabs, links, and form controls across the app.
 */
let isGlobalInitialized = false;

export function initGlobalHaptics(): () => void {
  if (isGlobalInitialized || typeof window === 'undefined') {
    return () => {};
  }

  isGlobalInitialized = true;
  let lastVibrateTime = 0;

  // Comprehensive selector covering buttons, toggle switches, checkboxes, radios, tabs, selects, and custom controls
  const INTERACTIVE_SELECTOR = [
    'button',
    '[role="button"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="checkbox"]',
    '[role="radio"]',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'input[type="range"]',
    'select',
    'summary',
    '[data-interactive="true"]',
    '[data-haptic]',
    'label.cursor-pointer',
  ].join(', ');

  const handlePointerDown = (event: PointerEvent) => {
    if (!isHapticsEnabled) return;

    // Rate-limit haptics to prevent excessive feedback on rapid multi-touch / scroll drag
    const now = Date.now();
    if (now - lastVibrateTime < 40) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Exclude plain text input fields and textareas from accidental pointerdown haptics
    const isTextInput = target.tagName === 'TEXTAREA' || 
      (target.tagName === 'INPUT' && !['button', 'submit', 'reset', 'checkbox', 'radio', 'range'].includes((target as HTMLInputElement).type));
    if (isTextInput) return;

    // Find the closest matching interactive element
    const interactiveElement = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
    if (!interactiveElement) return;

    // Skip disabled or non-interactive elements
    if (
      interactiveElement.hasAttribute('disabled') ||
      interactiveElement.getAttribute('aria-disabled') === 'true' ||
      interactiveElement.classList.contains('disabled') ||
      interactiveElement.classList.contains('pointer-events-none') ||
      interactiveElement.getAttribute('data-haptic') === 'none'
    ) {
      return;
    }

    // Determine semantic haptic pattern
    const customType = interactiveElement.getAttribute('data-haptic') as HapticType | null;
    let typeToTrigger: HapticType = 'tap';

    if (customType && HAPTIC_PATTERNS[customType]) {
      typeToTrigger = customType;
    } else if (
      interactiveElement.getAttribute('role') === 'switch' ||
      (interactiveElement.tagName === 'INPUT' && (interactiveElement as HTMLInputElement).type === 'checkbox') ||
      (interactiveElement.tagName === 'INPUT' && (interactiveElement as HTMLInputElement).type === 'radio')
    ) {
      typeToTrigger = 'toggle';
    } else if (
      interactiveElement.getAttribute('role') === 'tab' ||
      interactiveElement.tagName === 'SELECT'
    ) {
      typeToTrigger = 'selection';
    } else if (interactiveElement.getAttribute('data-variant') === 'primary' || interactiveElement.classList.contains('btn-primary')) {
      typeToTrigger = 'medium';
    }

    lastVibrateTime = now;
    triggerHaptic(typeToTrigger);
  };

  // Listen to change events for keyboard-triggered toggles and select dropdowns
  const handleChange = (event: Event) => {
    if (!isHapticsEnabled) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const isToggle = target.tagName === 'INPUT' && ['checkbox', 'radio', 'range'].includes((target as HTMLInputElement).type);
    const isSelect = target.tagName === 'SELECT';

    if (isToggle || isSelect) {
      const now = Date.now();
      if (now - lastVibrateTime >= 35) {
        lastVibrateTime = now;
        triggerHaptic(isToggle ? 'toggle' : 'selection');
      }
    }
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
  window.addEventListener('change', handleChange, { passive: true, capture: true });

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    window.removeEventListener('change', handleChange, { capture: true });
    isGlobalInitialized = false;
  };
}
