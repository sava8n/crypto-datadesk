import { useState } from 'react';

import Header from './Header';
import StatusBar from './StatusBar';
import SettingsDrawer from './settings/SettingsDrawer';
import Tabs, { type TabId } from './Tabs';
import IVSurfaceSection from './iv/IVSurfaceSection';
import IVCurvesSection from './iv/IVCurvesSection';
import TermStructureSection from './iv/TermStructureSection';
import SkewSection from './iv/SkewSection';
import GreekSection from './greeks/GreekSection';
import { GREEKS } from './greeks/greeks';
import BasisSection from './basis/BasisSection';
import ProbCurvesSection from './prob/ProbCurvesSection';
import ProbDistributionSection from './prob/ProbDistributionSection';
import GEXByStrikeSection from './gex/GEXByStrikeSection';
import OIByExpirationSection from './oi/OIByExpirationSection';
import OIByStrikeSection from './oi/OIByStrikeSection';
import SpotHistorySection from './spot/SpotHistorySection';
import VolumeByStrikeSection from './volume/VolumeByStrikeSection';

export default function Dashboard() {
  const [tab, setTab] = useState<TabId>('positioning');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="dashboard">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <SpotHistorySection />

      <Tabs active={tab} onSelect={setTab} />

      <main className="tab-body">
        {tab === 'positioning' && (
          <div className="panels">
            <GEXByStrikeSection />
            <OIByStrikeSection />
            <OIByExpirationSection />
            <VolumeByStrikeSection />
          </div>
        )}

        {tab === 'volatility' && (
          <div className="panels">
            <TermStructureSection />
            <SkewSection />
            <IVCurvesSection />
            <IVSurfaceSection />
          </div>
        )}

        {tab === 'probabilities' && (
          <div className="panels">
            <ProbCurvesSection />
            <ProbDistributionSection />
          </div>
        )}

        {tab === 'chain' && (
          <div className="panels panels--mini">
            {GREEKS.map((g) => (
              <GreekSection key={g.greek} {...g} />
            ))}
            <BasisSection />
          </div>
        )}
      </main>

      <StatusBar />

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
