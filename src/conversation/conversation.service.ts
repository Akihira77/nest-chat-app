import { Injectable, Logger } from "@nestjs/common"
import { Conversation, Message } from "@prisma/client"
import { PrismaService } from "src/store/prisma.service"
import { EditMessageDTO, InsertMessageDTO, MessageDTO } from "./types"

@Injectable()
export class ConversationService {
	private readonly logger: Logger
	constructor(private readonly prisma: PrismaService) {
		this.logger = new Logger(ConversationService.name)
	}

	public async validateUserMessage(
		senderId: number,
		messageId: number,
	): Promise<Message | null> {
		try {
			return this.prisma.message.findFirst({
				where: {
					senderId: senderId,
					id: messageId,
				},
			})
		} catch (err) {
			console.log(err)
			return null
		}
	}

	public async findMessage(
		conversationId: string,
		messageId: number,
	): Promise<Message | null> {
		try {
			return this.prisma.message.findFirst({
				where: {
					conversationId: conversationId,
					id: messageId,
				},
			})
		} catch (err) {
			console.log(err)
			return null
		}
	}
	public async findConversation(
		userOneId: number,
		userTwoId: number,
	): Promise<Conversation | null> {
		try {
			return this.prisma.conversation.findFirst({
				where: {
					OR: [
						{
							userOneId: userOneId,
							userTwoId: userTwoId,
						},
						{
							userOneId: userTwoId,
							userTwoId: userOneId,
						},
					],
				},
			})
		} catch (err) {
			this.logger.error(err)
			return null
		}
	}

	public async findConversations(userId: number): Promise<Conversation[]> {
		try {
			return this.prisma.conversation.findMany({
				where: {
					OR: [
						{
							userOneId: userId,
						},
						{
							userTwoId: userId,
						},
					],
				},
				include: {
					userOne: {
						select: {
							id: true,
							email: true,
							name: true,
							avatar: true,
						},
					},
					userTwo: {
						select: {
							id: true,
							email: true,
							name: true,
							avatar: true,
						},
					},
				},
			})
		} catch (err) {
			this.logger.error(err)
			return []
		}
	}
	public async createConversation(
		userOneId: number,
		userTwoId: number,
	): Promise<string> {
		try {
			const generateRandomString = function (
				length: number = 6,
				randomString = "",
			) {
				randomString += Math.random().toString(36).substring(2, length)
				if (randomString.length > length)
					return randomString.slice(0, length)
				return generateRandomString(length, randomString)
			}

			const { id } = await this.prisma.conversation.create({
				data: {
					id: generateRandomString(32, ""),
					userOneId: userOneId,
					userTwoId: userTwoId,
				},
				select: {
					id: true,
				},
			})

			return id
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public findMessages(
		conversationId: string | null,
		userId: number | null,
	): Promise<MessageDTO | null> {
		try {
			let condition: any[] = []
			if (conversationId) {
				condition.push({
					id: conversationId,
				})
			}

			if (userId) {
				condition.push(
					{
						userOneId: userId,
					},
					{
						userTwoId: userId,
					},
				)
			}
			return this.prisma.conversation.findFirst({
				where: {
					OR: condition,
				},
				select: {
					id: true,
					userOne: {
						select: {
							id: true,
							name: true,
						},
					},
					userTwo: {
						select: {
							id: true,
							name: true,
						},
					},
					messages: true,
				},
				// include: {
				// 	userOne: {
				// 		select: {
				// 			id: true,
				// 			name: true,
				// 		},
				// 	},
				// 	userTwo: {
				// 		select: {
				// 			id: true,
				// 			name: true,
				// 		},
				// 	},
				// 	messages: true,
				// },
			})
		} catch (err) {
			this.logger.error(err)
			return Promise.resolve({} as MessageDTO)
		}
	}

	public async insert(
		conversationId: string,
		data: InsertMessageDTO,
		senderId: number,
	): Promise<Message> {
		try {
			const message = await this.prisma.message.create({
				data: {
					senderId: senderId,
					receiverId: parseInt(data.receiverId),
					message: data.message ?? "",
					created_at: new Date().toISOString(),
					conversationId: conversationId,
					edited: false,
					unread: true,
					fileUrl: data.fileUrl ?? "",
					fileName: data.fileName ?? "",
					filePublicId: data.filePublicId ?? "",
					fileType: data.fileType ?? "",
				},
			})

			return message
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public async edit(
		conversationId: string,
		messageId: number,
		data: EditMessageDTO,
	): Promise<Message> {
		try {
			const message = await this.prisma.message.update({
				data: {
					message: data.message,
					edited: true,
				},
				where: {
					id: messageId,
					conversationId: conversationId,
				},
			})

			return message
		} catch (err) {
			this.logger.error(err)
			throw err
		}
	}

	public async markMessagesAsRead(
		conversationId: string,
		senderId: number,
	): Promise<boolean> {
		try {
			const result = await this.prisma.message.updateMany({
				data: {
					unread: false,
				},
				where: {
					conversationId: conversationId,
					senderId: senderId,
				},
			})

			return result.count > 0
		} catch (err) {
			this.logger.error(err)
			return false
		}
	}

	public async removeMessage(
		conversationId: string,
		messageId: number,
	): Promise<boolean> {
		try {
			const result = await this.prisma.message.delete({
				where: {
					id: messageId,
					conversationId: conversationId,
				},
			})

			return result !== null
		} catch (err) {
			this.logger.error(err)
			return false
		}
	}
}
