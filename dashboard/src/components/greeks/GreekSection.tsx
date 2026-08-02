// Deprecated: unmounted since 0.2.0 (the whole CHAIN tab) - per-strike greek profiles
// carry little day-to-day signal next to the OI-weighted exposure panels.
import { useMemo } from 'react';

import { useGreeksChain } from '../../api/queries';
import type { GreekName } from '../../api/client';
import ExpirySelect from '../controls/ExpirySelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import GreekChart, { type GreekPoint } from './GreekChart';

interface Props {
  greek: GreekName;
  label: string;
  color: string;
  valueFmt: (v: number) => string;
}

export default function GreekSection({ greek, label, color, valueFmt }: Props) {
  const query = useGreeksChain(useCurrency());
  const expiries = query.data?.expiries ?? [];
  const { selected, select } = useExpiryPicker(expiries);

  const points = useMemo<GreekPoint[]>(() => {
    if (!query.data || !selected) return [];
    return query.data.points
      .filter((p) => p.expiry === selected)
      .map((p) => ({ strike: p.strike, value: p[greek] }));
  }, [query.data, selected, greek]);

  const state = panelState(query, points, points.length, MIN_POINTS.line);

  return (
    <Panel
      title={label}
      subtitle="BLACK-76 × STRIKE"
      state={state}
      controls={<ExpirySelect expiries={expiries} selected={selected} onSelect={select} />}
    >
      {(data) => <GreekChart points={data} label={label} color={color} valueFmt={valueFmt} />}
    </Panel>
  );
}
