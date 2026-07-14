import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalizeHex, HexInput, hexToInt, isColorRoleName } from '../src/features/roles/hex.ts'

test('canonicalizeHex expands shorthand and uppercases', () => {
  assert.equal(canonicalizeHex('a20'), '#AA2200')
  assert.equal(canonicalizeHex('#a020f0'), '#A020F0')
  assert.equal(canonicalizeHex('A020F0'), '#A020F0')
})

test('hexToInt', () => {
  assert.equal(hexToInt('#A020F0'), 0xa020f0)
  assert.equal(hexToInt('#000000'), 0)
  assert.equal(hexToInt('#FFFFFF'), 0xffffff)
})

test('HexInput accepts valid and rejects invalid', () => {
  assert.equal(HexInput.safeParse('#fff').success, true)
  assert.equal(HexInput.safeParse('abc123').success, true)
  assert.equal(HexInput.safeParse('nope').success, false)
  assert.equal(HexInput.safeParse('#12345').success, false)
})

test('isColorRoleName matches canonical names only', () => {
  assert.equal(isColorRoleName('#A020F0'), true)
  assert.equal(isColorRoleName('#a020f0'), false)
  assert.equal(isColorRoleName('mod'), false)
})
