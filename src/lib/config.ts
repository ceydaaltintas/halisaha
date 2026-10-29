// Oynanabilirlik ve denge ile ilgili ayarlanabilir sabitler.
export const APP_CONFIG = {
  // 6 ana statın (HIZ, ŞUT, PAS, DRİ, DEF, FİZ) toplamı bu değeri aşamaz.
  // Oyuncuların kendini şişirmesini sınırlamak için bir "bütçe" mekanizması.
  statBudget: 450,
  // Kaleci puanı bütçeye dahil değil, kendi sınırı var.
  goalkeepingMax: 99,
  minStat: 1,
  maxStat: 99,
  // Kart seviyesi eşikleri (OVR'a göre).
  cardTiers: {
    bronze: { min: 0, max: 59 },
    silver: { min: 60, max: 69 },
    gold: { min: 70, max: 79 },
    special: { min: 80, max: 99 },
  },
  pinLength: 4,
  // PIN brute-force koruması (Supabase RPC tarafında da uygulanır).
  maxPinAttempts: 5,
  pinLockoutMinutes: 15,
} as const

export type CardTier = keyof typeof APP_CONFIG.cardTiers
