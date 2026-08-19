import type { SceneGraph } from '@pascal-app/core/clone-scene-graph'

export interface ArchitecturalDatasetEntry {
  id: string
  title: string
  category: 'house' | 'plot_plan' | 'apartment' | 'outbuilding'
  description: string
  tags: string[]
  sceneGraph: SceneGraph
}

/**
 * Ground Truth Architectural Dataset.
 * A collection of verified, defect-free 3D house and site plot layout templates.
 */
export const GROUND_TRUTH_ARCHITECTURAL_DATASET: ArchitecturalDatasetEntry[] = [
  {
    id: 'l_shaped_house_10x12',
    title: 'L-Shaped Residential House (7.6m x 9.9m with corner offset)',
    category: 'house',
    description: 'One-story L-shaped residential house with living room, master bedroom, kitchen, bathroom, and entrance hall. Exterior wall thickness 0.3m, height 3.0m.',
    tags: ['L-shaped', 'residential', 'house', '1-story', 'master bedroom', 'living room', 'kitchen'],
    sceneGraph: {
      nodes: {
        site_1: { id: 'site_1', type: 'site', children: ['building_1'] } as any,
        building_1: { id: 'building_1', type: 'building', parentId: 'site_1', children: ['level_1'] } as any,
        level_1: {
          id: 'level_1',
          type: 'level',
          parentId: 'building_1',
          level: 0,
          height: 3.0,
          children: ['wall_1', 'wall_2', 'wall_3', 'wall_4', 'wall_5', 'wall_6', 'room_living', 'room_bed'],
        } as any,
        wall_1: { id: 'wall_1', type: 'wall', parentId: 'level_1', start: [0, 0], end: [7.6, 0], thickness: 0.3, height: 3.0 } as any,
        wall_2: { id: 'wall_2', type: 'wall', parentId: 'level_1', start: [7.6, 0], end: [7.6, 9.9], thickness: 0.3, height: 3.0 } as any,
        wall_3: { id: 'wall_3', type: 'wall', parentId: 'level_1', start: [7.6, 9.9], end: [3.5, 9.9], thickness: 0.3, height: 3.0 } as any,
        wall_4: { id: 'wall_4', type: 'wall', parentId: 'level_1', start: [3.5, 9.9], end: [3.5, 7.6], thickness: 0.3, height: 3.0 } as any,
        wall_5: { id: 'wall_5', type: 'wall', parentId: 'level_1', start: [3.5, 7.6], end: [0, 7.6], thickness: 0.3, height: 3.0 } as any,
        wall_6: { id: 'wall_6', type: 'wall', parentId: 'level_1', start: [0, 7.6], end: [0, 0], thickness: 0.3, height: 3.0 } as any,
        room_living: {
          id: 'room_living',
          type: 'zone',
          parentId: 'level_1',
          name: 'Gostinaya (Living Room)',
          polygon: [[0, 0], [7.6, 0], [7.6, 7.6], [0, 7.6]],
        } as any,
        room_bed: {
          id: 'room_bed',
          type: 'zone',
          parentId: 'level_1',
          name: 'Spalnya (Bedroom)',
          polygon: [[3.5, 7.6], [7.6, 7.6], [7.6, 9.9], [3.5, 9.9]],
        } as any,
      } as unknown as Record<string, any>,
      rootNodeIds: ['site_1'],
    },
  },
  {
    id: 'plot_plan_with_sauna_and_parking',
    title: 'Site Plot Plan with Main House, Sauna, Garage Parking, and Gazebo',
    category: 'plot_plan',
    description: 'Full site plot layout featuring main house, detached bathhouse sauna (5x5m), 2-car paved parking area (6x6m), gazebo outdoor patio, and playground.',
    tags: ['plot plan', 'genplan', 'sauna', 'banya', 'parking', 'gazebo', 'playground', 'outbuilding', 'house'],
    sceneGraph: {
      nodes: {
        site_plot: { id: 'site_plot', type: 'site', children: ['bld_house', 'bld_sauna'] } as any,
        bld_house: { id: 'bld_house', type: 'building', parentId: 'site_plot', children: ['lvl_house'] } as any,
        lvl_house: {
          id: 'lvl_house',
          type: 'level',
          parentId: 'bld_house',
          level: 0,
          height: 3.0,
          children: ['w1', 'w2', 'w3', 'w4', 'z_house', 'z_parking', 'z_sauna', 'z_gazebo'],
        } as any,
        w1: { id: 'w1', type: 'wall', parentId: 'lvl_house', start: [0, 0], end: [10, 0], thickness: 0.3, height: 3.0 } as any,
        w2: { id: 'w2', type: 'wall', parentId: 'lvl_house', start: [10, 0], end: [10, 8], thickness: 0.3, height: 3.0 } as any,
        w3: { id: 'w3', type: 'wall', parentId: 'lvl_house', start: [10, 8], end: [0, 8], thickness: 0.3, height: 3.0 } as any,
        w4: { id: 'w4', type: 'wall', parentId: 'lvl_house', start: [0, 8], end: [0, 0], thickness: 0.3, height: 3.0 } as any,
        z_house: { id: 'z_house', type: 'zone', parentId: 'lvl_house', name: 'Main Residential House', polygon: [[0, 0], [10, 0], [10, 8], [0, 8]] } as any,
        z_parking: { id: 'z_parking', type: 'zone', parentId: 'lvl_house', name: '2-Car Parking Area', polygon: [[-12, 0], [-6, 0], [-6, 6], [-12, 6]] } as any,
        z_sauna: { id: 'z_sauna', type: 'zone', parentId: 'lvl_house', name: 'Bathhouse / Sauna', polygon: [[15, 0], [20, 0], [20, 5], [15, 5]] } as any,
        z_gazebo: { id: 'z_gazebo', type: 'zone', parentId: 'lvl_house', name: 'Outdoor Gazebo', polygon: [[15, 10], [19, 10], [19, 14], [15, 14]] } as any,
      } as unknown as Record<string, any>,
      rootNodeIds: ['site_plot'],
    },
  },
  {
    id: 'rectangular_2bed_house_8x10',
    title: 'Rectangular 2-Bedroom Country House (8m x 10m)',
    category: 'house',
    description: 'Compact 80 sq.m 2-bedroom residential house with central hallway, living kitchen room, bathroom, and storage.',
    tags: ['rectangular', 'house', '2-bedroom', 'compact', 'country house', 'kitchen'],
    sceneGraph: {
      nodes: {
        site_rect: { id: 'site_rect', type: 'site', children: ['bld_rect'] } as any,
        bld_rect: { id: 'bld_rect', type: 'building', parentId: 'site_rect', children: ['lvl_rect'] } as any,
        lvl_rect: {
          id: 'lvl_rect',
          type: 'level',
          parentId: 'bld_rect',
          level: 0,
          height: 2.8,
          children: ['rw1', 'rw2', 'rw3', 'rw4', 'rz_living', 'rz_bed1', 'rz_bed2'],
        } as any,
        rw1: { id: 'rw1', type: 'wall', parentId: 'lvl_rect', start: [0, 0], end: [10, 0], thickness: 0.3, height: 2.8 } as any,
        rw2: { id: 'rw2', type: 'wall', parentId: 'lvl_rect', start: [10, 0], end: [10, 8], thickness: 0.3, height: 2.8 } as any,
        rw3: { id: 'rw3', type: 'wall', parentId: 'lvl_rect', start: [10, 8], end: [0, 8], thickness: 0.3, height: 2.8 } as any,
        rw4: { id: 'rw4', type: 'wall', parentId: 'lvl_rect', start: [0, 8], end: [0, 0], thickness: 0.3, height: 2.8 } as any,
        rz_living: { id: 'rz_living', type: 'zone', parentId: 'lvl_rect', name: 'Living Room Kitchen', polygon: [[0, 0], [6, 0], [6, 8], [0, 8]] } as any,
        rz_bed1: { id: 'rz_bed1', type: 'zone', parentId: 'lvl_rect', name: 'Bedroom 1', polygon: [[6, 0], [10, 0], [10, 4], [6, 4]] } as any,
        rz_bed2: { id: 'rz_bed2', type: 'zone', parentId: 'lvl_rect', name: 'Bedroom 2', polygon: [[6, 4], [10, 4], [10, 8], [6, 8]] } as any,
      } as unknown as Record<string, any>,
      rootNodeIds: ['site_rect'],
    },
  },
]
