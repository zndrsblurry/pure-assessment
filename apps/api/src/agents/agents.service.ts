import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AgentInput } from "@purehomeriver-assessment/shared";
import { agentEmailAlreadyExists, agentNotFound } from "./agents.errors.js";
import { AgentsRepository } from "./agents.repository.js";
import { Agent } from "./entities/agent.entity.js";

@Injectable()
export class AgentsService {
	constructor(private readonly agents: AgentsRepository) {}

	findAll(): Promise<Agent[]> {
		return this.agents.findAll();
	}

	async findOne(id: string): Promise<Agent> {
		const agent = await this.agents.findById(id);
		if (!agent) throw agentNotFound();
		return agent;
	}

	async create(input: AgentInput): Promise<Agent> {
		await this.assertEmailAvailable(input.email);

		const now = new Date();
		return this.agents.create(
			new Agent({ ...input, id: randomUUID(), createdAt: now, updatedAt: now }),
		);
	}

	async update(id: string, input: AgentInput): Promise<Agent> {
		const existing = await this.findOne(id);
		await this.assertEmailAvailable(input.email, id);

		const updated = new Agent({
			...input,
			id,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		});
		const saved = await this.agents.update(id, updated);
		if (!saved) throw agentNotFound();
		return saved;
	}

	async remove(id: string): Promise<void> {
		const deleted = await this.agents.delete(id);
		if (!deleted) throw agentNotFound();
	}

	// An agent may keep their own email; anyone else's is a conflict.
	private async assertEmailAvailable(email: string, ownerId?: string) {
		const owner = await this.agents.findByEmail(email);
		if (owner && owner.id !== ownerId) throw agentEmailAlreadyExists();
	}
}
