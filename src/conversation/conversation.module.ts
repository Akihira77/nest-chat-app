import { Module } from "@nestjs/common"
import { ConversationController } from "./conversation.controller"
import { ConversationService } from "./conversation.service"
import { PrismaModule } from "src/store/prisma.module"
import { UserModule } from "src/user/user.module"

@Module({
	controllers: [ConversationController],
	providers: [ConversationService],
	imports: [PrismaModule, UserModule],
})
export class ConversationModule { }