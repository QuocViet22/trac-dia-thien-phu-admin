import { describe, expect, it } from 'vitest'
import { buildImageUrls, resolveGalleryError, validateGalleryCount, validateImageFile } from './imageUpload'

function png(name: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' })
}

describe('validateImageFile', () => {
  it('accepts a small image', () => {
    expect(validateImageFile(png('a.png', 100))).toBeNull()
  })

  it('rejects non-image types', () => {
    expect(
      validateImageFile(new File(['x'], 'a.txt', { type: 'text/plain' })),
    ).toBeTruthy()
  })

  it('rejects files over 5MB', () => {
    expect(validateImageFile(png('big.png', 6 * 1024 * 1024))).toBeTruthy()
  })
})

describe('validateGalleryCount', () => {
  it('accepts up to 10 gallery items', () => {
    expect(validateGalleryCount(10)).toBeNull()
  })

  it('rejects more than 10 gallery items', () => {
    expect(validateGalleryCount(11)).toBeTruthy()
  })
})

describe('resolveGalleryError', () => {
  it('rejects an oversize gallery file', () => {
    expect(resolveGalleryError([{ kind: 'file', file: png('big.png', 6 * 1024 * 1024) }])).toBeTruthy()
  })

  it('accepts valid gallery items', () => {
    expect(resolveGalleryError([{ kind: 'url', url: 'http://a/g.png' }])).toBeNull()
  })
})

describe('buildImageUrls', () => {
  it('puts cover first then gallery in order', () => {
    expect(
      buildImageUrls({ kind: 'url', url: 'c' }, [{ kind: 'url', url: 'g1' }]),
    ).toEqual(['c', 'g1'])
  })
})
