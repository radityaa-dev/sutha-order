'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction, type LoginState } from '../../app/(auth)/login/actions'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const initialState: LoginState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="h-11 w-full rounded-[var(--radius-sm)] text-[15px] font-semibold"
      disabled={pending}
    >
      {pending ? 'Memeriksa...' : 'Masuk'}
    </Button>
  )
}

export function LoginForm({ initialError }: { initialError?: string } = {}) {
  // Server Action: redirect dilakukan di server → cookie sesi tertulis di respons yang sama.
  const [state, formAction] = useActionState(loginAction, initialState)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  useEffect(() => {
    if (initialError) toast.error(initialError)
  }, [initialError])

  return (
    <div className="w-full">
      <h1 className="type-display text-[26px] leading-tight text-[#3A1D0D]">Masuk</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-600">
        Gunakan email dan password yang diberikan pengelola.
      </p>

      <Form {...form}>
        <form action={formAction} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-[#3A1D0D]">Email</FormLabel>
                <FormControl>
                  {/* name="email" dipakai oleh FormData server action */}
                  <Input
                    placeholder="nama@contoh.com"
                    type="email"
                    autoComplete="email"
                    className="h-11 rounded-[var(--radius-sm)] border-[#EAE3D9] text-[15px] placeholder:text-neutral-400"
                    {...field}
                    name="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-[#3A1D0D]">Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    className="h-11 rounded-[var(--radius-sm)] border-[#EAE3D9] text-[15px] placeholder:text-neutral-400"
                    {...field}
                    name="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SubmitButton />
        </form>
      </Form>

      <p className="mt-6 border-t border-[#EAE3D9] pt-4 text-[12px] leading-relaxed text-neutral-500">
        Lupa password atau akun belum aktif? Hubungi pengelola Sutha Corner.
      </p>
    </div>
  )
}