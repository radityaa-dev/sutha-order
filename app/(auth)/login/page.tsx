import { LoginForm } from '../../../components/admin/login-form'

const ERROR_MESSAGES: Record<string, string> = {
  profile_not_found: 'Profil pengguna tidak ditemukan. Hubungi administrator.',
  inactive: 'Akun tidak aktif. Hubungi administrator.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = error ? ERROR_MESSAGES[error] : undefined

  return <LoginForm initialError={message} />
}