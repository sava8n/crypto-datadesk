import { useEffect, useState } from 'react';

import { useReport, useReports } from '../../api/queries';
import { panelState } from '../panel/panelState';
import CalendarPanel from './CalendarPanel';
import ReferencesPanel from './ReferencesPanel';
import ReportPanel from './ReportPanel';
import TimelinePanel from './TimelinePanel';

export default function OverviewTab() {
  const list = useReports();
  // selection is deliberate; until the user makes one, follow the newest report
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const newest = list.data?.reports[0]?.id ?? null;
  useEffect(() => {
    if (selectedId == null && newest != null) setSelectedId(newest);
  }, [selectedId, newest]);

  const detail = useReport(selectedId);
  const noReports = list.data != null && list.data.reports.length === 0;
  const empty = { kind: 'empty', message: 'NO REPORT YET · GENERATED WEEKLY' } as const;
  const detailState = noReports ? empty : panelState(detail, detail.data, 1, 1);

  return (
    <div className="overview">
      <TimelinePanel
        state={
          noReports
            ? empty
            : panelState(list, list.data?.reports, list.data?.reports.length ?? 0, 1)
        }
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <ReportPanel state={detailState} />
      <div className="overview__side">
        <ReferencesPanel state={detailState} />
        <CalendarPanel state={detailState} />
      </div>
    </div>
  );
}
