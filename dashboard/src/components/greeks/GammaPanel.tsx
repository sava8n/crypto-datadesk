import GreekChart from './GreekChart';

interface Props {
  currency: string;
  selectedExpiry: string | null;
}

export default function GammaPanel({ currency, selectedExpiry }: Props) {
  return (
    <GreekChart
      greek="gamma"
      label="GAMMA"
      color="#33ff66"
      currency={currency}
      selectedExpiry={selectedExpiry}
      valueFmt={(v) => v.toFixed(6)}
    />
  );
}
