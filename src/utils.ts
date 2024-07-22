import { createSigner, createVerifier } from "fast-jwt"

export function jwtSign(userId: number, email: string): string {
	try {
		const signer = createSigner({
			key: process.env.JWT_SECRET!,
			expiresIn: "1h"
		})
		return signer({ userId, email })
	} catch (err) {
		throw err
	}
}

export function jwtVerify(token: string): { userId: number, email: string } {
	try {
		const verifier = createVerifier({
			key: process.env.JWT_SECRET!,
			cache: true,
			maxAge: 60 * 1000
		})
		const payload = verifier(token) as { userId: number, email: string }
		return payload
	} catch (err) {
		throw err
	}
}
