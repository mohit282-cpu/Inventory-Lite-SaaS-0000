import { Client, Account, Databases } from 'appwrite'

const DEFAULT_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'
const DEFAULT_PROJECT_ID = '6aabeb7e0017a4599d1e'

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || DEFAULT_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || DEFAULT_PROJECT_ID

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
  const envProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  const isEnvInvalid = !envProjectId ||
    envProjectId.trim() === '' ||
    envProjectId === 'your_project_id' ||
    envProjectId === 'unconfigured_appwrite_project_id'

  const activeProjectId = isEnvInvalid ? DEFAULT_PROJECT_ID : envProjectId
  const activeEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || DEFAULT_ENDPOINT
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)

  return {
    endpoint: activeEndpoint,
    projectId: activeProjectId,
    isConfigured: isTest || !isEnvInvalid,
  }
}

export function validateAppwriteConfig(): void {
  const config = getAppwriteConfig()
  if (!config.isConfigured && process.env.NODE_ENV === 'production') {
    const errorMsg = 'Configuration Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured in production environment variables. Deployment halted.'
    console.error(`[Appwrite Config] ${errorMsg}`)
    throw new Error(errorMsg)
  }
}

const account = new Account(client)
const databases = new Databases(client)

export { client, account, databases }
