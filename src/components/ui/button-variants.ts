import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground ',
        redButton: 'bg-red-500 text-white',
        outline: 'border bg-background shadow-xs',
        secondary: 'bg-secondary text-secondary-foreground',
        link: 'text-primary underline-offset-4',
        ghost: '',
      },
      size: {
        default: 'h-7 px-4 py-4 has-[>svg]:px-3 rounded-full',
        sm: 'h-6 px-3 py-3.5 has-[>svg]:px-2 rounded-full',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
