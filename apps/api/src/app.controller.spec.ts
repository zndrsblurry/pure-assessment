import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

describe("AppController", () => {
	it("returns the greeting from AppService", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [AppController],
			providers: [AppService],
		}).compile();

		expect(moduleRef.get(AppController).getHello()).toBe("Hello World!");
	});
});
