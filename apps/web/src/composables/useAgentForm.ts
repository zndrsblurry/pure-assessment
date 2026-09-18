import {
	type AgentInput,
	agentInputSchema,
} from "@purehomeriver-assessment/shared";
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
	ApiClientError,
	type ApiErrorDetail,
	createAgent,
	getAgent,
	updateAgent,
} from "@/api/agents";

export type AgentField = keyof AgentInput;
export type FieldErrors = Partial<Record<AgentField, string>>;
export type FormStatus = "idle" | "loading" | "submitting" | "saved" | "error";

const emptyInput = (): AgentInput => ({
	firstName: "",
	lastName: "",
	email: "",
	mobileNumber: "",
});

const agentFields = Object.keys(emptyInput()) as AgentField[];

const pickInput = (source: AgentInput): AgentInput =>
	Object.fromEntries(agentFields.map((f) => [f, source[f]])) as AgentInput;

const fieldErrorsFrom = (details: ApiErrorDetail[]): FieldErrors =>
	Object.fromEntries(
		details.map(({ path, message }) => [path as AgentField, message]),
	);

// Local state only: one screen, no cross-component sharing, so no store is needed.
export function useAgentForm(initialId: string | null) {
	const agentId = ref(initialId);
	const form = reactive<AgentInput>(emptyInput());
	const fieldErrors = ref<FieldErrors>({});
	const status = ref<FormStatus>(initialId ? "loading" : "idle");
	const formError = ref<string | null>(null);
	const lastSave = ref<"created" | "updated" | null>(null);
	// Last server-confirmed values; null until something has been loaded or saved.
	const savedInput = ref<AgentInput | null>(null);

	const isEditing = computed(() => agentId.value !== null);
	const isBusy = computed(
		() => status.value === "loading" || status.value === "submitting",
	);
	const isDirty = computed(() => {
		const saved = savedInput.value;
		return !saved || agentFields.some((f) => form[f] !== saved[f]);
	});
	const canSubmit = computed(() => !isBusy.value && isDirty.value);
	const canDiscard = computed(() => savedInput.value !== null && isDirty.value);

	function setForm(input: AgentInput) {
		Object.assign(form, input);
	}

	function applySaved(agent: AgentInput) {
		savedInput.value = pickInput(agent);
		setForm(savedInput.value);
	}

	function discardChanges() {
		if (!savedInput.value) return;
		setForm(savedInput.value);
		fieldErrors.value = {};
		formError.value = null;
		status.value = "idle";
	}

	function clearFieldError(field: AgentField) {
		if (fieldErrors.value[field]) {
			fieldErrors.value = { ...fieldErrors.value, [field]: undefined };
		}
	}

	async function load(id: string) {
		status.value = "loading";
		try {
			applySaved(await getAgent(id));
			status.value = "idle";
		} catch (error) {
			status.value = "error";
			formError.value =
				error instanceof ApiClientError && error.status === 404
					? "This agent no longer exists. Clear the URL to create a new one."
					: describe(error);
		}
	}

	// Frontend validation is UX only; the API re-validates with the same schema.
	function validate(): AgentInput | null {
		const result = agentInputSchema.safeParse(form);
		if (result.success) {
			fieldErrors.value = {};
			return result.data;
		}
		fieldErrors.value = fieldErrorsFrom(
			result.error.issues.map((issue) => ({
				path: String(issue.path[0]),
				message: issue.message,
			})),
		);
		return null;
	}

	async function submit() {
		if (!canSubmit.value) return;
		formError.value = null;
		const input = validate();
		if (!input) return;

		status.value = "submitting";
		try {
			const saved = agentId.value
				? await updateAgent(agentId.value, input)
				: await createAgent(input);
			lastSave.value = agentId.value ? "updated" : "created";
			agentId.value = saved.id;
			applySaved(saved);
			status.value = "saved";
		} catch (error) {
			status.value = "error";
			applyServerError(error);
		}
	}

	function applyServerError(error: unknown) {
		if (!(error instanceof ApiClientError)) {
			formError.value = describe(error);
			return;
		}
		if (error.code === "VALIDATION_FAILED") {
			fieldErrors.value = fieldErrorsFrom(error.details);
			formError.value = "Please fix the highlighted fields.";
		} else if (error.code === "AGENT_EMAIL_ALREADY_EXISTS") {
			fieldErrors.value = { email: "Another agent already uses this email." };
		} else {
			formError.value = error.message;
		}
	}

	watch(isDirty, (dirty) => {
		if (dirty && status.value === "saved") status.value = "idle";
	});

	onMounted(() => {
		if (initialId) load(initialId);
	});

	return {
		agentId,
		form,
		fieldErrors,
		status,
		formError,
		lastSave,
		isEditing,
		isBusy,
		isDirty,
		canSubmit,
		canDiscard,
		submit,
		discardChanges,
		clearFieldError,
	};
}

const describe = (error: unknown) =>
	error instanceof Error ? error.message : "Something went wrong.";
