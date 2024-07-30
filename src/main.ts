import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { IoAdapter } from "@nestjs/platform-socket.io"
import { startuWS } from "./socket"

export const uws = startuWS()
async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ["verbose"],
	})

	app.setGlobalPrefix("/api")
	await app.listen(Number(process.env.PORT))
	app.useWebSocketAdapter(new IoAdapter(app))
	console.log(`Listening to localhost:${process.env.PORT}`)
}
bootstrap()
