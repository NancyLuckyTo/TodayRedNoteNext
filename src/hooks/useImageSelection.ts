import { useState, useRef } from 'react'
import { toast } from '@/components/ui/toast'

const IMAGE_MAX_COUNT = 18
const IMAGE_MAX_SIZE = 5 * 1024 * 1024

export type SelectedImage = {
  file: File
  previewUrl: string
  width: number
  height: number
}

interface UseImageSelectionProps {
  maxCount?: number
}

export const useImageSelection = ({
  maxCount = IMAGE_MAX_COUNT,
}: UseImageSelectionProps = {}) => {
  const [images, setImages] = useState<SelectedImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remain = maxCount - images.length
    if (files.length > remain) {
      toast.error(`最多还能选择 ${remain} 张（总共最多 ${maxCount} 张）`)
    }
    const take = files.slice(0, remain)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    const toAdd: SelectedImage[] = []
    for (const file of take) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('仅支持 JPG、PNG 或 WEBP 格式')
        continue
      }
      if (file.size > IMAGE_MAX_SIZE) {
        toast.error('图片大小不能超过 5MB')
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      const dims = await new Promise<{ width: number; height: number }>(
        resolve => {
          const img = new Image()
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
          img.onerror = () => resolve({ width: 0, height: 0 })
          img.src = previewUrl
        }
      )

      toAdd.push({ file, previewUrl, ...dims })
    }

    if (toAdd.length) setImages(prev => [...prev, ...toAdd])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImageAt = (index: number) => {
    setImages(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return copy
    })
  }

  const resetImages = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setImages([])
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return {
    images,
    setImages,
    fileInputRef,
    handleFilesSelected,
    removeImageAt,
    resetImages,
    triggerFileInput,
  }
}
