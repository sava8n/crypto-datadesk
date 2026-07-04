import { useTermStructure } from '../../hooks/useTermStructure';
import TermStructurePanel from './TermStructurePanel';

export default function TermStructureSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useTermStructure(currency);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">TERM STRUCTURE</span>
        <span className="panel__title-sub">2D · ATM IV × EXPIRY</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING TERM STRUCTURE…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 3 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 3 && <TermStructurePanel data={data} />}
      </div>
    </section>
  );
}
