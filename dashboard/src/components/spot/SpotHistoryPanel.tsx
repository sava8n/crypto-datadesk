import { useEffect, useMemo, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from 'lightweight-charts';

import type { SpotCandle } from '../../types';
import type { PriceLevel } from './levels';
import { AMBER, AXIS_LINE, GRID, MONO } from '../../theme/charts';

const UP = '#33ff66';
const DOWN = '#ff3b30';
const DEFAULT_WINDOW_DAYS = 180;

interface Props {
  candles: SpotCandle[];
  levels: PriceLevel[];
}

export default function SpotHistoryPanel({ candles, levels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const windowedRef = useRef(false);

  const rows = useMemo(
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
        priceFormatter: (p: number) => p.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      windowedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    series.setData(rows);
    // default view on first load; later refetches keep the user's zoom/pan.
    if (!windowedRef.current) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, rows.length - DEFAULT_WINDOW_DAYS),
        to: rows.length,
      });
      windowedRef.current = true;
    }
  }, [rows]);

  // options-derived levels as horizontal price lines, resynced on each refetch
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((line) => series.removePriceLine(line));
    priceLinesRef.current = levels.map((lvl) =>
      series.createPriceLine({
        price: lvl.price,
        color: lvl.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: lvl.title,
      }),
    );
  }, [levels]);

  return <div ref={containerRef} />;
}
