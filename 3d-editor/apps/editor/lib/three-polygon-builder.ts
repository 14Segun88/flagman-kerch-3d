import * as THREE from 'three'
import type { PolygonStructure } from './free-cv-parser'

export function create3DMeshFromPolygon(structure: PolygonStructure, height = 3.0) {
  console.log(`🏗 [Three.js ExtrudeGeometry] Построение 3D-меша для [${structure.id}]: вершины = ${structure.points.length}, тип = ${structure.colorType}, высота = ${height}m`)

  const shape = new THREE.Shape()

  // Рисуем контур по всем точкам полигона (хоть 4, хоть 8 углов)
  structure.points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  })

  // Замыкаем полигон
  shape.closePath()

  // Вытягиваем 2D контур в 3D объект
  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  // Поворачиваем, чтобы пол лежал горизонтально
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: structure.colorType === 'pool' ? 0x0284c7 : 0x8d6e63,
    roughness: 0.4,
  })

  const mesh = new THREE.Mesh(geometry, material)
  console.log(`  ✨ [ExtrudeGeometry Complete] Меш [${structure.id}] успешно смонтирован (${structure.isLShape ? 'Г-образный контур' : 'Прямоугольный контур'})`)

  return mesh
}
