const BASE = '/api'

// Fired whenever the API answers 401. App.tsx listens and re-checks the
// session, which sends the user to the login screen instead of leaving them
// on a screen that claims there is nothing to show.
export const UNAUTHORIZED_EVENT = 'api:unauthorized'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    credentials: 'include',
    headers: {
      // FormData bodies (file uploads) must NOT get a Content-Type header
      // here -- the browser sets its own multipart boundary automatically.
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      if (typeof data.error === 'string') {
        message = data.error
      }
    } catch {
      // response wasn't JSON -- keep statusText
    }
    // A session that expired mid-use has to reach the auth store, otherwise
    // every screen just renders an empty list and looks like the data is
    // gone. Sent as an event so this module stays free of store imports.
    if (res.status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  // multipart/form-data upload (BIA/HR/backup file imports) -- deliberately
  // bypasses request()'s JSON Content-Type default so the browser sets its
  // own multipart boundary header.
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<T>(path, { method: 'POST', body: form })
  },
}
