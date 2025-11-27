import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { SelectedImage } from '@/hooks/useImageSelection'
import { IMAGE_MAX_COUNT } from '@/constants/post'

interface ImageUploaderProps {
  images: SelectedImage[]
  existingImages?: string[] // 已有图片 URL 列表（编辑模式）
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  onRemoveExisting?: (index: number) => void // 删除已有图片
  triggerAdd: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  disabled?: boolean
  maxCount?: number
}

export const ImageUploader = ({
  images,
  existingImages = [],
  onFilesSelected,
  onRemove,
  onRemoveExisting,
  triggerAdd,
  fileInputRef,
  disabled = false,
  maxCount = IMAGE_MAX_COUNT,
}: ImageUploaderProps) => {
  const totalCount = existingImages.length + images.length
  const canAddMore = totalCount < maxCount

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onFilesSelected}
        className="hidden"
        disabled={disabled}
      />

      <div className="grid grid-cols-3 gap-2">
        {/* 已有图片（编辑模式） */}
        {existingImages.map((url, idx) => (
          <div
            key={`existing-${idx}`}
            className="relative w-full aspect-square overflow-hidden rounded-md"
          >
            <img
              src={url}
              alt={`已有图片${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemoveExisting?.(idx)}
              disabled={disabled}
              className="absolute top-1 right-1 bg-black/20 text-white rounded-full p-1 hover:bg-black/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* 新上传的图片 */}
        {images.map((img, idx) => (
          <div
            key={`new-${idx}`}
            className="relative w-full aspect-square overflow-hidden rounded-md"
          >
            <img
              src={img.previewUrl}
              alt={`选中图片${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              disabled={disabled}
              className="absolute top-1 right-1 bg-black/20 text-white rounded-full p-1 hover:bg-black/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* 添加图片按钮 */}
        {canAddMore && (
          <button
            type="button"
            onClick={triggerAdd}
            disabled={disabled}
            className="w-full aspect-square bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-12 h-12 text-gray-300" />
          </button>
        )}
      </div>
    </div>
  )
}
