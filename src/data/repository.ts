import type { CreatePlayerInput, Player, UpdatePlayerInput } from '@/types/player'

export class RepositoryError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
  }
}

/** Veri katmanı soyutlaması. LocalStorageRepository ve SupabaseRepository
 * bu arayüzü uygular; uygulama hangi implementasyonun kullanıldığını bilmez. */
export interface PlayerRepository {
  list(): Promise<Player[]>
  get(id: string): Promise<Player | null>
  create(input: CreatePlayerInput): Promise<Player>
  update(id: string, input: UpdatePlayerInput): Promise<Player>
  remove(id: string, pin: string): Promise<void>
  /** Fotoğraf yükler ve erişilebilir bir URL döner. Depolama desteklemiyorsa (örn. localStorage) data URL döner. */
  uploadPhoto(file: File): Promise<string>
}
