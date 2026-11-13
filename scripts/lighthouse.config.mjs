/**
 * Configuração versionada da auditoria Lighthouse (ver README > Performance).
 * Build otimizado + cenário padrão dos mocks, sem simplificações.
 */
export default {
  port: 4318,
  runs: 3,
  pages: [
    { id: 'inicio', path: '/' },
    { id: 'detalhe', path: '/nfts/emerald-ape-042' },
  ],
  profiles: ['mobile', 'desktop'],
  categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
  outputDir: 'lighthouse-reports',
}
