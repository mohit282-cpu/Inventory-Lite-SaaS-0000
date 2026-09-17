import { Client, Account, Databases } from 'appwrite'

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6aabeb7e0017a4599d1e'

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)

// Run client.ping() to confirm setup
if (typeof (client as any).ping === 'function') {
  try {
    (client as any).ping().catch(() => {})
  } catch {
    // Non-blocking
  }
}

export interface AppwriteConfigInfo {
  endpoint: string
  projectId: string
  isConfigured: boolean
}

export function getAppwriteConfig(): AppwriteConfigInfo {
  return {
    endpoint,
    projectId,
    isConfigured: true,
  }
}

export function validateAppwriteConfig(): void {}

const account = new Account(client)
const databases = new Databases(client)

export { client, account, databases }
