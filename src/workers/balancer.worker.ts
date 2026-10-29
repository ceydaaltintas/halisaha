import { balanceTeams, type BalancerInput } from '@/lib/balancer'

self.onmessage = (event: MessageEvent<BalancerInput>) => {
  const result = balanceTeams(event.data)
  self.postMessage(result)
}
