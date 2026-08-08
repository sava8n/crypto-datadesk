import type { ReportDetail } from '../../types';
import Panel from '../panel/Panel';
import type { PanelState } from '../panel/panelState';

export default function ReferencesPanel({ state }: { state: PanelState<ReportDetail> }) {
  return (
    <Panel title="REFERENCES" subtitle="WHERE THE STORY IS" state={state}>
      {(detail) => (
        <ol className="refs">
          {detail.payload.references.map((ref) => (
            <li key={ref.id} className="refs__item">
              <span className="refs__num">{ref.id}</span>
              <div className="refs__body">
                <a className="refs__title" href={ref.url} target="_blank" rel="noreferrer">
                  {ref.title}
                </a>
                {ref.role === 'further_reading' && (
                  <span className="refs__tag">FURTHER READING</span>
                )}
                <div className="refs__note">{ref.note}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
