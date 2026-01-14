'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const baseUrl = typeof window === 'undefined' ? undefined : window.location.origin

  return (
    <SessionProvider
      baseUrl={baseUrl}
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}

