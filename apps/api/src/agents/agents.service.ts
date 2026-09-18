import { randomUUID } from "node:crypto";
import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { AgentsRepository } from "./agents.repository.js";
import { CreateAgentDto } from "./dto/create-agent.dto.js";
import { UpdateAgentDto } from "./dto/update-agent.dto.js";
import { Agent } from "./entities/agent.entity.js";

@Injectable()
export class AgentsService {
	constructor(private readonly agents: AgentsRepository) {}

	findAll(): Promise<Agent[]> {
		return this.agents.findAll();
	}

	async findOne(id: string): Promise<Agent> {
		const agent = await this.agents.findById(id);
		if (!agent) throw new NotFoundException("Agent was not found");
		return agent;
	}

	async create(dto: CreateAgentDto): Promise<Agent> {
		await this.assertEmailAvailable(dto.email);

		const now = new Date();
		return this.agents.create(
			new Agent({ ...dto, id: randomUUID(), createdAt: now, updatedAt: now }),
		);
	}

	async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
		const existing = await this.findOne(id);
		await this.assertEmailAvailable(dto.email, id);

		const updated = new Agent({
			...dto,
			id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		});
		const saved = await this.agents.update(id, updated);
		if (!saved) throw new NotFoundException("Agent was not found");
		return saved;
	}

	async remove(id: string): Promise<void> {
		const deleted = await this.agents.delete(id);
		if (!deleted) throw new NotFoundException("Agent was not found");
	}

	// An agent may keep their own email; anyone else's is a conflict.
	private async assertEmailAvailable(email: string, ownerId?: string) {
		const owner = await this.agents.findByEmail(email);
		if (owner && owner.id !== ownerId) {
			throw new ConflictException("An agent with this email already exists");
		}
	}
}
