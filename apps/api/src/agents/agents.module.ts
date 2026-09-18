import { Module } from "@nestjs/common";
import { AgentsRepository } from "./agents.repository.js";
import { InMemoryAgentsRepository } from "./in-memory-agents.repository.js";

@Module({
	providers: [
		{ provide: AgentsRepository, useClass: InMemoryAgentsRepository },
	],
	exports: [AgentsRepository],
})
export class AgentsModule {}
