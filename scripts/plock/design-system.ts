/**
 * Upgraded design system for card news & video stills.
 * 5 category palettes + 10 layout templates + SVG illustration library.
 */

// --- Category palettes ---
export interface Palette {
  bg: string;            // page background
  bgAlt: string;         // secondary surface
  accent: string;        // primary accent
  accentDeep: string;    // darker accent (gradient end)
  accentSoft: string;    // lightest accent tint
  ink: string;           // primary text
  inkSoft: string;       // secondary text
  highlight: string;     // secondary highlight color (complement)
  pattern: string;       // pattern stroke
  meshA: string;         // mesh gradient color A
  meshB: string;         // mesh gradient color B
  meshC: string;         // mesh gradient color C
}

export const PALETTES: Record<string, Palette> = {
  // 01 서비스 소개 — Indigo/Violet, 신뢰감 있는 톤
  '01-서비스소개': {
    bg: '#0F0F23',
    bgAlt: '#1A1A3E',
    accent: '#6366F1',
    accentDeep: '#4338CA',
    accentSoft: '#E0E7FF',
    ink: '#F8FAFC',
    inkSoft: '#A5B4FC',
    highlight: '#F59E0B',
    pattern: 'rgba(99,102,241,0.12)',
    meshA: '#6366F1',
    meshB: '#8B5CF6',
    meshC: '#EC4899',
  },
  // 02 기술 차별점 — Emerald/Cyan, 기술적·쾌속감
  '02-기술차별점': {
    bg: '#042F2E',
    bgAlt: '#083344',
    accent: '#10B981',
    accentDeep: '#047857',
    accentSoft: '#D1FAE5',
    ink: '#F0FDFA',
    inkSoft: '#6EE7B7',
    highlight: '#06B6D4',
    pattern: 'rgba(16,185,129,0.14)',
    meshA: '#10B981',
    meshB: '#06B6D4',
    meshC: '#0EA5E9',
  },
  // 03 활용 사례 — Amber/Warm, 따뜻함·확장
  '03-활용사례': {
    bg: '#1C1917',
    bgAlt: '#292524',
    accent: '#F59E0B',
    accentDeep: '#B45309',
    accentSoft: '#FEF3C7',
    ink: '#FAFAF9',
    inkSoft: '#FCD34D',
    highlight: '#F97316',
    pattern: 'rgba(245,158,11,0.14)',
    meshA: '#F59E0B',
    meshB: '#F97316',
    meshC: '#EF4444',
  },
  // 04 도입 가이드 — Violet/Pink, 섬세함·가이드
  '04-도입가이드': {
    bg: '#18181B',
    bgAlt: '#27272A',
    accent: '#A855F7',
    accentDeep: '#7E22CE',
    accentSoft: '#F3E8FF',
    ink: '#FAFAFA',
    inkSoft: '#D8B4FE',
    highlight: '#EC4899',
    pattern: 'rgba(168,85,247,0.14)',
    meshA: '#A855F7',
    meshB: '#EC4899',
    meshC: '#F43F5E',
  },
  // 05 시장 트렌드 — Rose/Crimson, 긴박감·임팩트
  '05-시장트렌드': {
    bg: '#450A0A',
    bgAlt: '#7F1D1D',
    accent: '#F43F5E',
    accentDeep: '#BE123C',
    accentSoft: '#FEE2E2',
    ink: '#FFF1F2',
    inkSoft: '#FDA4AF',
    highlight: '#FB923C',
    pattern: 'rgba(244,63,94,0.14)',
    meshA: '#F43F5E',
    meshB: '#E11D48',
    meshC: '#7C3AED',
  },
};

export function getPalette(categoryDir: string): Palette {
  return PALETTES[categoryDir] ?? PALETTES['01-서비스소개'];
}

// --- Mesh gradient backgrounds (SVG) ---
export function meshGradient(p: Palette, seed: number, w: number, h: number): string {
  // Produce a multi-radial mesh gradient background
  const rnd = (n: number, i: number) => {
    const s = Math.sin(seed * 9301 + i * 49297) * 233280;
    return (s - Math.floor(s)) * n;
  };
  const cx1 = 10 + rnd(30, 1);
  const cy1 = 10 + rnd(30, 2);
  const cx2 = 60 + rnd(30, 3);
  const cy2 = 30 + rnd(50, 4);
  const cx3 = 30 + rnd(50, 5);
  const cy3 = 60 + rnd(30, 6);
  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
      <defs>
        <radialGradient id="mg-${seed}-1" cx="${cx1}%" cy="${cy1}%" r="60%">
          <stop offset="0%" stop-color="${p.meshA}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${p.meshA}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="mg-${seed}-2" cx="${cx2}%" cy="${cy2}%" r="55%">
          <stop offset="0%" stop-color="${p.meshB}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${p.meshB}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="mg-${seed}-3" cx="${cx3}%" cy="${cy3}%" r="50%">
          <stop offset="0%" stop-color="${p.meshC}" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="${p.meshC}" stop-opacity="0"/>
        </radialGradient>
        <filter id="noise-${seed}">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="${p.bg}"/>
      <rect width="100%" height="100%" fill="url(#mg-${seed}-1)"/>
      <rect width="100%" height="100%" fill="url(#mg-${seed}-2)"/>
      <rect width="100%" height="100%" fill="url(#mg-${seed}-3)"/>
      <rect width="100%" height="100%" filter="url(#noise-${seed})"/>
    </svg>`;
}

// --- Abstract decorative shapes (SVG layers) ---
export function decorShapes(p: Palette, seed: number, variant: 'orbs' | 'lines' | 'grid' | 'dots' | 'waves'): string {
  switch (variant) {
    case 'orbs':
      return `
        <svg style="position:absolute;inset:0;pointer-events:none;" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <circle cx="820" cy="180" r="140" fill="${p.accent}" opacity="0.25"/>
          <circle cx="920" cy="280" r="80" fill="${p.highlight}" opacity="0.35"/>
          <circle cx="120" cy="820" r="180" fill="${p.accentDeep}" opacity="0.3"/>
          <circle cx="250" cy="900" r="50" fill="${p.highlight}" opacity="0.4"/>
        </svg>`;
    case 'lines':
      return `
        <svg style="position:absolute;inset:0;pointer-events:none;" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 200 Q 500 100 1000 300" stroke="${p.accent}" stroke-width="1.5" fill="none" opacity="0.4"/>
          <path d="M 0 400 Q 500 300 1000 500" stroke="${p.accentSoft}" stroke-width="1" fill="none" opacity="0.3"/>
          <path d="M 0 700 Q 500 600 1000 800" stroke="${p.highlight}" stroke-width="1.5" fill="none" opacity="0.25"/>
          <path d="M 0 900 Q 500 800 1000 1000" stroke="${p.accent}" stroke-width="1" fill="none" opacity="0.2"/>
        </svg>`;
    case 'grid':
      return `
        <svg style="position:absolute;inset:0;pointer-events:none;opacity:0.35;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="gp-${seed}" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="${p.pattern}" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gp-${seed})"/>
        </svg>`;
    case 'dots':
      return `
        <svg style="position:absolute;inset:0;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dp-${seed}" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1.5" fill="${p.pattern}"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dp-${seed})"/>
        </svg>`;
    case 'waves':
      return `
        <svg style="position:absolute;bottom:0;left:0;right:0;height:40%;pointer-events:none;" viewBox="0 0 1000 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 300 Q 250 200 500 280 T 1000 260 L 1000 400 L 0 400 Z" fill="${p.accent}" opacity="0.15"/>
          <path d="M 0 340 Q 250 280 500 330 T 1000 310 L 1000 400 L 0 400 Z" fill="${p.accentDeep}" opacity="0.25"/>
        </svg>`;
    default:
      return '';
  }
}

// --- Lucide-style SVG icons (pure inline SVG, stroke-based) ---
export const ICONS: Record<string, string> = {
  upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
  sparkles: `<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  arrow: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
  play: `<polygon points="5 3 19 12 5 21 5 3"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  trending: `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
  mic: `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  gift: `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
};

export function icon(name: string, size = 64, color = 'currentColor', strokeWidth = 2): string {
  const body = ICONS[name] ?? ICONS.sparkles;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
