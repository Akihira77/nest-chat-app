import { Injectable, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        super({
            log: ["info", "query", "error", "warn"],
            transactionOptions: {
                maxWait: 2 * 1000,
                timeout: 2 * 1000,
            },
        })
    }
    async onModuleInit() {
        await this.$connect()
        console.log("Database Connected with Prisma")
    }
}
