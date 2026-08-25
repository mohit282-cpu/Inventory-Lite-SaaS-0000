import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimiter } from '@/lib/rate-limiter'

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
    // 1. Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'contact_client'
    try {
      rateLimiter.checkLimit(`contact_${ip}`, 5, 60000)
    } catch (rateErr: any) {
      return NextResponse.json(
        { success: false, error: rateErr.message || 'Too many contact requests. Please try again later.' },
        { status: 429 }
      )
    }

    // 2. Parse payload
    const body = await request.json().catch(() => ({}))

    // Honeypot bot check: if invisible 'website' field is populated, silently reject bot request
    if (body.website && body.website.trim() !== '') {
      return NextResponse.json({ success: true, message: 'Thank you for your message!' })
    }

    const validation = contactSchema.safeParse(body)
    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Invalid support request inputs'
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 })
    }

    const name = sanitizeInput(validation.data.name)
    const phone = sanitizeInput(validation.data.phone)
    const businessName = sanitizeInput(validation.data.businessName || '')
    const message = sanitizeInput(validation.data.message)

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting Inventory Lite support! Our team will reach out to you shortly.',
      data: { name, phone, businessName, messageLength: message.length, messageReceived: true },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process support request. Please try again.' },
      { status: 500 }
    )
  }
}
