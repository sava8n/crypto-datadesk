import type { ReactNode } from 'react';

import BasisSection from '../basis/BasisSection';
import ExposureByStrikeSection from '../exposure/ExposureByStrikeSection';
import FlowByExpirySection from '../flow/FlowByExpirySection';
import FlowByStrikeSection from '../flow/FlowByStrikeSection';
import TapeSection from '../flow/TapeSection';
import GEXLevelsHistorySection from '../history/GEXLevelsHistorySection';
import OIHistorySection from '../history/OIHistorySection';
import SkewHistorySection from '../history/SkewHistorySection';
import VolHistorySection from '../history/VolHistorySection';
import VRPSection from '../history/VRPSection';
import IVCurvesSection from '../iv/IVCurvesSection';
import SkewSection from '../iv/SkewSection';
import SmileCompareSection from '../iv/SmileCompareSection';
import TermStructureSection from '../iv/TermStructureSection';
import OIByExpirySection from '../oi/OIByExpirySection';
import OIByStrikeSection from '../oi/OIByStrikeSection';
import OIChangeByStrikeSection from '../oi/OIChangeByStrikeSection';
import OverviewTab from '../overview/OverviewTab';
import ExpiryTableSection from '../prob/ExpiryTableSection';
import ProbCurvesSection from '../prob/ProbCurvesSection';
import ProbDistributionSection from '../prob/ProbDistributionSection';
import RVConeSection from '../vol/RVConeSection';
import VolumeByStrikeSection from '../volume/VolumeByStrikeSection';

/**
 * The navigation tree, as data.
 *
 * A view is a reading unit, not a chart: it holds several charts when they answer one
 * question from different angles, and one chart when that chart stands on its own.
 * The sidebar and the routing both read this single source; each chart titles itself.
 */
export interface View {
  id: string;
  label: string;
  // paragraphs rendered under the charts: what it shows, why it matters, how to read it, what
  // the controls do; omitted for the editorial view, which explains itself
  desc?: string[];
  render: () => ReactNode;
}

export interface Section {
  id: string;
  label: string;
  group: 'MARKET' | 'OPTIONS';
  views: View[];
}

export const SECTIONS: Section[] = [
  {
    id: 'overview',
    label: 'Overview',
    group: 'MARKET',
    views: [
      {
        id: 'note',
        label: 'Weekly note',
        render: () => <OverviewTab />,
      },
    ],
  },
  {
    id: 'positioning',
    label: 'Positioning',
    group: 'OPTIONS',
    views: [
      {
        id: 'gamma',
        label: 'Gamma',
        desc: [
          'Dealer gamma exposure in dollars per 1% move in the forward, summed at every strike, ' +
            'together with how the flip level, max pain and spot have moved against each other ' +
            'through time.',
          'Dealer hedging is mechanical rather than discretionary, so the sign of aggregate ' +
            'gamma decides whether that hedging damps moves or feeds them. It is the cleanest ' +
            'read available on whether a range is likely to hold or to break.',
          'Blue bars are the call side, orange the put side, and the line is the net. Above the ' +
            'flip level net gamma is positive: dealers sell rallies and buy dips, compressing ' +
            'realized vol into a range. Below it they hedge with the move instead and accelerate ' +
            'it. Bar height is how much hedging flow sits at that strike, and the tallest ones ' +
            'tend to act as magnets into expiry. In the history, watch how far spot is trading ' +
            'from the flip - sustained time below it is the regime where gaps happen.',
          'GEX SIGN sets how dealer inventory is signed. ASSUMED takes the classic view that ' +
            'dealers are long the calls and short the puts; FLOW signs each contract from the ' +
            'cumulative taker flow on the tape and falls back to the assumption where the tape ' +
            'does not cover the open interest. LOOKBACK sets the span of the history.',
        ],
        render: () => (
          <>
            <ExposureByStrikeSection greek="gamma" />
            <GEXLevelsHistorySection />
          </>
        ),
      },
      {
        id: 'openInterest',
        label: 'Open interest',
        desc: [
          'Contracts still outstanding, split into in- and out-of-the-money on each side, ' +
            'across strikes and across expiries; what was built or unwound over the window; and ' +
            'the call/put balance through time.',
          'Open interest is where positions actually are, as opposed to volume, which is only ' +
            'what changed hands. It marks the strikes dealers have to hedge around and the dates ' +
            'on which that hedging stops.',
          'Bars stack lighter for in-the-money and deeper for out-of-the-money, blue for calls ' +
            'and orange for puts. Tall out-of-the-money call strikes are supply into a rally; ' +
            'tall put strikes are standing demand for downside. Max pain is the strike that ' +
            'minimizes total payout to holders. In the change chart, positive is fresh build - ' +
            'new risk arriving - and negative is unwind, risk leaving. A put/call ratio above 1 ' +
            'means more puts are outstanding than calls.',
          'EXPIRY narrows the strike charts to one date; ALL EXPIRIES stacks the whole book, ' +
            'but max pain and the intrinsic-value overlay exist only for a single expiry and ' +
            'appear once one is picked. WINDOW on the change chart is the baseline the current ' +
            'book is compared against, 24 hours or 7 days back. LOOKBACK sets the span of the ' +
            'history.',
        ],
        render: () => (
          <>
            <OIByStrikeSection />
            <OIByExpirySection />
            <OIChangeByStrikeSection />
            <OIHistorySection />
          </>
        ),
      },
      {
        id: 'vannaCharm',
        label: 'Vanna & charm',
        desc: [
          'Two higher-order dealer exposures by strike: vanna, the dollar delta gained or lost ' +
            'per vol point, and charm, the dollar delta gained or lost per day of decay.',
          'Both create hedging flow while spot does not move at all. Vanna fires when vol ' +
            'reprices, charm fires simply as time passes, which is much of why expiry weeks ' +
            'trend without any news to explain it.',
          'Same call/put stack and net line as gamma. Positive vanna means a drop in implied ' +
            'vol forces dealers to sell delta, so a vol crush becomes spot supply; negative means ' +
            'a vol spike does. Charm concentrations show where decay is dragging delta, largest ' +
            'near the money and into the front expiry. Read the peak strikes as the levels where ' +
            'flow appears on its own, and treat them as most dangerous where they line up with ' +
            'the gamma peaks.',
          'GEX SIGN works as on the gamma chart, and each of the two charts keeps its own.',
        ],
        render: () => (
          <>
            <ExposureByStrikeSection greek="vanna" />
            <ExposureByStrikeSection greek="charm" />
          </>
        ),
      },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    group: 'OPTIONS',
    views: [
      {
        id: 'netFlow',
        label: 'Net flow',
        desc: [
          'Taker buys minus taker sells in contracts, at each strike and each expiry, beside ' +
            'gross traded volume by strike.',
          'This is direction rather than activity. Open interest says where positions are; ' +
            'flow says who is pressing right now, and whether the aggressor was willing to pay ' +
            'up to get on.',
          'Positive bars are net lifting of offers, negative is net hitting of bids, blue for ' +
            'calls and orange for puts. Read it against volume: a strike with heavy volume but ' +
            'flat net flow is two-way business, usually a market maker rotating, while large net ' +
            'flow on modest volume is one participant with a view. Persistent net buying of ' +
            'out-of-the-money calls at a single strike is where the next gamma concentration is ' +
            'being built.',
          'WINDOW is the span the taker flow is summed over, 24 hours or 7 days; volume is ' +
            'always the last 24 hours.',
        ],
        render: () => (
          <>
            <FlowByStrikeSection />
            <FlowByExpirySection />
            <VolumeByStrikeSection />
          </>
        ),
      },
      {
        id: 'tape',
        label: 'Tape',
        desc: [
          'Every individual print above the premium threshold, newest first: time, instrument, ' +
            'side, size, premium paid and the implied vol it traded at.',
          'The aggregates smooth away the thing that often matters most - whether a day of flow ' +
            'was a thousand small tickets or three large ones.',
          'Side is from the taker’s perspective. Blocks are negotiated away from the order book ' +
            'and generally mark one institution establishing a position rather than gradual ' +
            'accumulation. Compare each print’s implied vol against the surface: trades well ' +
            'above the mark are paying for urgency. Raising MIN PREM strips the retail noise and ' +
            'leaves only size.',
        ],
        render: () => <TapeSection />,
      },
    ],
  },
  {
    id: 'volatility',
    label: 'Volatility',
    group: 'OPTIONS',
    views: [
      {
        id: 'termStructure',
        label: 'Term structure',
        desc: [
          'At-the-money implied vol at each expiry with its 90-day percentile band, and the ' +
            'annualized futures basis plotted on the same expiry axis.',
          'The vol curve prices when the market expects something to happen; the basis prices ' +
            'what leverage costs to carry. Read together they say whether the front end is ' +
            'stressed or complacent.',
          'An upward slope is the normal state - less time means less room for something to ' +
            'happen. Inversion, with the front above the back, means a near-term catalyst is ' +
            'being paid for, and it usually mean-reverts once the event passes. Read the live ' +
            'line against the shaded band: above the 75th percentile the curve is rich versus ' +
            'its own recent history. On basis, a steep positive curve is crowded long carry; ' +
            'flat or negative is deleveraging.',
          'DTE sets the range of expiries on both charts, 0 to 30 days by default, so widen it ' +
            'to see the back of the curve.',
        ],
        render: () => (
          <>
            <TermStructureSection />
            <BasisSection />
          </>
        ),
      },
      {
        id: 'skew',
        label: 'Skew',
        desc: [
          'The 25-delta risk reversal and butterfly at each expiry, with the risk reversal ' +
            'tracked through time underneath.',
          'Skew is the price of asymmetry. It says which tail the market is willing to pay for, ' +
            'which is frequently a cleaner sentiment read than spot itself.',
          'The risk reversal is call vol minus put vol. Negative means puts are bid and the ' +
            'market is paying for protection; positive means calls are bid, typically in a ' +
            'squeeze. The butterfly is what the wings cost over the body, so a high reading means ' +
            'fat tails priced on both sides - a market bracing for a move without committing to a ' +
            'direction. Judge today against the history rather than against zero: a persistently ' +
            'negative risk reversal is normal here, and only the extremes carry information.',
          'DTE sets the range of expiries on the live chart, 0 to 30 days by default. LOOKBACK ' +
            'sets the span of the history.',
        ],
        render: () => (
          <>
            <SkewSection />
            <SkewHistorySection />
          </>
        ),
      },
      {
        id: 'smile',
        label: 'Smile',
        desc: [
          'Implied vol across strikes for every quoted expiry, and today’s curve for one expiry ' +
            'against an earlier snapshot of the same expiry.',
          'The surface is what every option price rests on, and a change in its shape usually ' +
            'says more than a change in its level.',
          'The curve is never flat: the wings price above the money because real returns have ' +
            'fatter tails than a lognormal assumes. A steepening left wing is downside demand; a ' +
            'lifting right wing is an upside chase. In the comparison, a parallel shift means the ' +
            'market repriced how much risk there is, while one side moving alone means it ' +
            'repriced which way. Read the at-the-money point for the level and the spread between ' +
            'the wings for the fear.',
          'DTE sets which expiries the curves chart draws, 0 to 30 days by default. On the ' +
            'comparison, EXPIRY picks the curve and WINDOW how far back the archived snapshot ' +
            'is, 24 hours or 7 days.',
        ],
        render: () => (
          <>
            <IVCurvesSection />
            <SmileCompareSection />
          </>
        ),
      },
      {
        id: 'realizedVsImplied',
        label: 'Realized vs implied',
        desc: [
          'Realized vol against its own percentile history at each lookback, implied and ' +
            'realized plotted through time, and the premium 30-day implied carried over the ' +
            'realized vol that actually followed it.',
          'This is the question behind every options trade - is vol rich or cheap - answered ' +
            'against what this market actually delivers rather than against an absolute number.',
          'In the cone, the marker is today’s realized vol and the bands are its 10th to 90th ' +
            'percentile at each window. Near the top means the market has been unusually violent; ' +
            'near the bottom means unusually quiet, and quiet regimes are where cheap optionality ' +
            'lives. In the risk premium, positive means implied was priced above what got ' +
            'delivered, so sellers were paid. Persistently positive is the normal state; the sign ' +
            'flipping is the regime changing, and that is when owning vol pays.',
          'LOOKBACK sets the span of the vol history. The risk premium has no control: a pair ' +
            'needs realized vol archived 30 days after its implied, so it always reads a year.',
        ],
        render: () => (
          <>
            <RVConeSection />
            <VolHistorySection />
            <VRPSection />
          </>
        ),
      },
    ],
  },
  {
    id: 'probabilities',
    label: 'Probabilities',
    group: 'OPTIONS',
    views: [
      {
        id: 'distribution',
        label: 'Distribution',
        desc: [
          'The market’s implied view of where spot lands at each expiry, shown as the ' +
            'probability of finishing above every strike and as a density over strike buckets.',
          'It converts option prices into the one form that is directly usable - odds. The two ' +
            'charts are the same information read cumulatively and bucket by bucket.',
          'On the curves, the strike where a line crosses 50% is that expiry’s implied median, ' +
            'and the steeper the curve the tighter the market’s expectation. On the density, the ' +
            'tallest bucket is the modal outcome and the tail buckets are colored separately ' +
            'because they carry the payoff asymmetry. Treat these as risk-neutral probabilities ' +
            'rather than forecasts: they include the premium people pay to hedge, which is why ' +
            'downside odds read higher than a pure forecast would put them.',
          'DTE sets which expiries the curves draw, 0 to 30 days by default; EXPIRY picks the ' +
            'one the density is built from.',
        ],
        render: () => (
          <>
            <ProbCurvesSection />
            <ProbDistributionSection />
          </>
        ),
      },
      {
        id: 'expiries',
        label: 'Expiries',
        desc: [
          'One row per expiry: the max-pain strike and its distance from spot, the ' +
            'one-standard-deviation move priced into the at-the-money straddle in both dollars ' +
            'and percent, and the realized outcome for expiries that have already settled.',
          'It puts a scale on the calendar. The implied move is the market’s own error bar and ' +
            'the honest reference for whether a price target is ambitious or unremarkable.',
          'Read the expected move as the range containing roughly two thirds of outcomes for ' +
            'that date; a move beyond it is a two-sigma event - not a shock, but not the base ' +
            'case either. Max pain drifts toward spot as an expiry approaches and is a weak ' +
            'magnet at best, so treat it as where hedging pressure sits rather than as a ' +
            'prediction. Settled rows are dimmed, and comparing them against what was implied ' +
            'beforehand shows whether the market has been over- or under-pricing recent moves.',
        ],
        render: () => <ExpiryTableSection />,
      },
    ],
  },
];

// a session opens on the overview, which reads as an orientation before any chart
export const DEFAULT_SECTION = 'overview';
export const DEFAULT_VIEW = 'note';

export function findSection(id: string): Section {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

export function findView(section: Section, id: string): View {
  return section.views.find((v) => v.id === id) ?? section.views[0];
}
