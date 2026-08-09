import type { ReportCalendarEvent, ReportDetail, ReportImportance } from '../../types';
import { dateLabel } from '../../utils/format';
import Panel from '../panel/Panel';
import type { PanelState } from '../panel/panelState';

function Row({ event }: { event: ReportCalendarEvent }) {
  return (
    <div className="cal__row">
      <div className="cal__when">
        <span className="cal__date">{dateLabel(event.date)}</span>
        <span className="cal__time">{event.time_utc ? `${event.time_utc}Z` : 'ALL DAY'}</span>
      </div>
      <div className="cal__what">
        <div className="cal__title">
          {event.title}
          <Badge importance={event.importance} />
        </div>
        <div className="cal__note">{event.note}</div>
      </div>
    </div>
  );
}

function Badge({ importance }: { importance: ReportImportance | 'auto' }) {
  return <span className={`badge badge--${importance}`}>{importance.toUpperCase()}</span>;
}

export default function CalendarPanel({ state }: { state: PanelState<ReportDetail> }) {
  return (
    <Panel title="CALENDAR" subtitle="MACRO · NEXT 7-10D" state={state}>
      {(detail) => (
        <div className="cal">
          {detail.payload.calendar.map((event, i) => (
            <Row key={i} event={event} />
          ))}
          {/* appended by the frontend from the schedule, never part of the stored payload */}
          <div className="cal__row">
            <div className="cal__when">
              <span className="cal__date">{dateLabel(detail.next_report_at)}</span>
              <span className="cal__time">{detail.next_report_at.slice(11, 16)}Z</span>
            </div>
            <div className="cal__what">
              <div className="cal__title">
                NEXT WEEKLY NOTE
                <Badge importance="auto" />
              </div>
              <div className="cal__note">Scheduled generation of the next report.</div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
