import { resolveShipRuntimeRole } from './services/fleetgraph/deployment/runtime-role.js'

async function main() {
  const role = resolveShipRuntimeRole()

  if (role === 'worker') {
    await import('./services/fleetgraph/worker/cli.js')
    return
  }

  await import('./db/migrate.js')
  if ((process.env.SHIP_PUBLIC_DEMO_BOOTSTRAP || '').trim().toLowerCase() === 'true') {
    await import('./db/seed.js')
  }
  await import('./index.js')
}

main().catch((error) => {
  console.error('Ship runtime entry failed:', error)
  process.exit(1)
})
