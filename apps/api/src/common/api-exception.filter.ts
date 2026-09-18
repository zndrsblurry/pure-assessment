import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ApiError, ApiErrorBody } from "./api-error.js";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(ApiExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const reply = host.switchToHttp().getResponse<FastifyReply>();
		const { status, body } = this.toResponse(exception);
		reply.status(status).send(body);
	}

	private toResponse(exception: unknown): {
		status: number;
		body: ApiErrorBody;
	} {
		if (exception instanceof ApiError) {
			const { code, message, details } = exception;
			return {
				status: exception.getStatus(),
				body: { error: { code, message, details } },
			};
		}

		// get a status-derived code for nest's own exceptions
		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			return {
				status,
				body: {
					error: { code: HttpStatus[status], message: exception.message },
				},
			};
		}

		this.logger.error(exception);
		return {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			body: {
				error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
			},
		};
	}
}
