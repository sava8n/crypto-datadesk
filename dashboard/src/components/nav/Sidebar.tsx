import { useIsFetching } from '@tanstack/react-query';
import { Fragment, useState } from 'react';

import { useStats } from '../../api/queries';
import { useCurrency, useRefreshMs } from '../../settings/store';
import { timeLabel } from '../../utils/format';
import GearIcon from '../icons/GearIcon';
import { SECTIONS } from './sections';

interface Props {
  section: string;
  view: string;
  onSelect: (section: string, view: string) => void;
  onOpenSettings: () => void;
}

function Footer() {
  const { data, isError } = useStats(useCurrency());
  // the clamped period, so the readout reports what the queries actually do
  const refreshSeconds = useRefreshMs() / 1000;
  const busy = useIsFetching() > 0;

  return (
    <div className="sidebar__status">
      <span className="sidebar__live">
        <span
          className={`dot${busy ? ' dot--warn' : isError ? ' dot--err' : ''}`}
          aria-hidden="true"
        />
        {busy ? 'SYNCING' : isError ? 'ERR · DERIBIT' : 'LIVE · DERIBIT'}
      </span>
      <span className="sidebar__upd">
        UPD {data ? timeLabel(data.as_of) : '-'} · AUTO {refreshSeconds}s
      </span>
    </div>
  );
}

export default function Sidebar({ section, view, onSelect, onOpenSettings }: Props) {
  const currency = useCurrency();
  // expansion is independent of selection: opening one section leaves the others as they are
  const [expanded, setExpanded] = useState<string[]>([section]);

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">
        Datadesk.
        <span className="sidebar__tag">{currency}</span>
      </div>

      {SECTIONS.map((s, i) => {
        const active = s.id === section;
        const first = i === 0 || SECTIONS[i - 1].group !== s.group;
        // a lone view has nothing to expand into, so its row navigates instead
        const single = s.views.length === 1;
        const open = expanded.includes(s.id);
        return (
          <Fragment key={s.id}>
            {first && <span className="sidebar__group">{s.group}</span>}
            <button
              type="button"
              className={`navrow${active ? ' navrow--active' : ''}`}
              aria-expanded={single ? undefined : open}
              onClick={() => (single ? onSelect(s.id, s.views[0].id) : toggle(s.id))}
            >
              {s.label}
            </button>
            {!single &&
              open &&
              s.views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`navsub${active && v.id === view ? ' navsub--active' : ''}`}
                  onClick={() => onSelect(s.id, v.id)}
                >
                  {v.label}
                </button>
              ))}
          </Fragment>
        );
      })}

      <div className="sidebar__spacer" />

      <Footer />

      <button type="button" className="prefs" onClick={onOpenSettings}>
        <GearIcon className="prefs__icon" />
        Preferences
      </button>
    </nav>
  );
}
