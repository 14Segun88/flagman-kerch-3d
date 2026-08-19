import { describe, expect, it } from 'vitest'
import { buildRAGPrompt } from './rag-prompt-builder'
import { ArchitecturalVectorDB, cosineSimilarity } from './vector-db-store'

describe('Vector RAG 3D Layout Store Unit Tests', () => {
  it('calculates cosine similarity correctly', () => {
    const vecA = [1, 0, 1]
    const vecB = [1, 0, 1]
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0)

    const vecOrthogonal = [0, 1, 0]
    expect(cosineSimilarity(vecA, vecOrthogonal)).toBeCloseTo(0.0)
  })

  it('searches vector database and finds L-shaped house ground truth template', () => {
    const db = new ArchitecturalVectorDB()
    const results = db.search('L-shaped house residential 1-story', 2)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.entry.id).toBe('l_shaped_house_10x12')
    expect(results[0]!.score).toBeGreaterThan(0.3)
  })

  it('searches vector database for plot plans (genplan sauna parking)', () => {
    const db = new ArchitecturalVectorDB()
    const results = db.search('plot plan genplan sauna parking gazebo', 2)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.entry.id).toBe('plot_plan_with_sauna_and_parking')
  })

  it('builds RAG prompt with retrieved Ground Truth 3D JSON references', () => {
    const db = new ArchitecturalVectorDB()
    const prompt = buildRAGPrompt('L-shaped house with sauna and parking', db, 2)

    expect(prompt.retrievedTemplates.length).toBe(2)
    expect(prompt.systemPrompt).toContain('GROUND TRUTH REFERENCE EXAMPLES FROM VECTOR DB')
    expect(prompt.systemPrompt).toContain('SceneGraph JSON')
  })
})
