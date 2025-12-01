import type { ComponentProps } from 'react'
import { ToastProvider } from './toast'

type ToasterProps = ComponentProps<typeof ToastProvider>

const Toaster = (props: ToasterProps) => {
  return <ToastProvider {...props} />
}

export { Toaster }
