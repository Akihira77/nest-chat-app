import { Injectable, Logger } from "@nestjs/common"
import { User } from "@prisma/client"
import { PrismaService } from "src/store/prisma.service"
import { CreateUserDTO, EditUserDTO, LoginDTO, UserDTO } from "./types"
import * as bcrypt from "bcrypt"
import { v2 as cloudinary } from "cloudinary"

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

	public findUserByEmail(email: string): Promise<{
		id: number
		name: string
		email: string
		password: string
	} | null> {
		try {
			return this.prisma.user.findFirst({
				where: {
					email: email,
				},
				select: {
					id: true,
					name: true,
					email: true,
					password: true,
				},
			})
		} catch (err) {
			this.logger.error(err)
			return Promise.resolve(null)
		}
	}
	public findUserById(id: number): Promise<UserDTO | null> {
		try {
			return this.prisma.user.findFirst({
				where: {
					id: id,
				},
				select: {
					id: true,
					name: true,
					email: true,
					avatar: true,
					created_at: true,
				},
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

	private compare(
		password: string,
		encryptedPassword: string,
	): Promise<boolean> {
		try {
			return Promise.resolve(bcrypt.compare(password, encryptedPassword))
		} catch (err) {
			this.logger.error(err)
			return Promise.resolve(false)
		}
	}

	public async create(data: CreateUserDTO): Promise<UserDTO> {
		try {
			return this.prisma.user.create({
				data: {
					email: data.email,
					name: data.name,
					avatar: data.avatar,
					password: await this.hash(data.password),
					created_at: new Date().toISOString(),
				},
			})
		} catch (err) {
			this.logger.error(err)
			return Promise.resolve({} as UserDTO)
		}
	}

	public async login(
		data: LoginDTO,
		encryptedPassword: string,
	): Promise<UserDTO | null> {
		try {
			const isValidPassword = await this.compare(
				data.password,
				encryptedPassword,
			)
			if (!isValidPassword) {
				return null
			}

			return this.prisma.user.findFirst({
				where: {
					email: data.email,
				},
			})
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public async edit(userId: number, data: EditUserDTO): Promise<User | null> {
		try {
			return await this.prisma.user.update({
				where: {
					id: userId,
				},
				data: {
					name: data.name,
					avatar: data.avatar,
				},
			})
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public async changePassword(
		userId: number,
		newPassword: string,
	): Promise<User | null> {
		try {
			return await this.prisma.user.update({
				where: {
					id: userId,
				},
				data: {
					password: await this.hash(newPassword),
				},
			})
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public async delete(userId: number): Promise<boolean> {
		try {
			cloudinary.api
				.delete_resources_by_prefix("uploads/" + userId.toString())
				.then(() =>
					cloudinary.api.delete_folder(
						"uploads/" + userId.toString(),
					),
				)

			return (
				(await this.prisma.user.delete({
					where: {
						id: userId,
					},
				})) !== null
			)
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}
}
