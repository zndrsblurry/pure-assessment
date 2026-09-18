import type {
	AgentInput,
	AgentResponse,
} from "@purehomeriver-assessment/shared";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface ApiErrorDetail {
	path: string;
	message: string;
}

// Mirrors the API's { error: { code, message, details } } body; NETWORK_ERROR when no response arrived.
export class ApiClientError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details: ApiErrorDetail[];

	constructor(
		status: number,
		code: string,
		message: string,
		details: ApiErrorDetail[] = [],
	) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl}${path}`, {
			...init,
			headers: { "Content-Type": "application/json", ...init?.headers },
		});
	} catch {
		throw new ApiClientError(0, "NETWORK_ERROR", "Could not reach the API");
	}

	if (response.ok) return response.json() as Promise<T>;

	const body = await response.json().catch(() => null);
	const error = body?.error ?? {};
	throw new ApiClientError(
		response.status,
		error.code ?? "UNKNOWN_ERROR",
		error.message ?? `Request failed with status ${response.status}`,
		error.details ?? [],
	);
}

export const getAgent = (id: string) =>
	request<AgentResponse>(`/agents/${encodeURIComponent(id)}`);

export const createAgent = (input: AgentInput) =>
	request<AgentResponse>("/agents", {
		method: "POST",
		body: JSON.stringify(input),
	});

export const updateAgent = (id: string, input: AgentInput) =>
	request<AgentResponse>(`/agents/${encodeURIComponent(id)}`, {
		method: "PUT",
		body: JSON.stringify(input),
	});
