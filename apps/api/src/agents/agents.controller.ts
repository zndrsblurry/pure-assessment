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
import { ApiTags } from "@nestjs/swagger";
import { AgentsService } from "./agents.service.js";
import { CreateAgentDto } from "./dto/create-agent.dto.js";
import { UpdateAgentDto } from "./dto/update-agent.dto.js";
import { Agent } from "./entities/agent.entity.js";

@ApiTags("agents")
@Controller("agents")
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	create(@Body() dto: CreateAgentDto): Promise<Agent> {
		return this.agentsService.create(dto);
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
	update(@Param("id") id: string, @Body() dto: UpdateAgentDto): Promise<Agent> {
		return this.agentsService.update(id, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	remove(@Param("id") id: string): Promise<void> {
		return this.agentsService.remove(id);
	}
}
