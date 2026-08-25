import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' })
    .max(255, { message: 'Email address is too long' }),
})

/**
 * Sanitize string to prevent stored/reflected XSS
 */
function sanitizeInput(str: string): string {
  return str.replace(/[<>'"]/g, '').trim()
}

export async function POST(request: Request) {
  try {
    // 1. Enforce rate limiting based on client IP or fallback key
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'subscribe_client'
    try {
      rateLimiter.checkLimit(`subscribe_${ip}`, 5, 60000)
    } catch (rateErr: any) {
      return NextResponse.json(
        { success: false, error: rateErr.message || 'Too many subscription requests. Please try again later.' },
        { status: 429 }
      )
    }

    // 2. Parse & Validate JSON payload using Zod
    const body = await request.json().catch(() => ({}))
    const validation = subscribeSchema.safeParse(body)

    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Invalid email address'
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 })
    }

    // 3. Sanitize inputs
    const sanitizedEmail = sanitizeInput(validation.data.email)
    if (!sanitizedEmail) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing! You are now on our update list.',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process subscription request. Please try again.' },
      { status: 500 }
    )
  }
}
