// LocalStorage modunda PIN'leri düz metin saklamamak için basit bir
// tuzlu SHA-256 hash'i. Not: Gerçek güvenlik Supabase RPC'lerindeki
// pgcrypto (crypt/gen_salt) tarafında sağlanır; bu yalnızca localStorage
// fallback modunun da PIN'i düz metin tutmaması için bir önlemdir.
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isValidPin(pin: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin)
}
