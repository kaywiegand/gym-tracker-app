export interface GlossaryEntry {
  term: string
  label: string
  definition: string
}

// Only terms that actually appear somewhere in this app's UI right now.
export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'e1RM',
    label: 'e1RM',
    definition:
      'Estimated one-rep max, calculated with the Epley formula (weight × (1 + reps/30)). Lets you compare strength across different rep ranges with a single number.',
  },
  {
    term: 'Volume',
    label: 'Volume (Volume Load)',
    definition: 'Total work performed: sets × reps × weight, summed up. More volume generally means more muscle-building stimulus.',
  },
  {
    term: 'Sets',
    label: 'Sets (working sets)',
    definition: 'Sets that count toward training volume. Warmup sets are excluded everywhere in this app.',
  },
  {
    term: 'ACWR',
    label: 'ACWR',
    definition:
      'Acute:Chronic Workload Ratio — this week’s training load vs. your 4-week average. 0.8–1.3 is a safe zone; much higher risks overreaching, much lower may mean detraining.',
  },
  {
    term: 'MEV',
    label: 'MEV — Minimum Effective Volume',
    definition: 'The fewest weekly sets for a muscle group needed to make progress at all.',
  },
  {
    term: 'MAV',
    label: 'MAV — Maximum Adaptive Volume',
    definition: 'The sweet-spot range of weekly sets for optimal muscle growth.',
  },
  {
    term: 'MRV',
    label: 'MRV — Maximum Recoverable Volume',
    definition: 'The most weekly sets you can recover from. Training past this risks overreaching.',
  },
  {
    term: 'PR',
    label: 'PR — Personal Record',
    definition: 'A new best e1RM for an exercise compared to the last time you did it.',
  },
  {
    term: 'Signature',
    label: "Workout signature",
    definition:
      'A workout’s typical footprint per muscle group across its recent sessions — average sets or volume per region, or the best e1RM reached on exercises that train that region as their primary muscle.',
  },
  {
    term: 'Plateau',
    label: 'Plateau',
    definition:
      'A new best means an e1RM more than 2% above your previous best from the last 12 sessions — equal or slightly higher values are noise. If the recent trend is also flat, the exercise is stalling two sessions before the configured limit and counts as a plateau once that many sessions pass without a new best (default 6, adjustable in Settings). A rising but jumpy history is not flagged. A signal to consider a deload week or switching up the exercise or rep range.',
  },
  {
    term: 'Recovery',
    label: 'Recovery (estimate)',
    definition:
      'An estimate, not a measurement. For every exercise trained in the last 3 weeks, the latest session’s e1RM is compared with the median of the three sessions before. One exercise dropping is normal; many dropping at once hints at fatigue. Below 35% of exercises falling counts as on track, 35–50% as worth watching, from 50% as a sign a deload may help (thresholds adjustable in Settings). Sleep, stress and soreness are not part of it.',
  },
]
