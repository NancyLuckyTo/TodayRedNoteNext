export const encodeCursor = (payload: any): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64')

/**
 * 解码游标
 */
export const decodeFeedCursor = (cursor?: string): any | null => {
  if (!cursor) return null
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8')
    const parsed = JSON.parse(json)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as any).phase === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
