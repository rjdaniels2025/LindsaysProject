import { FormattedMessage } from '../utils/formatMessage.jsx'
import ProgramDashboard from './ProgramDashboard.jsx'

export default function MessageBubble({ message, profile }) {
  const isAssistant = message.role === 'assistant'

  if (message.meta?.type === 'program') {
    return <ProgramDashboard message={message} profile={profile} />
  }

  if (isAssistant) {
    return (
      <article className="mr-auto max-w-4xl rounded-lg border border-line bg-card p-4 shadow-2xl shadow-black/30 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded bg-accent font-heading text-xl text-black">A</div>
          <span className="font-heading text-sm uppercase text-accent">Sports Scientist</span>
        </div>
        <div className="max-w-none">
          <FormattedMessage content={message.content} />
        </div>
      </article>
    )
  }

  return (
    <article className="ml-auto max-w-2xl rounded-lg border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-white">
      <p className="whitespace-pre-wrap leading-7">{message.content}</p>
    </article>
  )
}
