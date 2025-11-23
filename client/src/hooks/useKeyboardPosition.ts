import { useEffect, useState, useRef } from 'react'

interface KeyboardPosition {
  isKeyboardVisible: boolean // 是否弹出了键盘
  keyboardHeight: number // 键盘当前高度
}

const KEYBOARD_HEIGHT_THRESHOLD = 150 // 如果高度差超过 150px，则认为键盘弹出了
/**
 * 监听移动端键盘弹出/收起，返回键盘状态和高度
 * 使用 visualViewport API 检测键盘
 */
export const useKeyboardPosition = (): KeyboardPosition => {
  const [keyboardState, setKeyboardState] = useState<KeyboardPosition>({
    isKeyboardVisible: false,
    keyboardHeight: 0,
  })

  const windowHeightRef = useRef(window.innerHeight)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // 记录初始窗口高度
    windowHeightRef.current = window.innerHeight

    const handleResize = () => {
      const currentWindowHeight = window.innerHeight
      const heightDiff = windowHeightRef.current - currentWindowHeight

      if (heightDiff > KEYBOARD_HEIGHT_THRESHOLD) {
        setKeyboardState({
          isKeyboardVisible: true,
          keyboardHeight: heightDiff,
        })
      } else {
        setKeyboardState({
          isKeyboardVisible: false,
          keyboardHeight: 0,
        })
      }
    }

    // 使用 visualViewport API（如果可用）
    if (window.visualViewport) {
      const viewport = window.visualViewport
      const handleViewportResize = () => {
        const currentHeight = viewport.height
        const heightDiff = windowHeightRef.current - currentHeight

        if (heightDiff > KEYBOARD_HEIGHT_THRESHOLD) {
          setKeyboardState({
            isKeyboardVisible: true,
            keyboardHeight: heightDiff,
          })
        } else {
          setKeyboardState({
            isKeyboardVisible: false,
            keyboardHeight: 0,
          })
        }
      }

      viewport.addEventListener('resize', handleViewportResize)

      return () => {
        viewport.removeEventListener('resize', handleViewportResize)
        window.removeEventListener('resize', handleResize)
      }
    } else {
      // 降级方案：使用 window resize 事件
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return keyboardState
}
