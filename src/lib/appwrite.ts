import { Client, Account, Databases } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a9130d9000077ea830a";

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.warn('Configuration Warning: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set in environment.');
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);

/**
 * Ping the Appwrite backend server to verify connectivity and that the
 * endpoint/project configuration is correct. Uses the public /health/version
 * endpoint, so it does not require an authenticated session or API key.
 */
export async function ping() {
  const endpoint: string = client.config.endpoint ?? "https://fra.cloud.appwrite.io/v1"
  const res = await fetch(`${endpoint.replace(/\/$/, "")}/health/version`, {
    headers: {
      "X-Appwrite-Project": client.config.project ?? "",
    },
  })
  if (!res.ok) {
    throw new Error(`Appwrite health check failed with status ${res.status}`)
  }
  return res.json()
}

export { client, account, databases };
