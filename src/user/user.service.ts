import { Injectable, Logger } from "@nestjs/common"
import { User } from "@prisma/client"
import { PrismaService } from "src/store/prisma.service"
import { CreateUserDTO, LoginDTO, UserDTO } from "./types"
import * as bcrypt from "bcrypt"

@Injectable()
export class UserService {
    private readonly logger: Logger
    constructor(private readonly prisma: PrismaService) {
        this.logger = new Logger(UserService.name)
    }

    public findUsers(): Promise<User[]> {
        try {
            return this.prisma.user.findMany()
        } catch (err) {
            this.logger.error(err)
            return Promise.resolve([])
        }
    }

    public findUserById(id: number): Promise<UserDTO | null> {
        try {
            return this.prisma.user.findFirst({
                where: {
                    id: id
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    created_at: true,
                }
            })
        } catch (err) {
            this.logger.error(err)
            return Promise.resolve(null)
        }
    }

    private hash(password: string): Promise<string> {
        try {
            return Promise.resolve(bcrypt.hash(password, 10))
        } catch (err) {
            this.logger.error(err)
            return Promise.resolve("")
        }
    }

    private compare(password: string, encryptedPassword: string): Promise<boolean> {
        try {
            return Promise.resolve(bcrypt.compare(password, encryptedPassword))
        } catch (err) {
            this.logger.error(err)
            return Promise.resolve(false)
        }
    }

    public async create(data: CreateUserDTO): Promise<UserDTO> {
        try {
            this.prisma.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    avatar: data.avatar,
                    password: await this.hash(data.password),
                    created_at: new Date().toISOString()
                }
            })
        } catch (err) {
            this.logger.error(err)
            return Promise.resolve({} as UserDTO)
        }
    }

    public async login(data: LoginDTO, encryptedPassword: string): Promise<UserDTO | null> {
        try {
            const isValidPassword = await this.compare(data.password, encryptedPassword)
            if (!isValidPassword) {
                return null
            }

            return this.prisma.user.findFirst({
                where: {
                    email: data.email
                }
            })
        } catch (err) {
            this.logger.error(err)
            throw err
        }
    }
}
