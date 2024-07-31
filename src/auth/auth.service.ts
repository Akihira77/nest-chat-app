import { Injectable } from "@nestjs/common"
import { AuthPayload } from "./types"
import { jwtVerify } from "src/utils"

@Injectable()
export class AuthService {
	constructor() {}

	validateToken(token: string): AuthPayload {
		return jwtVerify(token)
	}
}
