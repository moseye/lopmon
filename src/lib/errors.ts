/** An error whose message is safe to show to the user in an ephemeral reply. */
export class UserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserError'
  }
}
