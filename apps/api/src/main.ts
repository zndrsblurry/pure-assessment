import { NestFactory } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { setupApp } from "./app.setup.js";

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	);

	setupApp(app);
	// @fastify/cors only allows GET/HEAD/POST unless methods are listed explicitly.
	app.enableCors({
		origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
		methods: ["GET", "POST", "PUT", "DELETE"],
	});

	const openApiConfig = new DocumentBuilder()
		.setTitle("Property Agent API")
		.setVersion("1.0")
		.build();
	SwaggerModule.setup("docs", app, () =>
		SwaggerModule.createDocument(app, openApiConfig),
	);

	await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
await bootstrap();
