import type { Metadata } from 'next'
import RentYourGear from '@/components/RentYourGear'

export const metadata: Metadata = {
  title: 'List Your Rental Gear',
  description: 'List your professional cinema gear for rent on GearHub Pro and reach production companies worldwide.',
}

export default function Page() {
  return <RentYourGear />
}
