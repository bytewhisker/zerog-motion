import type { PresetName, SpringConfig } from '../types.js';

/**
 * Calibrated spring presets for common interface interactions.
 */
export const presets: Record<PresetName, Readonly<Required<Omit<SpringConfig, 'velocity' | 'precision'>>>> = {
  /**
   * High stiffness, optimal damping for instant tactile UI feedback.
   * Perfect for buttons, toggles, and micro-interactions.
   */
  snappy: {
    stiffness: 400,
    damping: 30,
    mass: 1,
  },

  /**
   * Playful overshoot with moderate damping.
   * Ideal for modals, popovers, badges, and cheerful UI reveals.
   */
  bouncy: {
    stiffness: 200,
    damping: 10,
    mass: 1,
  },

  /**
   * Silky, Apple-style fluid layout transitions without jarring bounces.
   * Best for tabs, accordions, dynamic height morphs, and route changes.
   */
  smooth: {
    stiffness: 120,
    damping: 20,
    mass: 1,
  },

  /**
   * Soft, relaxed deceleration for low-urgency states.
   * Great for subtle hovers, tooltips, and opacity fades.
   */
  gentle: {
    stiffness: 80,
    damping: 14,
    mass: 1,
  },
} as const;

/**
 * Type guard to check if a value is a valid PresetName.
 */
export function isPresetName(value: unknown): value is PresetName {
  return typeof value === 'string' && value in presets;
}

/**
 * Resolves a preset name or SpringConfig object into a concrete SpringConfig.
 */
export function resolveSpringPreset(presetOrConfig?: PresetName | SpringConfig): SpringConfig {
  if (!presetOrConfig) {
    return presets.smooth;
  }
  if (typeof presetOrConfig === 'string' && isPresetName(presetOrConfig)) {
    return presets[presetOrConfig];
  }
  return presetOrConfig as SpringConfig;
}
