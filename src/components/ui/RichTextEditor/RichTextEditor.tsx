import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import styles from './RichTextEditor.module.css'

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  return (
    <div className={styles.menuBar}>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`${styles.menuBtn} ${editor.isActive('bold') ? styles.isActive : ''}`}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`${styles.menuBtn} ${editor.isActive('italic') ? styles.isActive : ''}`}
        title="Italic"
      >
        <em>I</em>
      </button>
      <div className={styles.divider}></div>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
        className={`${styles.menuBtn} ${editor.isActive('heading', { level: 1 }) ? styles.isActive : ''}`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
        className={`${styles.menuBtn} ${editor.isActive('heading', { level: 2 }) ? styles.isActive : ''}`}
        title="Heading 2"
      >
        H2
      </button>
      <div className={styles.divider}></div>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().setParagraph().run(); }}
        className={`${styles.menuBtn} ${editor.isActive('paragraph') ? styles.isActive : ''}`}
        title="Paragraph"
      >
        P
      </button>
    </div>
  )
}

export function RichTextEditor({ value, onChange, placeholder = "Write your story here..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
    },
  })

  // Ensure controlled component updates don't break if content is loaded asynchronously
  if (editor && value && editor.getHTML() !== value && !editor.isFocused) {
    editor.commands.setContent(value);
  }

  return (
    <div className={styles.editorWrapper}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className={styles.editorContainer} />
    </div>
  )
}
