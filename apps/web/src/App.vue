<script setup lang="ts">
import AgentForm from "@/components/AgentForm.vue";

// Edit mode is `?id=<uuid>`; one form does not justify a router.
const agentId = new URLSearchParams(window.location.search).get("id");

function rememberId(id: string) {
	const url = new URL(window.location.href);
	url.searchParams.set("id", id);
	window.history.replaceState(null, "", url);
}
</script>

<template>
	<main class="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
		<h1 class="text-2xl font-semibold">Pure Assessment</h1>
		<AgentForm :agent-id="agentId" @saved="rememberId" />
	</main>
</template>
