import { HttpStatus } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";

export const agentNotFound = () =>
	new ApiError(HttpStatus.NOT_FOUND, "AGENT_NOT_FOUND", "Agent was not found");

export const agentEmailAlreadyExists = () =>
	new ApiError(
		HttpStatus.CONFLICT,
		"AGENT_EMAIL_ALREADY_EXISTS",
		"An agent with this email already exists",
	);
