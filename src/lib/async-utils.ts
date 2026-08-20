/**
 * Reusable Asynchronous Utilities
 */

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a Promise with a timeout limit.
 * Guaranteed to resolve or reject within the specified `timeoutMs` limit.
 * Actively cleans up timer handles to prevent dangling callbacks or memory leaks.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  let timerId: NodeJS.Timeout | number | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new TimeoutError(errorMessage))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timerId !== null) {
      clearTimeout(timerId as any)
    }
  })
}
