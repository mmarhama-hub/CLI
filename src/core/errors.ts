export class PlugskyError extends Error {
  constructor(message: string, readonly code: string = "E_GENERIC") {
    super(message)
    this.name = "PlugskyError"
  }
}
export class AuthError extends PlugskyError {
  constructor(msg = "Not authenticated. Run `plugsky login`.") { super(msg, "E_AUTH") }
}
export class ApiError extends PlugskyError {
  constructor(message: string, readonly status: number) { super(message, "E_API") }
}
