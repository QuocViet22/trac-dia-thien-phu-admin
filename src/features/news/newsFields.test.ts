import { describe, expect, it } from 'vitest'
import { toNewsPayload, validateNews } from './newsFields'

const valid = {
  title: 'Máy GPS RTK mới',
  author: 'Ban Biên Tập',
  status: 'PUBLISHED' as const,
  newsType: 'NEWS' as const,
  seoPageTitle: '',
  seoDescriptionTag: '',
  seoAlias: 'may-gps-rtk-moi',
  description: '<p>desc</p>',
  imageUrl: 'http://a/cover.png',
}

describe('validateNews', () => {
  it('accepts a valid form', () => {
    expect(validateNews(valid)).toEqual({})
  })

  it('rejects blank title, author, seoAlias, and missing status', () => {
    expect(validateNews({ ...valid, title: '  ' }).title).toBeTruthy()
    expect(validateNews({ ...valid, author: '  ' }).author).toBeTruthy()
    expect(validateNews({ ...valid, seoAlias: '  ' }).seoAlias).toBeTruthy()
    expect(validateNews({ ...valid, status: '' }).status).toBeTruthy()
  })

  it('rejects missing newsType', () => {
    expect(validateNews({ ...valid, newsType: '' }).newsType).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    expect(validateNews({ ...valid, title: 'x'.repeat(257) }).title).toBeTruthy()
  })
})

describe('toNewsPayload', () => {
  it('maps blanks to null and a single cover image', () => {
    expect(toNewsPayload(valid)).toEqual({
      title: 'Máy GPS RTK mới',
      description: '<p>desc</p>',
      author: 'Ban Biên Tập',
      status: 'PUBLISHED',
      newsType: 'NEWS',
      seoPageTitle: null,
      seoDescriptionTag: null,
      seoAlias: 'may-gps-rtk-moi',
      images: [{ imageUrl: 'http://a/cover.png', sortOrder: 0 }],
    })
  })

  it('omits images when no url is given', () => {
    expect(toNewsPayload({ ...valid, imageUrl: '  ' }).images).toEqual([])
  })
})
