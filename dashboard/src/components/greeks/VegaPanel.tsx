import GreekChart from './GreekChart';

interface Props {
  currency: string;
  selectedExpiry: string | null;
}

export default function VegaPanel({ currency, selectedExpiry }: Props) {
  return (
    <GreekChart
      greek="vega"
      label="VEGA"
      color="#ffb000"
      currency={currency}
      selectedExpiry={selectedExpiry}
      valueFmt={(v) => v.toFixed(2)}
    />
  );
}
