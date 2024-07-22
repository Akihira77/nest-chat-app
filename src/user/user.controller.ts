import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	Post,
	Res,
} from "@nestjs/common"
import { UserService } from "./user.service"
import { Response } from "express"
import { CreateUserDTO, LoginDTO } from "./types"
import typia from "typia"
import { jwtSign } from "src/utils"

@Controller("user")
export class UserController {
	constructor(private readonly userSvc: UserService) { }

	@Get()
	public async findAll(@Res() res: Response): Promise<Response> {
		try {
			const users = await this.userSvc.findUsers()

			return res.status(HttpStatus.OK).json({ users })
		} catch (err) {
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
				return res.status(HttpStatus.BAD_REQUEST).json(
					{
						msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
					}
				)
			}

			const user = await this.userSvc.create(data)

			return res.status(HttpStatus.CREATED).json({ token: jwtSign(user.id, user.email), user })
		} catch (err) {
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
				return res.status(HttpStatus.BAD_REQUEST).json(
					{
						msg: `Field ${validationResult.errors[0]?.path} with value ${validationResult.errors[0]?.value} is invalid`,
					}
				)
			}

			let user = await this.userSvc.findUserByEmail(data.email)
			if (!user) {
				return res
					.status(HttpStatus.NOT_FOUND)
					.json({ msg: "user is not found" })
			}

			const isValidPassword = await this.userSvc.login(data, user.password!)

			if (!isValidPassword) {
				return res.status(HttpStatus.BAD_REQUEST).json({ msg: "Password is incorrect" })
			}

			return res.status(HttpStatus.OK).json({ token: jwtSign(user!.id, user!.email), user })
		} catch (err) {
			return res
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ msg: "Oops. There is an error, please try again" })
		}
	}
}
