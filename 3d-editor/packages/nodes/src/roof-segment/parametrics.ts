import type { AnyNodeId, ParametricDescriptor, RoofSegmentNode } from '@pascal-app/core'

export const roofSegmentParametrics: ParametricDescriptor<RoofSegmentNode> = {
  groups: [],
  onDeleteCascade: (node, nodes) => {
    const toCascade: AnyNodeId[] = []
    for (const [id, candidate] of Object.entries(nodes)) {
      if (candidate && candidate.type === 'roof') {
        const children = (candidate as any).children || []
        if (children.includes(node.id)) {
          toCascade.push(id as AnyNodeId)
        }
      }
    }
    return toCascade
  },
  customPanel: () => import('./panel'),
}
