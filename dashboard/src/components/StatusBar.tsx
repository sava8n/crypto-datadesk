import { useStats } from '../hooks/useStats';
import { REFRESH_LABEL } from '../config';

export default function StatusBar({ currency }: { currency: string }) {
  const { isFetching, isError, dataUpdatedAt } = useStats(currency);
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB') : '—';

  const connClass = isError
    ? 'statusbar__conn--err'
    : isFetching
      ? 'statusbar__conn--warn'
      : 'statusbar__conn--ok';
  const connText = isError ? '● DISCONNECTED' : isFetching ? '● SYNCING' : '● CONNECTED';

  return (
    <footer className="statusbar">
      <span className="statusbar__item">UPD {updated}</span>
      <span className="statusbar__spacer" />
      <span className={`statusbar__conn ${connClass}`}>{connText}</span>
      <span className="statusbar__sep">│</span>
      <span className="statusbar__item">REFRESH {REFRESH_LABEL}</span>
    </footer>
  );
}
