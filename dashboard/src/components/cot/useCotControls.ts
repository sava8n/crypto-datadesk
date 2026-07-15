import { useState } from 'react';

import type { CotMethod, CotWindow } from '../../api/client';
import { useSettings } from '../../settings/store';

export interface CotControlsState {
  window: CotWindow;
  method: CotMethod;
  flowWeeks: number;
}

// section-local COT controls
// re-seeded from the settings defaults whenever those move
export function useCotControls() {
  const { window, method, flowWeeks } = useSettings().cot;
  const [state, setState] = useState<CotControlsState>({ window, method, flowWeeks });
  const [seed, setSeed] = useState({ window, method, flowWeeks });

  if (seed.window !== window || seed.method !== method || seed.flowWeeks !== flowWeeks) {
    setSeed({ window, method, flowWeeks });
    setState({ window, method, flowWeeks });
  }

  return [state, setState] as const;
}
