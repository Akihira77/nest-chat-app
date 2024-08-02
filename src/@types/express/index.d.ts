import { Request } from "express"
import { Multer } from "multer"
import { AuthPayload } from "../shared.js"

declare global {
	namespace Express {
		interface Request extends Express.Request {
			user: {
				userId: number
				name: string
				email: string
			}
		}

		interface Multer extends Express.Multer {}
	}
}
