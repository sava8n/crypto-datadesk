import { RECENT_WINDOWS, STRIKE_RANGES } from '../../config';
import { useChartScope } from '../../settings/store';
import { EXPIRY_ALL, resolveExpiry } from '../../utils/expiry';
import { dateLabel, usdShort } from '../../utils/format';
import { MIN_PREMIUMS } from '../flow/tape';
import DteSlider from './DteSlider';
import { ScopePopover, ScopeRow, ScopeSegmented } from './Scope';

interface ScopeProps {
  chartId: string;
}

export function FlowWindowScope({ chartId }: ScopeProps) {
  const { scope, update } = useChartScope(chartId);

  return (
    <ScopeSegmented
      label="WINDOW"
      value={scope.flowWindow}
      options={RECENT_WINDOWS}
      onSelect={(v) => update({ flowWindow: v })}
    />
  );
}

export function StrikeRangeScope({ chartId }: ScopeProps) {
  const { scope, update } = useChartScope(chartId);

  return (
    <ScopeSegmented
      label="STRIKES"
      value={scope.strikeRange}
      options={STRIKE_RANGES}
      onSelect={(v) => update({ strikeRange: v })}
    />
  );
}

export function DteScope({ chartId }: ScopeProps) {
  const { scope, update } = useChartScope(chartId);

  return (
    <ScopePopover label="DTE" value={`${scope.minDte}-${scope.maxDte}D`} width={240}>
      {() => (
        <div className="scope__slider">
          <span className="scope__slider-val">
            {scope.minDte} - {scope.maxDte}D
          </span>
          <DteSlider
            min={scope.minDte}
            max={scope.maxDte}
            onCommit={(lo, hi) => update({ minDte: lo, maxDte: hi })}
          />
        </div>
      )}
    </ScopePopover>
  );
}

export function PremiumScope({ chartId }: ScopeProps) {
  const { scope, update } = useChartScope(chartId);
  const label = MIN_PREMIUMS.find((p) => p.value === scope.tapeMinPremium)?.label;

  return (
    <ScopePopover
      label="MIN PREM"
      value={label ?? `≥${usdShort(scope.tapeMinPremium)}`}
      width={180}
    >
      {(close) => (
        <>
          {MIN_PREMIUMS.map((p) => (
            <ScopeRow
              key={p.value}
              active={p.value === scope.tapeMinPremium}
              onClick={() => {
                update({ tapeMinPremium: p.value });
                close();
              }}
            >
              {p.label}
            </ScopeRow>
          ))}
        </>
      )}
    </ScopePopover>
  );
}

/**
 * The trigger shows the resolved expiry, not the raw scope: a stored pick that has rolled off
 * the chain resolves to a quoted one. ALL is offered only where the chart can plot every expiry.
 */
export function ExpiryScope({
  chartId,
  expiries,
  allowAll,
}: ScopeProps & { expiries: string[]; allowAll?: boolean }) {
  const { scope, update } = useChartScope(chartId);

  const options = [
    ...(allowAll ? [{ value: EXPIRY_ALL, label: 'ALL EXPIRIES' }] : []),
    ...expiries.map((iso) => ({ value: iso, label: dateLabel(iso) })),
  ];
  const active =
    allowAll && scope.expiry === EXPIRY_ALL
      ? EXPIRY_ALL
      : (resolveExpiry(scope.expiry, expiries) ?? scope.expiry);
  const current = options.find((o) => o.value === active);

  return (
    <ScopePopover label="EXPIRY" value={current?.label ?? '-'} width={200}>
      {(close) => (
        <>
          {options.map((o) => (
            <ScopeRow
              key={o.value}
              active={o.value === active}
              onClick={() => {
                update({ expiry: o.value });
                close();
              }}
            >
              {o.label}
            </ScopeRow>
          ))}
        </>
      )}
    </ScopePopover>
  );
}
