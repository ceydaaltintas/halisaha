import { APP_CONFIG } from '@/lib/config'
import { isWithinBudget } from '@/lib/ratings'
import { generateSalt, hashPin } from '@/lib/pin'
import type { CreatePlayerInput, Player, UpdatePlayerInput } from '@/types/player'
import { RepositoryError } from './repository'
import type { PlayerRepository } from './repository'

const PLAYERS_KEY = 'halisaha_players_v1'
const PIN_SECRETS_KEY = 'halisaha_pin_secrets_v1'

interface PinSecret {
  hash: string
  salt: string
  attempts: number
  lockedUntil?: string
}

function readPlayers(): Player[] {
  const raw = localStorage.getItem(PLAYERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Player[]
  } catch {
    return []
  }
}

function writePlayers(players: Player[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

function readSecrets(): Record<string, PinSecret> {
  const raw = localStorage.getItem(PIN_SECRETS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, PinSecret>
  } catch {
    return {}
  }
}

function writeSecrets(secrets: Record<string, PinSecret>): void {
  localStorage.setItem(PIN_SECRETS_KEY, JSON.stringify(secrets))
}

function getAdminPin(): string | undefined {
  return import.meta.env.VITE_ADMIN_PIN as string | undefined
}

async function verifyPin(id: string, pin: string): Promise<void> {
  const adminPin = getAdminPin()
  if (adminPin && pin === adminPin) return

  const secrets = readSecrets()
  const secret = secrets[id]
  if (!secret) throw new RepositoryError('PIN doğrulanamadı.', 'NO_SECRET')

  if (secret.lockedUntil && new Date(secret.lockedUntil) > new Date()) {
    throw new RepositoryError(
      'Çok fazla hatalı PIN denemesi yapıldı. Lütfen daha sonra tekrar deneyin.',
      'LOCKED',
    )
  }

  const candidateHash = await hashPin(pin, secret.salt)
  if (candidateHash !== secret.hash) {
    secret.attempts = (secret.attempts ?? 0) + 1
    if (secret.attempts >= APP_CONFIG.maxPinAttempts) {
      secret.lockedUntil = new Date(
        Date.now() + APP_CONFIG.pinLockoutMinutes * 60 * 1000,
      ).toISOString()
      secret.attempts = 0
    }
    secrets[id] = secret
    writeSecrets(secrets)
    throw new RepositoryError('PIN yanlış.', 'WRONG_PIN')
  }

  secret.attempts = 0
  secret.lockedUntil = undefined
  secrets[id] = secret
  writeSecrets(secrets)
}

function validateStats(stats: CreatePlayerInput['stats']): void {
  if (!isWithinBudget(stats)) {
    throw new RepositoryError(
      `Stat toplamı bütçeyi (${APP_CONFIG.statBudget}) aşıyor.`,
      'BUDGET_EXCEEDED',
    )
  }
}

export class LocalStorageRepository implements PlayerRepository {
  async list(): Promise<Player[]> {
    return readPlayers()
  }

  async get(id: string): Promise<Player | null> {
    return readPlayers().find((p) => p.id === id) ?? null
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    validateStats(input.stats)
    if (!/^\d{4}$/.test(input.pin)) {
      throw new RepositoryError('PIN 4 haneli sayı olmalı.', 'INVALID_PIN')
    }

    const now = new Date().toISOString()
    const player: Player = {
      id: crypto.randomUUID(),
      name: input.name,
      nickname: input.nickname,
      positions: input.positions,
      mainPosition: input.mainPosition,
      stats: input.stats,
      avatarType: input.avatarType,
      avatarValue: input.avatarValue,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    }

    const players = readPlayers()
    players.push(player)
    writePlayers(players)

    const salt = generateSalt()
    const hash = await hashPin(input.pin, salt)
    const secrets = readSecrets()
    secrets[player.id] = { hash, salt, attempts: 0 }
    writeSecrets(secrets)

    return player
  }

  async update(id: string, input: UpdatePlayerInput): Promise<Player> {
    await verifyPin(id, input.pin)

    const players = readPlayers()
    const idx = players.findIndex((p) => p.id === id)
    if (idx === -1) throw new RepositoryError('Oyuncu bulunamadı.', 'NOT_FOUND')

    const existing = players[idx]
    const nextStats = input.stats ?? existing.stats
    validateStats(nextStats)

    const updated: Player = {
      ...existing,
      name: input.name ?? existing.name,
      nickname: input.nickname ?? existing.nickname,
      positions: input.positions ?? existing.positions,
      mainPosition: input.mainPosition ?? existing.mainPosition,
      stats: nextStats,
      avatarType: input.avatarType ?? existing.avatarType,
      avatarValue: input.avatarValue ?? existing.avatarValue,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      updatedAt: new Date().toISOString(),
    }
    players[idx] = updated
    writePlayers(players)
    return updated
  }

  async remove(id: string, pin: string): Promise<void> {
    await verifyPin(id, pin)
    const players = readPlayers().filter((p) => p.id !== id)
    writePlayers(players)
    const secrets = readSecrets()
    delete secrets[id]
    writeSecrets(secrets)
  }

  async uploadPhoto(file: File): Promise<string> {
    // LocalStorage modunda gerçek bir depolama yok; küçültülmüş resmi data URL olarak saklarız.
    const resized = await resizeImageToDataUrl(file, 200 * 1024)
    return resized
  }
}

async function resizeImageToDataUrl(file: File, maxBytes: number): Promise<string> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  let { width, height } = img
  const maxDim = 256
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new RepositoryError('Resim işlenemedi.', 'CANVAS_ERROR')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.9
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  return dataUrl
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}
