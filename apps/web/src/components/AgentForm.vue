<script setup lang="ts">
import { computed, watch } from "vue";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AgentField, useAgentForm } from "@/composables/useAgentForm";

const props = defineProps<{ agentId: string | null }>();
const emit = defineEmits<{ saved: [id: string] }>();

const {
	agentId,
	form,
	fieldErrors,
	status,
	formError,
	lastSave,
	isEditing,
	isBusy,
	submit,
	clearFieldError,
} = useAgentForm(props.agentId);

watch(agentId, (id) => id && emit("saved", id));

const submitLabel = computed(() => {
	if (status.value === "submitting") return "Saving…";
	return isEditing.value ? "Update Agent" : "Create Agent";
});

const fields: {
	name: AgentField;
	label: string;
	type: string;
	autocomplete: string;
}[] = [
	{
		name: "firstName",
		label: "First name",
		type: "text",
		autocomplete: "given-name",
	},
	{
		name: "lastName",
		label: "Last name",
		type: "text",
		autocomplete: "family-name",
	},
	{ name: "email", label: "Email", type: "email", autocomplete: "email" },
	{
		name: "mobileNumber",
		label: "Mobile number",
		type: "tel",
		autocomplete: "tel",
	},
];
</script>

<template>
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>Property Agent</CardTitle>
			<CardDescription>
				{{ isEditing ? "Update the agent's details." : "Create a new agent." }}
			</CardDescription>
		</CardHeader>

		<form novalidate @submit.prevent="submit">
			<CardContent class="flex flex-col gap-4">
				<p v-if="status === 'loading'" class="text-muted-foreground text-sm" aria-live="polite">
					Loading agent…
				</p>

				<div v-for="field in fields" :key="field.name" class="flex flex-col gap-1.5">
					<Label :for="field.name">{{ field.label }}</Label>
					<Input
						:id="field.name"
						v-model="form[field.name]"
						:type="field.type"
						:autocomplete="field.autocomplete"
						:disabled="isBusy"
						:aria-invalid="fieldErrors[field.name] ? true : undefined"
						:aria-describedby="fieldErrors[field.name] ? `${field.name}-error` : undefined"
						@input="clearFieldError(field.name)"
					/>
					<p
						v-if="fieldErrors[field.name]"
						:id="`${field.name}-error`"
						class="text-destructive text-sm"
						role="alert"
					>
						{{ fieldErrors[field.name] }}
					</p>
				</div>
			</CardContent>

			<CardFooter class="flex flex-col items-stretch gap-3 pt-4">
				<Button type="submit" :disabled="isBusy">
					{{ submitLabel }}
				</Button>
				<p v-if="formError" class="text-destructive text-sm" role="alert">
					{{ formError }}
				</p>
				<p v-else-if="status === 'saved'" class="text-muted-foreground text-sm" aria-live="polite">
					Agent {{ lastSave }}. Keep this URL to edit it later. ID:
					<code class="break-all">{{ agentId }}</code>
				</p>
			</CardFooter>
		</form>
	</Card>
</template>
