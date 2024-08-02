import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { startuWS } from "./socket"
import { v2 } from "cloudinary"

export const uws = startuWS()
function startCloudinary() {
	v2.config({
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		secure: true,
	})
}

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ["verbose"],
	})

	app.setGlobalPrefix("/api")
	await app.listen(Number(process.env.PORT))
	console.log(`Listening to localhost:${process.env.PORT}`)
}
startCloudinary()
console.log(v2.config())
bootstrap()
