import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpStatus,
	Logger,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common"
import { ConversationService } from "./conversation.service"
import { Response } from "express"
import { EditMessageDTO, InsertMessageDTO } from "./types"
import typia from "typia"
import { uws } from "src/main"
import { FileInterceptor } from "@nestjs/platform-express"
import { v2 } from "cloudinary"
import * as fs from "fs"
import * as path from "path"
import { AuthGuard } from "src/auth/auth.guard"
import { UserService } from "src/user/user.service"

@Controller("conversation")
@UseGuards(AuthGuard)
export class ConversationController {
	private readonly logger: Logger
	constructor(
		private readonly conversationSvc: ConversationService,
		private readonly userSvc: UserService,
	) {
		this.logger = new Logger(ConversationController.name)
	}

	@Get("user/:userId")
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

			if (file) {
				const uploadDir = "./uploads"
				if (!fs.existsSync(uploadDir)) {
					fs.mkdirSync(uploadDir, { recursive: true })
				}
				const fileName = `${Date.now()}-${file.originalname}`
				const filePath = path.join(uploadDir, fileName)
				await fs.promises.writeFile(filePath, file.buffer)

				const result = await v2.uploader.upload(filePath, {
					resource_type: "auto",
					eager: [
						{ fetch_format: "avif", format: "" },
						{ fetch_format: "jp2", format: "" },
						{
							fetch_format: "webp",
							flags: "awebp",
							format: "",
						},
					],
					use_asset_folder_as_public_id_prefix: true,
				})

				if (!result?.public_id) {
					throw new Error("File upload error. Try again.")
				}

				data.filePublicId = result.public_id
				data.fileName = fileName
				data.fileUrl = result.secure_url
				data.fileType = result.type
			}

			const result = await this.conversationSvc.insertMessage(
				conversationId,
				data,
			)

			uws.publish(
				validationResult.data.receiverId.toString(),
				typia.json.stringify({
					action: "added",
					senderId: validationResult.data.senderId,
					message: validationResult.data.message,
					fileUrl: data?.fileUrl,
					fileType: data?.fileType,
				}),
			)
			return res.status(HttpStatus.CREATED).json({ msg: result })
		} catch (err) {
			this.logger.error(err)
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
			const isValidUser = await this.userSvc.findUserById(data.senderId)
			if (!isValidUser) {
				throw new NotFoundException("user did not found")
			}

			const isUserHasThisMessage =
				await this.conversationSvc.validateUserMessage(
					data.senderId,
					parseInt(query.messageId),
				)
			if (!isUserHasThisMessage) {
				throw new ForbiddenException("you can't edit this message")
			}

			const result = await this.conversationSvc.editMessage(
				query.conversationId,
				parseInt(query.messageId),
				data,
			)

			uws.publish(
				data.receiverId.toString(),
				typia.json.stringify({
					action: "edited",
					senderId: data.senderId,
					messageId: result.id,
				}),
			)
			return res.status(HttpStatus.OK).json({ msg: result })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(err.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
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
			this.logger.error(err)
			return res
				.status(err.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
		}
	}

	@Delete(":conversationId/:messageId")
	public async removeMessage(
		@Param() params: { conversationId: string; messageId: string },
		@Res() res: Response,
	): Promise<Response> {
		try {
			const message = await this.conversationSvc.findMessage(
				params.conversationId,
				parseInt(params.messageId),
			)
			if (!message) {
				throw new NotFoundException("message did not found")
			}

			if (message.fileName) {
				const fileDir = "./uploads"
				if (!fs.existsSync(fileDir)) {
					fs.mkdirSync(fileDir, { recursive: true })
				}
				const filePath = path.join(fileDir, message.fileName)
				fs.rm(filePath, (err: Error | null) => {
					if (err) {
						return err
					}
				})

				v2.uploader.destroy(message.filePublicId!, {
					invalidate: true,
				})
			}

			const result = await this.conversationSvc.removeMessage(
				params.conversationId,
				parseInt(params.messageId),
			)
			if (!result) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ msg: "removing message failed" })
			}

			uws.publish(
				message.receiverId.toString(),
				typia.json.stringify({
					action: "deleted",
					senderId: message.senderId,
					messageId: message.id,
				}),
			)

			return res
				.status(HttpStatus.OK)
				.json({ msg: "success removing message" })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(err.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
		}
	}
}
