import { useGEXByStrike } from '../../hooks/useGEXByStrike';
import GEXByStrikePanel from './GEXByStrikePanel';

export default function GEXByStrikeSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useGEXByStrike(currency);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">GAMMA EXPOSURE BY STRIKE</span>
        <span className="panel__title-sub">USD / 1% MOVE · CALLS + / PUTS − × STRIKE</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING GAMMA EXPOSURE…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 1 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 1 && <GEXByStrikePanel data={data} />}
      </div>
    </section>
  );
}
