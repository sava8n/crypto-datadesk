import { useOIByExpiration } from '../../hooks/useOIByExpiration';
import OIByExpirationPanel from './OIByExpirationPanel';

export default function OIByExpirationSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useOIByExpiration(currency);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">OPEN INTEREST BY EXPIRATION</span>
        <span className="panel__title-sub">CONTRACTS · ITM/OTM × EXPIRY</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING OPEN INTEREST…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 1 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 1 && (
          <OIByExpirationPanel data={data} />
        )}
      </div>
    </section>
  );
}
