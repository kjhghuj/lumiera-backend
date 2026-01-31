import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Toaster, toast } from "@medusajs/ui"
import { useState, useEffect, useRef, useCallback } from "react"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { DocumentText, Plus, ArrowPath } from "@medusajs/icons"

// ============================================================================
// Product Detail Story Widget - 简洁版富文本编辑器
// ============================================================================

const ProductDetailStoryWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --------------------------------------------------------------------------
    // Load Data
    // --------------------------------------------------------------------------

    useEffect(() => {
        if (data?.metadata?.detail_story) {
            const story = data.metadata.detail_story as string
            if (editorRef.current) {
                editorRef.current.innerHTML = story
            }
        }
    }, [data])

    // --------------------------------------------------------------------------
    // Content Change Handler
    // --------------------------------------------------------------------------

    const handleContentChange = useCallback(() => {
        if (editorRef.current) {
            setIsDirty(true)
        }
    }, [])

    // --------------------------------------------------------------------------
    // Paste Handler - 处理粘贴图片
    // --------------------------------------------------------------------------

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        const imageFiles: File[] = []

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile()
                if (file) imageFiles.push(file)
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault()
            await uploadAndInsertImages(imageFiles)
        }
    }

    // --------------------------------------------------------------------------
    // Upload Multiple Images
    // --------------------------------------------------------------------------

    const uploadAndInsertImages = async (files: File[]) => {
        if (files.length === 0) return

        setIsUploading(true)

        try {
            const formData = new FormData()
            for (const file of files) {
                formData.append('files', file)
            }

            const response = await fetch('/admin/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!response.ok) throw new Error('Upload failed')

            const result = await response.json()
            const uploadedFiles = result.files || []

            if (uploadedFiles.length > 0 && editorRef.current) {
                // Focus the editor first
                editorRef.current.focus()

                for (const uploadedFile of uploadedFiles) {
                    if (uploadedFile?.url) {
                        const img = document.createElement('img')
                        img.src = uploadedFile.url
                        img.style.maxWidth = '100%'
                        img.style.height = 'auto'
                        img.style.margin = '8px 0'
                        img.style.borderRadius = '8px'
                        img.style.display = 'block'

                        // Try to insert at cursor, otherwise append to end
                        const selection = window.getSelection()
                        if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
                            const range = selection.getRangeAt(0)
                            range.deleteContents()
                            range.insertNode(img)
                            range.setStartAfter(img)
                            range.setEndAfter(img)
                            selection.removeAllRanges()
                            selection.addRange(range)

                            // Add line break
                            const br = document.createElement('br')
                            range.insertNode(br)
                            range.setStartAfter(br)
                            range.setEndAfter(br)
                        } else {
                            // Append to end of editor
                            editorRef.current.appendChild(img)
                            editorRef.current.appendChild(document.createElement('br'))
                        }
                    }
                }

                handleContentChange()
                toast.success(`已插入 ${uploadedFiles.length} 张图片`)
            }
        } catch (error) {
            console.error('[DetailStory] Upload error:', error)
            toast.error("上传失败")
        } finally {
            setIsUploading(false)
        }
    }

    // --------------------------------------------------------------------------
    // File Select Handler (Multiple)
    // --------------------------------------------------------------------------

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const imageFiles: File[] = []
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
                imageFiles.push(files[i])
            }
        }

        if (imageFiles.length > 0) {
            await uploadAndInsertImages(imageFiles)
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // --------------------------------------------------------------------------
    // Save Handler (with R2 cleanup)
    // --------------------------------------------------------------------------

    // Extract image URLs from HTML content
    const extractImageUrls = (html: string): string[] => {
        const urls: string[] = []
        const imgRegex = /<img[^>]+src="([^"]+)"/g
        let match
        while ((match = imgRegex.exec(html)) !== null) {
            urls.push(match[1])
        }
        return urls
    }

    // Extract file key from URL
    const extractFileKeyFromUrl = (url: string): string | null => {
        try {
            const urlObj = new URL(url)
            const pathname = urlObj.pathname
            return pathname.startsWith('/') ? pathname.slice(1) : pathname
        } catch {
            return null
        }
    }

    const handleSave = async () => {
        if (!editorRef.current) return

        setIsSaving(true)

        try {
            const htmlContent = editorRef.current.innerHTML
            const originalHtml = (data.metadata?.detail_story as string) || ""

            // Find removed images
            const originalImages = extractImageUrls(originalHtml)
            const currentImages = extractImageUrls(htmlContent)
            const removedImages = originalImages.filter(url => !currentImages.includes(url))

            console.log('[DetailStory] Original images:', originalImages.length)
            console.log('[DetailStory] Current images:', currentImages.length)
            console.log('[DetailStory] Removed images:', removedImages)

            // Save the new content
            const response = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: {
                        ...data.metadata,
                        detail_story: htmlContent,
                    },
                }),
            })

            if (!response.ok) throw new Error('Save failed')

            // Delete removed images from R2
            if (removedImages.length > 0) {
                for (const imageUrl of removedImages) {
                    const fileKey = extractFileKeyFromUrl(imageUrl)
                    if (fileKey) {
                        try {
                            await fetch('/admin/delete-file', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileKey }),
                            })
                            console.log('[DetailStory] Deleted R2 file:', fileKey)
                        } catch (err) {
                            console.warn('[DetailStory] Failed to delete R2 file:', fileKey, err)
                        }
                    }
                }
                toast.success("保存成功", { description: `已清理 ${removedImages.length} 个未使用的图片` })
            } else {
                toast.success("保存成功")
            }

            setIsDirty(false)
        } catch (error) {
            console.error('[DetailStory] Save error:', error)
            toast.error("保存失败")
        } finally {
            setIsSaving(false)
        }
    }

    // --------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------

    return (
        <Container className="divide-y p-0">
            <Toaster />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <DocumentText className="text-ui-fg-subtle" />
                    <Heading level="h2">产品故事</Heading>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <Plus className="mr-1" />
                        {isUploading ? '上传中...' : '插入图片'}
                    </Button>
                    <Button
                        variant="primary"
                        size="small"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? <ArrowPath className="animate-spin mr-1" /> : null}
                        {isSaving ? '保存中...' : '保存'}
                    </Button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Editor */}
            <div className="p-6">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleContentChange}
                    onPaste={handlePaste}
                    className="min-h-[200px] max-h-[500px] overflow-y-auto p-4 border border-ui-border-base rounded-lg focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive bg-ui-bg-field prose prose-sm max-w-none"
                    style={{
                        lineHeight: '1.8',
                    }}
                    data-placeholder="在此编写产品故事...支持直接粘贴图片"
                    suppressContentEditableWarning
                />
                <style>{`
                    [contenteditable]:empty:before {
                        content: attr(data-placeholder);
                        color: #9ca3af;
                        pointer-events: none;
                    }
                    [contenteditable] img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 8px;
                        margin: 8px 0;
                    }
                `}</style>
                <Text size="small" className="mt-2 text-ui-fg-subtle">
                    提示：可直接粘贴图片，或点击"插入图片"按钮上传
                </Text>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product.details.after",
})

export default ProductDetailStoryWidget
