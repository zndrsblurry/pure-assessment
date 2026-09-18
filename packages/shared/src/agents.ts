import { z } from "zod";

const trimmed = (value: unknown) =>
	typeof value === "string" ? value.trim() : value;

// Lengths mirror the property_agents table in docs/erd.md.
export const agentInputSchema = z.object({
	firstName: z.string().trim().min(1).max(100),
	lastName: z.string().trim().min(1).max(100),
	// z.email() checks the format before .trim() would run, so trim up front.
	email: z.preprocess(trimmed, z.email().max(254)),
	mobileNumber: z.string().trim().min(1).max(32),
});

export type AgentInput = z.infer<typeof agentInputSchema>;

export interface AgentResponse extends AgentInput {
	id: string;
	createdAt: string;
	updatedAt: string;
}
