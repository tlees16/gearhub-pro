import { Suspense } from 'react'
import { Loader } from 'lucide-react'
import ProductPage, { generateProductMetadata } from '@/components/ProductPage'

// Next.js 15: params is a Promise
type Props = { params: Promise<{ productId: string }> }

export async function generateMetadata({ params }: Props) {
  const { productId } = await params
  return generateProductMetadata(productId)
}

export default async function Page({ params }: Props) {
  const { productId } = await params
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-zinc-950">
          <Loader className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      }
    >
      <ProductPage productId={productId} />
    </Suspense>
  )
}
