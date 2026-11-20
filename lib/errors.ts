import { toast } from 'sonner'

export interface AppError {
  message: string
  code?: string
  details?: any
}

export function handleError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
    }
  }
  return { message: 'Terjadi kesalahan yang tidak diketahui' }
}

export function showErrorToast(error: unknown) {
  const appError = handleError(error)
  toast.error(appError.message)
}