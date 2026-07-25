import { useIsFetching } from '@tanstack/react-query';

import { useStats } from '../hooks/useStats';

export default function StatusBar({ currency }: { currency: string }) {
  const { data, isError } = useStats(currency);
  const busy = useIsFetching() > 0;

  const updated = data ? new Date(data.as_of).toLocaleTimeString('en-GB') : '-';

  return (
    <footer className="statusbar">
      <span className="statusbar__item">UPD {updated}</span>
      <span className="statusbar__spacer" />
      {busy && <span className="statusbar__conn statusbar__conn--warn">● SYNCING</span>}
      {!busy && isError && <span className="statusbar__conn statusbar__conn--err">● ERR</span>}
    </footer>
  );
}
