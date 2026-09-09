import { Client, Account, Databases } from "appwrite";

export interface AppwriteConfigInfo {
  endpoint: string;
  projectId: string;
  isConfigured: boolean;
}

/**
 * Helper to check Appwrite configuration status without throwing
 */
export function getAppwriteConfig(): AppwriteConfigInfo {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  const isConfigured = isTest || Boolean(
    projectId &&
    projectId.trim() !== "" &&
    projectId !== "your_project_id" &&
    projectId !== "unconfigured_appwrite_project_id"
  );
  return {
    endpoint,
    projectId,
    isConfigured,
  };
}

/**
 * Validates Appwrite configuration and throws a clear actionable error if missing.
 * Intended to be called prior to executing API requests, NOT during module evaluation.
 */
export function validateAppwriteConfig(): void {
  const config = getAppwriteConfig();
  if (!config.isConfigured) {
    const isDev = process.env.NODE_ENV === "development";
    const envSource = isDev ? "local environment variables" : "production environment variables";
    const actionGuide = isDev
      ? "Please ensure NEXT_PUBLIC_APPWRITE_PROJECT_ID is set in your .env.local file."
      : "Please set NEXT_PUBLIC_APPWRITE_PROJECT_ID in your production hosting provider dashboard.";
    const errorMsg = `Configuration Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured in ${envSource}. ${actionGuide}`;
    console.error(`[Appwrite Config] ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

const config = getAppwriteConfig();

// Initialize Appwrite Client safely at module scope without throwing on import
const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId || "unconfigured_appwrite_project_id");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
