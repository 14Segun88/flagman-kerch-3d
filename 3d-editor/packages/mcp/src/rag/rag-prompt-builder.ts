import { ArchitecturalVectorDB, type VectorSearchResult } from './vector-db-store'

export interface RAGPromptResult {
  systemPrompt: string
  userPrompt: string
  retrievedTemplates: VectorSearchResult[]
}

/**
 * Builds RAG Few-Shot Prompts for NVIDIA NIM Llama 405B / LM Studio.
 * Injects ground truth 3D scene templates retrieved from the vector database.
 */
export function buildRAGPrompt(
  userQuery: string,
  vectorDB: ArchitecturalVectorDB,
  topK = 2,
): RAGPromptResult {
  const retrievedTemplates = vectorDB.search(userQuery, topK)

  let systemPrompt = `You are an expert AI 3D Architectural Designer. Your job is to convert 2D house blueprints or site plot plans into clean, defect-free Pascal 3D Editor JSON scene graphs.

CRITICAL INSTRUCTION:
Below are GROUND TRUTH 3D SCENE TEMPLATES retrieved from our Architectural Vector Database.
You MUST follow their node structure ("nodes", "rootNodeIds", "site", "building", "level", "wall", "zone") strictly. DO NOT invent invalid properties!

=== GROUND TRUTH REFERENCE EXAMPLES FROM VECTOR DB ===
`

  for (let i = 0; i < retrievedTemplates.length; i++) {
    const item = retrievedTemplates[i]!
    systemPrompt += `
--- REFERENCE EXAMPLE ${i + 1} (Match Score: ${(item.score * 100).toFixed(1)}%) ---
Title: ${item.entry.title}
Description: ${item.entry.description}
Ground Truth SceneGraph JSON:
${JSON.stringify(item.entry.sceneGraph, null, 2)}
`
  }

  systemPrompt += `
=== END OF REFERENCE EXAMPLES ===

Output ONLY raw JSON matching the SceneGraph schema of the reference examples. Do NOT write markdown prose or commentary.`

  const userPrompt = `Generate a valid 3D SceneGraph JSON for the following input 2D plan / description:
"${userQuery}"`

  return {
    systemPrompt,
    userPrompt,
    retrievedTemplates,
  }
}
