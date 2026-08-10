import { Fragment } from 'react';

export type TabId =
  | 'overview'
  | 'positioning'
  | 'flow'
  | 'volatility'
  | 'probabilities'
  | 'history';

const GROUPS: { label: string; tabs: { id: TabId; label: string }[] }[] = [
  {
    label: 'MARKET',
    tabs: [{ id: 'overview', label: 'Overview' }],
  },
  {
    label: 'OPTIONS',
    tabs: [
      { id: 'positioning', label: 'Positioning' },
      { id: 'flow', label: 'Flow' },
      { id: 'volatility', label: 'Volatility' },
      { id: 'probabilities', label: 'Probabilities' },
      { id: 'history', label: 'History' },
    ],
  },
];

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export default function Tabs({ active, onSelect }: Props) {
  return (
    <nav className="tabs">
      {GROUPS.map(({ label, tabs }) => (
        <Fragment key={label}>
          <span className="tabs__group">{label}</span>
          {tabs.map(({ id, label: tabLabel }) => (
            <button
              key={id}
              type="button"
              className={`tabs__tab${id === active ? ' tabs__tab--active' : ''}`}
              onClick={() => onSelect(id)}
            >
              {tabLabel}
            </button>
          ))}
        </Fragment>
      ))}
    </nav>
  );
}
