import Header from './Header';
import StatusBar from './StatusBar';
import IVSurfaceSection from './iv/IVSurfaceSection';
import IVCurvesSection from './iv/IVCurvesSection';
import TermStructureSection from './iv/TermStructureSection';
import DeltaPanel from './greeks/DeltaPanel';
import GammaPanel from './greeks/GammaPanel';
import ThetaPanel from './greeks/ThetaPanel';
import VegaPanel from './greeks/VegaPanel';
import OIByExpirationSection from './oi/OIByExpirationSection';
import OIByStrikeSection from './oi/OIByStrikeSection';

export default function Dashboard({ currency }: { currency: string }) {
  return (
    <div className="dashboard">
      <Header currency={currency} />

      <div className="panels panels--mini">
        <DeltaPanel currency={currency} />
        <GammaPanel currency={currency} />
        <ThetaPanel currency={currency} />
        <VegaPanel currency={currency} />
      </div>

      <OIByStrikeSection currency={currency} />

      <OIByExpirationSection currency={currency} />

      <div className="panels">
        <IVSurfaceSection currency={currency} />
        <IVCurvesSection currency={currency} />
        <TermStructureSection currency={currency} />
      </div>

      <StatusBar currency={currency} />
    </div>
  );
}
