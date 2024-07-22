import { Message } from "@prisma/client"

export type InsertMessageDTO = {
	message?: string
	fileUrl?: string
	fileType?: string
	senderId: number
	receiverId: number
}

export type EditMessageDTO = {
	message: string
	senderId: number
	receiverId: number
}

type User = {
	id: number
	name: string
}

export type MessageDTO = {
	userOne: User
	userTwo: User
	messages: Message[]
}

export type ChatDTO = {
	conversationId: string
	body: InsertMessageDTO
}
