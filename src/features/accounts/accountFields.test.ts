import { describe, expect, it } from 'vitest'
import { fieldForConflict, toAccountPayload, validateAccount } from './accountFields'

const valid = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'secret123',
  role: 'ADMIN' as const,
}

describe('validateAccount', () => {
  it('accepts a valid form', () => {
    expect(validateAccount(valid)).toEqual({})
  })

  it('rejects blanks, malformed email, and short password', () => {
    expect(validateAccount({ ...valid, username: '  ' }).username).toBeTruthy()
    expect(validateAccount({ ...valid, email: 'not-an-email' }).email).toBeTruthy()
    expect(validateAccount({ ...valid, password: 'short' }).password).toBeTruthy()
    expect(validateAccount({ ...valid, role: '' }).role).toBeTruthy()
  })

  it('rejects fields longer than 256 characters', () => {
    expect(validateAccount({ ...valid, username: 'x'.repeat(257) }).username).toBeTruthy()
  })
})

describe('toAccountPayload', () => {
  it('trims text fields and passes the role through', () => {
    expect(toAccountPayload({ ...valid, username: '  alice  ' })).toEqual({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret123',
      roleType: 'ADMIN',
    })
  })
})

describe('fieldForConflict', () => {
  it('routes username conflicts to the username field', () => {
    expect(fieldForConflict('username already exists: alice')).toBe('username')
  })

  it('routes email conflicts to the email field', () => {
    expect(fieldForConflict('email already exists: alice@example.com')).toBe('email')
  })

  it('returns null for anything else (form-level message)', () => {
    expect(fieldForConflict('account already exists')).toBeNull()
    expect(fieldForConflict('')).toBeNull()
  })
})
