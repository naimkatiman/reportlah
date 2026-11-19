import OpenAI from 'openai'
import { AgentError } from '@/lib/types'

export type ChatBody = { messages: unknown[]; tools?: unknown[]; tool_choice?: unknown; response_format?: { type: 'json_object' } }
export type ToolCall = { id: string; name: string; arguments: string }
export type ChatReply = { content: string | null; tool_calls: ToolCall[]; raw_message: unknown }
export type ChatFn = (body: ChatBody) => Promise<ChatReply>

let client: OpenAI | null = null

// The only code that talks to the SDK. Thinking is switched off on every request:
// Model Studio takes `enable_thinking: false`, OpenRouter takes `reasoning: { enabled: false }`.
export const chat: ChatFn = async (body) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new AgentError('kunci API tiada')
  const baseURL = process.env.QWEN_BASE_URL
  client ??= new OpenAI({ apiKey, baseURL, timeout: Number(process.env.QWEN_TIMEOUT_MS) || 15000, maxRetries: 1 })
  const thinkingOff = /openrouter/i.test(baseURL ?? '') ? { reasoning: { enabled: false } } : { enable_thinking: false }
  const request = { model: process.env.QWEN_MODEL, ...thinkingOff, ...body }
  try {
    const res = (await client.chat.completions.create(request as never)) as unknown as {
      choices?: { message?: { content?: string | null; tool_calls?: { id: string; function?: { name: string; arguments: string } }[] } }[]
    }
    const m = res.choices?.[0]?.message
    if (!m) throw new Error('tiada mesej')
    return {
      content: m.content ?? null,
      tool_calls: (m.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function?.name ?? '', arguments: c.function?.arguments ?? '' })),
      raw_message: m,
    }
  } catch (e) {
    throw new AgentError(e instanceof Error ? e.message : 'ralat model')
  }
}
