import { Module } from "@nestjs/common";
import { AgentsController } from "./agents.controller.js";
import { AgentsRepository } from "./agents.repository.js";
import { AgentsService } from "./agents.service.js";
import { InMemoryAgentsRepository } from "./in-memory-agents.repository.js";

@Module({
	controllers: [AgentsController],
	providers: [
		AgentsService,
		{ provide: AgentsRepository, useClass: InMemoryAgentsRepository },
	],
})
export class AgentsModule {}
