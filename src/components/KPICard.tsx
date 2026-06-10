import type { ReactNode } from 'react'

interface KPICardProps {
  icon: ReactNode
  label: string
  value: string | number
  helper?: string
  tone?: 'blue' | 'teal' | 'amber' | 'rose' | 'neutral'
}

export function KPICard({ icon, label, value, helper, tone = 'neutral' }: KPICardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <span className="kpi-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="kpi-card__value">{value}</div>
      {helper && <div className="kpi-card__helper">{helper}</div>}
    </article>
  )
}
