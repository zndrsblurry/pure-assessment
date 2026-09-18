import { HttpStatus, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ApiError } from "./api-error.js";

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
	constructor(private readonly schema: ZodType<T>) {}

	transform(value: unknown): T {
		const result = this.schema.safeParse(value);
		if (result.success) return result.data;

		const details = result.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		}));
		throw new ApiError(
			HttpStatus.BAD_REQUEST,
			"VALIDATION_FAILED",
			"Request body is invalid",
			details,
		);
	}
}
