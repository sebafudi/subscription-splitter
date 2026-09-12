import { useEffect, useState } from 'react'

export function App() {
  const [health, setHealth] = useState<string>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json() as Promise<{ ok: boolean }>)
      .then((body) => setHealth(body.ok ? 'ok' : 'not ok'))
      .catch(() => setHealth('unreachable'))
  }, [])

  return (
    <main>
      <h1>Subscription Splitter</h1>
      <p>API health: {health}</p>
    </main>
  )
}
