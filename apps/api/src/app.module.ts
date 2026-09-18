import { Module } from "@nestjs/common";
import { AgentsModule } from "./agents/agents.module.js";

@Module({
	imports: [AgentsModule],
})
export class AppModule {}
