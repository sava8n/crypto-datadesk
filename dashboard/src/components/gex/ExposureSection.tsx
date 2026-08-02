import { useState } from 'react';

import { useExposure } from '../../api/queries';
import type { ExposureGreek } from '../../types';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import ExposureChart from './ExposureChart';

const GREEKS: { value: ExposureGreek; label: string }[] = [
  { value: 'vanna', label: 'VANNA' },
  { value: 'charm', label: 'CHARM' },
];

function GreekSelect({
  greek,
  onSelect,
}: {
  greek: ExposureGreek;
  onSelect: (g: ExposureGreek) => void;
}) {
  return (
    <label className="expiry">
      <span className="expiry__label">GREEK</span>
      <select
        className="expiry__select"
        value={greek}
        onChange={(e) => onSelect(e.target.value as ExposureGreek)}
      >
        {GREEKS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ExposureSection() {
  const [greek, setGreek] = useState<ExposureGreek>('vanna');
  const query = useExposure(useCurrency(), greek);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="VANNA / CHARM EXPOSURE"
      subtitle="USD Δ · CALLS + / PUTS - × STRIKE"
      state={state}
      controls={<GreekSelect greek={greek} onSelect={setGreek} />}
    >
      {(data) => <ExposureChart data={data} />}
    </Panel>
  );
}
