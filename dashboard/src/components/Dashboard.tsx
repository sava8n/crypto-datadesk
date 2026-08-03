import { useState } from 'react';

import Header from './Header';
import StatusBar from './StatusBar';
import SettingsDrawer from './settings/SettingsDrawer';
import Tabs, { type TabId } from './Tabs';
import IVCurvesSection from './iv/IVCurvesSection';
import TermStructureSection from './iv/TermStructureSection';
import SkewSection from './iv/SkewSection';
import BasisSection from './basis/BasisSection';
import ProbCurvesSection from './prob/ProbCurvesSection';
import ProbDistributionSection from './prob/ProbDistributionSection';
import ExposureByStrikeSection from './exposure/ExposureByStrikeSection';
import GEXByStrikeSection from './exposure/GEXByStrikeSection';
import SmileCompareSection from './iv/SmileCompareSection';
import ExpiryTableSection from './prob/ExpiryTableSection';
import OIByExpirySection from './oi/OIByExpirySection';
import OIByStrikeSection from './oi/OIByStrikeSection';
import OIChangeByStrikeSection from './oi/OIChangeByStrikeSection';
import RVConeSection from './vol/RVConeSection';
import SpotHistorySection from './spot/SpotHistorySection';
import VolumeByStrikeSection from './volume/VolumeByStrikeSection';
import FlowByExpirySection from './flow/FlowByExpirySection';
import FlowByStrikeSection from './flow/FlowByStrikeSection';
import TapeSection from './flow/TapeSection';
import GEXLevelsHistorySection from './history/GEXLevelsHistorySection';
import OIHistorySection from './history/OIHistorySection';
import SkewHistorySection from './history/SkewHistorySection';
import VolHistorySection from './history/VolHistorySection';
import VRPSection from './history/VRPSection';

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
            <OIByExpirySection />
            <OIChangeByStrikeSection />
            <ExposureByStrikeSection />
          </div>
        )}

        {tab === 'flow' && (
          <div className="panels">
            <FlowByStrikeSection />
            <FlowByExpirySection />
            <TapeSection />
            <VolumeByStrikeSection />
          </div>
        )}

        {tab === 'volatility' && (
          <div className="panels">
            <TermStructureSection />
            <SkewSection />
            <IVCurvesSection />
            <SmileCompareSection />
            <RVConeSection />
            <BasisSection />
          </div>
        )}

        {/* ordered to mirror the live tabs: volatility series first, then positioning */}
        {tab === 'history' && (
          <div className="panels">
            <VolHistorySection />
            <SkewHistorySection />
            <VRPSection />
            <OIHistorySection />
            <GEXLevelsHistorySection />
          </div>
        )}

        {tab === 'probabilities' && (
          <div className="panels">
            <ProbCurvesSection />
            <ProbDistributionSection />
            <ExpiryTableSection />
          </div>
        )}
      </main>

      <StatusBar />

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
