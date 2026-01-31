import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Toaster, toast, Badge, clx } from "@medusajs/ui"
import { useState, useEffect, useRef, useCallback } from "react"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Photo, XMark, Plus, ArrowPath, CheckCircle, Swatch } from "@medusajs/icons"

// ============================================================================
// Type Definitions
// ============================================================================

interface ProductImage {
    id: string
    url: string
}

interface ProductVariant {
    id: string
    title: string
    sku?: string
    metadata?: {
        images?: { url: string }[]
    }
}

// ============================================================================
// Custom Media Manager Widget
// ============================================================================

const ProductMediaManagerWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
    const [images, setImages] = useState<ProductImage[]>([])
    const [thumbnail, setThumbnail] = useState<string>("")
    const [variants, setVariants] = useState<ProductVariant[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showVariantSelector, setShowVariantSelector] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --------------------------------------------------------------------------
    // Load Data
    // --------------------------------------------------------------------------

    const loadProductData = useCallback(async () => {
        if (data) {
            console.log('[MediaManager] Loading product data:', data.id)
            setImages(data.images || [])
            setThumbnail(data.thumbnail || "")

            // Load variants
            try {
                const response = await fetch(`/admin/products/${data.id}/variants?limit=100`, {
                    credentials: 'include',
                })
                if (response.ok) {
                    const result = await response.json()
                    setVariants(result.variants || [])
                }
            } catch (error) {
                console.error('[MediaManager] Failed to load variants:', error)
            }
        }
    }, [data])

    useEffect(() => {
        loadProductData()
    }, [loadProductData])

    // --------------------------------------------------------------------------
    // Hide Native Media Section
    // --------------------------------------------------------------------------

    useEffect(() => {
        // 隐藏原生媒体区域
        const hideNativeMedia = () => {
            // 查找包含 "Media" 标题的 section
            const sections = document.querySelectorAll('section, div[class*="Container"]')
            sections.forEach(section => {
                const heading = section.querySelector('h2')
                if (heading && (heading.textContent?.includes('Media') || heading.textContent?.includes('媒体'))) {
                    // 检查是否是我们自己的 widget（通过查找"媒体管理"标题）
                    if (!heading.textContent?.includes('媒体管理')) {
                        (section as HTMLElement).style.display = 'none'
                    }
                }
            })
        }

        // 延迟执行以确保 DOM 已加载
        const timer = setTimeout(hideNativeMedia, 500)

        // 监听 DOM 变化
        const observer = new MutationObserver(hideNativeMedia)
        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [])

    // --------------------------------------------------------------------------
    // Refresh Product Data
    // --------------------------------------------------------------------------

    const refreshProductData = async () => {
        try {
            const response = await fetch(`/admin/products/${data.id}`, {
                credentials: 'include',
            })
            if (response.ok) {
                const result = await response.json()
                if (result.product) {
                    setImages(result.product.images || [])
                    setThumbnail(result.product.thumbnail || "")
                    console.log('[MediaManager] Data refreshed')
                }
            }
        } catch (error) {
            console.error('[MediaManager] Failed to refresh data:', error)
        }
    }

    // --------------------------------------------------------------------------
    // Upload Handler
    // --------------------------------------------------------------------------

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)

        try {
            const formData = new FormData()
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i])
            }

            const uploadResponse = await fetch('/admin/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!uploadResponse.ok) throw new Error('Upload failed')

            const uploadResult = await uploadResponse.json()
            const uploadedImages = uploadResult.files || []

            const newImages = [
                ...images.map(img => ({ url: img.url })),
                ...uploadedImages.map((file: { url: string }) => ({ url: file.url }))
            ]

            const updateResponse = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: newImages }),
            })

            if (!updateResponse.ok) throw new Error('Failed to update product')

            await refreshProductData()
            toast.success("上传成功", { description: `已上传 ${uploadedImages.length} 张图片` })

        } catch (error) {
            console.error('[MediaManager] Upload error:', error)
            toast.error("上传失败")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // --------------------------------------------------------------------------
    // Delete Handler
    // --------------------------------------------------------------------------

    const handleDeleteImage = async (imageUrl: string) => {
        setIsDeleting(imageUrl)

        try {
            const fileKey = extractFileKeyFromUrl(imageUrl)
            const newImages = images.filter(img => img.url !== imageUrl).map(img => ({ url: img.url }))
            const newThumbnail = thumbnail === imageUrl ? "" : undefined

            const updatePayload: { images: { url: string }[]; thumbnail?: string } = { images: newImages }
            if (newThumbnail !== undefined) updatePayload.thumbnail = newThumbnail

            const updateResponse = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            })

            if (!updateResponse.ok) throw new Error('Failed to update product')

            if (fileKey) {
                await fetch('/admin/delete-file', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileKey }),
                }).catch(() => { })
            }

            setImages(prev => prev.filter(img => img.url !== imageUrl))
            if (thumbnail === imageUrl) setThumbnail("")
            toast.success("删除成功")

        } catch (error) {
            console.error('[MediaManager] Delete error:', error)
            toast.error("删除失败")
        } finally {
            setIsDeleting(null)
        }
    }

    // --------------------------------------------------------------------------
    // Set Thumbnail Handler
    // --------------------------------------------------------------------------

    const handleSetThumbnail = async (imageUrl: string) => {
        setIsSaving(true)
        try {
            const response = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thumbnail: imageUrl }),
            })
            if (!response.ok) throw new Error('Failed to set thumbnail')
            setThumbnail(imageUrl)
            toast.success("缩略图已设置")
        } catch (error) {
            toast.error("设置失败")
        } finally {
            setIsSaving(false)
        }
    }

    // --------------------------------------------------------------------------
    // Set Variant Image Handler
    // --------------------------------------------------------------------------

    const handleSetVariantImage = async (imageUrl: string, variantId: string) => {
        setIsSaving(true)
        try {
            const variant = variants.find(v => v.id === variantId)
            const existingImages = (variant?.metadata?.images || []) as { url: string }[]

            // Check if already added
            if (existingImages.some(img => img.url === imageUrl)) {
                toast.info("图片已关联到此变体")
                setShowVariantSelector(null)
                setIsSaving(false)
                return
            }

            const newImages = [...existingImages, { url: imageUrl }]

            const response = await fetch(`/admin/products/${data.id}/variants/${variantId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: {
                        ...variant?.metadata,
                        images: newImages
                    }
                }),
            })

            if (!response.ok) throw new Error('Failed to update variant')

            // Update local state
            setVariants(prev => prev.map(v =>
                v.id === variantId
                    ? { ...v, metadata: { ...v.metadata, images: newImages } }
                    : v
            ))

            toast.success("已关联到变体", { description: variant?.title || variantId })
        } catch (error) {
            console.error('[MediaManager] Set variant image error:', error)
            toast.error("设置失败")
        } finally {
            setIsSaving(false)
            setShowVariantSelector(null)
        }
    }

    // --------------------------------------------------------------------------
    // Utility
    // --------------------------------------------------------------------------

    const extractFileKeyFromUrl = (url: string): string | null => {
        try {
            const urlObj = new URL(url)
            const pathname = urlObj.pathname
            return pathname.startsWith('/') ? pathname.slice(1) : pathname
        } catch {
            return null
        }
    }

    const getVariantCountForImage = (imageUrl: string): number => {
        return variants.filter(v =>
            (v.metadata?.images as { url: string }[] | undefined)?.some(img => img.url === imageUrl)
        ).length
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
                    <Photo className="text-ui-fg-subtle" />
                    <Heading level="h2">媒体管理</Heading>
                    <Badge color="blue" size="xsmall">{images.length}</Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="small" onClick={refreshProductData}>
                        <ArrowPath className="mr-1" />刷新
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <Plus className="mr-1" />{isUploading ? '上传中...' : '上传'}
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

            {/* Image Grid */}
            <div className="p-6">
                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-ui-fg-subtle">
                        <Photo className="w-12 h-12 mb-2" />
                        <Text>暂无图片</Text>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((image) => (
                            <div
                                key={image.id || image.url}
                                className={clx(
                                    "relative group rounded-lg overflow-hidden border-2 transition-all",
                                    thumbnail === image.url
                                        ? "border-ui-fg-interactive"
                                        : "border-ui-border-base hover:border-ui-border-strong"
                                )}
                            >
                                <div className="aspect-square bg-ui-bg-subtle">
                                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                                </div>

                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    {thumbnail === image.url && (
                                        <Badge color="green" size="xsmall">
                                            <CheckCircle className="mr-1" />缩略图
                                        </Badge>
                                    )}
                                    {getVariantCountForImage(image.url) > 0 && (
                                        <Badge color="purple" size="xsmall">
                                            <Swatch className="mr-1" />变体 ×{getVariantCountForImage(image.url)}
                                        </Badge>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                    {/* Row 1: Thumbnail & Variant */}
                                    <div className="flex gap-2">
                                        {thumbnail !== image.url && (
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                onClick={() => handleSetThumbnail(image.url)}
                                                disabled={isSaving}
                                            >
                                                缩略图
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="small"
                                            onClick={() => setShowVariantSelector(image.url)}
                                            disabled={isSaving}
                                        >
                                            <Swatch className="mr-1" />变体
                                        </Button>
                                    </div>
                                    {/* Row 2: Delete */}
                                    <Button
                                        variant="danger"
                                        size="small"
                                        onClick={() => handleDeleteImage(image.url)}
                                        disabled={isDeleting === image.url}
                                    >
                                        {isDeleting === image.url ? <ArrowPath className="animate-spin" /> : <XMark className="mr-1" />}
                                        删除
                                    </Button>
                                </div>

                                {/* Variant Selector Popup */}
                                {showVariantSelector === image.url && (
                                    <div className="absolute inset-0 bg-white/95 flex flex-col p-3 z-10">
                                        <div className="flex justify-between items-center mb-2">
                                            <Text weight="plus" size="small">选择变体</Text>
                                            <button onClick={() => setShowVariantSelector(null)} className="text-ui-fg-subtle hover:text-ui-fg-base">
                                                <XMark />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1">
                                            {variants.length === 0 ? (
                                                <Text size="small" className="text-ui-fg-subtle">无变体</Text>
                                            ) : (
                                                variants.map(variant => {
                                                    const isLinked = (variant.metadata?.images as { url: string }[] | undefined)?.some(img => img.url === image.url)
                                                    return (
                                                        <button
                                                            key={variant.id}
                                                            onClick={() => handleSetVariantImage(image.url, variant.id)}
                                                            disabled={isSaving || isLinked}
                                                            className={clx(
                                                                "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                                                                isLinked
                                                                    ? "bg-ui-bg-subtle-pressed text-ui-fg-disabled cursor-not-allowed"
                                                                    : "hover:bg-ui-bg-subtle"
                                                            )}
                                                        >
                                                            {variant.title}
                                                            {isLinked && <span className="ml-1 text-xs">(已关联)</span>}
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product.details.side.before",
})

export default ProductMediaManagerWidget
