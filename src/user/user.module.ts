import { Module } from "@nestjs/common"
import { UserService } from "./user.service";
import { PrismaModule } from "src/store/prisma.module";

@Module({
    controllers: [],
    providers: [],
    imports: [PrismaModule],
    exports: [UserService]
})

export class UserModule { }
