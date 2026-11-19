import { renderToStaticMarkup } from 'react-dom/server'
import { Board, type BoardProps } from '@/app/ui/Board'
import type { StateView } from '@/lib/types'

const noop = () => {}

export function renderBoard(state: StateView, extra: Partial<BoardProps> = {}): string {
  return renderToStaticMarkup(
    <Board
      state={state}
      pending={false}
      notice={null}
      copied={false}
      onGenerate={noop}
      onRetry={noop}
      onReset={noop}
      onAdd={noop}
      onCopy={noop}
      {...extra}
    />,
  )
}
