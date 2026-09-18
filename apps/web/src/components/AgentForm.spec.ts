import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiClientError,
	createAgent,
	getAgent,
	updateAgent,
} from "@/api/agents";
import AgentForm from "./AgentForm.vue";

vi.mock("@/api/agents", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/api/agents")>()),
	createAgent: vi.fn(),
	getAgent: vi.fn(),
	updateAgent: vi.fn(),
}));

const input = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	mobileNumber: "+44 7700 900000",
};

const savedAgent = {
	...input,
	id: "11111111-1111-4111-8111-111111111111",
	createdAt: "2026-01-01T10:00:00.000Z",
	updatedAt: "2026-01-01T10:00:00.000Z",
};

const mountForm = (agentId: string | null = null) =>
	mount(AgentForm, { props: { agentId } });

async function fillForm(
	wrapper: ReturnType<typeof mountForm>,
	values: Partial<typeof input> = {},
) {
	const data = { ...input, ...values };
	for (const [name, value] of Object.entries(data)) {
		await wrapper.get(`#${name}`).setValue(value);
	}
}

const submit = async (wrapper: ReturnType<typeof mountForm>) => {
	await wrapper.get("form").trigger("submit");
	await flushPromises();
};

const alerts = (wrapper: ReturnType<typeof mountForm>) =>
	wrapper.findAll('[role="alert"]').map((el) => el.text());

describe("AgentForm", () => {
	beforeEach(() => {
		vi.mocked(createAgent).mockReset();
		vi.mocked(getAgent).mockReset();
		vi.mocked(updateAgent).mockReset();
	});

	it("renders a labelled field for each attribute and a create button", () => {
		const wrapper = mountForm();

		for (const name of Object.keys(input)) {
			const label = wrapper.get(`label[for="${name}"]`);
			expect(label.text()).not.toBe("");
			expect(wrapper.get(`#${name}`).element.tagName).toBe("INPUT");
		}
		expect(wrapper.get("button[type=submit]").text()).toBe("Create Agent");
	});

	it("blocks submission and shows required errors when fields are empty", async () => {
		const wrapper = mountForm();

		await submit(wrapper);

		expect(alerts(wrapper)).toHaveLength(4);
		expect(wrapper.get("#email").attributes("aria-invalid")).toBe("true");
		expect(createAgent).not.toHaveBeenCalled();
	});

	it("flags an invalid email without calling the API", async () => {
		const wrapper = mountForm();
		await fillForm(wrapper, { email: "not-an-email" });

		await submit(wrapper);

		expect(alerts(wrapper)).toEqual(["Invalid email address"]);
		expect(createAgent).not.toHaveBeenCalled();
	});

	it("clears a field error once the user edits that field", async () => {
		const wrapper = mountForm();
		await submit(wrapper);

		await wrapper.get("#firstName").setValue("A");

		expect(alerts(wrapper)).toHaveLength(3);
	});

	it("sends a create request with trimmed values and switches to edit mode", async () => {
		vi.mocked(createAgent).mockResolvedValue(savedAgent);
		const wrapper = mountForm();
		await fillForm(wrapper, {
			firstName: "  Ada ",
			email: " ada@example.com ",
		});

		await submit(wrapper);

		expect(createAgent).toHaveBeenCalledWith(input);
		expect(updateAgent).not.toHaveBeenCalled();
		expect(wrapper.emitted("saved")).toEqual([[savedAgent.id]]);
		expect(wrapper.get("button[type=submit]").text()).toBe("Update Agent");
		expect(wrapper.text()).toContain("Agent created.");
		expect(wrapper.text()).toContain(savedAgent.id);
	});

	it("loads the agent in edit mode and sends an update request", async () => {
		vi.mocked(getAgent).mockResolvedValue(savedAgent);
		vi.mocked(updateAgent).mockResolvedValue({
			...savedAgent,
			lastName: "King",
		});
		const wrapper = mountForm(savedAgent.id);
		await flushPromises();

		expect(getAgent).toHaveBeenCalledWith(savedAgent.id);
		expect((wrapper.get("#firstName").element as HTMLInputElement).value).toBe(
			"Ada",
		);
		expect(wrapper.get("button[type=submit]").text()).toBe("Update Agent");

		await wrapper.get("#lastName").setValue("King");
		await submit(wrapper);

		expect(updateAgent).toHaveBeenCalledWith(savedAgent.id, {
			...input,
			lastName: "King",
		});
		expect(createAgent).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain("Agent updated.");
	});

	it("disables the form while a request is in flight", async () => {
		let resolve!: (value: typeof savedAgent) => void;
		vi.mocked(createAgent).mockReturnValue(new Promise((r) => (resolve = r)));
		const wrapper = mountForm();
		await fillForm(wrapper);

		await wrapper.get("form").trigger("submit");
		await flushPromises();

		const button = wrapper.get("button[type=submit]");
		expect(button.text()).toBe("Saving…");
		expect(button.attributes("disabled")).toBeDefined();
		expect(wrapper.get("#email").attributes("disabled")).toBeDefined();

		await wrapper.get("form").trigger("submit");
		expect(createAgent).toHaveBeenCalledTimes(1);

		resolve(savedAgent);
		await flushPromises();
		expect(button.attributes("disabled")).toBeUndefined();
	});

	it("shows a duplicate email conflict on the email field", async () => {
		vi.mocked(createAgent).mockRejectedValue(
			new ApiClientError(409, "AGENT_EMAIL_ALREADY_EXISTS", "exists"),
		);
		const wrapper = mountForm();
		await fillForm(wrapper);

		await submit(wrapper);

		expect(alerts(wrapper)).toEqual(["Another agent already uses this email."]);
		expect(wrapper.get("#email").attributes("aria-invalid")).toBe("true");
	});

	it("maps backend validation details onto fields", async () => {
		vi.mocked(createAgent).mockRejectedValue(
			new ApiClientError(400, "VALIDATION_FAILED", "invalid", [
				{ path: "mobileNumber", message: "Too long" },
			]),
		);
		const wrapper = mountForm();
		await fillForm(wrapper);

		await submit(wrapper);

		expect(alerts(wrapper)).toEqual([
			"Too long",
			"Please fix the highlighted fields.",
		]);
	});

	it("renders other backend errors as a form-level message", async () => {
		vi.mocked(createAgent).mockRejectedValue(
			new ApiClientError(0, "NETWORK_ERROR", "Could not reach the API"),
		);
		const wrapper = mountForm();
		await fillForm(wrapper);

		await submit(wrapper);

		expect(alerts(wrapper)).toEqual(["Could not reach the API"]);
	});

	it("explains when the agent being edited does not exist", async () => {
		vi.mocked(getAgent).mockRejectedValue(
			new ApiClientError(404, "AGENT_NOT_FOUND", "Agent was not found"),
		);
		const wrapper = mountForm("missing");
		await flushPromises();

		expect(alerts(wrapper)[0]).toMatch(/no longer exists/);
	});
});
