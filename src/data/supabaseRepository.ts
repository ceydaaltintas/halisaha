import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CreatePlayerInput, Player, UpdatePlayerInput } from '@/types/player'
import { RepositoryError } from './repository'
import type { PlayerRepository } from './repository'

const PHOTO_BUCKET = 'halisaha-avatars'

function toPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    nickname: (row.nickname as string) ?? undefined,
    positions: row.positions as Player['positions'],
    mainPosition: row.main_position as Player['mainPosition'],
    stats: {
      pace: row.pace as number,
      shooting: row.shooting as number,
      passing: row.passing as number,
      dribbling: row.dribbling as number,
      defending: row.defending as number,
      physical: row.physical as number,
      goalkeeping: (row.goalkeeping as number | null) ?? undefined,
    },
    avatarType: row.avatar_type as Player['avatarType'],
    avatarValue: row.avatar_value as string,
    photoUrl: (row.photo_url as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseRepository implements PlayerRepository {
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  async list(): Promise<Player[]> {
    const { data, error } = await this.client
      .from('halisaha_players_public')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw new RepositoryError(error.message, error.code)
    return (data ?? []).map(toPlayer)
  }

  async get(id: string): Promise<Player | null> {
    const { data, error } = await this.client
      .from('halisaha_players_public')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new RepositoryError(error.message, error.code)
    return data ? toPlayer(data) : null
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    const { data, error } = await this.client.rpc('halisaha_create_player', {
      p_name: input.name,
      p_nickname: input.nickname ?? null,
      p_positions: input.positions,
      p_main_position: input.mainPosition,
      p_pace: input.stats.pace,
      p_shooting: input.stats.shooting,
      p_passing: input.stats.passing,
      p_dribbling: input.stats.dribbling,
      p_defending: input.stats.defending,
      p_physical: input.stats.physical,
      p_goalkeeping: input.stats.goalkeeping ?? null,
      p_avatar_type: input.avatarType,
      p_avatar_value: input.avatarValue,
      p_photo_url: input.photoUrl ?? null,
      p_pin: input.pin,
    })
    if (error) throw new RepositoryError(error.message, error.code)
    return toPlayer(data)
  }

  async update(id: string, input: UpdatePlayerInput): Promise<Player> {
    const { data, error } = await this.client.rpc('halisaha_update_player', {
      p_id: id,
      p_pin: input.pin,
      p_name: input.name ?? null,
      p_nickname: input.nickname ?? null,
      p_positions: input.positions ?? null,
      p_main_position: input.mainPosition ?? null,
      p_pace: input.stats?.pace ?? null,
      p_shooting: input.stats?.shooting ?? null,
      p_passing: input.stats?.passing ?? null,
      p_dribbling: input.stats?.dribbling ?? null,
      p_defending: input.stats?.defending ?? null,
      p_physical: input.stats?.physical ?? null,
      p_goalkeeping: input.stats?.goalkeeping ?? null,
      p_avatar_type: input.avatarType ?? null,
      p_avatar_value: input.avatarValue ?? null,
      p_photo_url: input.photoUrl ?? null,
    })
    if (error) throw new RepositoryError(error.message, error.code)
    return toPlayer(data)
  }

  async remove(id: string, pin: string): Promise<void> {
    const { error } = await this.client.rpc('halisaha_delete_player', { p_id: id, p_pin: pin })
    if (error) throw new RepositoryError(error.message, error.code)
  }

  async uploadPhoto(file: File): Promise<string> {
    const resized = await resizeImage(file)
    const path = `${crypto.randomUUID()}.jpg`
    const { error } = await this.client.storage.from(PHOTO_BUCKET).upload(path, resized, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (error) throw new RepositoryError(error.message)
    const { data } = this.client.storage.from(PHOTO_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }
}

async function resizeImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = reject
    image.src = url
  })

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
  if (!ctx) throw new RepositoryError('Resim işlenemedi.')
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new RepositoryError('Resim sıkıştırılamadı.'))),
      'image/jpeg',
      0.85,
    )
  })
}
