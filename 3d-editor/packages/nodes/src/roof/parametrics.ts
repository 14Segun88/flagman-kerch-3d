import type { AnyNodeId, ParametricDescriptor, RoofNode } from '@pascal-app/core'

export const roofParametrics: ParametricDescriptor<RoofNode> = {
  groups: [],
  onDeleteCascade: (node) => {
    return (node.children || []) as AnyNodeId[]
  },
  customPanel: () => import('./panel'),
}
