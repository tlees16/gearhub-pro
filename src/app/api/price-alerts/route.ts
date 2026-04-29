import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://lzkdewuwrshiqjjndszx.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  let body: { email?: string; productId?: string; productName?: string; targetPrice?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, productId, productName, targetPrice } = body
  if (!email || !productId) {
    return NextResponse.json({ error: 'email and productId are required' }, { status: 422 })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    })

    const { error } = await supabase.from('price_alerts').upsert(
      {
        email,
        product_id: productId,
        product_name: productName,
        target_price: targetPrice,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'email,product_id' },
    )

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[price-alerts]', err)
    return NextResponse.json(
      { error: 'Failed to save alert' },
      { status: 500 },
    )
  }
}
