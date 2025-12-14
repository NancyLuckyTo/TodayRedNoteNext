import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
})

export const registerSchema = z
  .object({
    username: z.string().min(1, '请输入账号'),
    password: z.string().min(8, '密码至少 8 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
