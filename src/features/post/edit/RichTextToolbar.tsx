import { Editor } from '@tiptap/react'
import {
  Undo2,
  Redo2,
  Bold,
  Strikethrough,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Minus,
  Link as LinkIcon,
  Eraser,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RichTextToolbarProps {
  editor: Editor | null
  className?: string
  style?: React.CSSProperties
}

export const RichTextToolbar = ({
  editor,
  className,
  style,
}: RichTextToolbarProps) => {
  const setLink = () => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('输入链接地址', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const isActive = (name: string, options?: Record<string, unknown>) => {
    return editor?.isActive(name, options) || false
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 bg-white border-t border-gray-100 overflow-x-auto text-black w-full max-w-md mx-auto',
        'scrollbar-hide',
        className
      )}
      style={style}
    >
      {/* 撤销 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!editor || !editor.can().undo()}
        className="h-8 w-8 p-0"
        aria-label="撤销"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* 重做 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!editor || !editor.can().redo()}
        className="h-8 w-8 p-0"
        aria-label="重做"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 清除格式 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor?.chain().focus().clearNodes().unsetAllMarks().run()
        }
        disabled={!editor}
        className="h-8 w-8 p-0"
        aria-label="清除格式"
      >
        <Eraser className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 标题 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run()
        }
        disabled={!editor}
        className={cn(
          'h-8 w-8 p-0',
          isActive('heading', { level: 1 }) && 'bg-gray-200'
        )}
        aria-label="标题1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
        disabled={!editor}
        className={cn(
          'h-8 w-8 p-0',
          isActive('heading', { level: 2 }) && 'bg-gray-200'
        )}
        aria-label="标题2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      {/* 加粗 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('bold') && 'bg-gray-200')}
        aria-label="加粗"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* 删除线 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('strike') && 'bg-gray-200')}
        aria-label="删除线"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      {/* 引用 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('blockquote') && 'bg-gray-200')}
        aria-label="引用"
      >
        <Quote className="h-4 w-4" />
      </Button>

      {/* 无序列表 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('bulletList') && 'bg-gray-200')}
        aria-label="无序列表"
      >
        <List className="h-4 w-4" />
      </Button>

      {/* 有序列表 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('orderedList') && 'bg-gray-200')}
        aria-label="有序列表"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      {/* 分割线 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        disabled={!editor}
        className="h-8 w-8 p-0"
        aria-label="分割线"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 链接 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        disabled={!editor}
        className={cn('h-8 w-8 p-0', isActive('link') && 'bg-gray-200')}
        aria-label="链接"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
