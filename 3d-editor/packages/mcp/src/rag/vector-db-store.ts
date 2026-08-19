import {
  type ArchitecturalDatasetEntry,
  GROUND_TRUTH_ARCHITECTURAL_DATASET,
} from './architectural-dataset'

export interface VectorSearchResult {
  entry: ArchitecturalDatasetEntry
  score: number
}

/**
 * Calculates Cosine Similarity between two numerical vector arrays.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i]!
    const b = vecB[i]!
    dotProduct += a * b
    normA += a * a
    normB += b * b
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Lightweight Feature Vectorizer for Architectural Floor Plans & Site Layouts.
 * Converts text descriptions and key terms into a normalized feature vector.
 */
export class ArchitecturalVectorizer {
  private vocabulary: string[]

  constructor(customVocabulary?: string[]) {
    this.vocabulary = customVocabulary || [
      'house',
      'дом',
      'l-shaped',
      'l-образный',
      'sauna',
      'баня',
      'parking',
      'парковка',
      'garage',
      'гараж',
      'gazebo',
      'беседка',
      'bedroom',
      'спальня',
      'living',
      'гостиная',
      'kitchen',
      'кухня',
      'rectangular',
      'прямоугольный',
      'plot',
      'участок',
      'genplan',
      'генплан',
      'outbuilding',
      'постройка',
      'playground',
      'площадка',
    ]
  }

  public vectorize(text: string, tags: string[] = []): number[] {
    const combined = `${text.toLowerCase()} ${tags.map((t) => t.toLowerCase()).join(' ')}`
    const tokens = combined.split(/[\s,._\-()]+/)

    const vector: number[] = new Array(this.vocabulary.length).fill(0)

    for (let i = 0; i < this.vocabulary.length; i++) {
      const keyword = this.vocabulary[i]!
      for (const token of tokens) {
        if (token.includes(keyword) || keyword.includes(token)) {
          vector[i] = (vector[i] ?? 0) + 1
        }
      }
    }

    // L2 Normalization
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      return vector.map((val) => val / magnitude)
    }
    return vector
  }
}

/**
 * Vector Database Store for Ground Truth 3D Architectural Layouts.
 */
export class ArchitecturalVectorDB {
  private vectorizer: ArchitecturalVectorizer
  private indexedEntries: Array<{
    entry: ArchitecturalDatasetEntry
    vector: number[]
  }> = []

  constructor() {
    this.vectorizer = new ArchitecturalVectorizer()
    this.buildIndex(GROUND_TRUTH_ARCHITECTURAL_DATASET)
  }

  /**
   * Build vector index from dataset entries.
   */
  public buildIndex(dataset: ArchitecturalDatasetEntry[]): void {
    this.indexedEntries = dataset.map((entry) => ({
      entry,
      vector: this.vectorizer.vectorize(entry.description, entry.tags),
    }))
  }

  /**
   * Search for top K most relevant 3D ground truth templates using vector cosine similarity.
   */
  public search(query: string, topK = 2): VectorSearchResult[] {
    const queryVector = this.vectorizer.vectorize(query)

    const scored = this.indexedEntries.map((item) => {
      const score = cosineSimilarity(queryVector, item.vector)
      return { entry: item.entry, score }
    })

    // Sort by descending similarity score
    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, topK)
  }
}
