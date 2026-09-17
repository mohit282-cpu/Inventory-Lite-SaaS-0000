import { describe, it, expect } from 'vitest'
import { generateBackupMetadata, exportBackup, importBackup, verifyBackupIntegrity } from '../../scripts/backup-restore'
import fs from 'fs'
import path from 'path'

describe('Backup & Disaster Recovery CLI Utility Tests', () => {
  const testFile = path.join(process.cwd(), 'src/test/fixtures/tmp-backup-test.json')

  it('generates valid backup metadata and calculates document totals', () => {
    const data = {
      products: [{ $id: 'p1' }, { $id: 'p2' }],
      sales: [{ $id: 's1' }],
    }
    const meta = generateBackupMetadata(data)
    expect(meta.totalCollections).toBe(2)
    expect(meta.totalDocuments).toBe(3)
    expect(meta.checksum).toBeDefined()
  })

  it('exports and re-imports backup payload cleanly', () => {
    const sampleData = {
      customers: [{ $id: 'c1', name: 'Test Customer' }],
    }
    exportBackup(sampleData, testFile)
    expect(fs.existsSync(testFile)).toBe(true)

    const imported = importBackup(testFile)
    expect(imported.data.customers.length).toBe(1)
    expect(imported.data.customers[0].name).toBe('Test Customer')

    // Cleanup test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  it('validates backup payload integrity', () => {
    const validPayload = {
      metadata: { timestamp: new Date().toISOString(), version: '1.0.0', environment: 'test', totalCollections: 1, totalDocuments: 1, checksum: 'abc' },
      data: { products: [{ $id: 'p1' }] },
    }
    const res = verifyBackupIntegrity(validPayload as any)
    expect(res.valid).toBe(true)
    expect(res.errors.length).toBe(0)
  })
})
