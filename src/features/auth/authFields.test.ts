import { describe, expect, it } from 'vitest'
import { validateForgot, validateLogin, validateReset } from './authFields'

describe('validateLogin', () => {
  it('accepts non-blank credentials', () => {
    expect(validateLogin({ username: 'alice', password: 'secret123' })).toEqual({})
  })

  it('rejects blank username and password', () => {
    expect(validateLogin({ username: '  ', password: 'secret123' }).username).toBeTruthy()
    expect(validateLogin({ username: 'alice', password: '' }).password).toBeTruthy()
  })
})

describe('validateForgot', () => {
  it('accepts a well-formed pair', () => {
    expect(validateForgot({ username: 'alice', email: 'alice@example.com' })).toEqual({})
  })

  it('rejects blanks and malformed email', () => {
    expect(validateForgot({ username: '', email: 'alice@example.com' }).username).toBeTruthy()
    expect(validateForgot({ username: 'alice', email: 'not-an-email' }).email).toBeTruthy()
  })
})

describe('validateReset', () => {
  it('accepts matching passwords of length 8+', () => {
    expect(validateReset({ newPassword: 'brand-new-1', confirm: 'brand-new-1' })).toEqual({})
  })

  it('rejects short and mismatched passwords', () => {
    expect(validateReset({ newPassword: 'short', confirm: 'short' }).newPassword).toBeTruthy()
    expect(validateReset({ newPassword: 'brand-new-1', confirm: 'other-pass-2' }).confirm).toBeTruthy()
  })
})
