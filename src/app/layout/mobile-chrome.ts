import { useRouterState } from '@tanstack/react-router'

/**
 * Telas "imersivas" no mobile (Figma): têm cabeçalho próprio (voltar + título)
 * e barra de ação fixa — sem navegação inferior. Fonte única para layout raiz,
 * navegação inferior e rodapé.
 */
const IMMERSIVE_ROUTES = [/^\/nfts\/[^/]+$/, /^\/cart$/, /^\/checkout$/, /^\/login$/, /^\/register$/]

export const isImmersiveRoute = (pathname: string) => IMMERSIVE_ROUTES.some((route) => route.test(pathname))

export function useMobileChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const immersive = isImmersiveRoute(pathname)
  return {
    pathname,
    /** Navegação inferior flutuante (só mobile). */
    bottomNav: !immersive,
    /** No mobile o rodapé institucional só aparece no início (telas de app não têm rodapé). */
    footerOnMobile: pathname === '/',
  }
}
