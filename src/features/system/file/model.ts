import { getRecord, toNullableString } from '@/lib/api-normalize'
import { toId } from '@/lib/ids'

export type SysFile = {
  id: string
  originalName: string
  storageName: string
  filePath: string
  url: string | null
  size: number
  sizeFormatted: string
  extension: string
  contentType: string | null
  md5: string | null
  storageType: string
  bucket: string | null
  bizType: string | null
  bizId: string | null
  uploadBy: string | null
  uploadTime: string | null
  createTime: string | null
}

export type SysFileQuery = {
  pageNum: number
  pageSize: number
  originalName?: string
  extension?: string
  bizType?: string
  uploadBy?: string
  beginTime?: string
  endTime?: string
}

export type SysFilePage = {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  records: SysFile[]
}

export const BIZ_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'other', label: '其它' },
  { value: 'avatar', label: '头像' },
  { value: 'attachment', label: '附件' },
  { value: 'talent_attachment', label: '人才附件' },
  { value: 'import', label: '导入' },
  { value: 'export', label: '导出' },
  { value: 'icon', label: '图标' },
]

const previewMimeTypes = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['bmp', 'image/bmp'],
  ['ico', 'image/x-icon'],
  ['pdf', 'application/pdf'],
])

/** Restricts inline previews to application-selected image and PDF MIME types. */
export function getPreviewMimeType(extension?: string | null) {
  return extension ? previewMimeTypes.get(extension.toLowerCase()) : undefined
}

export const MAX_UPLOAD_SIZE_MB = 100

/**
 * Extensions refused at the picker. This mirrors what the upload dialog tells
 * the user; it is a convenience guard, not a security boundary — the server
 * still has to validate every upload it accepts.
 */
const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  'exe',
  'bat',
  'sh',
  'cmd',
  'com',
  'scr',
  'msi',
  'dll',
  'jar',
  'ps1',
  'vbs',
  'wsf',
  'hta',
  'cpl',
  'pif',
  'reg',
])

/** Trailing extension in lowercase, or '' when the name carries none. */
function getFileExtension(name: string) {
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1 || lastDot === name.length - 1) {
    return ''
  }

  return name.slice(lastDot + 1).toLowerCase()
}

/**
 * Validates a picked file against the size ceiling and the blocked extension
 * list.
 *
 * @param file - Name and byte size of the picked file.
 * @returns A user-facing rejection reason, or null when the file is acceptable.
 */
export function getUploadRejectionReason(file: {
  name: string
  size: number
}): string | null {
  if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    return `文件超出 ${MAX_UPLOAD_SIZE_MB}MB 限制`
  }

  const extension = getFileExtension(file.name)
  if (extension && BLOCKED_UPLOAD_EXTENSIONS.has(extension)) {
    return `不支持上传 .${extension} 类型的文件`
  }

  return null
}

export function formatFileSize(size: number) {
  if (!size && size !== 0) {
    return '-'
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function canPreview(extension: string | null | undefined) {
  return Boolean(getPreviewMimeType(extension))
}

export function normalizeSysFile(input: unknown): SysFile {
  const record = getRecord(input)
  const size = Number(record.size ?? 0)

  return {
    id: toId(record.id),
    originalName: String(record.originalName ?? ''),
    storageName: String(record.storageName ?? ''),
    filePath: String(record.filePath ?? ''),
    url: toNullableString(record.url),
    size,
    sizeFormatted: formatFileSize(size),
    extension: String(record.extension ?? '').toLowerCase(),
    contentType: toNullableString(record.contentType),
    md5: toNullableString(record.md5),
    storageType: String(record.storageType ?? 'local'),
    bucket: toNullableString(record.bucket),
    bizType: toNullableString(record.bizType),
    bizId:
      record.bizId === null || record.bizId === undefined
        ? null
        : toId(record.bizId),
    uploadBy:
      record.uploadBy === null || record.uploadBy === undefined
        ? null
        : toId(record.uploadBy),
    uploadTime: toNullableString(record.uploadTime),
    createTime: toNullableString(record.createTime),
  }
}
