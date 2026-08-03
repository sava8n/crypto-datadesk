import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';

import type { SpotCandle } from '../../types';
import type { Cone } from './ExpectedMoveConePrimitive';
import { ExpectedMoveConePrimitive } from './ExpectedMoveConePrimitive';
import { AMBER, AXIS_LINE, DOWN, GRID, MONO, UP } from '../../theme/charts';
import { useSettings } from '../../settings/store';
import { priceWhole } from '../../utils/format';


// blank space kept past the cone, as a fraction of the visible window
const LABEL_ROOM = 0.09;

interface Props {
  candles: SpotCandle[];
  cone?: Cone;
}

export default function SpotHistoryChart({ candles, cone }: Props) {
  const { spotLookbackDays } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const coneRef = useRef<ExpectedMoveConePrimitive | null>(null);
  // the lookback the visible range was last set from; null until the first paint
  const windowedRef = useRef<number | null>(null);

  const bars = useMemo(
    () =>
      candles.map((c) => ({
        time: c.ts.slice(0, 10), // daily candles: 'YYYY-MM-DD'
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    [candles],
  );

  const rows = useMemo(() => {
    const future = cone?.points.filter((p) => p.time > (bars[bars.length - 1]?.time ?? '')) ?? [];
    return [...bars, ...future.map((p) => ({ time: p.time }))];
  }, [bars, cone]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: AMBER,
        fontFamily: MONO,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      rightPriceScale: {
        borderColor: AXIS_LINE,
        // tight auto-fit: let the visible candles use almost the full panel height
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: { borderColor: AXIS_LINE },
      crosshair: {
        vertLine: { color: AXIS_LINE, labelBackgroundColor: '#0b0e10' },
        horzLine: { color: AXIS_LINE, labelBackgroundColor: '#0b0e10' },
      },
      localization: {
        priceFormatter: priceWhole,
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: false,
    });

    const conePrimitive = new ExpectedMoveConePrimitive();
    series.attachPrimitive(conePrimitive);

    chartRef.current = chart;
    seriesRef.current = series;
    coneRef.current = conePrimitive;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      coneRef.current = null;
      windowedRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    series.setData(rows);
    // default view on first load and whenever the lookback setting changes;
    // later refetches keep the user's zoom/pan
    if (windowedRef.current !== spotLookbackDays) {
      const from = Math.max(0, bars.length - spotLookbackDays);
      chart.timeScale().setVisibleLogicalRange({
        from,
        to: rows.length + (rows.length - from) * LABEL_ROOM,
      });
      windowedRef.current = spotLookbackDays;
    }
  }, [rows, bars.length, spotLookbackDays]);

  // the expected-move cone, drawn forward from the last candle
  useEffect(() => {
    coneRef.current?.setCone(cone ?? null);
  }, [cone]);

  return <div ref={containerRef} />;
}
