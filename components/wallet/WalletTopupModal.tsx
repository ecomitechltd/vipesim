'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, CreditCard, ArrowRight, WarningCircle, Sparkle } from '@phosphor-icons/react'

interface WalletTopupModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number // In cents
  minimumRequired?: number // In cents, for checkout flow
  onTopupInitiated?: () => void
}

const TOPUP_BUNDLES = [
  { amount: 5, label: '$5', popular: false },
  { amount: 10, label: '$10', popular: false },
  { amount: 25, label: '$25', popular: true },
  { amount: 50, label: '$50', popular: false },
  { amount: 100, label: '$100', popular: false },
  { amount: 200, label: '$200', popular: false },
]

export function WalletTopupModal({
  isOpen,
  onClose,
  currentBalance,
  minimumRequired,
  onTopupInitiated,
}: WalletTopupModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(25)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [useCustom, setUseCustom] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shortfall = minimumRequired ? Math.max(0, minimumRequired - currentBalance) : 0
  const suggestedAmount = shortfall > 0 ? Math.ceil(shortfall / 100) : 25

  // Get the actual amount to charge
  const getTopupAmount = () => {
    if (useCustom) {
      const parsed = parseFloat(customAmount)
      return isNaN(parsed) ? 0 : parsed
    }
    return selectedAmount
  }

  const handleTopup = async () => {
    const amount = getTopupAmount()

    if (amount < 1 || amount > 2000) {
      setError('Amount must be between $1 and $2,000')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate top-up')
      }

      // Notify parent that topup was initiated
      onTopupInitiated?.()

      // Redirect to payment page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    setSelectedAmount(value)
    setUseCustom(false)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    setCustomAmount(value)
    setUseCustom(true)
  }

  const handleBundleSelect = (amount: number) => {
    setSelectedAmount(amount)
    setUseCustom(false)
    setCustomAmount('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet weight="duotone" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add Funds</h2>
                <p className="text-white text-sm opacity-90">Top up your wallet</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">${(currentBalance / 100).toFixed(2)}</span>
              <span className="text-white opacity-90">current balance</span>
            </div>

            {shortfall > 0 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                <WarningCircle weight="fill" className="w-4 h-4 text-yellow-300" />
                <span className="text-sm text-white">
                  You need at least <strong>${(shortfall / 100).toFixed(2)}</strong> more for this purchase
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <WarningCircle weight="fill" className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Quick Amount Bundles */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TOPUP_BUNDLES.map((bundle) => (
                  <button
                    key={bundle.amount}
                    onClick={() => handleBundleSelect(bundle.amount)}
                    className={`relative px-4 py-3 rounded-xl text-center font-semibold transition-all ${
                      selectedAmount === bundle.amount && !useCustom
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {bundle.popular && (
                      <span className="absolute -top-2 -right-2">
                        <Sparkle weight="fill" className="w-4 h-4 text-yellow-500" />
                      </span>
                    )}
                    {bundle.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider for Custom Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Or choose custom amount: <span className="text-indigo-600 font-bold">${useCustom ? (parseFloat(customAmount) || 0).toFixed(0) : selectedAmount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={useCustom ? (parseFloat(customAmount) || 25) : selectedAmount}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$1</span>
                <span>$500</span>
              </div>
            </div>

            {/* Custom Input for Higher Amounts */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Need more? Enter exact amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter amount (1-2000)"
                  className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 transition-colors ${
                    useCustom ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                  } focus:outline-none focus:border-indigo-500`}
                />
              </div>
            </div>

            {/* Payment Notice */}
            <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-start gap-3">
                <CreditCard weight="duotone" className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-indigo-900 mb-1">Secure Payment</p>
                  <p className="text-indigo-700">
                    You&apos;ll be redirected to our secure payment page. After successful payment, funds will be instantly added to your wallet.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleTopup}
              disabled={isLoading || getTopupAmount() < 1}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Add ${getTopupAmount().toFixed(2)} to Wallet
                  <ArrowRight weight="bold" className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
