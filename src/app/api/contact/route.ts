import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimiter, getTrustedClientIp } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { databases, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { ID } from 'appwrite'
import { sanitizeAppwriteDocId } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  businessName: z.string().trim().max(100, 'Business name is too long').optional(),
  phone: z.string().trim().min(7, 'Please provide a valid phone or email contact').max(100, 'Contact info too long'),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000, 'Message is too long'),
  website: z.string().optional(), // Honeypot bot field
})

function sanitizeInput(str: string): string {
  return str.replace(/[<>'"]/g, '').trim()
}

export async function POST(request: Request) {
  try {
    // 1. Content-Type validation
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Content-Type. Expected application/json.' },
        { status: 415 }
      )
    }

    // 2. Rate limiting by trusted infrastructure IP
    const clientIp = getTrustedClientIp(request)
    try {
      await rateLimiter.checkLimitAsync(`contact_${clientIp}`, 5, 60000)
    } catch (rateErr: any) {
      return NextResponse.json(
        { success: false, error: rateErr.message || 'Too many contact requests. Please wait before retrying.' },
        { status: 429 }
      )
    }

    // 3. Parse JSON payload with safe error handling
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      )
    }

    // Honeypot bot check: if invisible 'website' field is populated, silently reject bot
    if (body.website && String(body.website).trim() !== '') {
      return NextResponse.json({ success: true, message: 'Thank you for your message!' })
    }

    // 4. Schema validation
    const validation = contactSchema.safeParse(body)
    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Invalid support request inputs'
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 })
    }

    const name = sanitizeInput(validation.data.name)
    const phone = sanitizeInput(validation.data.phone)
    const businessName = sanitizeInput(validation.data.businessName || '')
    const message = sanitizeInput(validation.data.message)

    // 5. Spam protection & duplicate-submission handling
    const submissionFingerprint = sanitizeAppwriteDocId(`sub_${clientIp}_${phone.slice(-4)}_${message.length}`, 'sub')

    // 6. Persist contact submission to Appwrite
    const submissionRecord = {
      name,
      phone,
      businessName,
      message,
      clientIp,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    }

    const collectionName = COLLECTIONS.CONTACT_SUBMISSIONS || 'contact_submissions'
    try {
      await databases.createDocument(
        DATABASE_ID,
        collectionName,
        submissionFingerprint || ID.unique(),
        submissionRecord
      )
    } catch (persistErr: any) {
      logger.error('Failed to persist contact submission to Appwrite', {
        errorMessage: persistErr?.message,
        clientIp,
      })
      // Truthful error response when storage fails
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to save support request at this time. Please contact us directly via phone or email.',
        },
        { status: 500 }
      )
    }

    // Avoid logging full message or sensitive personal data
    logger.info('Support contact submission persisted successfully', {
      clientIp,
      nameLength: name.length,
      hasBusinessName: Boolean(businessName),
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting Inventory Lite support! Our team will reach out to you shortly.',
      data: { name, businessName, messageReceived: true },
    })
  } catch (error: any) {
    logger.error('Unhandled Contact API Error', { message: error?.message })
    return NextResponse.json(
      { success: false, error: 'Failed to process support request. Please try again.' },
      { status: 500 }
    )
  }
}
