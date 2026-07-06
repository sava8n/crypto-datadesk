import { useState } from 'react';

import Header from './Header';
import StatusBar from './StatusBar';
import Tabs, { type TabId } from './Tabs';
import IVSurfaceSection from './iv/IVSurfaceSection';
import IVCurvesSection from './iv/IVCurvesSection';
import TermStructureSection from './iv/TermStructureSection';
import SkewSection from './iv/SkewSection';
import DeltaSection from './greeks/DeltaSection';
import GammaSection from './greeks/GammaSection';
import ThetaSection from './greeks/ThetaSection';
import VegaSection from './greeks/VegaSection';
import GEXByStrikeSection from './gex/GEXByStrikeSection';
import OIByExpirationSection from './oi/OIByExpirationSection';
import OIByStrikeSection from './oi/OIByStrikeSection';
import SpotHistorySection from './spot/SpotHistorySection';
import VolumeByStrikeSection from './volume/VolumeByStrikeSection';

export default function Dashboard({ currency }: { currency: string }) {
  const [tab, setTab] = useState<TabId>('positioning');

  return (
    <div className="dashboard">
      <Header currency={currency} />

      <SpotHistorySection currency={currency} />

      <Tabs active={tab} onSelect={setTab} />

      <main className="tab-body">
        {tab === 'positioning' && (
          <>
            <GEXByStrikeSection currency={currency} />
            <OIByStrikeSection currency={currency} />
            <VolumeByStrikeSection currency={currency} />
            <OIByExpirationSection currency={currency} />
          </>
        )}

        {tab === 'volatility' && (
          <div className="panels">
            <TermStructureSection currency={currency} />
            <SkewSection currency={currency} />
            <IVCurvesSection currency={currency} />
            <IVSurfaceSection currency={currency} />
          </div>
        )}

        {tab === 'chain' && (
          <div className="panels panels--mini">
            <DeltaSection currency={currency} />
            <GammaSection currency={currency} />
            <ThetaSection currency={currency} />
            <VegaSection currency={currency} />
          </div>
        )}
      </main>

      <StatusBar currency={currency} />
    </div>
  );
}
