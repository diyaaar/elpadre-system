import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children directly into document.body via a portal.
 * Use this to wrap fixed-position modals/overlays so that
 * framer-motion's transform: none on parent containers
 * doesn't create a new containing block for fixed elements.
 */
export function Portal({ children }: { children: React.ReactNode }) {
    const el = useRef(document.createElement('div'))

    useEffect(() => {
        const container = el.current
        document.body.appendChild(container)
        return () => {
            document.body.removeChild(container)
        }
    }, [])

    return createPortal(children, el.current)
}
