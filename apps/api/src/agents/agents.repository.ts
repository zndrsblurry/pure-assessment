import { Agent } from "./entities/agent.entity.js";

export abstract class AgentsRepository {
	abstract findAll(): Promise<Agent[]>;
	abstract findById(id: string): Promise<Agent | null>;
	abstract findByEmail(email: string): Promise<Agent | null>;
	abstract create(agent: Agent): Promise<Agent>;
	abstract update(id: string, agent: Agent): Promise<Agent | null>;
	abstract delete(id: string): Promise<boolean>;
}
