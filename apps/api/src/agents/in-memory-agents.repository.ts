import { Injectable } from "@nestjs/common";
import { AgentsRepository } from "./agents.repository.js";
import { Agent } from "./entities/agent.entity.js";

@Injectable()
export class InMemoryAgentsRepository extends AgentsRepository {
	private readonly agents = new Map<string, Agent>();

	async findAll(): Promise<Agent[]> {
		return [...this.agents.values()];
	}

	async findById(id: string): Promise<Agent | null> {
		return this.agents.get(id) ?? null;
	}

	// Case-insensitive to mirror the lower(email) unique index in docs/erd.md.
	async findByEmail(email: string): Promise<Agent | null> {
		const needle = email.toLowerCase();
		for (const agent of this.agents.values()) {
			if (agent.email.toLowerCase() === needle) return agent;
		}
		return null;
	}

	async create(agent: Agent): Promise<Agent> {
		this.agents.set(agent.id, agent);
		return agent;
	}

	async update(id: string, agent: Agent): Promise<Agent | null> {
		if (!this.agents.has(id)) return null;
		this.agents.set(id, agent);
		return agent;
	}

	async delete(id: string): Promise<boolean> {
		return this.agents.delete(id);
	}
}
