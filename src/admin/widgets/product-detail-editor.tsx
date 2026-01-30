import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Label, Textarea, Toaster, toast } from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

// ============================================================================
// Type Definitions
// ============================================================================

type SectionType = 'image_full' | 'text_block'

interface DetailSection {
    id: string
    type: SectionType
    content: string        // 文本内容 或 图片URL
    fileId?: string        // 文件ID，用于删除
    meta?: {
        alt?: string
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = (): string => {
    return crypto.randomUUID()
}

// ============================================================================
// Widget Component
// ============================================================================

const ProductDetailEditorWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
    // State
    const [sections, setSections] = useState<DetailSection[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    // Text input state
    const [showTextInput, setShowTextInput] = useState(false)
    const [newTextContent, setNewTextContent] = useState('')

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --------------------------------------------------------------------------
    // Load Data
    // --------------------------------------------------------------------------

    useEffect(() => {
        if (data?.metadata?.detail_sections) {
            const loadedSections = data.metadata.detail_sections as DetailSection[]
            console.log('[ProductDetailEditor] Loading sections from metadata:', loadedSections)
            console.log('[ProductDetailEditor] FileIds in loaded sections:',
                loadedSections.map(s => ({ id: s.id, type: s.type, fileId: s.fileId || 'MISSING' }))
            )
            setSections(Array.isArray(loadedSections) ? loadedSections : [])
        } else {
            console.log('[ProductDetailEditor] No detail_sections in metadata, initializing empty')
            setSections([])
        }
    }, [data])

    // --------------------------------------------------------------------------
    // Upload Handler
    // --------------------------------------------------------------------------

    const handleFileUpload = async (file: File): Promise<{ url: string; id: string } | null> => {
        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('files', file)

            const response = await fetch('/admin/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.status}`)
            }

            const result = await response.json()

            if (result.files && result.files.length > 0) {
                return {
                    url: result.files[0].url,
                    id: result.files[0].id
                }
            }

            throw new Error('No file URL returned from upload')
        } catch (error) {
            console.error('[ProductDetailEditor] File upload error:', error)
            toast.error("Upload Failed", {
                description: "Failed to upload image. Please try again.",
            })
            return null
        } finally {
            setIsUploading(false)
        }
    }

    // --------------------------------------------------------------------------
    // Delete File Handler
    // --------------------------------------------------------------------------

    const handleFileDelete = async (fileId: string): Promise<boolean> => {
        console.log('[ProductDetailEditor] handleFileDelete called with fileId:', fileId)

        try {
            const response = await fetch(`/admin/uploads/${fileId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            console.log('[ProductDetailEditor] Delete response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('[ProductDetailEditor] File delete failed:', response.status, errorText)
                return false
            }

            const result = await response.json()
            console.log('[ProductDetailEditor] Delete response:', result)
            return true
        } catch (error) {
            console.error('[ProductDetailEditor] File delete error:', error)
            return false
        }
    }

    // --------------------------------------------------------------------------
    // Section Handlers
    // --------------------------------------------------------------------------

    const handleAddTextSection = () => {
        if (!newTextContent.trim()) {
            toast.error("Empty Content", {
                description: "Please enter some text content.",
            })
            return
        }

        const newSection: DetailSection = {
            id: generateId(),
            type: 'text_block',
            content: newTextContent.trim(),
        }

        setSections(prev => [...prev, newSection])
        setNewTextContent('')
        setShowTextInput(false)
        setIsDirty(true)

        toast.success("Section Added", {
            description: "Text section added successfully.",
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error("Invalid File", {
                description: "Please select an image file.",
            })
            return
        }

        const result = await handleFileUpload(file)
        if (result) {
            const newSection: DetailSection = {
                id: generateId(),
                type: 'image_full',
                content: result.url,
                fileId: result.id,
                meta: {
                    alt: file.name.replace(/\.[^/.]+$/, ''),
                },
            }

            setSections(prev => [...prev, newSection])
            setIsDirty(true)

            toast.success("Section Added", {
                description: "Image section added successfully.",
            })
        }

        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDeleteSection = async (id: string) => {
        const sectionToDelete = sections.find(s => s.id === id)

        console.log('[ProductDetailEditor] Deleting section:', {
            id,
            type: sectionToDelete?.type,
            fileId: sectionToDelete?.fileId
        })

        // Delete file from server if exists
        if (sectionToDelete?.fileId && sectionToDelete.type === 'image_full') {
            console.log('[ProductDetailEditor] Attempting to delete file from R2:', sectionToDelete.fileId)
            const deleted = await handleFileDelete(sectionToDelete.fileId)
            if (deleted) {
                console.log('[ProductDetailEditor] ✅ File deleted from R2 successfully')
            } else {
                console.error('[ProductDetailEditor] ❌ Failed to delete file from R2')
            }
        } else {
            console.log('[ProductDetailEditor] No file to delete (no fileId or not image_full)')
        }

        setSections(prev => prev.filter(s => s.id !== id))
        setIsDirty(true)

        toast.success("Section Deleted", {
            description: "Section removed successfully.",
        })
    }

    // --------------------------------------------------------------------------
    // Save Handler
    // --------------------------------------------------------------------------

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    metadata: {
                        ...data.metadata,
                        detail_sections: sections,
                    },
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to save product details')
            }

            toast.success("Saved", {
                description: "Product detail sections saved successfully!",
            })
            setIsDirty(false)
        } catch (error) {
            console.error('[ProductDetailEditor] Save error:', error)
            toast.error("Error", {
                description: "Failed to save changes. Please try again.",
            })
        } finally {
            setIsSaving(false)
        }
    }

    // --------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------

    return (
        <Container className="divide-y p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div>
                    <Heading level="h2">Product Detail Story</Heading>
                    <Text className="text-ui-fg-subtle" size="small">
                        Manage rich content sections for this product's detail page
                    </Text>
                </div>
                {isDirty && (
                    <Text className="text-ui-fg-warning" size="small">
                        Unsaved changes
                    </Text>
                )}
            </div>

            <div className="px-6 py-4 space-y-6">
                {/* Section List */}
                {sections.length > 0 ? (
                    <div className="space-y-3">
                        <Label weight="plus">Sections ({sections.length})</Label>
                        <div className="space-y-2">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded-lg border"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="text-ui-fg-muted text-sm w-6">
                                            {index + 1}.
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Text className="text-ui-fg-base font-medium" size="small">
                                                {section.type === 'image_full' ? '🖼️ Image' : '📝 Text'}
                                            </Text>
                                            <Text className="text-ui-fg-subtle truncate" size="xsmall">
                                                {section.type === 'image_full'
                                                    ? section.meta?.alt || 'Image'
                                                    : section.content.substring(0, 50) + (section.content.length > 50 ? '...' : '')
                                                }
                                            </Text>
                                        </div>
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="small"
                                        onClick={() => handleDeleteSection(section.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-ui-fg-subtle">
                        <Text>No sections yet. Add text or images below.</Text>
                    </div>
                )}

                {/* Add Buttons */}
                <div className="space-y-4">
                    <Label weight="plus">Add New Section</Label>

                    {/* Text Input Mode */}
                    {showTextInput ? (
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Enter text content..."
                                value={newTextContent}
                                onChange={(e) => setNewTextContent(e.target.value)}
                                rows={4}
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleAddTextSection}
                                    disabled={!newTextContent.trim()}
                                >
                                    Add Text
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowTextInput(false)
                                        setNewTextContent('')
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowTextInput(true)}
                            >
                                📝 Add Text
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                isLoading={isUploading}
                                disabled={isUploading}
                            >
                                🖼️ Add Image
                            </Button>
                        </div>
                    )}

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Save Button */}
                <div className="pt-4">
                    <Button
                        onClick={handleSave}
                        isLoading={isSaving}
                        disabled={!isDirty || isSaving}
                        className="w-full"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            <Toaster />
        </Container>
    )
}

// ============================================================================
// Widget Configuration
// ============================================================================

export const config = defineWidgetConfig({
    zone: "product.details.after",
})

export default ProductDetailEditorWidget
