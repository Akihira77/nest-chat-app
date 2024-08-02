import { Module } from "@nestjs/common"
import { UserService } from "./user.service"
import { PrismaModule } from "src/store/prisma.module"
import { UserController } from "./user.controller"
import { AuthModule } from "src/auth/auth.module"

@Module({
	controllers: [UserController],
	providers: [UserService],
	imports: [PrismaModule, AuthModule],
	exports: [UserService],
})
export class UserModule {}
