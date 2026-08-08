import type { ReportDetail } from '../../types';
import Panel from '../panel/Panel';
import type { PanelState } from '../panel/panelState';
import { metaLine } from './overview';
import ReportBody from './ReportBody';

export default function ReportPanel({ state }: { state: PanelState<ReportDetail> }) {
  return (
    <Panel title="MARKET OVERVIEW" subtitle="AI WEEKLY DESK NOTE" state={state}>
      {(detail) => (
        <div className="report">
          <h1 className="report__headline">{detail.payload.headline}</h1>
          <div className="report__meta">{metaLine(detail)}</div>
          <p className="report__standfirst">{detail.payload.standfirst}</p>
          <div className="report-body">
            <ReportBody body_md={detail.payload.body_md} />
          </div>
        </div>
      )}
    </Panel>
  );
}
