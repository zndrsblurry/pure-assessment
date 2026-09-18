export interface AgentProps {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	mobileNumber: string;
	createdAt: Date;
	updatedAt: Date;
}

export class Agent implements AgentProps {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	mobileNumber: string;
	createdAt: Date;
	updatedAt: Date;

	constructor(props: AgentProps) {
		Object.assign(this, props);
	}
}
