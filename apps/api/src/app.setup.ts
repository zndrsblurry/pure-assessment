import type { INestApplication } from "@nestjs/common";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";

// Shared by main.ts and the HTTP tests so both run the same middleware chain.
export function setupApp<T extends INestApplication>(app: T): T {
	app.useGlobalFilters(new ApiExceptionFilter());
	return app;
}
