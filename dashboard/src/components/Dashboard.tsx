import { useState } from 'react';

import { useTheme } from '../settings/store';
import MarketStrip from './MarketStrip';
import SectionView from './nav/SectionView';
import Sidebar from './nav/Sidebar';
import { DEFAULT_SECTION, DEFAULT_VIEW, findSection, findView } from './nav/sections';
import PreferencesModal from './settings/PreferencesModal';

export default function Dashboard() {
  const [route, setRoute] = useState({ section: DEFAULT_SECTION, view: DEFAULT_VIEW });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();

  const section = findSection(route.section);
  const view = findView(section, route.view);

  return (
    <div className="dashboard">
      <Sidebar
        section={section.id}
        view={view.id}
        onSelect={(s, v) => setRoute({ section: s, view: v })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/*
       * Charts hold their colours as plain strings baked into a memoised option, so a theme
       * switch remounts them rather than threading the mode through every dependency array.
       * Legend toggles reset with it - acceptable for an explicit, infrequent action.
       */}
      <div className="shell" key={theme}>
        <MarketStrip />
        <main className="shell__body">
          <div className="shell__inner">
            <SectionView view={view} />
          </div>
        </main>
      </div>

      <PreferencesModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
