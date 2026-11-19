import type { FormEvent } from 'react'
import { mostReported } from '@/lib/core/ranking'
import type { Channel,StateView, Tag, TraceStep } from '@/lib/types'

export type BoardProps = {
  state: StateView
  pending: boolean
  notice: string | null
  copied: boolean
  onGenerate: () => void
  onRetry: () => void
  onReset: () => void
  onAdd: (text: string, hasPhoto: boolean) => void
  onCopy: () => void
}

const TAG_TEXT: Record<Tag, string> = {
  in_report: 'In report',
  other: 'Other complaint',
  not_processed: 'Not checked yet',
}

const TAG_STYLE: Record<Tag, string> = {
  in_report: 'text-slate-900 font-medium',
  other: 'bg-slate-200 text-slate-900',
  not_processed: 'bg-white text-slate-700 border border-dashed border-slate-500',
}

const CHANNEL_TEXT: Record<Channel, string> = {
  seed: 'Sample',
  web: 'Web',
  telegram: 'Telegram',
}

const STEPS: { tool: TraceStep['tool']; label: string; actor: string }[] = [
  { tool: 'read_complaints', label: 'Read the complaints', actor: 'The app' },
  { tool: 'cluster', label: 'Group the complaints', actor: 'The assistant' },
  { tool: 'draft_report', label: 'Write the message', actor: 'The assistant' },
  { tool: 'list_gaps', label: 'Check what is missing', actor: 'The app' },
]

type StepStatus = 'done' | 'failed' | 'skipped' | 'waiting'

const DOT: Record<StepStatus, string> = {
  done: 'bg-green-800',
  failed: 'bg-red-700',
  skipped: 'bg-slate-300',
  waiting: 'border-2 border-slate-400 bg-white',
}

function hasErrorKey(output: unknown): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    ('error' in output || 'rejected' in output)
  )
}

function stepFor(trace: TraceStep[], tool: TraceStep['tool']) {
  let entry: TraceStep | undefined
  for (const t of trace) if (t.tool === tool) entry = t
  let status: StepStatus
  if (trace.length === 0) status = 'waiting'
  else if (!entry) status = 'skipped'
  else status = hasErrorKey(entry.output) ? 'failed' : 'done'
  return { entry, status }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const month = MONTHS[Number(m) - 1]
  if (!y || !month || !d || Number.isNaN(Number(d))) return iso
  return `${Number(d)} ${month} ${y}`
}

const HIGHLIGHT =
  'bg-white data-[changed=true]:border-l-4 data-[changed=true]:border-green-800 data-[changed=true]:pl-3'

function UpdatedTag() {
  return (
    <span className="shrink-0 rounded-md bg-green-800 px-2 py-0.5 text-sm font-medium text-white">
      Updated
    </span>
  )
}

function actorStyle(actor: string): string {
  if (actor.startsWith('The assistant')) return 'bg-green-800 text-white'
  if (actor.includes('backup')) return 'bg-amber-200 text-amber-950'
  return 'bg-slate-800 text-white'
}

const textBtn =
  'min-h-11 px-2 text-base font-medium text-slate-900 underline underline-offset-4 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50'

const primaryBtn =
  'min-h-11 rounded-md bg-green-800 px-5 text-base font-medium text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50'
const quietBtn =
  'min-h-11 rounded-md border border-slate-400 bg-white px-5 text-base font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export function Board(props: BoardProps) {
  const { state, pending, notice, copied, onGenerate, onRetry, onReset, onAdd, onCopy } = props
  const report = state.report
  const changed = (...keys: string[]) =>
    keys.some((k) => state.last_changed.includes(k)) ? 'true' : undefined
  const busy = pending || state.running
  const rows = mostReported(state)
  const maxCount = Math.max(1, ...rows.map((r) => r.count))
  const hasSeed = state.complaints.some((c) => c.channel === 'seed')
  let newestId: string | null = null
  if (state.last_changed.includes('count')) {
    for (const c of state.complaints) if (c.tag === 'in_report') newestId = c.id
  }

  function generateBtn(cls: string) {
    return (
      <button
        type="button"
        data-testid="generate"
        className={cls}
        disabled={busy}
        aria-busy={busy}
        onClick={onGenerate}
      >
        Generate report
      </button>
    )
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const text = String(data.get('text') ?? '')
    const file = data.get('media')
    const hasMedia = file instanceof File && file.size > 0
    onAdd(text, hasMedia)
    form.reset()
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <h1 className="text-xl font-semibold max-[639px]:flex-1">Reportlah</h1>
          <p className="text-base text-slate-700 max-[639px]:order-last max-[639px]:w-full min-[640px]:flex-1">
            Many complaints about one problem become one report.
          </p>
          <button type="button" data-testid="reset" className={quietBtn} onClick={onReset}>
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 gap-8 px-4 py-6 min-[960px]:grid-cols-[40fr_60fr] min-[960px]:items-start">
        <section data-testid="complaints" aria-labelledby="complaints-h" className="flex flex-col gap-4">
          <h2 id="complaints-h" className="text-xl font-semibold">
            Complaints
          </h2>
          {hasSeed && (
            <p className="text-base text-slate-700">Complaints marked Sample are sample data we wrote.</p>
          )}
          <ul className="flex flex-col divide-y divide-slate-200 rounded-md bg-white">
            {state.complaints.map((c) => (
              <li
                key={c.id}
                data-testid="complaint"
                data-tag={c.tag}
                data-channel={c.channel}
                className={`p-3 ${c.id === newestId ? 'border-l-4 border-green-800' : ''}`}
              >
                <p className="break-words text-lg text-slate-900">{c.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-base text-slate-700">
                  {c.id === newestId && (
                    <span className="rounded-md bg-green-800 px-2 py-0.5 text-base font-medium text-white">
                      New
                    </span>
                  )}
                  {c.tag === 'in_report' ? (
                    <span className={`inline-flex items-center gap-2 text-base ${TAG_STYLE[c.tag]}`}>
                      <span aria-hidden="true" className="size-2.5 rounded-full bg-green-800" />
                      {TAG_TEXT[c.tag]}
                    </span>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-base font-medium ${TAG_STYLE[c.tag]}`}>
                      {TAG_TEXT[c.tag]}
                    </span>
                  )}
                  <span>{CHANNEL_TEXT[c.channel]}</span>
                  <span>{formatDate(c.date)}</span>
                  {c.has_photo && <span>Photo or video</span>}
                </div>
              </li>
            ))}
          </ul>

          {notice !== null && (
            <div data-testid="notice" role="status">
              <p className="break-words rounded-md border border-slate-300 bg-white px-4 py-3 text-base">
                {notice}
              </p>
            </div>
          )}

          <form
            data-testid="add-form"
            onSubmit={submit}
            className="flex flex-col gap-2 rounded-md bg-slate-50 p-3"
          >
            <label htmlFor="complaint-text" className="text-base font-medium">
              Add a complaint
            </label>
            <textarea
              id="complaint-text"
              name="text"
              rows={2}
              className="w-full rounded-md border border-slate-400 bg-white p-3 text-base"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="complaint-media" className="text-base">
                Photo or video (optional)
              </label>
              <input
                id="complaint-media"
                type="file"
                name="media"
                accept="image/*,video/*"
                data-testid="media-input"
                className="min-h-11 w-full rounded-md border border-slate-400 bg-white text-base file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-4 file:text-base file:font-medium file:text-slate-900"
              />
              <p className="text-base text-slate-700">
                Reportlah only notes that one is attached. It does not read or keep the file.
              </p>
            </div>
            <button type="submit" className={quietBtn}>
              Add complaint
            </button>
          </form>
        </section>

        <section
          data-testid="report"
          aria-labelledby="report-h"
          className="flex flex-col gap-5 max-[959px]:order-first min-[960px]:sticky min-[960px]:top-4"
        >
          <h2 id="report-h" className="sr-only">
            Report
          </h2>

          {state.last_error !== null && (
            <div
              data-testid="model-error"
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900"
            >
              <p className="flex-1">
                The assistant cannot be reached right now.
                {report ? ' The report below is the last good one.' : ''}
              </p>
              <button type="button" data-testid="retry" className={quietBtn} onClick={onRetry}>
                Retry
              </button>
            </div>
          )}

          {report === null ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-slate-300 bg-white p-6">
              <p className="text-lg text-slate-700">No report yet</p>
              <p className="text-base text-slate-700">
                {`Press Generate report to group the ${state.complaints.length} complaints on the left.`}
              </p>
              {generateBtn(primaryBtn)}
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-md border-2 border-slate-900 bg-white p-7 shadow-lg">
              <p data-testid="report-place" className="text-lg font-semibold">
                {report.place}
              </p>
              <div className="flex flex-col gap-1">
                <p data-testid="report-count" data-changed={changed('count')} className="group flex items-baseline gap-3 self-start text-slate-950">
                  <span className="rounded-md px-3 py-2 text-9xl font-bold leading-none group-data-[changed=true]:bg-green-800 group-data-[changed=true]:text-white">{report.count}</span>{' '}
                  <span className="text-3xl font-semibold">
                    {report.count === 1 ? 'complaint' : 'complaints'}
                  </span>
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <p
                    data-testid="report-period"
                    data-changed={changed('first_date', 'latest_date')}
                    className={`text-xl text-slate-800 ${HIGHLIGHT}`}
                  >
                    {report.period}
                  </p>
                  {changed('first_date', 'latest_date') && <UpdatedTag />}
                </div>
              </div>
              <p data-testid="recipient" className="text-base text-slate-900">
                {'Addressed to ' + report.recipient.label}
                {!report.recipient.confirmed && (
                  <>
                    {' '}
                    <span className="whitespace-nowrap rounded-full bg-amber-200 px-2.5 py-0.5 text-base font-medium text-amber-950">
                      not confirmed
                    </span>
                  </>
                )}
              </p>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">Still missing</h3>
                  {changed('gaps') && <UpdatedTag />}
                </div>
                <ul
                  data-testid="missing"
                  data-changed={changed('gaps')}
                  className={`mt-1 flex flex-col gap-1 ${HIGHLIGHT}`}
                >
                  {report.gap_labels.length === 0 ? (
                    <li className="text-base text-slate-700">Nothing missing</li>
                  ) : (
                    report.gap_labels.map((g) => (
                      <li key={g} className="rounded-md border border-amber-600 bg-amber-200 px-3 py-1.5 text-base font-medium text-amber-950">
                        {g}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base text-slate-700">Message to copy</p>
                  {changed('message') && <UpdatedTag />}
                </div>
                <p
                  data-testid="report-message"
                  data-changed={changed('message')}
                  className="whitespace-pre-wrap break-words rounded-md border-slate-100 bg-white p-4 text-lg leading-relaxed text-slate-900 data-[changed=true]:border-l-4 data-[changed=true]:border-green-800"
                >
                  {report.message}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="copy-message"
                  className={primaryBtn}
                  onClick={onCopy}
                >
                  {copied ? 'Copied' : 'Copy message'}
                </button>
                {generateBtn(textBtn)}
              </div>
            </div>
          )}

          <div data-testid="steps">
            <h3 className="text-lg font-semibold">Steps</h3>
            <p className="mt-1 text-base text-slate-700">
              Green steps are done by the assistant. Dark steps are done by the app, which owns the numbers.
            </p>
            <ol className="mt-2 flex flex-col gap-2">
              {STEPS.map((s) => {
                const { entry, status } = stepFor(state.last_trace, s.tool)
                let actor = s.actor
                if (entry?.by === 'fallback') {
                  if (s.tool === 'draft_report') actor = 'The app (backup wording)'
                  else if (s.tool === 'cluster') actor = 'The assistant (place name from the app)'
                }
                return (
                  <li
                    key={s.tool}
                    data-testid="step"
                    data-status={status}
                    className="flex min-h-11 items-center gap-3 text-lg"
                  >
                    <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOT[status]}`} />
                    <span className="flex-1">
                      {s.label}
                      <span className="text-slate-700">{' · '}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-base font-medium ${actorStyle(actor)}`}>
                        {actor}
                      </span>
                      {entry && entry.attempt >= 2 && (
                        <span className="text-slate-700">{' · second try'}</span>
                      )}
                    </span>
                    <span className="text-base text-slate-700">
                      {status === 'done' && entry
                        ? entry.ms === 0
                          ? 'under 1 ms'
                          : `${entry.ms} ms`
                        : status === 'waiting'
                          ? 'not run yet'
                          : status}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>

          <p className="text-base text-slate-700">
            Copy the message and send it yourself. Reportlah does not send it to anyone and promises no action.
          </p>
        </section>
      </main>

      <section
        data-testid="ranking"
        aria-labelledby="ranking-h"
        className="mx-auto w-full max-w-[1280px] px-4 pb-8"
      >
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
          <h2 id="ranking-h" className="text-xl font-semibold">
            Most reported
          </h2>
          <p className="text-base text-slate-700">Counted by the app from the complaints above.</p>
          {rows.length === 0 ? (
            <p className="text-base text-slate-700">Nothing ranked yet</p>
          ) : (
            <ol className="flex flex-col divide-y divide-slate-200">
              {rows.map((row) => (
                <li
                  key={`${row.rank}-${row.label}`}
                  data-testid="rank-row"
                  data-kind={row.kind}
                  className={`flex items-start gap-3 py-2 text-base ${row.kind === 'report' ? 'font-medium' : ''}`}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-base ${row.kind === 'report' ? 'bg-green-800 text-white' : 'bg-slate-100 text-slate-800'}`}
                  >
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words">{row.label}</span>
                    <span className="mt-1 block h-1.5 rounded-full bg-slate-100">
                      <span
                        className={`block h-1.5 rounded-full ${row.kind === 'report' ? 'bg-green-700' : 'bg-slate-400'}`}
                        style={{ width: `${Math.max(4, (row.count / maxCount) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span data-testid="rank-count" className="shrink-0 text-right">
                    {row.count === 1 ? '1 complaint' : `${row.count} complaints`}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
