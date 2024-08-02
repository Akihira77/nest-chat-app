export type UserDTO = {
	id: number
	name: string
	email: string
	avatar: string
	created_at: Date
}

export type CreateUserDTO = {
	email: string
	name: string
	avatar: string
	password: string
}

export type LoginDTO = {
	email: string
	password: string
}

export type EditUserDTO = {
	name: string
	avatar: string
}
