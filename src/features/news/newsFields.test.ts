import { describe, expect, it } from 'vitest'
import { toNewsPayload, validateNews } from './newsFields'

const valid = {
  title: 'Máy GPS RTK mới',
  author: 'Ban Biên Tập',
  status: 'PUBLISHED' as const,
  newsType: 'NEWS' as const,
  location: '',
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

  it('requires a location for customer news', () => {
    expect(validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: '  ' }).location).toBeTruthy()
  })

  it('accepts customer news with a location', () => {
    expect(validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: 'Hà Nội' })).toEqual({})
  })

  it('rejects a customer location longer than 256 characters', () => {
    expect(
      validateNews({ ...valid, newsType: 'CUSTOMER_NEWS', location: 'x'.repeat(257) }).location,
    ).toBeTruthy()
  })

  it('requires a location for repair and inspection news', () => {
    expect(
      validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: '  ' }).location,
    ).toBeTruthy()
  })

  it('accepts repair and inspection news with a location', () => {
    expect(
      validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: 'Hà Nội' }),
    ).toEqual({})
  })

  it('rejects a repair location longer than 256 characters', () => {
    expect(
      validateNews({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: 'x'.repeat(257) })
        .location,
    ).toBeTruthy()
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
      location: null,
      seoPageTitle: null,
      seoDescriptionTag: null,
      seoAlias: 'may-gps-rtk-moi',
      images: [{ imageUrl: 'http://a/cover.png', sortOrder: 0 }],
    })
  })

  it('omits images when no url is given', () => {
    expect(toNewsPayload({ ...valid, imageUrl: '  ' }).images).toEqual([])
  })

  it('sends the location for location-bearing types', () => {
    expect(
      toNewsPayload({ ...valid, newsType: 'CUSTOMER_NEWS', location: ' Hà Nội ' }).location,
    ).toBe('Hà Nội')
    expect(
      toNewsPayload({ ...valid, newsType: 'REPAIR_AND_INSPECTION_NEWS', location: ' Hà Nội ' })
        .location,
    ).toBe('Hà Nội')
    expect(toNewsPayload({ ...valid, newsType: 'NEWS', location: 'Hà Nội' }).location).toBeNull()
  })
})
