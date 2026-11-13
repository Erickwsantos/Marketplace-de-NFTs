import { createFileRoute } from '@tanstack/react-router'
import { ProfileLayout } from '@/features/account/profile-layout'

export const Route = createFileRoute('/_auth/profile')({
  component: ProfileLayout,
})
