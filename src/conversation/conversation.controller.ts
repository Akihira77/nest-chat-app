import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	Req,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common"
import { ConversationService } from "./conversation.service"
import { Request, Response } from "express"
import { EditMessageDTO, InsertMessageDTO } from "./types"
import typia from "typia"
import { uws } from "src/main"
import { FileInterceptor } from "@nestjs/platform-express"
import {
	v2 as cloudinary,
	UploadApiErrorResponse,
	UploadApiResponse,
} from "cloudinary"
import { AuthGuard } from "src/auth/auth.guard"
import { UserService } from "src/user/user.service"
import { Readable } from "stream"

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

	@Get("user")
	public async findConversations(
		@Req() req: Request,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const conversations = await this.conversationSvc.findConversations(
				req.user.userId,
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
			const messages = await this.conversationSvc.findMessages(
				conversationId,
				null,
			)

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
		@Req() req: Request,
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
					req.user.userId,
					parseInt(data.receiverId),
				)
			let conversationId = hasChattedBefore?.id

			if (!conversationId) {
				conversationId = await this.conversationSvc.createConversation(
					req.user.userId,
					parseInt(data.receiverId),
				)
			}

			if (file) {
				async function uploadStream(
					buffer: Buffer,
				): Promise<UploadApiResponse | UploadApiErrorResponse> {
					return new Promise<
						UploadApiResponse | UploadApiErrorResponse
					>((res, rej) => {
						const theTransformStream =
							cloudinary.uploader.upload_stream(
								{
									folder: "uploads",
								},
								(
									err: UploadApiErrorResponse,
									result: UploadApiResponse,
								) => {
									if (err) return rej(err)
									res(result)
								},
							)

						Readable.from(buffer).pipe(theTransformStream)
					})
				}

				const uploadResult = await uploadStream(file.buffer)
				if (!uploadResult.public_id) {
					throw new InternalServerErrorException(
						"File upload error. Try again.",
					)
				}

				data.filePublicId = uploadResult.public_id
				data.fileName = `${Date.now()}-${file.originalname}`
				data.fileUrl = uploadResult.secure_url
				data.fileType = uploadResult.format
			}

			data.senderId = req.user.userId.toString()
			const result = await this.conversationSvc.insert(
				conversationId,
				data,
			)

			uws.publish(
				validationResult.data.receiverId.toString(),
				typia.json.stringify({
					action: "added",
					senderId: req.user.userId,
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
		@Req() req: Request,
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
			const isValidUser = await this.userSvc.findUserById(req.user.userId)
			if (!isValidUser) {
				throw new NotFoundException("user did not found")
			}

			const isUserHasThisMessage =
				await this.conversationSvc.validateUserMessage(
					req.user.userId,
					parseInt(query.messageId),
				)
			if (!isUserHasThisMessage) {
				throw new ForbiddenException("you can't edit this message")
			}

			const result = await this.conversationSvc.edit(
				query.conversationId,
				parseInt(query.messageId),
				data,
			)

			uws.publish(
				data.receiverId.toString(),
				typia.json.stringify({
					action: "edited",
					senderId: req.user.userId,
					message: validationResult.data.message,
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
		@Req() req: Request,
		@Param() params: { conversationId: string },
		@Res() res: Response,
	): Promise<Response> {
		try {
			await this.conversationSvc.markMessagesAsRead(
				params.conversationId,
				req.user.userId,
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

			if (message.filePublicId) {
				cloudinary.uploader.destroy(message.filePublicId, {
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
