import type { AgentConfig as SDKAgentConfig } from '@opencode-ai/sdk';
import {
	CATEGORY_PREFIXES,
	DEFAULT_MODELS,
	isQAAgent,
	isSMEAgent,
	isSubagent,
	ALL_SUBAGENT_NAMES,
} from '../config/constants';
import { loadAgentPrompt, type PluginConfig, type SwarmConfig } from '../config';
import { type AgentDefinition, createArchitectAgent } from './architect';
import { createAuditorAgent } from './auditor';
import { createCoderAgent } from './coder';
import { createExplorerAgent } from './explorer';
import { createSecurityReviewerAgent } from './security-reviewer';
import { createTestEngineerAgent } from './test-engineer';
import { createAllSMEAgents } from './sme';

export type { AgentDefinition } from './architect';

/**
 * Get the model for an agent within a specific swarm config
 */
function getModelForAgent(
	agentName: string,
	swarmAgents?: Record<string, { model?: string; temperature?: number; disabled?: boolean }>
): string {
	// Strip swarm prefix if present (e.g., "local_coder" -> "coder")
	const baseAgentName = agentName.includes('_') 
		? agentName.substring(agentName.indexOf('_') + 1)
		: agentName;

	// 1. Check explicit override
	const explicit = swarmAgents?.[baseAgentName]?.model;
	if (explicit) return explicit;

	// 2. Check category default for SME
	if (isSMEAgent(baseAgentName)) {
		const categoryModel = swarmAgents?.[CATEGORY_PREFIXES.sme]?.model;
		if (categoryModel) return categoryModel;
		return DEFAULT_MODELS._sme;
	}

	// 3. Check category default for QA
	if (isQAAgent(baseAgentName)) {
		const categoryModel = swarmAgents?.[CATEGORY_PREFIXES.qa]?.model;
		if (categoryModel) return categoryModel;
		return DEFAULT_MODELS._qa;
	}

	// 4. Default from constants
	return DEFAULT_MODELS[baseAgentName] ?? DEFAULT_MODELS.default;
}

/**
 * Check if an agent is disabled in swarm config
 */
function isAgentDisabled(
	agentName: string,
	swarmAgents?: Record<string, { disabled?: boolean }>
): boolean {
	const baseAgentName = agentName.includes('_') 
		? agentName.substring(agentName.indexOf('_') + 1)
		: agentName;
	return swarmAgents?.[baseAgentName]?.disabled === true;
}

/**
 * Get temperature override for an agent
 */
function getTemperatureOverride(
	agentName: string,
	swarmAgents?: Record<string, { temperature?: number }>
): number | undefined {
	const baseAgentName = agentName.includes('_') 
		? agentName.substring(agentName.indexOf('_') + 1)
		: agentName;
	return swarmAgents?.[baseAgentName]?.temperature;
}

/**
 * Apply config overrides to an agent definition
 */
function applyOverrides(
	agent: AgentDefinition,
	swarmAgents?: Record<string, { temperature?: number }>
): AgentDefinition {
	const tempOverride = getTemperatureOverride(agent.name, swarmAgents);
	if (tempOverride !== undefined) {
		agent.config.temperature = tempOverride;
	}
	return agent;
}

/**
 * Create agents for a single swarm
 */
function createSwarmAgents(
	swarmId: string,
	swarmConfig: SwarmConfig,
	isDefault: boolean
): AgentDefinition[] {
	const agents: AgentDefinition[] = [];
	const swarmAgents = swarmConfig.agents;
	
	// Prefix for non-default swarms (e.g., "local_" for swarmId "local")
	const prefix = isDefault ? '' : `${swarmId}_`;
	
	// Helper to get model for agent
	const getModel = (name: string) => getModelForAgent(name, swarmAgents);

	// Helper to load custom prompts
	const getPrompts = (name: string) => loadAgentPrompt(name);
	
	// Helper to create prefixed agent name
	const prefixName = (name: string) => `${prefix}${name}`;

	// Generate the list of subagent names for this swarm's architect prompt
	const subagentNames = ALL_SUBAGENT_NAMES.map(name => `@${prefix}${name}`).join(' ');

	// 1. Create Architect
	if (!isAgentDisabled('architect', swarmAgents)) {
		const architectPrompts = getPrompts('architect');
		const architect = createArchitectAgent(
			getModel('architect'),
			architectPrompts.prompt,
			architectPrompts.appendPrompt
		);
		architect.name = prefixName('architect');
		
		// Update architect prompt to reference prefixed subagents if not default
		if (!isDefault) {
			const swarmName = swarmConfig.name || swarmId;
			architect.description = `[${swarmName}] ${architect.description}`;
			// Inject swarm-specific agent references into prompt
			architect.config.prompt = architect.config.prompt?.replace(
				/@explorer/g, `@${prefix}explorer`
			).replace(
				/@coder/g, `@${prefix}coder`
			).replace(
				/@test_engineer/g, `@${prefix}test_engineer`
			).replace(
				/@security_reviewer/g, `@${prefix}security_reviewer`
			).replace(
				/@auditor/g, `@${prefix}auditor`
			).replace(
				/@sme_(\w+)/g, `@${prefix}sme_$1`
			);
		}
		
		agents.push(applyOverrides(architect, swarmAgents));
	}

	// 2. Create Explorer
	if (!isAgentDisabled('explorer', swarmAgents)) {
		const explorerPrompts = getPrompts('explorer');
		const explorer = createExplorerAgent(
			getModel('explorer'),
			explorerPrompts.prompt,
			explorerPrompts.appendPrompt
		);
		explorer.name = prefixName('explorer');
		agents.push(applyOverrides(explorer, swarmAgents));
	}

	// 3. Create all SME agents
	const smeAgents = createAllSMEAgents(getModel, getPrompts);
	for (const sme of smeAgents) {
		if (!isAgentDisabled(sme.name, swarmAgents)) {
			sme.name = prefixName(sme.name);
			agents.push(applyOverrides(sme, swarmAgents));
		}
	}

	// 4. Create pipeline agents
	if (!isAgentDisabled('coder', swarmAgents)) {
		const coderPrompts = getPrompts('coder');
		const coder = createCoderAgent(
			getModel('coder'),
			coderPrompts.prompt,
			coderPrompts.appendPrompt
		);
		coder.name = prefixName('coder');
		agents.push(applyOverrides(coder, swarmAgents));
	}

	if (!isAgentDisabled('security_reviewer', swarmAgents)) {
		const securityPrompts = getPrompts('security_reviewer');
		const security = createSecurityReviewerAgent(
			getModel('security_reviewer'),
			securityPrompts.prompt,
			securityPrompts.appendPrompt
		);
		security.name = prefixName('security_reviewer');
		agents.push(applyOverrides(security, swarmAgents));
	}

	if (!isAgentDisabled('auditor', swarmAgents)) {
		const auditorPrompts = getPrompts('auditor');
		const auditor = createAuditorAgent(
			getModel('auditor'),
			auditorPrompts.prompt,
			auditorPrompts.appendPrompt
		);
		auditor.name = prefixName('auditor');
		agents.push(applyOverrides(auditor, swarmAgents));
	}

	if (!isAgentDisabled('test_engineer', swarmAgents)) {
		const testPrompts = getPrompts('test_engineer');
		const testEngineer = createTestEngineerAgent(
			getModel('test_engineer'),
			testPrompts.prompt,
			testPrompts.appendPrompt
		);
		testEngineer.name = prefixName('test_engineer');
		agents.push(applyOverrides(testEngineer, swarmAgents));
	}

	return agents;
}

/**
 * Create all agent definitions with configuration applied
 */
export function createAgents(config?: PluginConfig): AgentDefinition[] {
	const allAgents: AgentDefinition[] = [];

	// Check if we have swarms configured
	const swarms = config?.swarms;
	
	if (swarms && Object.keys(swarms).length > 0) {
		// Multiple swarms mode
		const swarmIds = Object.keys(swarms);
		
		// Determine which swarm is the default (first one, or one named "default")
		const defaultSwarmId = swarmIds.includes('default') ? 'default' : swarmIds[0];
		
		for (const swarmId of swarmIds) {
			const swarmConfig = swarms[swarmId];
			const isDefault = swarmId === defaultSwarmId;
			const swarmAgents = createSwarmAgents(swarmId, swarmConfig, isDefault);
			allAgents.push(...swarmAgents);
		}
	} else {
		// Legacy single swarm mode - use top-level agents config
		const legacySwarmConfig: SwarmConfig = {
			name: 'Default',
			agents: config?.agents,
		};
		const swarmAgents = createSwarmAgents('default', legacySwarmConfig, true);
		allAgents.push(...swarmAgents);
	}

	return allAgents;
}

/**
 * Get agent configurations formatted for the OpenCode SDK.
 */
export function getAgentConfigs(
	config?: PluginConfig
): Record<string, SDKAgentConfig> {
	const agents = createAgents(config);

	return Object.fromEntries(
		agents.map((agent) => {
			const sdkConfig: SDKAgentConfig = {
				...agent.config,
				description: agent.description,
			};

			// Apply mode based on agent type
			// Architects are primary, everything else is subagent
			if (agent.name === 'architect' || agent.name.endsWith('_architect')) {
				sdkConfig.mode = 'primary';
			} else {
				sdkConfig.mode = 'subagent';
			}

			return [agent.name, sdkConfig];
		})
	);
}

// Re-export agent types
export { createArchitectAgent } from './architect';
export { createCoderAgent } from './coder';
export { createExplorerAgent } from './explorer';
export { createSecurityReviewerAgent } from './security-reviewer';
export { createAuditorAgent } from './auditor';
export { createTestEngineerAgent } from './test-engineer';
export { createAllSMEAgents, createSMEAgent, listDomains } from './sme';
