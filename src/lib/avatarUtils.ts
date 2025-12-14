/**
 * 根据用户名生成默认头像 URL
 * 使用 UI Avatars API - 无需自托管，支持全球 CDN
 * @param name 用户名
 * @param size 头像尺寸（默认 64px）
 */
export const getDefaultAvatar = (name?: string, size = 64): string => {
  const displayName = name?.trim() || '用户'
  // 根据用户名生成固定的背景色（同一用户名始终相同颜色）
  const hash = displayName
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360
  // 使用 HSL 转 HEX，保持饱和度和亮度固定
  const bgColor = hslToHex(hue, 65, 55)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${bgColor}&color=fff&size=${size}&font-size=0.4&bold=true`
}

/** HSL 转 HEX 颜色 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `${f(0)}${f(8)}${f(4)}`
}

/**
 * 纯色占位符样式类名
 * 当无法发起网络请求时，用 CSS 渲染占位符
 */
export const AVATAR_PLACEHOLDER_CLASS =
  'bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium'
