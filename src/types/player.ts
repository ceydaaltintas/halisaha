export type Position = 'KL' | 'DEF' | 'OS' | 'FOR'

export const ALL_POSITIONS: Position[] = ['KL', 'DEF', 'OS', 'FOR']

export const POSITION_LABELS: Record<Position, string> = {
  KL: 'Kaleci',
  DEF: 'Defans',
  OS: 'Orta Saha',
  FOR: 'Forvet',
}

export interface PlayerStats {
  pace: number // HIZ
  shooting: number // ŞUT
  passing: number // PAS
  dribbling: number // DRİ
  defending: number // DEF
  physical: number // FİZ
  goalkeeping?: number // KAL (sadece KL oynayabiliyorsa)
}

export type AvatarType = 'initial' | 'emoji' | 'photo'

export interface Player {
  id: string
  name: string
  nickname?: string
  positions: Position[]
  mainPosition: Position
  stats: PlayerStats
  avatarType: AvatarType
  avatarValue: string // baş harf, emoji ya da boş (photo kullanılıyorsa)
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

// Sunucudan/depodan PIN hash'i hiçbir zaman istemciye dönmez.
export type PlayerPublic = Player

export interface PlayerWithRatings extends Player {
  ovr: number
  positionRatings: Record<Position, number>
  tier: 'bronze' | 'silver' | 'gold' | 'special'
}

export interface CreatePlayerInput {
  name: string
  nickname?: string
  positions: Position[]
  mainPosition: Position
  stats: PlayerStats
  avatarType: AvatarType
  avatarValue: string
  photoUrl?: string
  pin: string
}

export type UpdatePlayerInput = Partial<Omit<CreatePlayerInput, 'pin'>> & {
  pin: string
}
