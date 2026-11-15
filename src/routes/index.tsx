import { createFileRoute } from '@tanstack/react-router';
import { SimulatorDashboard } from '@/components/simulator/SimulatorDashboard';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Futebol Manager Simulator | Simulador de Futebol' },
      {
        name: 'description',
        content:
          'Simulador de futebol estilo Football Manager de texto com 20 competições, clubes reais, elencos, Poisson e chaveamento.',
      },
      { property: 'og:title', content: 'Futebol Manager Simulator' },
      {
        property: 'og:description',
        content:
          'Simulador de futebol estilo Football Manager de texto com 20 competições, clubes reais, elencos, Poisson e chaveamento.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: SimulatorDashboard,
});
