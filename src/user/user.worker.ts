import { v2 as cloudinary } from "cloudinary"
import { PrismaService } from "src/store/prisma.service"
import { parentPort } from "worker_threads"

parentPort?.on("message", async (userId: number): Promise<void> => {
	const prisma = new PrismaService()
	const messages = await prisma.message.findMany({
		where: {
			OR: [
				{
					senderId: userId,
				},
				{
					receiverId: userId,
				},
			],
		},
	})

	let arr: string[] = []
	for (const message of messages) {
		try {
			if (message.filePublicId) {
				arr.push(message.filePublicId)
				cloudinary.uploader.destroy(message.filePublicId, {
					invalidate: true,
				})
				console.log("delete success")
			}
		} catch (err) {
			parentPort?.postMessage({ status: "error", err })
		}
	}

	parentPort?.postMessage({ status: "success", data: arr })
})
