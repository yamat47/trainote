import type { Preview } from '../structure.ts';

// The note of the design's preview screen, as Claude reads it.
export const NOTE = 'ベンチ60kg10回3セット、お菓子我慢した、夜更かしした';

export const PREVIEW: Preview = {
  entries: [
    {
      kind: 'win',
      category: 'exercise',
      body: 'ベンチ',
      items: [
        {
          exercise: 'ベンチプレス',
          weightKg: 60,
          reps: 10,
          sets: 3,
          durationMin: null,
          distanceKm: null,
        },
      ],
    },
    { kind: 'win', category: 'food', body: 'お菓子我慢した', items: [] },
    { kind: 'slip', category: 'sleep', body: '夜更かしした', items: [] },
  ],
  comment: 'お菓子を我慢できたのは大きいです。',
};
