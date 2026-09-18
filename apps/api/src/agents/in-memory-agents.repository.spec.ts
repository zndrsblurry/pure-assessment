import { beforeEach, describe, expect, it } from "vitest";
import { Agent } from "./entities/agent.entity.js";
import { InMemoryAgentsRepository } from "./in-memory-agents.repository.js";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	const now = new Date("2026-01-01T00:00:00.000Z");
	return new Agent({
		id: "agent-1",
		firstName: "Ada",
		lastName: "Lovelace",
		email: "ada@example.com",
		mobileNumber: "+44 7700 900000",
		createdAt: now,
		updatedAt: now,
		...overrides,
	});
}

describe("InMemoryAgentsRepository", () => {
	let repository: InMemoryAgentsRepository;

	beforeEach(() => {
		repository = new InMemoryAgentsRepository();
	});

	it("stores a created agent and finds it by id", async () => {
		const agent = makeAgent();

		await repository.create(agent);

		expect(await repository.findById(agent.id)).toBe(agent);
	});

	it("returns null for an unknown id", async () => {
		expect(await repository.findById("missing")).toBeNull();
	});

	it("lists every stored agent", async () => {
		await repository.create(makeAgent({ id: "a" }));
		await repository.create(makeAgent({ id: "b", email: "b@example.com" }));

		const all = await repository.findAll();

		expect(all.map((a) => a.id)).toEqual(["a", "b"]);
	});

	it("finds by email ignoring case", async () => {
		const agent = makeAgent({ email: "Ada@Example.com" });
		await repository.create(agent);

		expect(await repository.findByEmail("ada@example.com")).toBe(agent);
		expect(await repository.findByEmail("other@example.com")).toBeNull();
	});

	it("replaces an existing agent on update and rejects unknown ids", async () => {
		const agent = makeAgent();
		await repository.create(agent);
		const renamed = makeAgent({ firstName: "Augusta" });

		expect(await repository.update(agent.id, renamed)).toBe(renamed);
		expect(await repository.findById(agent.id)).toBe(renamed);
		expect(await repository.update("missing", renamed)).toBeNull();
	});

	it("deletes an agent once", async () => {
		const agent = makeAgent();
		await repository.create(agent);

		expect(await repository.delete(agent.id)).toBe(true);
		expect(await repository.delete(agent.id)).toBe(false);
		expect(await repository.findById(agent.id)).toBeNull();
	});
});
