import { useState } from 'react';

import { useCotHistory } from '../../hooks/useCotHistory';
import { useSettings } from '../../settings/store';
import { expiryLabel } from '../../utils/format';
import CotNetHistoryPanel from './CotNetHistoryPanel';
import { COT_ZOOMS, type CotZoom } from './zoom';

export default function CotNetHistorySection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useCotHistory(currency);
  const points = data?.points.length ?? 0;

  const { netZoom } = useSettings().cot;
  const [zoom, setZoom] = useState<CotZoom>(netZoom);
  const [zoomSeed, setZoomSeed] = useState(netZoom);
  if (zoomSeed !== netZoom) {
    setZoomSeed(netZoom);
    setZoom(netZoom);
  }

  return (
    <section className="panel panel--full">
      <div className="panel__title">
        <span className="panel__title-main">NET POSITIONING HISTORY</span>
        <span className="panel__title-sub">
          NET {currency}-EQUIV × CATEGORY · WEEKLY · {currency} PRICE STRIP
          {data?.micro_included_from
            ? ` · MICRO FROM ${expiryLabel(data.micro_included_from)}`
            : ''}
        </span>
        <label className="expiry">
          <span className="expiry__label">ZOOM</span>
          <select
            className="expiry__select"
            value={zoom}
            onChange={(e) => setZoom(e.target.value as CotZoom)}
          >
            {COT_ZOOMS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING COT HISTORY…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 2 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 2 && (
          <CotNetHistoryPanel data={data} zoom={zoom} />
        )}
      </div>
    </section>
  );
}
