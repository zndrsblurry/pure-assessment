import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, createAgent, getAgent, updateAgent } from "./agents";

const input = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	mobileNumber: "+44 7700 900000",
};

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const lastRequest = () => {
	const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
	return { url, method: init.method ?? "GET", body: init.body };
};

describe("agents api client", () => {
	afterEach(() => {
		fetchMock.mockReset();
	});

	it("GETs a single agent by id", async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { id: "a b", ...input }));

		const agent = await getAgent("a b");

		expect(lastRequest()).toMatchObject({
			url: "http://localhost:3000/agents/a%20b",
			method: "GET",
		});
		expect(agent.id).toBe("a b");
	});

	it("POSTs JSON to create and PUTs JSON to update", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse(201, { id: "1", ...input }),
		);

		await createAgent(input);
		expect(lastRequest()).toEqual({
			url: "http://localhost:3000/agents",
			method: "POST",
			body: JSON.stringify(input),
		});

		await updateAgent("1", input);
		expect(lastRequest()).toEqual({
			url: "http://localhost:3000/agents/1",
			method: "PUT",
			body: JSON.stringify(input),
		});
	});

	it("turns a structured API error into ApiClientError", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(400, {
				error: {
					code: "VALIDATION_FAILED",
					message: "Request body is invalid",
					details: [{ path: "email", message: "Invalid email address" }],
				},
			}),
		);

		const error = await createAgent(input).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(ApiClientError);
		expect(error).toMatchObject({
			status: 400,
			code: "VALIDATION_FAILED",
			message: "Request body is invalid",
			details: [{ path: "email", message: "Invalid email address" }],
		});
	});

	it("falls back to a generic error when the body is not the API shape", async () => {
		fetchMock.mockResolvedValue(
			new Response("<html>gateway</html>", { status: 502 }),
		);

		const error = await getAgent("1").catch((e: unknown) => e);

		expect(error).toMatchObject({
			status: 502,
			code: "UNKNOWN_ERROR",
			message: "Request failed with status 502",
			details: [],
		});
	});

	it("reports a network failure as NETWORK_ERROR", async () => {
		fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

		const error = await getAgent("1").catch((e: unknown) => e);

		expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
	});
});
