// app/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function RootPage() {
  const session = await getSession()

  if (!session) redirect('/login')

  if (session.role === 'admin' || session.role === 'superadmin') {
    redirect('/admin/dashboard')
  } else if (session.role === 'ga_staff') {
    redirect('/ga/dashboard')
  } else {
    redirect('/evaluate')
  }
}