import { scoreOf, type Agent } from '@/lib/scan';

/// Tells you whether the number on a card is good, before you have to click anything.
///
/// The cards read "30.4 SCORE" and nothing on the page said what the scale was. It is nominally
/// 0–100, but printing "/100" would be its own kind of lie: nothing on BSC comes close. The highest
/// total_score in the whole registry is about 49 and the field clusters near 12, so a bare "out of a
/// hundred" would make every agent look like a failure.
///
/// So the calibration comes from the page's own data — the best score actually on this shelf — which
/// is true whatever the registry does next and needs no extra request.
export function ScoreScale({ agents }: { agents: Agent[] }) {
  if (!agents.length) return null;
  const scores = agents.map(scoreOf).filter((n) => n > 0);
  if (!scores.length) return null;
  const best = Math.max(...scores);

  return (
    <p className="scale-note">
      <b>Reading the score:</b> 8004scan&rsquo;s weighted reputation — service, engagement, publisher,
      compliance and momentum, each with its own weight. The scale runs to 100 in principle, but the
      registry is young and nothing is near it: the best on this shelf is{' '}
      <b>{best.toFixed(1)}</b>, and the highest anywhere on BSC is around 49. Treat it as a ranking
      against the current field rather than a mark out of a hundred. Every agent page breaks its own
      score into those dimensions.
    </p>
  );
}
