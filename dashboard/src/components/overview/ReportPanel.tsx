import type { ReportDetail, ReportListItem } from '../../types';
import { Scopes } from '../controls/Scope';
import Panel from '../panel/Panel';
import type { PanelState } from '../panel/panelState';
import EditionPicker from './EditionPicker';
import ReportBody from './ReportBody';

interface Props {
  state: PanelState<ReportDetail>;
  reports: ReportListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function ReportPanel({ state, reports, selectedId, onSelect }: Props) {
  return (
    <Panel
      title="MARKET OVERVIEW"
      state={state}
      controls={
        <Scopes>
          <EditionPicker reports={reports} selectedId={selectedId} onSelect={onSelect} />
        </Scopes>
      }
    >
      {(detail) => (
        <div className="report">
          <h1 className="report__headline">{detail.payload.headline}</h1>
          <p className="report__standfirst">{detail.payload.standfirst}</p>
          <div className="report-body">
            <ReportBody
              body_md={detail.payload.body_md}
              refIds={new Set(detail.payload.references.map((r) => r.id))}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
