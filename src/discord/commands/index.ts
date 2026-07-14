import type { Command } from '../types.ts'
import { createRoleSignup } from './create-role-signup.ts'
import { myColor } from './mycolor.ts'
import { ping } from './ping.ts'

export const commands: Command[] = [ping, createRoleSignup, myColor]
