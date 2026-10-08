import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  initialValue: string
  onChange: (html: string) => void
}

export default function RichText({ initialValue, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialValue || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  if (!editor) return null

  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      className={active ? 'is-active' : ''}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <div className="tiptap-wrap">
      <div className="tiptap-toolbar">
        {btn('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {btn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {btn('S', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
        {btn('H2', editor.isActive('heading', { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {btn('•', editor.isActive('bulletList'), () =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        {btn('1.', editor.isActive('orderedList'), () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
      </div>
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  )
}
