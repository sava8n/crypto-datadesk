import GreekChart from './GreekChart';

export default function GammaPanel({ currency }: { currency: string }) {
  return (
    <GreekChart
      greek="gamma"
      label="GAMMA"
      color="#33ff66"
      currency={currency}
      valueFmt={(v) => v.toFixed(6)}
    />
  );
}
