import type { PlayerWithRatings } from '@/types/player'

export const TIER_THEME: Record<PlayerWithRatings['tier'], { label: string; bg: string; border: string; text: string; glow?: string }> = {
  bronze: {
    label: 'Bronz',
    bg: 'linear-gradient(160deg,#8a5a3b 0%,#6b4226 55%,#4a2c17 100%)',
    border: '#c98a56',
    text: '#fff3e6',
  },
  silver: {
    label: 'Gümüş',
    bg: 'linear-gradient(160deg,#cfd6dd 0%,#9aa5b1 55%,#6c7580 100%)',
    border: '#eef2f5',
    text: '#1c2024',
  },
  gold: {
    label: 'Altın',
    bg: 'linear-gradient(160deg,#ffe08a 0%,#e8ac1f 55%,#a6730a 100%)',
    border: '#fff3c4',
    text: '#2a1c00',
  },
  special: {
    label: 'Özel',
    bg: 'linear-gradient(160deg,#6a00ff 0%,#ff00c8 45%,#00e0ff 100%)',
    border: '#ffffff',
    text: '#ffffff',
    glow: '0 0 24px rgba(255,0,200,0.55), 0 0 48px rgba(0,224,255,0.35)',
  },
}

// Normal (saha oyuncusu) kartlarda gösterilen 6 stat etiketi/anahtarı.
export const FIELD_STAT_ITEMS: { label: string; key: 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' }[] = [
  { label: 'HIZ', key: 'pace' },
  { label: 'ŞUT', key: 'shooting' },
  { label: 'PAS', key: 'passing' },
  { label: 'DRİ', key: 'dribbling' },
  { label: 'DEF', key: 'defending' },
  { label: 'FİZ', key: 'physical' },
]

// Kaleci kartlarında aynı 6 hücrelik ızgara, KAL ağırlıklı etiketlerle.
// (KAL = kalecilik; diğerleri saha statlarının kaleci bağlamındaki karşılığı.)
export const GK_STAT_ITEMS: { label: string; key: 'goalkeeping' | 'defending' | 'physical' | 'passing' | 'pace' | 'dribbling' }[] = [
  { label: 'KAL', key: 'goalkeeping' },
  { label: 'POZ', key: 'defending' },
  { label: 'REF', key: 'physical' },
  { label: 'DAĞ', key: 'passing' },
  { label: 'ÇIK', key: 'pace' },
  { label: 'AYK', key: 'dribbling' },
]
