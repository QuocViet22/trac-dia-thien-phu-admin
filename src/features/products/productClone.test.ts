import { describe, expect, it } from 'vitest'
import type { Product } from '../../lib/types'
import { fromProduct } from './productFields'

const source = {
  name: 'Máy toàn đạc',
  categoryId: 'cat-1',
  brand: 'Hi-Target',
  skuCode: 'SKU-1',
  barcode: 'BAR-1',
  measurementUnit: 'Cái',
  description: '<p>desc</p>',
  shortDescription: 'short',
  seoPageTitle: 'title',
  seoDescriptionTag: 'desc tag',
  seoAlias: 'may-toan-dac',
  images: [
    { imageUrl: 'http://a/1.png', sortOrder: 0 },
    { imageUrl: 'http://a/2.png', sortOrder: 1 },
  ],
} as unknown as Product

describe('fromProduct clone', () => {
  it('drops images when duplicating', () => {
    expect(fromProduct(source, true).images).toEqual([])
  })
})
