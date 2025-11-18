export const IMAGE_RATIO = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  SQUARE: 'square',
  NONE: 'none',
} as const

export type ImageRatioType = (typeof IMAGE_RATIO)[keyof typeof IMAGE_RATIO]
