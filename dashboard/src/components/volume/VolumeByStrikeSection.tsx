import { useVolumeByStrike } from '../../hooks/useVolumeByStrike';
import VolumeByStrikePanel from './VolumeByStrikePanel';

export default function VolumeByStrikeSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useVolumeByStrike(currency);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">VOLUME BY STRIKE</span>
        <span className="panel__title-sub">CONTRACTS · 24H · CALLS/PUTS × STRIKE</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING VOLUME…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 1 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 1 && <VolumeByStrikePanel data={data} />}
      </div>
    </section>
  );
}
