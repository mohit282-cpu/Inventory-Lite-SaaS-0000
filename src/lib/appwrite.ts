import { Client, Account, Databases } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

if (!projectId && typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  throw new Error('Configuration Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured in production environment variables.');
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId || 'unconfigured_appwrite_project_id');

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
