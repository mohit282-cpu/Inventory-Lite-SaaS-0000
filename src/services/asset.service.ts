import { Query } from 'appwrite'
import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { StoreAsset, AssetInput, AssetStatus } from '@/types'
import { authorizeBusinessAccess } from '@/lib/authorization'

export class AssetService extends BaseService {
  constructor() {
    super(COLLECTIONS.STORE_ASSETS)
  }

  async createAsset(data: AssetInput, businessId: string, userId: string): Promise<StoreAsset> {
    await authorizeBusinessAccess({ businessId, userId })

    if (!data.name || !data.name.trim()) {
      throw new Error('Asset name is required')
    }

    if (data.cost === undefined || data.cost < 0) {
      throw new Error('Asset cost must be a non-negative number')
    }

    const payload = {
      businessId,
      name: data.name.trim(),
      serialNumber: data.serialNumber?.trim() || '',
      category: data.category?.trim() || 'General Equipment',
      cost: data.cost,
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      status: data.status || 'ACTIVE',
      notes: data.notes?.trim() || '',
      createdBy: userId,
    }

    return await this.create<StoreAsset>(payload, businessId, userId)
  }

  async getAsset(assetId: string, businessId: string): Promise<StoreAsset | null> {
    try {
      const asset = await this.getById<StoreAsset>(assetId, businessId)
      return asset
    } catch {
      return null
    }
  }

  async listAssets(businessId: string, status?: AssetStatus): Promise<StoreAsset[]> {
    const queries = [Query.orderDesc('createdAt')]

    if (status) {
      queries.push(Query.equal('status', status))
    }

    return await this.list<StoreAsset>(businessId, queries)
  }

  async updateAsset(
    assetId: string,
    data: Partial<AssetInput>,
    businessId: string,
    userId: string
  ): Promise<StoreAsset> {
    await authorizeBusinessAccess({ businessId, userId })

    const existing = await this.getAsset(assetId, businessId)
    if (!existing) {
      throw new Error('Store asset not found')
    }

    const updates: Partial<StoreAsset> = {}

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Asset name cannot be empty')
      updates.name = data.name.trim()
    }
    if (data.serialNumber !== undefined) updates.serialNumber = data.serialNumber.trim()
    if (data.category !== undefined) updates.category = data.category.trim()
    if (data.cost !== undefined) {
      if (data.cost < 0) throw new Error('Asset cost must be a non-negative number')
      updates.cost = data.cost
    }
    if (data.purchaseDate !== undefined) updates.purchaseDate = data.purchaseDate
    if (data.status !== undefined) updates.status = data.status
    if (data.notes !== undefined) updates.notes = data.notes.trim()

    return await this.update<StoreAsset>(assetId, updates, businessId)
  }

  async deleteAsset(assetId: string, businessId: string, userId: string): Promise<boolean> {
    await authorizeBusinessAccess({ businessId, userId })

    const existing = await this.getAsset(assetId, businessId)
    if (!existing) {
      throw new Error('Store asset not found')
    }

    return await this.delete(assetId, businessId)
  }
}

export const assetService = new AssetService()
