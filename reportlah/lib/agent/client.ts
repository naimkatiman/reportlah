import OpenAI from 'openai'
import type { ChatCall, ChatFn, ChatReply } from '@/lib/types'

type RawCompletion = {
  choices: {
    message: {
      content?: string | null
      tool_calls?: { function: { name: string; arguments: string } }[] | null
    }
  }[]
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('model_unavailable')
  client ??= new OpenAI({
    apiKey,
    baseURL: process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    maxRetries: 0,
  })
  return client
}

export const chat: ChatFn = async (call: ChatCall, signal: AbortSignal): Promise<ChatReply> => {
  const openai = getClient()
  const body = {
    model: process.env.QWEN_MODEL ?? 'qwen3.7-plus',
    enable_thinking: false,
    messages: call.messages,
    tools: call.tools,
    tool_choice:
      process.env.QWEN_FORCE_MODE === 'auto'
        ? 'auto'
        : { type: 'function', function: { name: call.tool_name } },
  }
  const res = (await openai.chat.completions.create(body as never, { signal })) as unknown as RawCompletion
  const message = res.choices[0]?.message
  return {
    tool_calls: (message?.tool_calls ?? []).map((t) => ({
      name: t.function.name,
      arguments: t.function.arguments,
    })),
    content: message?.content ?? null,
  }
}
