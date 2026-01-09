'use client'

import { useState, useEffect } from 'react'
import { Wallet, Plus } from '@phosphor-icons/react'
import { WalletTopupModal } from './WalletTopupModal'

interface WalletBalanceProps {
  className?: string
  showTopupButton?: boolean
  onBalanceChange?: (balance: number) => void
}

export function WalletBalance({ className = '', showTopupButton = true, onBalanceChange }: WalletBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false)

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.balance)
        onBalanceChange?.(data.balance)
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  // Refetch after topup
  const handleTopupInitiated = () => {
    // Balance will be updated when user returns from payment
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
        <div className="w-16 h-5 rounded bg-gray-200 animate-pulse" />
      </div>
    )
  }

  if (balance === null) return null

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setIsTopupModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors group"
        >
          <Wallet weight="duotone" className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-indigo-900">${(balance / 100).toFixed(2)}</span>
          {showTopupButton && (
            <Plus weight="bold" className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
          )}
        </button>
      </div>

      <WalletTopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        currentBalance={balance}
        onTopupInitiated={handleTopupInitiated}
      />
    </>
  )
}
