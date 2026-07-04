import { useSummary } from '../hooks/useSummary';

export default function StatusBar({ currency }: { currency: string }) {
  const { data, isFetching, isError, dataUpdatedAt } = useSummary(currency);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB') : '—';
  const points = data?.instrument_count ?? 0;
  const expiries = data?.expiry_count ?? 0;

  const connClass = isError
    ? 'statusbar__conn--err'
    : isFetching
      ? 'statusbar__conn--warn'
      : 'statusbar__conn--ok';
  const connText = isError ? '● DISCONNECTED' : isFetching ? '● SYNCING' : '● CONNECTED';

  return (
    <footer className="statusbar">
      <span className="statusbar__item">PTS {points}</span>
      <span className="statusbar__sep">│</span>
      <span className="statusbar__item">EXP {expiries}</span>
      <span className="statusbar__sep">│</span>
      <span className="statusbar__item">UPD {updated}</span>
      <span className="statusbar__spacer" />
      <span className={`statusbar__conn ${connClass}`}>{connText}</span>
      <span className="statusbar__sep">│</span>
      <span className="statusbar__item">REFRESH 5m</span>
    </footer>
  );
}
