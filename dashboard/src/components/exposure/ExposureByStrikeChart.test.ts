import type { LineSeriesOption } from 'echarts';
import { describe, expect, it } from 'vitest';
import type { ExposureByStrikeResponse, ExposureGreek } from '../../types';
import { buildExposureByStrikeOption } from './ExposureByStrikeChart';

const resp = (
  gex_flip: number | null,
  strikes: number[],
  greek: ExposureGreek = 'gamma',
): ExposureByStrikeResponse => ({
  currency: 'BTC',
  spot: 100,
  as_of: '2026-07-26T00:00:00Z',
  greek,
  gex_flip,
  convention: 'assumption',
  tape_start: null,
  oi_explained_fraction: null,
  points: strikes.map((strike) => ({
    strike,
    call_exposure: 1,
    put_exposure: -1,
    net_exposure: 0,
  })),
});

const markLineOf = (option: ReturnType<typeof buildExposureByStrikeOption>) => {
  const series = option.series as LineSeriesOption[];
  return series[2].markLine?.data ?? [];
};

const axisNameOf = (option: ReturnType<typeof buildExposureByStrikeOption>) =>
  (option.yAxis as { name: string }).name;

describe('buildExposureByStrikeOption', () => {
  it('sorts strikes ascending regardless of input order', () => {
    const option = buildExposureByStrikeOption(resp(null, [120_000, 90_000, 100_000]));
    expect((option.xAxis as { data: string[] }).data).toEqual(['90k', '100k', '120k']);
  });

  it('names the axis for the greek served', () => {
    expect(axisNameOf(buildExposureByStrikeOption(resp(null, [100], 'gamma')))).toBe('GEX / 1%');
    expect(axisNameOf(buildExposureByStrikeOption(resp(null, [100], 'vanna')))).toBe(
      'VEX / VOL PT',
    );
    expect(axisNameOf(buildExposureByStrikeOption(resp(null, [100], 'charm')))).toBe('CEX / DAY');
  });

  it('marks the flip at the nearest quoted strike', () => {
    const data = markLineOf(buildExposureByStrikeOption(resp(101, [90, 100, 120])));
    expect(data).toHaveLength(1);
    expect((data[0] as { xAxis: number }).xAxis).toBe(1);
  });

  it('draws no flip line when the backend reports none', () => {
    expect(markLineOf(buildExposureByStrikeOption(resp(null, [90, 100])))).toEqual([]);
  });

  it('draws no flip line for vanna or charm, which never carry one', () => {
    expect(markLineOf(buildExposureByStrikeOption(resp(null, [90, 100], 'vanna')))).toEqual([]);
    expect(markLineOf(buildExposureByStrikeOption(resp(null, [90, 100], 'charm')))).toEqual([]);
  });

  it('draws no flip line when there are no strikes to anchor it to', () => {
    expect(markLineOf(buildExposureByStrikeOption(resp(101, [])))).toEqual([]);
  });

  it('labels the flip with the level, not the index', () => {
    const data = markLineOf(buildExposureByStrikeOption(resp(101, [100, 110])));
    const label = (data[0] as { label: { formatter: string } }).label;
    expect(label.formatter).toBe('Flip $101.00');
  });

  it('drops a flip the strike window has pushed out of view', () => {
    expect(markLineOf(buildExposureByStrikeOption(resp(130, [90, 100, 120])))).toEqual([]);
  });

  it('marks spot at the nearest quoted strike beside the flip', () => {
    const data = markLineOf(buildExposureByStrikeOption(resp(95, [90, 100, 120]), 118));
    expect(data.map((d) => (d as { xAxis: number }).xAxis)).toEqual([0, 2]);
    expect((data[1] as { label: { formatter: string } }).label.formatter).toBe('SPOT');
  });

  it('marks no spot outside the shown strikes or without one', () => {
    expect(markLineOf(buildExposureByStrikeOption(resp(null, [90, 100]), 150))).toEqual([]);
    expect(markLineOf(buildExposureByStrikeOption(resp(null, [90, 100]), null))).toEqual([]);
  });
});
