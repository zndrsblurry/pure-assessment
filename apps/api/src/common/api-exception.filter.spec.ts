import {
	type ArgumentsHost,
	HttpStatus,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error.js";
import { ApiExceptionFilter } from "./api-exception.filter.js";

describe("ApiExceptionFilter", () => {
	const reply = { status: vi.fn(), send: vi.fn() };
	const host = {
		switchToHttp: () => ({ getResponse: () => reply }),
	} as unknown as ArgumentsHost;
	const filter = new ApiExceptionFilter();

	beforeEach(() => {
		reply.status.mockReset().mockReturnValue(reply);
		reply.send.mockReset();
	});

	it("renders ApiError with its code, message and details", () => {
		filter.catch(
			new ApiError(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Bad", [
				{ path: "email" },
			]),
			host,
		);

		expect(reply.status).toHaveBeenCalledWith(400);
		expect(reply.send).toHaveBeenCalledWith({
			error: {
				code: "VALIDATION_FAILED",
				message: "Bad",
				details: [{ path: "email" }],
			},
		});
	});

	it("maps Nest HttpExceptions to a status-derived code", () => {
		filter.catch(new NotFoundException("Cannot GET /nope"), host);

		expect(reply.status).toHaveBeenCalledWith(404);
		expect(reply.send).toHaveBeenCalledWith({
			error: { code: "NOT_FOUND", message: "Cannot GET /nope" },
		});
	});

	it("hides unexpected errors behind a generic 500 and logs them", () => {
		const log = vi
			.spyOn(Logger.prototype, "error")
			.mockImplementation(() => {});
		const boom = new Error("db password is hunter2");

		filter.catch(boom, host);

		expect(reply.status).toHaveBeenCalledWith(500);
		expect(reply.send).toHaveBeenCalledWith({
			error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
		});
		expect(JSON.stringify(reply.send.mock.calls)).not.toContain("hunter2");
		expect(log).toHaveBeenCalledWith(boom);
		log.mockRestore();
	});
});
