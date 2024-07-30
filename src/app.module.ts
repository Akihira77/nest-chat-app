import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { UserModule } from "./user/user.module"
import { ConversationModule } from "./conversation/conversation.module"

@Module({
    imports: [ConfigModule.forRoot(), UserModule, ConversationModule],
})
export class AppModule { }
