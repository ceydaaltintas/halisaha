import { LocalStorageMatchRepository } from './localStorageMatchRepository'
import { LocalStorageRepository } from './localStorageRepository'
import { SupabaseMatchRepository } from './supabaseMatchRepository'
import { SupabaseRepository } from './supabaseRepository'
import type { MatchRepository } from './matchRepository'
import type { PlayerRepository } from './repository'

export type { PlayerRepository } from './repository'
export type { MatchRepository } from './matchRepository'
export { RepositoryError } from './repository'

let instance: PlayerRepository | null = null
let matchInstance: MatchRepository | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

/** Env değişkenleri varsa Supabase'e, yoksa otomatik olarak localStorage'a düşer. */
export function getRepository(): PlayerRepository {
  if (instance) return instance
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  instance = url && anonKey ? new SupabaseRepository(url, anonKey) : new LocalStorageRepository()
  return instance
}

export function getMatchRepository(): MatchRepository {
  if (matchInstance) return matchInstance
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  matchInstance = url && anonKey ? new SupabaseMatchRepository(url, anonKey) : new LocalStorageMatchRepository()
  return matchInstance
}
