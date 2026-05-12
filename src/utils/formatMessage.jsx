import ReactMarkdown from 'react-markdown'

export function FormattedMessage({ content }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="mt-6 mb-3 font-heading text-3xl text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-6 mb-3 font-heading text-2xl text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-5 mb-2 font-heading text-xl text-white">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-7 text-body">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 text-body">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-body">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        code: ({ children }) => (
          <code className="rounded border border-line bg-black/40 px-1.5 py-0.5 text-sm text-accent">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
