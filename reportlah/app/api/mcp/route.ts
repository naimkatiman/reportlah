import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { agencyKeyOk, agencyReport } from '@/lib/agency'

export const dynamic = 'force-dynamic'

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

function buildServer(): McpServer {
  const server = new McpServer({ name: 'reportlah', version: '1.0.0' })
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  server.registerTool(
    'list_reports',
    { description: 'List the current complaint report, if any.', annotations: readOnly },
    async () => {
      const r = agencyReport()
      return text(
        r
          ? [{ report_id: r.report_id, place: r.place, issue: r.issue, count: r.count, period: r.period, missing: r.missing }]
          : [],
      )
    },
  )
  server.registerTool(
    'get_report',
    { description: 'Get the full current report with its message, or null when there is none.', annotations: readOnly },
    async () => {
      const r = agencyReport()
      return text(r ?? { report: null })
    },
  )
  return server
}

export async function POST(req: Request): Promise<Response> {
  if (!agencyKeyOk(req.headers.get('authorization'))) {
    return Response.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    )
  }
  const server = buildServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(req)
  } finally {
    void transport.close()
    void server.close()
  }
}

const notAllowed = () =>
  Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } })

export const GET = notAllowed
