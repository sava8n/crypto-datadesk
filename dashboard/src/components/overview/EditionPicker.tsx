import type { ReportListItem } from '../../types';
import { ScopePopover } from '../controls/Scope';
import { editionLabel } from './timeline';

interface Props {
  reports: ReportListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** Edition dropdown for the weekly note; rows carry the headline so the list still reads. */
export default function EditionPicker({ reports, selectedId, onSelect }: Props) {
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0];
  if (!selected) return null;

  return (
    <ScopePopover label="EDITION" value={editionLabel(selected.generated_at)}>
      {(close) => (
        <>
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              className={`picker__row${report.id === selected.id ? ' picker__row--active' : ''}`}
              onClick={() => {
                onSelect(report.id);
                close();
              }}
            >
              <span className="picker__row-k">{editionLabel(report.generated_at)}</span>
              <span className="picker__row-h">{report.headline}</span>
            </button>
          ))}
        </>
      )}
    </ScopePopover>
  );
}
