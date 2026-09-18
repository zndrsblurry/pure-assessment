import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module.js";
import { setupApp } from "../app.setup.js";

const validBody = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	mobileNumber: "+44 7700 900000",
};

describe("Agents HTTP API", () => {
	let app: NestFastifyApplication;

	const request = (
		method: "GET" | "POST" | "PUT" | "DELETE",
		url: string,
		payload?: unknown,
	) => app.inject({ method, url, payload: payload as object | undefined });

	const createAgent = async (overrides: Partial<typeof validBody> = {}) => {
		const res = await request("POST", "/agents", {
			...validBody,
			...overrides,
		});
		expect(res.statusCode).toBe(201);
		return res.json();
	};

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = setupApp(
			moduleRef.createNestApplication<NestFastifyApplication>(
				new FastifyAdapter(),
			),
		);
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it("creates an agent and returns it with server-owned fields", async () => {
		const res = await request("POST", "/agents", validBody);

		expect(res.statusCode).toBe(201);
		const body = res.json();
		expect(body).toMatchObject(validBody);
		expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
		expect(body.updatedAt).toBe(body.createdAt);
	});

	it("lists created agents and fetches one by id", async () => {
		const agent = await createAgent({ email: "list@example.com" });

		const list = await request("GET", "/agents");
		const one = await request("GET", `/agents/${agent.id}`);

		expect(list.statusCode).toBe(200);
		expect(list.json()).toContainEqual(agent);
		expect(one.statusCode).toBe(200);
		expect(one.json()).toEqual(agent);
	});

	it("returns a structured 404 for an unknown id", async () => {
		const res = await request(
			"GET",
			"/agents/00000000-0000-0000-0000-000000000000",
		);

		expect(res.statusCode).toBe(404);
		expect(res.json()).toEqual({
			error: { code: "AGENT_NOT_FOUND", message: "Agent was not found" },
		});
	});

	it("updates an agent, keeping createdAt and advancing updatedAt", async () => {
		const agent = await createAgent({ email: "update@example.com" });
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(Date.parse(agent.createdAt) + 60_000));

		const res = await request("PUT", `/agents/${agent.id}`, {
			...validBody,
			email: "update@example.com",
			firstName: "Augusta",
		});
		vi.useRealTimers();

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.firstName).toBe("Augusta");
		expect(body.createdAt).toBe(agent.createdAt);
		expect(Date.parse(body.updatedAt)).toBeGreaterThan(
			Date.parse(agent.updatedAt),
		);
	});

	it("returns 404 when updating or deleting an unknown id", async () => {
		const put = await request("PUT", "/agents/missing", validBody);
		const del = await request("DELETE", "/agents/missing");

		expect(put.statusCode).toBe(404);
		expect(del.statusCode).toBe(404);
		expect(del.json().error.code).toBe("AGENT_NOT_FOUND");
	});

	it("deletes an agent with 204 and no body, then 404s", async () => {
		const agent = await createAgent({ email: "delete@example.com" });

		const del = await request("DELETE", `/agents/${agent.id}`);
		const after = await request("GET", `/agents/${agent.id}`);

		expect(del.statusCode).toBe(204);
		expect(del.body).toBe("");
		expect(after.statusCode).toBe(404);
	});

	it("rejects an invalid email with 400 and field details", async () => {
		const res = await request("POST", "/agents", {
			...validBody,
			email: "nope",
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().error.code).toBe("VALIDATION_FAILED");
		expect(res.json().error.details).toEqual([
			{ path: "email", message: expect.stringContaining("email") },
		]);
	});

	it("rejects missing required fields with 400", async () => {
		const res = await request("POST", "/agents", { firstName: " " });

		expect(res.statusCode).toBe(400);
		const paths = res.json().error.details.map((d: { path: string }) => d.path);
		expect(paths).toEqual(["firstName", "lastName", "email", "mobileNumber"]);
	});

	it("rejects a duplicate email with 409 on create", async () => {
		await createAgent({ email: "dupe@example.com" });

		const res = await request("POST", "/agents", {
			...validBody,
			email: "DUPE@example.com",
		});

		expect(res.statusCode).toBe(409);
		expect(res.json().error.code).toBe("AGENT_EMAIL_ALREADY_EXISTS");
	});

	it("rejects taking another email on update but allows keeping your own", async () => {
		const ada = await createAgent({ email: "ada2@example.com" });
		await createAgent({ email: "grace@example.com" });

		const stolen = await request("PUT", `/agents/${ada.id}`, {
			...validBody,
			email: "grace@example.com",
		});
		const kept = await request("PUT", `/agents/${ada.id}`, {
			...validBody,
			email: "ada2@example.com",
		});

		expect(stolen.statusCode).toBe(409);
		expect(kept.statusCode).toBe(200);
		expect(kept.json().email).toBe("ada2@example.com");
	});

	it("ignores client-supplied id, createdAt and updatedAt", async () => {
		const res = await request("POST", "/agents", {
			...validBody,
			email: "owned@example.com",
			id: "client-id",
			createdAt: "2000-01-01T00:00:00.000Z",
			updatedAt: "2000-01-01T00:00:00.000Z",
		});

		expect(res.statusCode).toBe(201);
		const body = res.json();
		expect(body.id).not.toBe("client-id");
		expect(body.createdAt).not.toBe("2000-01-01T00:00:00.000Z");
		expect(body.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
	});

	it("trims whitespace from input fields", async () => {
		const res = await request("POST", "/agents", {
			firstName: "  Ada ",
			lastName: " Lovelace ",
			email: " trim@example.com ",
			mobileNumber: " 123 ",
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toMatchObject({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "trim@example.com",
			mobileNumber: "123",
		});
	});
});
