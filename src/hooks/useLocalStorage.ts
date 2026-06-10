import { useState } from 'react'

type StoredValue<T> = T | ((value: T) => T)

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: StoredValue<T>) => {
    setStoredValue((current) => {
      const valueToStore = value instanceof Function ? value(current) : value
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
      return valueToStore
    })
  }

  return [storedValue, setValue] as const
}
