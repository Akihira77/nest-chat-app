import {
	BadRequestException,
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
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common"
import { ConversationService } from "./conversation.service"
import { Response } from "express"
import { EditMessageDTO, InsertMessageDTO } from "./types"
import typia from "typia"
import { uws } from "src/main"
import { FileInterceptor } from "@nestjs/platform-express"
import * as fs from "fs"
import * as path from "path"

@Controller("conversation")
export class ConversationController {
	constructor(private readonly conversationSvc: ConversationService) {}

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
	@UseInterceptors(
		FileInterceptor("file", {
			limits: {
				fileSize: 5 * 1024 * 1024,
			},
			fileFilter: (
				_req: Request,
				file: Express.Multer.File,
				callback: (error: Error | null, acceptFile: boolean) => void,
			) => {
				const allowedTypes = [
					"image/webp",
					"image/jpeg",
					"image/png",
					"application/pdf",
				] // Tipe file yang diperbolehkan
				if (!allowedTypes.includes(file.mimetype)) {
					return callback(
						new BadRequestException("file type is invalid"),
						false,
					)
				}
				callback(null, true)
			},
		}),
	)
	public async chatting(
		@UploadedFile() file: Express.Multer.File,
		@Body() data: InsertMessageDTO,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const validationResult =
				typia.validateEquals<InsertMessageDTO>(data)
			if (!validationResult.success) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
				})
			}

			const uploadDir = "./assets"
			data.fileUrl = `${Date.now()}-${file.originalname}`
			const filePath = path.join(uploadDir, data.fileUrl)
			data.fileType = file.mimetype

			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true })
			}

			const hasChattedBefore =
				await this.conversationSvc.findConversation(
					parseInt(data.senderId),
					parseInt(data.receiverId),
				)
			let conversationId = hasChattedBefore?.id

			if (!conversationId) {
				conversationId = await this.conversationSvc.create(
					parseInt(data.senderId),
					parseInt(data.receiverId),
				)
			}

			const result = await this.conversationSvc.insertMessage(
				conversationId,
				data,
			)

			await fs.promises.writeFile(filePath, file.buffer)
			uws.publish(
				validationResult.data.receiverId.toString(),
				typia.json.stringify({
					senderId: validationResult.data.senderId,
					message: validationResult.data.message,
					fileUrl: data?.fileUrl,
					fileType: data?.fileType,
				}),
			)
			return res.status(HttpStatus.CREATED).json({ msg: result })
		} catch (err) {
			console.log(err)
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				msg: "Oops. There is an error, please try again",
			})
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
				return res.status(HttpStatus.BAD_REQUEST).json({
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
