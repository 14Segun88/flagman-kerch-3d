import type { Plugin } from '@pascal-app/core'
import type { EditorHostPanel } from '@pascal-app/editor'

export const costEstimatorPlugin: Plugin = {
  id: 'pascal:cost-estimator',
  apiVersion: 1,
  nodes: [], // No custom nodes, just observing existing ones
}

export const costEstimatorHostPanel: EditorHostPanel = {
  id: 'pascal:cost-estimator:panel',
  pluginId: 'pascal:cost-estimator',
  label: 'Смета',
  description: 'Расчет стоимости строительства (Цены по Крыму)',
  creator: {
    name: 'Pascal',
    url: 'https://pascal.app',
  },
  icon: {
    kind: 'svg',
    viewBox: '0 0 24 24',
    path: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z',
  },
  defaultInstalled: true,
  component: () => import('./cost-estimator-panel'),
}

export default {
  ...costEstimatorPlugin,
  editorPanels: [costEstimatorHostPanel],
}
