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
import OIChangeSection from './oi/OIChangeSection';
import RVConeSection from './iv/RVConeSection';
import SpotHistorySection from './spot/SpotHistorySection';
import VolumeByStrikeSection from './volume/VolumeByStrikeSection';
import GexLevelsHistorySection from './history/GexLevelsHistorySection';
import OIHistorySection from './history/OIHistorySection';
import SkewHistorySection from './history/SkewHistorySection';
import VolHistorySection from './history/VolHistorySection';

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
            <OIChangeSection />
            <VolumeByStrikeSection />
          </div>
        )}

        {tab === 'volatility' && (
          <div className="panels">
            <TermStructureSection />
            <SkewSection />
            <IVCurvesSection />
            <IVSurfaceSection />
            <RVConeSection />
          </div>
        )}

        {tab === 'history' && (
          <div className="panels">
            <VolHistorySection />
            <SkewHistorySection />
            <OIHistorySection />
            <GexLevelsHistorySection />
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
