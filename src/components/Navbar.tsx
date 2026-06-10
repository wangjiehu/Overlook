import { BarChart3, CalendarDays, Database, Download, FileJson, FileText, Gauge, Radar, RefreshCw, Upload, UserRound } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { ViewKey } from '../types'

interface NavbarProps {
  activeView: ViewKey
  setActiveView: Dispatch<SetStateAction<ViewKey>>
  onImportClick: () => void
  onExportCsv: () => void
  onExportJson: () => void
  onExportReport: () => void
  onResetWorkspace: () => void
  onInstall?: () => void
  showInstall: boolean
}

const tabs: Array<{ key: ViewKey; label: string; icon: typeof Gauge }> = [
  { key: 'overview', label: '总览', icon: Gauge },
  { key: 'content', label: '内容库', icon: Database },
  { key: 'planner', label: '计划', icon: CalendarDays },
  { key: 'benchmarks', label: '对标', icon: Radar },
  { key: 'accounts', label: '账号', icon: UserRound },
]

export function Navbar({
  activeView,
  setActiveView,
  onImportClick,
  onExportCsv,
  onExportJson,
  onExportReport,
  onResetWorkspace,
  onInstall,
  showInstall,
}: NavbarProps) {
  return (
    <header className="app-nav">
      <div className="app-nav__inner">
        <button className="brand-button" onClick={() => setActiveView('overview')} aria-label="回到总览">
          <span className="brand-mark">
            <BarChart3 size={18} />
          </span>
          <span>
            <strong>Overlook</strong>
            <small>Creator Ops</small>
          </span>
        </button>

        <nav className="tab-strip" aria-label="主视图">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeView === tab.key
            return (
              <button
                key={tab.key}
                data-view={tab.key}
                className={active ? 'tab-button tab-button--active' : 'tab-button'}
                onClick={() => setActiveView(tab.key)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="nav-actions" aria-label="工作区命令">
          <div className="command-group">
            <span>数据</span>
            <button className="action-button" onClick={onImportClick} title="导入 CSV" aria-label="导入 CSV">
              <Upload size={16} />
              <span>导入 CSV</span>
            </button>
            <button className="action-button action-button--ghost" onClick={onExportCsv}>
              <Download size={16} />
              <span>导出 CSV</span>
            </button>
          </div>

          <div className="command-group">
            <span>输出</span>
            <button className="action-button action-button--ghost" onClick={onExportJson}>
              <FileJson size={16} />
              <span>JSON</span>
            </button>
            <button className="action-button action-button--ghost" onClick={onExportReport}>
              <FileText size={16} />
              <span>PDF 报告</span>
            </button>
          </div>

          <div className="command-group command-group--quiet">
            <button className="action-button action-button--danger" onClick={onResetWorkspace}>
              <RefreshCw size={16} />
              <span>恢复示例</span>
            </button>
            {showInstall && onInstall && (
              <button className="action-button action-button--install" onClick={onInstall}>
                安装
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
