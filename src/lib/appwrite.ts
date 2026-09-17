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
  const activeProjectId = envProjectId && envProjectId.trim() !== '' && envProjectId !== 'your_project_id' && envProjectId !== 'unconfigured_appwrite_project_id'
    ? envProjectId
    : DEFAULT_PROJECT_ID

  const activeEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || DEFAULT_ENDPOINT

  const isConfigured = Boolean(
    activeProjectId &&
    activeProjectId.trim() !== '' &&
    activeProjectId !== 'your_project_id' &&
    activeProjectId !== 'unconfigured_appwrite_project_id'
  )

  return {
    endpoint: activeEndpoint,
    projectId: activeProjectId,
    isConfigured,
  }
}

export function validateAppwriteConfig(): void {
  const config = getAppwriteConfig()
  if (!config.isConfigured) {
    const isDev = process.env.NODE_ENV === 'development'
    const envSource = isDev ? 'local environment variables' : 'production environment variables'
    const actionGuide = isDev
      ? 'Please ensure NEXT_PUBLIC_APPWRITE_PROJECT_ID is set in your .env.local file.'
      : 'Please set NEXT_PUBLIC_APPWRITE_PROJECT_ID in your production hosting provider dashboard.'
    const errorMsg = `Configuration Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured in ${envSource}. ${actionGuide}`
    console.error(`[Appwrite Config] ${errorMsg}`)
    throw new Error(errorMsg)
  }
}

const account = new Account(client)
const databases = new Databases(client)

export { client, account, databases }
