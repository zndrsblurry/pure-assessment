import { HttpStatus } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../common/api-error.js";
import { AgentsService } from "./agents.service.js";
import { InMemoryAgentsRepository } from "./in-memory-agents.repository.js";

const input = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	mobileNumber: "+44 7700 900000",
};

async function expectApiError(
	promise: Promise<unknown>,
	status: HttpStatus,
	code: string,
) {
	const error = await promise.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(ApiError);
	expect((error as ApiError).getStatus()).toBe(status);
	expect((error as ApiError).code).toBe(code);
}

describe("AgentsService", () => {
	let service: AgentsService;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
		service = new AgentsService(new InMemoryAgentsRepository());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("creates an agent with a generated id and matching timestamps", async () => {
		const agent = await service.create(input);

		expect(agent).toMatchObject(input);
		expect(agent.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(agent.createdAt).toEqual(new Date("2026-01-01T10:00:00.000Z"));
		expect(agent.updatedAt).toEqual(agent.createdAt);
	});

	it("rejects a duplicate email regardless of case", async () => {
		await service.create(input);

		await expectApiError(
			service.create({ ...input, email: "ADA@example.com" }),
			HttpStatus.CONFLICT,
			"AGENT_EMAIL_ALREADY_EXISTS",
		);
	});

	it("returns 404 for unknown ids on read, update and delete", async () => {
		await expectApiError(
			service.findOne("missing"),
			HttpStatus.NOT_FOUND,
			"AGENT_NOT_FOUND",
		);
		await expectApiError(
			service.update("missing", input),
			HttpStatus.NOT_FOUND,
			"AGENT_NOT_FOUND",
		);
		await expectApiError(
			service.remove("missing"),
			HttpStatus.NOT_FOUND,
			"AGENT_NOT_FOUND",
		);
	});

	it("keeps createdAt and advances updatedAt on update", async () => {
		const created = await service.create(input);
		vi.setSystemTime(new Date("2026-01-02T10:00:00.000Z"));

		const updated = await service.update(created.id, {
			...input,
			firstName: "Augusta",
		});

		expect(updated.firstName).toBe("Augusta");
		expect(updated.createdAt).toEqual(created.createdAt);
		expect(updated.updatedAt).toEqual(new Date("2026-01-02T10:00:00.000Z"));
		expect(await service.findOne(created.id)).toEqual(updated);
	});

	it("lets an agent keep their own email but not take another one", async () => {
		const ada = await service.create(input);
		await service.create({ ...input, email: "grace@example.com" });

		await expect(service.update(ada.id, input)).resolves.toMatchObject({
			email: input.email,
		});
		await expectApiError(
			service.update(ada.id, { ...input, email: "Grace@Example.com" }),
			HttpStatus.CONFLICT,
			"AGENT_EMAIL_ALREADY_EXISTS",
		);
	});

	it("removes an agent so it can no longer be found", async () => {
		const agent = await service.create(input);

		await service.remove(agent.id);

		await expectApiError(
			service.findOne(agent.id),
			HttpStatus.NOT_FOUND,
			"AGENT_NOT_FOUND",
		);
		expect(await service.findAll()).toEqual([]);
	});
});
