import { BarChart3, User, Download, Upload, Sun, Moon, HelpCircle, Smartphone } from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

interface NavbarProps {
  activeTab: string
  setActiveTab: Dispatch<SetStateAction<'dashboard' | 'platforms' | 'insights' | 'accounts'>>
  onExport: () => void
  onImportClick: () => void
  onDownloadSample: () => void
  onClearImported: () => void
  hasImported: boolean
  onThemeToggle: () => void
  onShowOnboarding?: () => void
  // PWA install affordance (only shown when beforeinstallprompt available; Apple-like clean button)
  showInstall?: boolean
  onInstall?: () => void
}

export function Navbar({ activeTab, setActiveTab, onExport, onImportClick, onDownloadSample, onClearImported, hasImported, onThemeToggle, onShowOnboarding, showInstall, onInstall }: NavbarProps) {
  const tabs = [
    { key: 'dashboard' as const, label: '概览' },
    { key: 'platforms' as const, label: '平台' },
    { key: 'insights' as const, label: '洞察' },
    { key: 'accounts' as const, label: '账号' },
  ]

  // Determine theme icon (Sun for dark mode to switch to light, Moon for light)
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <nav className="apple-nav" aria-label="主导航">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between min-h-14 h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-xl tracking-tight">Overlook</div>
            <div className="text-[10px] text-secondary -mt-1">Creator Insights</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm overflow-x-auto pb-0.5 -mb-0.5 sm:overflow-visible" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`apple-btn px-3.5 py-1 text-sm rounded-full transition-all ${
                activeTab === tab.key 
                  ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-sm' 
                  : 'hover:bg-[#E8E8ED] dark:hover:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto max-w-[60%] sm:max-w-none -mr-1 sm:mr-0 pb-0.5">
          <button onClick={onExport} className="apple-btn apple-btn-secondary text-sm hidden sm:inline-flex" aria-label="导出报告">
            <Download className="w-4 h-4" /> 导出报告
          </button>
          <button onClick={onImportClick} className="apple-btn apple-btn-secondary text-sm hidden md:inline-flex" aria-label="导入CSV数据">
            <Upload className="w-4 h-4" /> 导入CSV
          </button>
          <button onClick={onDownloadSample} className="apple-btn apple-btn-ghost text-xs sm:text-sm px-2 sm:px-3" aria-label="下载示例CSV">
            示例CSV
          </button>
          {hasImported && (
            <button onClick={onClearImported} className="apple-btn apple-btn-ghost text-xs sm:text-sm text-[#FF3B30]" aria-label="清除导入的数据">
              清除
            </button>
          )}
          {onShowOnboarding && (
            <button 
              onClick={onShowOnboarding} 
              className="apple-btn apple-btn-ghost p-1.5 sm:p-2"
              aria-label="新手引导"
              title="新手引导 / 重新打开教程"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
          {/* PWA Install button - only when beforeinstallprompt captured; clean Apple HIG style */}
          {showInstall && onInstall && (
            <button 
              onClick={onInstall} 
              className="apple-btn apple-btn-primary text-sm hidden sm:inline-flex items-center gap-1.5"
              aria-label="安装 Overlook 到桌面或主屏幕"
              title="安装到桌面/主屏（PWA）— 支持 iOS/Android 添加到主屏，离线可用"
            >
              <Smartphone className="w-4 h-4" /> 安装到桌面/主屏
            </button>
          )}
          <button 
            onClick={onThemeToggle} 
            className="apple-btn apple-btn-secondary p-1.5 sm:p-2"
            aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            title={isDarkMode ? '切换到浅色模式 (Apple HIG)' : '切换到深色模式 (Apple HIG)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#E8E8ED] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>
    </nav>
  )
}
