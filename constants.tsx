import { TreeType } from './types';

export const COLORS = {
  HEALTHY: '#4ade80',
  WILTING: '#3f3f46',
  DEAD: '#18181b',
  BACKGROUND: '#040a04',
  ACCENT: '#22c55e',
  PREMIUM: '#fbbf24'
};

export interface TreePalette {
  color: string;
  trunk: string;
  description: string;
  trunkDark: string;
  trunkMid: string;
  trunkLight: string;
  leafDark: string;
  leafMid: string;
  leafLight: string;
  leafHighlight: string;
  accent?: string;
}

export const TREE_CONFIGS: Record<TreeType, TreePalette> = {
  [TreeType.OAK]: { 
    color: '#166534', 
    trunk: '#5d4037', 
    description: 'Sturdy and timeless forest green.',
    trunkDark: '#271913',
    trunkMid: '#4e342e',
    trunkLight: '#795548',
    leafDark: '#0a2e16',
    leafMid: '#166534',
    leafLight: '#22c55e',
    leafHighlight: '#4ade80',
    accent: '#86efac'
  },
  [TreeType.CHERRY_BLOSSOM]: { 
    color: '#ffb7c5', 
    trunk: '#6d4c41', 
    description: 'Fleeting beauty in pink.',
    trunkDark: '#2a1712',
    trunkMid: '#4e342e',
    trunkLight: '#6d4c41',
    leafDark: '#831843',
    leafMid: '#db2777',
    leafLight: '#f472b6',
    leafHighlight: '#fce7f3',
    accent: '#fff1f2'
  },
  [TreeType.PINE]: { 
    color: '#3f6212', 
    trunk: '#4e342e', 
    description: 'Evergreen focus.',
    trunkDark: '#1f130e',
    trunkMid: '#3e2723',
    trunkLight: '#5d4037',
    leafDark: '#092514',
    leafMid: '#14532d',
    leafLight: '#16a34a',
    leafHighlight: '#4ade80',
    accent: '#854d0e'
  },
  [TreeType.BAMBOO]: { 
    color: '#22c55e', 
    trunk: '#064e3b', 
    description: 'Rapid and resilient growth.',
    trunkDark: '#032a1f',
    trunkMid: '#064e3b',
    trunkLight: '#047857',
    leafDark: '#064e3b',
    leafMid: '#059669',
    leafLight: '#10b981',
    leafHighlight: '#34d399',
    accent: '#a7f3d0'
  },
  [TreeType.CACTUS]: { 
    color: '#a3e635', 
    trunk: '#14532d', 
    description: 'Survivalist endurance.',
    trunkDark: '#0b351d',
    trunkMid: '#14532d',
    trunkLight: '#15803d',
    leafDark: '#14532d',
    leafMid: '#16a34a',
    leafLight: '#4ade80',
    leafHighlight: '#a3e635',
    accent: '#f59e0b'
  },
  [TreeType.MAPLE]: { 
    color: '#ef4444', 
    trunk: '#4e342e', 
    description: 'Vibrant change.',
    trunkDark: '#271406',
    trunkMid: '#451a03',
    trunkLight: '#78350f',
    leafDark: '#143818',
    leafMid: '#166534',
    leafLight: '#b45309',
    leafHighlight: '#f59e0b',
    accent: '#dc2626'
  },
  [TreeType.BAOBAB]: { 
    color: '#f59e0b', 
    trunk: '#8d6e63', 
    description: 'The tree of life.',
    trunkDark: '#33211a',
    trunkMid: '#5d4037',
    trunkLight: '#8d6e63',
    leafDark: '#064e3b',
    leafMid: '#15803d',
    leafLight: '#22c55e',
    leafHighlight: '#86efac',
    accent: '#eab308'
  },
  [TreeType.CEDAR]: { 
    color: '#115e59', 
    trunk: '#5d2e2e', 
    description: 'Ancient strength with a warm bark.',
    trunkDark: '#241010',
    trunkMid: '#4a2222',
    trunkLight: '#6d3636',
    leafDark: '#082523',
    leafMid: '#0f4f4b',
    leafLight: '#0d9488',
    leafHighlight: '#2dd4bf',
    accent: '#99f6e4'
  },
  [TreeType.WILLOW]: { 
    color: '#84cc16', 
    trunk: '#4e342e', 
    description: 'Fluid and graceful weeping branches.',
    trunkDark: '#241712',
    trunkMid: '#452b22',
    trunkLight: '#6b4538',
    leafDark: '#14532d',
    leafMid: '#3f6212',
    leafLight: '#65a30d',
    leafHighlight: '#84cc16',
    accent: '#bef264'
  },
  [TreeType.SEQUOIA]: { 
    color: '#14532d', 
    trunk: '#8d4422', 
    description: 'Titan of the grove with massive trunk.',
    trunkDark: '#361405',
    trunkMid: '#7c2d12',
    trunkLight: '#c2410c',
    leafDark: '#082414',
    leafMid: '#14532d',
    leafLight: '#16a34a',
    leafHighlight: '#4ade80',
    accent: '#ea580c'
  },
  [TreeType.BONSAI]: { 
    color: '#22c55e', 
    trunk: '#4e342e', 
    description: 'Disciplined beauty.',
    trunkDark: '#231510',
    trunkMid: '#422820',
    trunkLight: '#6a4336',
    leafDark: '#072e18',
    leafMid: '#15803d',
    leafLight: '#22c55e',
    leafHighlight: '#4ade80',
    accent: '#86efac'
  }
};

export const QUOTES = [
  "Silence is the soil where deep focus grows.",
  "Nature does not hurry, yet everything is accomplished.",
  "Deep roots weather the harshest winters.",
  "The taller the Sequoia, the quieter the forest floor.",
  "Be like the willow: fluid in action, rooted in purpose.",
  "Every great grove began with a single, silent seed.",
  "Growth is a quiet revolution happening in the marrow of the wood.",
  "Patience is the water that turns stone into moss.",
  "Listen to the wind through the needles; it knows the way home.",
  "The canopy is only as strong as the heartwood is deep.",
  "In the quiet of the grove, time becomes secondary to being."
];

export const MUSIC_TRACKS = [
  { id: 'none', name: 'Silence', desc: 'No background audio' },
  { id: 'zen', name: 'Ambient Resonance', desc: '432Hz Harmonic Solarpunk Drone' },
  { id: 'nature', name: 'Forest Whispers', desc: 'Wind rustle and gentle chimes' },
  { id: 'rain', name: 'Sanctuary Rain', desc: 'Soft bio-filtered rainfall' }
];
