import { NextResponse } from 'next/server'
import { databases, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { Query } from 'appwrite'

export const dynamic = 'force-dynamic'

/**
 * Health Check API Route
 * 
 * Returns HTTP 200 when application and database are healthy.
 * Returns HTTP 503 when application is up but Appwrite database connectivity fails,
 * allowing monitoring systems and load balancers to distinguish application availability
 * from database degradation.
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const uptime = process.uptime ? Math.floor(process.uptime()) : 0

  let dbStatus: 'connected' | 'disconnected' = 'disconnected'
  let dbLatencyMs = 0
  let dbError: string | null = null

  const start = Date.now()
  try {
    // Ping Appwrite Database by performing a minimal list query
    await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BUSINESSES,
      [Query.limit(1)]
    )
    dbStatus = 'connected'
    dbLatencyMs = Date.now() - start
  } catch (err: any) {
    dbStatus = 'disconnected'
    dbLatencyMs = Date.now() - start
    dbError = err?.message || 'Database query failed'
  }

  const isHealthy = dbStatus === 'connected'

  const responsePayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp,
    uptimeSeconds: uptime,
    services: {
      web: { status: 'up' },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
    },
  }

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
