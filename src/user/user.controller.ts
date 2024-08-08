import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	Param,
	Post,
	Put,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common"
import { UserService } from "./user.service"
import { Response } from "express"
import { CreateUserDTO, EditUserDTO, LoginDTO } from "./types"
import typia from "typia"
import { jwtSign } from "src/utils"
import { AuthGuard } from "src/auth/auth.guard"

@Controller("user")
export class UserController {
	private readonly logger: Logger
	constructor(private readonly userSvc: UserService) {
		this.logger = new Logger(UserController.name)
	}

	@Get()
	public async findAll(@Res() res: Response): Promise<Response> {
		try {
			const users = await this.userSvc.findUsers()

			return res.status(HttpStatus.OK).json({ users })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Get(":userId")
	public async findUserById(
		@Param("userId") userId: string,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const user = await this.userSvc.findUserById(parseInt(userId))

			if (!user) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ msg: "user is not found" })
			}

			return res.status(HttpStatus.OK).json({ user })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Post("register")
	public async register(
		@Body() data: CreateUserDTO,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const validationResult = typia.validateEquals<CreateUserDTO>(data)
			if (!validationResult.success) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
				})
			}

			const user = await this.userSvc.create(data)

			return res
				.status(HttpStatus.CREATED)
				.json({ token: jwtSign(user.id, user.name, user.email), user })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@Post("login")
	public async login(
		@Body() data: LoginDTO,
		@Res() res: Response,
	): Promise<Response> {
		try {
			const validationResult = typia.validateEquals<LoginDTO>(data)
			if (!validationResult.success) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
				})
			}

			let user = await this.userSvc.findUserByEmail(data.email)
			if (!user) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ msg: "user is not found" })
			}

			const isValidPassword = await this.userSvc.login(
				data,
				user.password!,
			)

			if (!isValidPassword) {
				return res
					.status(HttpStatus.BAD_REQUEST)
					.json({ msg: "Password is incorrect" })
			}

			return res.status(HttpStatus.OK).json({
				token: jwtSign(user!.id, user!.name, user!.email),
				user,
			})
		} catch (err) {
			this.logger.error(err)
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}

	@UseGuards(AuthGuard)
	@Put(":userId")
	public async edit(
		@Req() req: Express.Request,
		@Param("userId") userId: string,
		@Body() body: EditUserDTO,
		@Res() res: Response,
	) {
		try {
			const user = await this.userSvc.findUserById(parseInt(userId))
			if (!user) {
				throw new NotFoundException("user did not found")
			}

			if (req.user.userId !== user.id) {
				throw new BadRequestException("invalid credentials")
			}

			const validationResult = typia.validateEquals<EditUserDTO>(body)
			if (!validationResult.success) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
				})
			}

			const result = await this.userSvc.edit(parseInt(userId), body)
			if (!result) {
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					msg: "There is an error for updating your data, please check again your new data and try again",
				})
			}

			return res.status(HttpStatus.OK).json({ user: result })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(err.code ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
		}
	}

	@UseGuards(AuthGuard)
	@Put("change-password/:userId")
	public async changePassword(
		@Req() req: Express.Request,
		@Param("userId") userId: string,
		@Body() body: { password: string },
		@Res() res: Response,
	) {
		try {
			const user = await this.userSvc.findUserById(parseInt(userId))
			if (!user) {
				throw new NotFoundException("user did not found")
			}

			if (req.user.userId !== user.id) {
				throw new BadRequestException("invalid credentials")
			}

			const validationResult = typia.validateEquals<{ password: string }>(
				body,
			)
			if (!validationResult.success) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
				})
			}

			const result = await this.userSvc.changePassword(
				parseInt(userId),
				body.password,
			)
			if (!result) {
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					msg: "There is an error for updating your password, please check again your new password and try again",
				})
			}

			return res.status(HttpStatus.OK).json({ user: result })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(err.code ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
		}
	}

	@UseGuards(AuthGuard)
	@Delete()
	public async delete(@Req() req: any, @Res() res: Response) {
		try {
			const result = await this.userSvc.delete(req.user.userId)
			if (!result) {
				throw new InternalServerErrorException()
			}

			return res
				.status(HttpStatus.OK)
				.json({ msg: "deleting account success" })
		} catch (err) {
			this.logger.error(err)
			return res
				.status(err.code ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({
					msg:
						err.message ??
						"Oops. There is an error, please try again",
				})
		}
	}
}
