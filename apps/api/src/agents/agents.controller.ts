import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Put,
} from "@nestjs/common";
import { ApiBody, ApiTags, type SchemaObject } from "@nestjs/swagger";
import type { AgentInput } from "@purehomeriver-assessment/shared";
import { agentInputSchema } from "@purehomeriver-assessment/shared";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AgentsService } from "./agents.service.js";
import { Agent } from "./entities/agent.entity.js";

// Swagger reads the same schema the pipe validates with, so docs cannot drift.
const { $schema: _, ...agentInputJsonSchema } =
	z.toJSONSchema(agentInputSchema);
const agentBody = { schema: agentInputJsonSchema as SchemaObject };
const validateAgentInput = new ZodValidationPipe(agentInputSchema);

@ApiTags("agents")
@Controller("agents")
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	@ApiBody(agentBody)
	create(@Body(validateAgentInput) input: AgentInput): Promise<Agent> {
		return this.agentsService.create(input);
	}

	@Get()
	findAll(): Promise<Agent[]> {
		return this.agentsService.findAll();
	}

	@Get(":id")
	findOne(@Param("id") id: string): Promise<Agent> {
		return this.agentsService.findOne(id);
	}

	@Put(":id")
	@ApiBody(agentBody)
	update(
		@Param("id") id: string,
		@Body(validateAgentInput) input: AgentInput,
	): Promise<Agent> {
		return this.agentsService.update(id, input);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	remove(@Param("id") id: string): Promise<void> {
		return this.agentsService.remove(id);
	}
}
