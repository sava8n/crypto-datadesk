import type { ReportListItem } from '../../types';
import { dateLabel, timeLabel } from '../../utils/format';
import Panel from '../panel/Panel';
import type { PanelState } from '../panel/panelState';
import { timelineLabel } from './timeline';

interface Props {
  state: PanelState<ReportListItem[]>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function TimelinePanel({ state, selectedId, onSelect }: Props) {
  return (
    <Panel title="TIMELINE" subtitle="WEEKLY" state={state}>
      {(reports) => (
        <div className="timeline">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              className={`timeline__item${report.id === selectedId ? ' timeline__item--active' : ''}`}
              onClick={() => onSelect(report.id)}
            >
              <span className="timeline__date">
                {dateLabel(report.generated_at)} {timeLabel(report.generated_at)}
              </span>
              <span className="timeline__label">{timelineLabel(report.generated_at)}</span>
              <span className="timeline__headline">{report.headline}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
