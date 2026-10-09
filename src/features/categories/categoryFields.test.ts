import { describe, expect, it } from 'vitest'
import { toCategoryPayload, toCategoryPayloadFromUrls, validateCategory } from './categoryFields'

const valid = {
  name: 'Thời trang nam',
  description: '<p>desc</p>',
  seoPageTitle: '',
  seoDescription: '',
  seoAlias: 'thoi-trang-nam',
  parentCategoryId: '',
  imageUrl: 'http://a/cat.png',
}

describe('validateCategory', () => {
  it('accepts a valid form', () => {
    expect(validateCategory(valid)).toEqual({})
  })

  it('rejects blank name', () => {
    expect(validateCategory({ ...valid, name: '  ' }).name).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    expect(validateCategory({ ...valid, seoAlias: 'x'.repeat(257) }).seoAlias).toBeTruthy()
  })
})

describe('toCategoryPayload', () => {
  it('maps blanks to null and a single cover image', () => {
    expect(toCategoryPayload(valid)).toEqual({
      name: 'Thời trang nam',
      description: '<p>desc</p>',
      seoPageTitle: null,
      seoDescription: null,
      seoAlias: 'thoi-trang-nam',
      parentCategoryId: null,
      images: [{ imageUrl: 'http://a/cat.png', sortOrder: 0 }],
    })
  })

  it('omits images when no url is given', () => {
    expect(toCategoryPayload({ ...valid, imageUrl: '  ' }).images).toEqual([])
  })
})

describe('toCategoryPayloadFromUrls', () => {
  it('maps ordered urls to sortOrder images', () => {
    expect(toCategoryPayloadFromUrls(valid, ['c', 'g1']).images).toEqual([
      { imageUrl: 'c', sortOrder: 0 },
      { imageUrl: 'g1', sortOrder: 1 },
    ])
  })

  it('omits images when urls are empty', () => {
    expect(toCategoryPayloadFromUrls(valid, []).images).toEqual([])
  })
})
