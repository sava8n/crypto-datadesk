import { useState } from 'react';

import { useExposure } from '../../api/queries';
import type { ExposureGreek, GexConvention } from '../../types';
import ConventionSelect from '../controls/ConventionSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { conventionSubtitle } from './convention';
import ExposureByStrikeChart from './ExposureByStrikeChart';

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

export default function ExposureByStrikeSection() {
  const [greek, setGreek] = useState<ExposureGreek>('vanna');
  const [convention, setConvention] = useState<GexConvention>('assumption');
  const query = useExposure(useCurrency(), greek, convention);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="VANNA / CHARM EXPOSURE BY STRIKE"
      subtitle={conventionSubtitle('USD Δ', query.data)}
      state={state}
      controls={
        <>
          <GreekSelect greek={greek} onSelect={setGreek} />
          <ConventionSelect convention={convention} onSelect={setConvention} />
        </>
      }
    >
      {(data) => <ExposureByStrikeChart data={data} />}
    </Panel>
  );
}
