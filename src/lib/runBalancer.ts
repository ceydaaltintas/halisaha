import type { BalanceOutput, BalancerInput } from './balancer'

/** Balancer'ı bir Web Worker içinde çalıştırır (UI'ı kilitlememek için). */
export function runBalancerInWorker(input: BalancerInput): Promise<BalanceOutput> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/balancer.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<BalanceOutput>) => {
      resolve(event.data)
      worker.terminate()
    }
    worker.onerror = (err) => {
      reject(err)
      worker.terminate()
    }
    worker.postMessage(input)
  })
}
