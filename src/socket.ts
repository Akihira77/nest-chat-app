import typia from "typia"
import { App, SHARED_COMPRESSOR, TemplatedApp, WebSocket } from "uWebSockets.js"
const port = Number(process.env.WS_PORT)

export function startuWS(): TemplatedApp {
	const app = App({})
		.ws("/ws", {
			/* Options */
			compression: SHARED_COMPRESSOR,
			maxPayloadLength: 16 * 1024 * 1024,
			idleTimeout: 10,
			maxBackpressure: 1024,

			/* Handlers */
			open: (ws: WebSocket<unknown>) => {
				ws.subscribe("notification")
				console.log("A client connected to chat socket server", ws)
			},
			message: (ws: WebSocket<unknown>, message: ArrayBuffer) => {
				/* Parse this message according to some application
				 * protocol such as JSON [action, topic, message] */
				//
				type Message = {
					action: string
					senderId: number
					receiverId?: number
					message?: string
					fileUrl?: string
					fileType?: string
				}
				try {
					const dec = new TextDecoder()
					const decData = dec.decode(message)
					const validationResult =
						typia.json.validateParse<Message>(decData)

					if (!validationResult.success) {
						console.log(validationResult.errors)
						ws.send("Message is not correct")
						return
					}

					if (validationResult.data.action === "send__chat") {
						ws.publish(
							validationResult.data.receiverId!.toString(),
							typia.json.stringify({
								senderId: validationResult.data.senderId,
								message: validationResult.data.message,
								fileUrl: validationResult.data.fileUrl,
								fileType: validationResult.data.fileType,
							}),
						)

						ws.send("success sending your message")
					} else if (validationResult.data.action === "subscribe") {
						console.log(
							`client subscribing topic: ${validationResult.data.senderId}`,
						)
						ws.subscribe(validationResult.data.senderId!.toString())
						ws.send(
							`you subscribing topic ${validationResult.data.senderId}`,
						)
					}
				} catch (err) {
					console.log(err)
				}
			},
			drain: (ws) => {
				console.log("WebSocket backpressure: " + ws.getBufferedAmount())
			},
			close: (
				_ws: WebSocket<unknown>,
				code: number,
				message: ArrayBuffer,
			) => {
				/* The library guarantees proper unsubscription at close */
				console.log(code, message)
			},
		})
		.any("/*", (res, _req) => {
			res.end("Nothing to see here!")
		})
		.listen(port, (token) => {
			if (token) {
				console.log("Socket Listening to port " + port)
			} else {
				console.log("Socket Failed to listen to port " + port)
			}
		})

	return app
}
