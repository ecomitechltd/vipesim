import { Navbar } from '@/components/shared/Navbar'
import { Footer } from '@/components/shared/Footer'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function CountryLoading() {
  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen bg-gray-50">
        {/* Hero Skeleton */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
          <div className="container mx-auto px-6 py-12 relative z-10">
            <Skeleton className="w-40 h-6 bg-white/20 mb-6" />
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-16 rounded-lg bg-white/30" />
              <div>
                <Skeleton className="w-64 h-12 bg-white/30 mb-2" />
                <Skeleton className="w-48 h-6 bg-white/20" />
              </div>
            </div>
          </div>
        </section>

        {/* Plans Grid Skeleton */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            <Skeleton className="w-48 h-8 mb-6" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                >
                  <div className="text-center">
                    <Skeleton className="w-20 h-10 mx-auto mb-2" />
                    <Skeleton className="w-24 h-4 mx-auto mb-2" />
                    <Skeleton className="w-16 h-3 mx-auto mb-4" />
                    <Skeleton className="w-24 h-10 mx-auto mb-4" />
                    <Skeleton className="w-full h-12 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Skeleton */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-6">
            <Skeleton className="w-40 h-8 mb-6" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="w-28 h-5 mb-2" />
                    <Skeleton className="w-32 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Install Skeleton */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-6">
            <Skeleton className="w-40 h-8 mb-8" />
            <div className="max-w-2xl space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="w-48 h-6 mb-2" />
                    <Skeleton className="w-full h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other Destinations Skeleton */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-6">
            <Skeleton className="w-64 h-8 mb-6" />
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 bg-white rounded-xl p-4 border border-gray-100 min-w-[160px]"
                >
                  <Skeleton className="w-12 h-8 mb-2" />
                  <Skeleton className="w-24 h-5 mb-1" />
                  <Skeleton className="w-16 h-4" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
