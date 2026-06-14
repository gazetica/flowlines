// hapticService.ts
// Flow Lines | Gazetica Studio | UX Sprint A | Task FL-UX-A.5
//
// Thin @capacitor/haptics wrapper for the three tactile game moments. Each call
// reads the FL Haptics toggle live (so a mid-game change applies at once) and is
// fire-and-forget — errors (e.g. web, no vibrator) are swallowed so haptics can
// never affect gameplay.

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

function enabled(): boolean {
  return useFlowSettingsStore.getState().hapticsEnabled;
}

/** A colour pair connected — a single medium tap. */
export async function hapticLockIn(): Promise<void> {
  if (!enabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* no vibrator / web — ignore */
  }
}

/** Level complete — a heavy thump followed by a light flourish. */
export async function hapticWin(): Promise<void> {
  if (!enabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((r) => setTimeout(r, 120));
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Path retracted — a light tick. */
export async function hapticUndo(): Promise<void> {
  if (!enabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}
