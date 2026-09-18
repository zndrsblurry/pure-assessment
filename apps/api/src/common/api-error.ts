import { HttpException, HttpStatus } from "@nestjs/common";

export interface ApiErrorBody {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

// throw this anywhere, ApiExceptionFilter turns it into ApiErrorBody.
export class ApiError extends HttpException {
	constructor(
		status: HttpStatus,
		readonly code: string,
		message: string,
		readonly details?: unknown,
	) {
		super(message, status);
	}
}
