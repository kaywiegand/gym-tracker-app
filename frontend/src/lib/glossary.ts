export interface GlossaryEntry {
  term: string
  label: string
  definition: string
}

// Only terms that actually appear somewhere in this app's UI right now --
// no Plateau entry, since plateau detection itself isn't built yet (Stage
// 6); a glossary entry with nothing to point at would be misleading.
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
    definition: 'A workout’s typical muscle-group distribution — average sets per region across its recent sessions.',
  },
]
