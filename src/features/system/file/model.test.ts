import { describe, expect, test } from 'bun:test'
import {
  MAX_UPLOAD_SIZE_MB,
  canPreview,
  formatFileSize,
  getPreviewMimeType,
  getUploadRejectionReason,
} from './model'

function fileLike(name: string, sizeMb = 1) {
  return { name, size: Math.round(sizeMb * 1024 * 1024) }
}

describe('getUploadRejectionReason', () => {
  test('accepts an ordinary document', () => {
    expect(getUploadRejectionReason(fileLike('resume.pdf'))).toBeNull()
  })

  test('rejects the executable types the dialog promises to block', () => {
    for (const name of ['payload.exe', 'setup.bat', 'install.sh']) {
      expect(getUploadRejectionReason(fileLike(name))).not.toBeNull()
    }
  })

  test('rejects regardless of extension casing', () => {
    expect(getUploadRejectionReason(fileLike('PAYLOAD.EXE'))).not.toBeNull()
  })

  test('judges by the trailing extension, not an earlier one', () => {
    expect(getUploadRejectionReason(fileLike('invoice.pdf.exe'))).not.toBeNull()
    expect(getUploadRejectionReason(fileLike('archive.exe.pdf'))).toBeNull()
  })

  test('rejects a file above the size ceiling', () => {
    expect(
      getUploadRejectionReason(fileLike('big.pdf', MAX_UPLOAD_SIZE_MB + 1))
    ).not.toBeNull()
  })

  test('accepts a file exactly at the size ceiling', () => {
    expect(
      getUploadRejectionReason(fileLike('edge.pdf', MAX_UPLOAD_SIZE_MB))
    ).toBeNull()
  })

  test('accepts a file carrying no extension', () => {
    expect(getUploadRejectionReason(fileLike('README'))).toBeNull()
  })

  test('rejects a dotfile whose only segment is dangerous', () => {
    expect(getUploadRejectionReason(fileLike('.sh'))).not.toBeNull()
  })
})

describe('formatFileSize', () => {
  test('scales through the unit ladder', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.00 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })
})

describe('canPreview', () => {
  test('accepts known image and pdf extensions case-insensitively', () => {
    expect(canPreview('PNG')).toBe(true)
    expect(canPreview('pdf')).toBe(true)
  })

  test('rejects unknown or absent extensions', () => {
    expect(canPreview('docx')).toBe(false)
    expect(canPreview(null)).toBe(false)
  })
})

test('inline file previews use an allowlist of known MIME types', () => {
  expect(getPreviewMimeType('PDF')).toBe('application/pdf')
  expect(getPreviewMimeType('jpeg')).toBe('image/jpeg')
  expect(getPreviewMimeType('html')).toBeUndefined()
  expect(canPreview('svg')).toBe(false)
  expect(canPreview('constructor')).toBe(false)
})
