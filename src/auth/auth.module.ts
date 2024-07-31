import { Module } from "@nestjs/common"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"

@Module({
	controllers: [],
	providers: [AuthGuard, AuthService],
	imports: [],
	exports: [AuthGuard, AuthService],
})
export class AuthModule {}
