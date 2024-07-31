import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common"
import { AuthService } from "./auth.service"

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly authService: AuthService) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		try {
			const request = context.switchToHttp().getRequest()
			const { authorization } = request.headers
			if (!authorization || authorization.trim() === "") {
				throw new UnauthorizedException("Please provide token")
			}

			const authToken = authorization.split(" ")[1]
			const resp = this.authService.validateToken(authToken)
			request.user = resp
			return true
		} catch (error) {
			console.log("auth error - ", error.message)
			throw new ForbiddenException(
				error.message || "session expired! Please sign In",
			)
		}
	}
}
