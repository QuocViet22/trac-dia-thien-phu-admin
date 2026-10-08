import { describe, expect, it } from 'vitest'
import { validateImageFile } from './imageUpload'

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
