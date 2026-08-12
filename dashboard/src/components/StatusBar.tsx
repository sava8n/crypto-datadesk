import { useIsFetching } from '@tanstack/react-query';

import { useStats } from '../api/queries';
import { useCurrency, useRefreshMs } from '../settings/store';
import { timeLabel } from '../utils/format';

export default function StatusBar() {
  const { data, isError } = useStats(useCurrency());
  // the clamped period, so the bar reports what the queries actually do
  const refreshSeconds = useRefreshMs() / 1000;
  const busy = useIsFetching() > 0;

  return (
    <footer className="statusbar">
      <span className="statusbar__item">UPD {data ? timeLabel(data.as_of) : '-'}</span>
      <span className="statusbar__item">AUTO {refreshSeconds}s</span>
      <span className="statusbar__spacer" />
      {busy && <span className="statusbar__conn statusbar__conn--warn">● SYNCING</span>}
      {!busy && isError && <span className="statusbar__conn statusbar__conn--err">● ERR</span>}
    </footer>
  );
}
