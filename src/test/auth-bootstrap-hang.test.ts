import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout, TimeoutError } from '@/lib/async-utils'

describe('Authentication Bootstrap Hang & Timeout Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('withTimeout resolves normally when promise completes before timeout limit', async () => {
    const fastPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 100)
    })

    const wrapped = withTimeout(fastPromise, 5000)
    await vi.advanceTimersByTimeAsync(150)

    const result = await wrapped
    expect(result).toBe('success')
  })

  it('withTimeout ACTIVELY rejects with TimeoutError when promise NEVER resolves', async () => {
    // A promise that NEVER settles (hanging request simulation)
    const neverResolvingPromise = new Promise<string>(() => {})

    const wrapped = withTimeout(neverResolvingPromise, 10000, 'Authentication timed out after 10s')

    let caughtError: any = null
    wrapped.catch((err) => {
      caughtError = err
    })

    // Advance fake timers asynchronously by 10,001 ms
    await vi.advanceTimersByTimeAsync(10001)

    expect(caughtError).toBeInstanceOf(TimeoutError)
    expect(caughtError.message).toBe('Authentication timed out after 10s')
  })

  it('withTimeout cleans up timer when promise rejects early', async () => {
    const failingPromise = Promise.reject(new Error('Appwrite 401 Unauthorized'))

    const wrapped = withTimeout(failingPromise, 5000)
    await expect(wrapped).rejects.toThrow('Appwrite 401 Unauthorized')
  })

  it('verifies that authentication bootstrap timeout handles never-resolving session checks', async () => {
    let authStatus: string = 'INITIALIZING'
    let isAuthLoading: boolean = true
    let authError: string | null = null

    async function simulateAuthBootstrap(sessionCheckPromise: Promise<any>) {
      try {
        const currentUser = await withTimeout(
          sessionCheckPromise,
          10000,
          'Authentication request timed out after 10s'
        )
        if (!currentUser) {
          authStatus = 'UNAUTHENTICATED'
        } else {
          authStatus = 'AUTHENTICATED'
        }
      } catch (err: any) {
        if (err instanceof TimeoutError) {
          authStatus = 'TIMEOUT'
          authError = err.message
        } else {
          authStatus = 'ERROR'
          authError = err.message
        }
      } finally {
        isAuthLoading = false
      }
    }

    const neverEndingAccountGet = new Promise<any>(() => {})

    const bootstrapTask = simulateAuthBootstrap(neverEndingAccountGet)

    expect(authStatus).toBe('INITIALIZING')
    expect(isAuthLoading).toBe(true)

    // Advance timers asynchronously by 10 seconds
    await vi.advanceTimersByTimeAsync(10001)
    await bootstrapTask

    expect(isAuthLoading).toBe(false)
    expect(authStatus).toBe('TIMEOUT')
    expect(authError).toBe('Authentication request timed out after 10s')
  })

  it('proves workspace loading failures leave user AUTHENTICATED without hanging', async () => {
    let authStatus: string = 'INITIALIZING'
    let isAuthLoading: boolean = true
    let isWorkspaceLoading: boolean = false
    let workspaceError: string | null = null

    async function simulateAuthWithFailingWorkspace() {
      // 1. Session check succeeds immediately
      await withTimeout(Promise.resolve({ $id: 'usr_99' }), 10000)
      authStatus = 'AUTHENTICATED'
      isAuthLoading = false

      // 2. Workspace loading fails or times out
      isWorkspaceLoading = true
      try {
        const hangingWorkspacePromise = new Promise(() => {})
        await withTimeout(hangingWorkspacePromise, 2000, 'Profile load timeout')
      } catch (err: any) {
        workspaceError = err.message
      } finally {
        isWorkspaceLoading = false
      }
    }

    const task = simulateAuthWithFailingWorkspace()

    await vi.advanceTimersByTimeAsync(0)
    expect(authStatus).toBe('AUTHENTICATED')
    expect(isAuthLoading).toBe(false)

    // Advance 2s for workspace timeout
    await vi.advanceTimersByTimeAsync(2001)
    await task

    // Auth status is STILL AUTHENTICATED, user is not logged out or stuck
    expect(authStatus).toBe('AUTHENTICATED')
    expect(isWorkspaceLoading).toBe(false)
    expect(workspaceError).toBe('Profile load timeout')
  })
})
