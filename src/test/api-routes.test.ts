import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, any>()

vi.mock('@/config/appwrite', () => ({
  DATABASE_ID: 'test_db',
  COLLECTIONS: {
    CONTACT_SUBMISSIONS: 'contact_submissions',
    NEWSLETTER_SUBSCRIPTIONS: 'newsletter_subscriptions',
    BUSINESSES: 'businesses',
  },
  databases: {
    listDocuments: vi.fn(async (_db, col, queries = []) => {
      let docs = Array.from(store.values()).filter((d) => d.$collectionId === col)
      for (const q of queries) {
        const qStr = typeof q === 'string' ? q : JSON.stringify(q)
        if (qStr.includes('equal') && qStr.includes('email')) {
          const match = qStr.match(/"([^"]+@.+?)"/)
          if (match) {
            docs = docs.filter((d) => d.email === match[1])
          }
        }
      }
      return { documents: docs, total: docs.length }
    }),
    createDocument: vi.fn(async (_db, col, id, data) => {
      const doc = { $id: id || `doc_${Date.now()}`, $collectionId: col, ...data }
      store.set(`${col}:${doc.$id}`, doc)
      return doc
    }),
  },
}))

import { databases } from '@/config/appwrite'
import { POST as contactHandler } from '@/app/api/contact/route'
import { POST as subscribeHandler } from '@/app/api/subscribe/route'
import { GET as healthHandler } from '@/app/api/health/route'
import { getTrustedClientIp, rateLimiter } from '@/lib/rate-limiter'

describe('API Routes: Contact, Subscribe, Health, and Rate Limiting Tests', () => {
  beforeEach(() => {
    store.clear()
    rateLimiter.reset()
    vi.restoreAllMocks()
    vi.mocked(databases.createDocument).mockImplementation(async (_db, col, id, data) => {
      const doc = { $id: id || `doc_${Date.now()}`, $collectionId: col, ...data }
      store.set(`${col}:${doc.$id}`, doc)
      return doc as any
    })
  })

  describe('Trusted IP & Rate Limiting', () => {
    it('prioritizes trusted x-real-ip and does not allow spoofed x-forwarded-for bypass', () => {
      const req = new Request('http://localhost/api/test', {
        headers: {
          'x-real-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        },
      })
      expect(getTrustedClientIp(req)).toBe('203.0.113.195')
    })

    it('enforces rate limits per client IP', async () => {
      const makeReq = () =>
        new Request('http://localhost/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-real-ip': '192.0.2.1',
          },
          body: JSON.stringify({
            name: 'Rate Test',
            phone: '9841000000',
            message: 'Testing rate limits',
          }),
        })

      // Send 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const res = await contactHandler(makeReq())
        expect(res.status).toBe(200)
      }

      // 6th request must be rate limited with HTTP 429
      const res6 = await contactHandler(makeReq())
      expect(res6.status).toBe(429)
      const data = await res6.json()
      expect(data.error).toMatch(/Rate limit exceeded/)
    })
  })

  describe('POST /api/contact', () => {
    it('rejects missing or invalid Content-Type header with HTTP 415', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'raw body',
      })
      const res = await contactHandler(req)
      expect(res.status).toBe(415)
    })

    it('rejects malformed JSON payload with HTTP 400', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"invalid_json":',
      })
      const res = await contactHandler(req)
      expect(res.status).toBe(400)
    })

    it('silently absorbs honeypot bot submissions without persisting them', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Spam Bot',
          phone: '9841000000',
          message: 'Buy cheap watches',
          website: 'http://spam-link.com', // Honeypot field
        }),
      })
      const res = await contactHandler(req)
      expect(res.status).toBe(200)
      expect(databases.createDocument).not.toHaveBeenCalledWith(
        expect.anything(),
        'contact_submissions',
        expect.anything(),
        expect.anything()
      )
    })

    it('persists legitimate contact submissions and returns HTTP 200', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Shyam Shrestha',
          businessName: 'Shyam Stores',
          phone: '9841234567',
          message: 'Interested in inventory software subscription.',
        }),
      })
      const res = await contactHandler(req)
      expect(res.status).toBe(200)
      expect(databases.createDocument).toHaveBeenCalledWith(
        'test_db',
        'contact_submissions',
        expect.anything(),
        expect.objectContaining({
          name: 'Shyam Shrestha',
          phone: '9841234567',
          businessName: 'Shyam Stores',
        })
      )
    })

    it('returns truthful HTTP 500 when database persistence fails', async () => {
      vi.mocked(databases.createDocument).mockImplementation(async (_db, col, id, data) => {
        if (col === 'contact_submissions') {
          throw new Error('Appwrite DB timeout')
        }
        const doc = { $id: id || `doc_${Date.now()}`, $collectionId: col, ...data }
        store.set(`${col}:${doc.$id}`, doc)
        return doc as any
      })

      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Shyam Shrestha',
          phone: '9841234567',
          message: 'Interested in inventory software subscription.',
        }),
      })
      const res = await contactHandler(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toMatch(/Unable to save support request/)
    })
  })

  describe('POST /api/subscribe', () => {
    it('rejects invalid email formats with HTTP 400', async () => {
      const req = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })
      const res = await subscribeHandler(req)
      expect(res.status).toBe(400)
    })

    it('persists new newsletter subscription to database', async () => {
      const req = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
      const res = await subscribeHandler(req)
      expect(res.status).toBe(200)
      expect(databases.createDocument).toHaveBeenCalledWith(
        'test_db',
        'newsletter_subscriptions',
        expect.anything(),
        expect.objectContaining({
          email: 'user@example.com',
          status: 'ACTIVE',
        })
      )
    })

    it('handles duplicate subscription idempotently without error', async () => {
      store.set('newsletter_subscriptions:sub_existing', {
        $id: 'sub_existing',
        $collectionId: 'newsletter_subscriptions',
        email: 'existing@example.com',
      })

      const req = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'existing@example.com' }),
      })
      const res = await subscribeHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toMatch(/already subscribed/i)
    })

    it('returns truthful HTTP 500 when storage fails', async () => {
      vi.mocked(databases.createDocument).mockImplementation(async (_db, col, id, data) => {
        if (col === 'newsletter_subscriptions') {
          throw new Error('Appwrite DB down')
        }
        const doc = { $id: id || `doc_${Date.now()}`, $collectionId: col, ...data }
        store.set(`${col}:${doc.$id}`, doc)
        return doc as any
      })

      const req = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'fail@example.com' }),
      })
      const res = await subscribeHandler(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toMatch(/temporarily unavailable/i)
    })
  })

  describe('GET /api/health', () => {
    it('returns HTTP 200 with status "healthy" when database ping succeeds', async () => {
      const res = await healthHandler()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('healthy')
      expect(body.services.web.status).toBe('up')
      expect(body.services.database.status).toBe('connected')
    })

    it('returns HTTP 503 with status "degraded" when database ping fails', async () => {
      vi.mocked(databases.listDocuments).mockRejectedValueOnce(new Error('Connection refused'))
      const res = await healthHandler()
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.status).toBe('degraded')
      expect(body.services.web.status).toBe('up')
      expect(body.services.database.status).toBe('disconnected')
      expect(body.services.database.error).toBe('Connection refused')
    })
  })
})
