import { Module } from "@nestjs/common";
import { AgentsModule } from "./agents/agents.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

@Module({
	imports: [AgentsModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
