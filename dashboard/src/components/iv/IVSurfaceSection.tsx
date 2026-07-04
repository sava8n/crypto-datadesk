import { useIVSurface } from '../../hooks/useIVSurface';
import IVSurfacePanel from './IVSurfacePanel';

export default function IVSurfaceSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useIVSurface(currency);
  const points = data?.points.length ?? 0;

  return (
    <main className="panel">
      <div className="panel__title">
        <span className="panel__title-main">IMPLIED VOLATILITY SURFACE</span>
        <span className="panel__title-sub">3D · DELTA × EXPIRY × IV</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING SURFACE…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 4 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 4 && <IVSurfacePanel data={data} />}
      </div>
    </main>
  );
}
