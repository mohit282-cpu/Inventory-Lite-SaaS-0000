import { Client, Account, Databases } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a85664100023f1deffb";

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('Configuration Warning: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set in environment.');
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
