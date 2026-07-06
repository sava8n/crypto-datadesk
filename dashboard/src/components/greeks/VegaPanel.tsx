import GreekChart from './GreekChart';

export default function VegaPanel({ currency }: { currency: string }) {
  return (
    <GreekChart
      greek="vega"
      label="VEGA"
      color="#ffb000"
      currency={currency}
      valueFmt={(v) => v.toFixed(2)}
    />
  );
}
