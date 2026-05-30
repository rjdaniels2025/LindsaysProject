import { useState } from 'react'
import { Lock, ArrowLeft } from 'lucide-react'

const ADMIN_PASSCODE = 'ILoveJesus123!!'

export default function AdminPasscode({ onUnlock, onBack }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (value === ADMIN_PASSCODE) {
      onUnlock()
    } else {
      setError('Incorrect passcode.')
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-body">
      <form
        onSubmit={submit}
        className={`w-full max-w-sm rounded-lg border border-line bg-card p-6 shadow-2xl shadow-black/50 transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}
      >
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-accent/10 text-accent">
          <Lock size={22} />
        </div>
        <p className="font-heading text-lg uppercase text-accent">Elevate Health &amp; Fitness</p>
        <h1 className="mt-1 font-heading text-4xl uppercase leading-none text-white">Coach Admin</h1>
        <p className="mt-3 text-sm leading-6 text-body">Enter your passcode to access the coach dashboard.</p>

        <label className="mt-6 block">
          <span className="mb-2 block font-heading text-lg uppercase text-white">Passcode</span>
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            autoFocus
            autoComplete="off"
            placeholder="••••••••••••"
            className="w-full rounded-lg border border-line bg-[#111] px-4 py-3 text-white outline-none transition placeholder:text-[#444] focus:border-accent"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          className="mt-5 min-h-12 w-full rounded-lg bg-accent px-5 font-heading text-xl uppercase text-black transition hover:bg-white"
        >
          Unlock
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 font-heading text-lg uppercase text-body transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </main>
  )
}
