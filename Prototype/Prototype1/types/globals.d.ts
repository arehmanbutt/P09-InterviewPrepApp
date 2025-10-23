export {}

declare global {
  interface CustomJwtSessionClaims {
    firstname?: string
    email?: string
    image?: string
  }
}