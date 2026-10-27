import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string
      action: string
      theme: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': (errorCode: string) => void
    },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

function siteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY
}

export default function TurnstileWidget({
  action,
  onToken,
  resetKey,
}: {
  action: 'login' | 'password-reset'
  onToken: (token: string | null) => void
  resetKey: number
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)
  const key = siteKey()

  useEffect(() => {
    onTokenRef.current = onToken
  })

  useEffect(() => {
    if (!key) return
    let poll = 0

    function mount(): void {
      const api = window.turnstile
      const el = mountRef.current
      if (!api || typeof api.render !== 'function' || !el) return
      try {
        widgetRef.current = api.render(el, {
          sitekey: key,
          action,
          theme: 'light',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': (errorCode) => {
            // 110200 = hostname not allowed for this sitekey. Dev-only log so
            // the one visible message is not the only diagnostic.
            if (import.meta.env.DEV) console.error(`Turnstile error ${errorCode}`)
            // Cloudflare discards the widget on this path; do not remove() it.
            widgetRef.current = null
            setFailed(true)
            onTokenRef.current(null)
          },
        })
      } catch (error) {
        // A Turnstile failure must never crash the page behind it.
        if (import.meta.env.DEV) console.error('Turnstile render failed', error)
        setFailed(true)
      }
    }

    // Cloudflare's ready() refuses to run when the script is async/defer, and the
    // script must stay async so a blocked CDN cannot hold up the app. Once the
    // global exists the API is initialised, so render directly instead.
    if (typeof window.turnstile?.render === 'function') {
      mount()
    } else {
      // The script is async: wait for the global, but never poll forever —
      // a blocked or broken script must surface as a visible failure.
      const deadline = Date.now() + 10_000
      poll = window.setInterval(() => {
        if (typeof window.turnstile?.render === 'function') {
          window.clearInterval(poll)
          mount()
          return
        }
        if (Date.now() > deadline) {
          window.clearInterval(poll)
          setFailed(true)
        }
      }, 100)
    }

    return () => {
      if (poll) window.clearInterval(poll)
      if (widgetRef.current) {
        window.turnstile?.remove(widgetRef.current)
        widgetRef.current = null
      }
    }
  }, [action, key])

  useEffect(() => {
    if (!widgetRef.current) return
    window.turnstile?.reset(widgetRef.current)
    onTokenRef.current(null)
  }, [resetKey])

  // Keep the widget container mounted even on failure: Cloudflare's watchcat
  // warns "Cannot find Widget" when a widget's wrapper leaves the DOM, so the
  // message is a sibling and the dead widget box is hidden instead.
  return (
    <div className="login-turnstile">
      <div ref={mountRef} hidden={!key || failed} />
      {(!key || failed) && (
        <p className="login-alert" role="alert">
          Không tải được xác thực bảo mật. Vui lòng tải lại trang.
        </p>
      )}
    </div>
  )
}
