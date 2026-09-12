import { readFileSync } from 'node:fs'

/**
 * Parses a `.dev.vars` file into a plain key/value map. Handles a value
 * wrapped in single or double quotes (the quotes are stripped and their
 * contents, including a `#`, are taken literally), an unquoted value
 * followed by a trailing `# comment` (stripped), and a whole-line comment.
 */
export function parseDevVars(contents) {
  const vars = {}
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue

    const key = line.slice(0, equalsIndex).trim()
    let rawValue = line.slice(equalsIndex + 1).trim()

    const quote = rawValue[0]
    if ((quote === '"' || quote === "'") && rawValue.endsWith(quote) && rawValue.length >= 2) {
      rawValue = rawValue.slice(1, -1)
    } else {
      const commentIndex = rawValue.indexOf('#')
      if (commentIndex !== -1) rawValue = rawValue.slice(0, commentIndex).trim()
    }

    vars[key] = rawValue
  }
  return vars
}

async function seedAccount(baseUrl, seedToken, email, password, name) {
  const res = await fetch(`${baseUrl}/api/dev/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-seed-token': seedToken },
    body: JSON.stringify({ email, password, name }),
  })
  const body = await res.json()
  console.log(name, res.status, JSON.stringify(body))
  if (!res.ok) process.exitCode = 1
}

async function main() {
  const vars = parseDevVars(readFileSync('.dev.vars', 'utf8'))
  const baseUrl = process.env.SEED_TARGET_URL || 'http://localhost:8787'

  await seedAccount(baseUrl, vars.SEED_TOKEN, vars.SEED_OWNER_EMAIL, vars.SEED_OWNER_PASSWORD, 'Owner')
  await seedAccount(baseUrl, vars.SEED_TOKEN, vars.SEED_REVIEWER_EMAIL, vars.SEED_REVIEWER_PASSWORD, 'Reviewer')
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
