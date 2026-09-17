process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6aabeb7e0017a4599d1e'
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'inventory_lite_db'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock console.error to suppress expected test errors
const originalError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  // Suppress specific known errors from test output
  if (
    msg.includes('Not implemented: window.matchMedia') ||
    msg.includes('Error: Insufficient stock') ||
    msg.includes('Failed to release lock') ||
    msg.includes('Transaction failed')
  ) {
    return;
  }
  originalError(...args);
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any
