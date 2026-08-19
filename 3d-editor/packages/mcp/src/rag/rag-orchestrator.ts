import { buildRAGPrompt } from './rag-prompt-builder'
import { ArchitecturalVectorDB } from './vector-db-store'

export interface RAGOrchestratorOptions {
  apiKey?: string
  baseUrl?: string
  modelName?: string
  topK?: number
}

/**
 * RAG 3D Layout Generator Orchestrator.
 * Combines Vector RAG retrieval with NVIDIA NIM Llama 405B / LM Studio
 * to generate high-quality 3D house & site layout models.
 */
export class RAG3DLayoutOrchestrator {
  private vectorDB: ArchitecturalVectorDB

  constructor() {
    this.vectorDB = new ArchitecturalVectorDB()
  }

  /**
   * Generates RAG Few-Shot Prompt for LLMs.
   */
  public generatePrompt(userQuery: string, topK = 2) {
    return buildRAGPrompt(userQuery, this.vectorDB, topK)
  }

  /**
   * Executes RAG Generation call against NVIDIA NIM (Llama 405B / 70B) or local LM Studio.
   */
  public async generateSceneGraph(
    userQuery: string,
    options: RAGOrchestratorOptions = {},
  ): Promise<{
    sceneGraph: any
    retrievedTemplatesCount: number
    rawLLMResponse?: string
  }> {
    const promptData = this.generatePrompt(userQuery, options.topK ?? 2)
    const baseUrl = options.baseUrl || process.env.LM_STUDIO_URL || process.env.LOCAL_VLM_URL || 'http://127.0.0.1:1235/v1'
    const apiKey = options.apiKey || process.env.LM_STUDIO_API_KEY || ''
    const model = options.modelName || 'qwen2.5-vl'

    // Execute call to local LM Studio or configured VLM endpoint
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [
              { role: 'system', content: promptData.systemPrompt },
              { role: 'user', content: promptData.userPrompt },
            ],
          }),
        })

        const data = (await response.json()) as any
        const rawContent = data?.choices?.[0]?.message?.content || ''

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            sceneGraph: parsed,
            retrievedTemplatesCount: promptData.retrievedTemplates.length,
            rawLLMResponse: rawContent,
          }
        }
      } catch (err) {
        console.warn('RAG LLM fetch failed, falling back to top retrieved template:', err)
      }

    // Fallback: Return top retrieved template from Vector DB directly
    const topTemplate = promptData.retrievedTemplates[0]?.entry.sceneGraph
    return {
      sceneGraph: topTemplate,
      retrievedTemplatesCount: promptData.retrievedTemplates.length,
    }
  }
}

// Example CLI runner
if (process.env.RUN_RAG_EXAMPLE) {
  const orchestrator = new RAG3DLayoutOrchestrator()
  console.log('--- Testing RAG 3D Layout Orchestrator ---')
  const prompt = orchestrator.generatePrompt('Г-образный жилой дом 8х10м с террасой')
  console.log(`Retrieved Templates: ${prompt.retrievedTemplates.length}`)
  console.log(`Top Template Match: ${prompt.retrievedTemplates[0]?.entry.title}`)
  console.log('--- Generated System Prompt Preview ---')
  console.log(prompt.systemPrompt.slice(0, 500) + '...\n')
}
