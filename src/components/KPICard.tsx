import { ReactNode } from 'react'

interface KPICardProps {
  icon: ReactNode
  label: string
  value: string | number
  change?: string
  changeColor?: string
}

export function KPICard({ icon, label, value, change, changeColor = '#34C759' }: KPICardProps) {
  return (
    <div className="apple-card p-6">
      <div className="flex items-center gap-3 text-secondary mb-2">
        {icon} {label}
      </div>
      <div className="text-4xl font-semibold tracking-tighter">{value}</div>
      {change && (
        <div className="text-sm mt-1" style={{ color: changeColor }}>
          {change}
        </div>
      )}
    </div>
  )
}
