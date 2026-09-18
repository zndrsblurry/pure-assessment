import { CreateAgentDto } from "./create-agent.dto.js";

// PUT replaces the whole resource, so the shape is identical to create.
export class UpdateAgentDto extends CreateAgentDto {}
