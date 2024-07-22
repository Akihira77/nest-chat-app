import {
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	Param,
	Post,
	Put,
	Query,
	Res,
} from "@nestjs/common"
import { ConversationService } from "./conversation.service"
import { Response } from "express"
import { EditMessageDTO, InsertMessageDTO } from "./types"
import typia from "typia"

@Controller("conversation")
export class ConversationController {
	constructor(private readonly conversationSvc: ConversationService) { }

	@Get(":userId")
	public async findConversations(
		@Param("userId") userId: string,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const conversations = await this.conversationSvc.findConversations(
				parseInt(userId),
			)

			return res.status(HttpStatus.OK).json({ conversations })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Get(":conversationId")
	public async findMessages(
		@Param("conversationId") conversationId: string,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const messages =
				await this.conversationSvc.findMessages(conversationId)

			if (!messages) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ messages: "conversation is not found" })
			}

			return res.status(HttpStatus.OK).json({ messages })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Post("chat")
	public async chatting(
		@Body() data: InsertMessageDTO,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const validationResult =
				typia.validateEquals<InsertMessageDTO>(data)
			if (!validationResult.success) {
				return res
					.status(HttpStatus.BAD_REQUEST)
					.json({
						msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
					})
			}

			const hasChattedBefore =
				await this.conversationSvc.findConversation(
					data.senderId,
					data.receiverId,
				)
			let conversationId = hasChattedBefore?.id

			if (!conversationId) {
				conversationId = await this.conversationSvc.create(
					data.senderId,
					data.receiverId,
				)
			}

			const result = await this.conversationSvc.insertMessage(
				conversationId,
				data,
			)

			return res.status(HttpStatus.CREATED).json({ msg: result })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Put()
	public async editMessage(
		@Query() query: { conversationId: string; messageId: string },
		@Body() data: EditMessageDTO,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const validationResult = typia.validateEquals<EditMessageDTO>(data)
			if (!validationResult.success) {
				return res
					.status(HttpStatus.BAD_REQUEST)
					.json({
						msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
					})
			}

			const result = await this.conversationSvc.editMessage(
				query.conversationId,
				parseInt(query.messageId),
				data,
			)

			return res.status(HttpStatus.OK).json({ msg: result })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Put("/mark-messages-as-read/:conversationId/:senderId")
	public async markMessagesAsRead(
		@Param() params: { conversationId: string; senderId: string },
		@Res() res: Response,
	): Promise<Response> {
		try {
			await this.conversationSvc.markMessagesAsRead(
				params.conversationId,
				parseInt(params.senderId),
			)

			return res.sendStatus(HttpStatus.OK)
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Delete(":messageId")
	public async removeMessage(
		@Param("messageId") messageId: string,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const result = await this.conversationSvc.removeMessage(
				parseInt(messageId),
			)
			if (!result) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ msg: "removing message failed" })
			}

			return res
				.status(HttpStatus.OK)
				.json({ msg: "success removing message" })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}
}
