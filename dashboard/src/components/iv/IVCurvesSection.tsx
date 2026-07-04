import { useIVCurves } from '../../hooks/useIVCurves';
import IVCurvesPanel from './IVCurvesPanel';

export default function IVCurvesSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useIVCurves(currency);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">IMPLIED VOLATILITY CURVES</span>
        <span className="panel__title-sub">2D · STRIKE × IV · PER EXPIRY</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING CURVES…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 4 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 4 && <IVCurvesPanel data={data} />}
      </div>
    </section>
  );
}
