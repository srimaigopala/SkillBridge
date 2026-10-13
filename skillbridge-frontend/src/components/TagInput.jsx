import { X } from 'lucide-react'
import { useState } from 'react'

// Chip editor: type and press Enter or comma to add; click × to remove.
export default function TagInput({ values = [], onChange, placeholder, tone = 'blue', max = 50 }) {
  const [draft, setDraft] = useState('')
  const chip = tone === 'violet' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'

  function add(raw) {
    const additions = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (additions.length === 0) return
    const existing = new Set(values.map((value) => value.toLowerCase()))
    const next = [...values]
    for (const value of additions) {
      if (!existing.has(value.toLowerCase()) && next.length < max) {
        next.push(value)
        existing.add(value.toLowerCase())
      }
    }
    onChange(next)
    setDraft('')
  }

  return (
    <div className="mt-2 flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
      {values.map((value) => (
        <span key={value} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${chip}`}>
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded p-0.5 hover:bg-white/70"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => {
          const value = event.target.value
          if (value.includes(',')) add(value)
          else setDraft(value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            add(draft)
          } else if (event.key === 'Backspace' && !draft && values.length > 0) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={() => add(draft)}
        placeholder={values.length === 0 ? placeholder : 'Add more...'}
        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm font-normal outline-none"
      />
    </div>
  )
}
