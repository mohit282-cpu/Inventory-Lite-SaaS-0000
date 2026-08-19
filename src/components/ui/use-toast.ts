"use client"

import * as React from "react"

export interface ToastProps {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  duration?: number
}

const TOAST_LIMIT = 5
const DEFAULT_DURATION = 4000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST
      toast: ToasterToast
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST
      toastId?: string
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const clearToastTimeout = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId))
    toastTimeouts.delete(toastId)
  }
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.DISMISS_TOAST:
    case actionTypes.REMOVE_TOAST: {
      const { toastId } = action

      if (toastId === undefined) {
        toastTimeouts.forEach((timeout) => clearTimeout(timeout))
        toastTimeouts.clear()
        return {
          ...state,
          toasts: [],
        }
      }

      clearToastTimeout(toastId)
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }
    }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toast({ duration = DEFAULT_DURATION, ...props }: ToastProps) {
  const id = genId()

  const dismiss = () => dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id })

  const update = (props: ToastProps) =>
    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: { ...props, id },
    })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
    },
  })

  if (duration > 0) {
    const timeout = setTimeout(() => {
      dismiss()
    }, duration)
    toastTimeouts.set(id, timeout)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.REMOVE_TOAST, toastId }),
  }
}

export { useToast, toast }
