import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useImperativeHandle, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export interface RichTextEditorRef {
  editor: Editor | null
}

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(
  (
    {
      content,
      onChange,
      placeholder = '分享你的想法',
      disabled = false,
      className,
    },
    ref
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // 1-2 级标题
          heading: {
            levels: [1, 2],
          },
          // 禁用 StarterKit 自带的 link，使用自定义配置
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline',
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: cn(
            'focus:outline-none min-h-[150px] px-3',
            '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:my-2',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2',
            '[&_p]:my-2',
            '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
            '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2',
            '[&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:my-2 [&_pre]:overflow-x-auto',
            '[&_a]:text-blue-600 [&_a]:underline',
            '[&_hr]:my-4 [&_hr]:border-t [&_hr]:border-gray-300',
            '[&_strong]:font-bold',
            '[&_s]:line-through',
            className
          ),
        },
      },
    })

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content)
      }
    }, [content, editor])

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled)
      }
    }, [editor, disabled])

    useImperativeHandle(ref, () => ({
      editor,
    }))

    return <EditorContent editor={editor} />
  }
)

RichTextEditor.displayName = 'RichTextEditor'
