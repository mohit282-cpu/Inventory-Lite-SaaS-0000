import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimiter, getTrustedClientIp } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { databases, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { Query } from 'appwrite'
import { sanitizeAppwriteDocId } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' })
    .max(255, { message: 'Email address is too long' }),
})

function sanitizeInput(str: string): string {
  return str.replace(/[<>'"]/g, '').trim()
}

export async function POST(request: Request) {
  try {
    // 1. Content-Type check
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Content-Type. Expected application/json.' },
        { status: 415 }
      )
    }

    // 2. Rate limiting by trusted client IP
    const clientIp = getTrustedClientIp(request)
    try {
      await rateLimiter.checkLimitAsync(`subscribe_${clientIp}`, 5, 60000)
    } catch (rateErr: any) {
      return NextResponse.json(
        { success: false, error: rateErr.message || 'Too many subscription requests. Please try again later.' },
        { status: 429 }
      )
    }

    // 3. Parse & Validate JSON payload
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      )
    }

    const validation = subscribeSchema.safeParse(body)
    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Invalid email address'
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 })
    }

    const sanitizedEmail = sanitizeInput(validation.data.email)
    if (!sanitizedEmail) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    const collectionName = COLLECTIONS.NEWSLETTER_SUBSCRIPTIONS || 'newsletter_subscriptions'

    // 4. Duplicate subscription handling
    try {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        collectionName,
        [Query.equal('email', sanitizedEmail), Query.limit(1)]
      )

      if (existing.documents.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed! Thank you for staying connected.',
        })
      }
    } catch {
      // Continue to create attempt
    }

    // 5. Persist subscription record
    try {
      const docId = sanitizeAppwriteDocId(`sub_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, 'sub')
      await databases.createDocument(
        DATABASE_ID,
        collectionName,
        docId,
        {
          email: sanitizedEmail,
          clientIp,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        }
      )
    } catch (createErr: any) {
      if (createErr?.code === 409) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed! Thank you for staying connected.',
        })
      }
      logger.error('Failed to persist newsletter subscription to Appwrite', {
        errorMessage: createErr?.message,
      })
      // Return truthful error when storage fails
      return NextResponse.json(
        { success: false, error: 'Newsletter service is temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    }

    logger.info('Newsletter subscription created', {
      domain: sanitizedEmail.split('@')[1],
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing! You are now on our update list.',
    })
  } catch (error: any) {
    logger.error('Subscribe API Error', { message: error?.message })
    return NextResponse.json(
      { success: false, error: 'Failed to process subscription request. Please try again.' },
      { status: 500 }
    )
  }
}
