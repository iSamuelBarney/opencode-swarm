import type { SMEDomainConfig } from './base';

export const aiSMEConfig: SMEDomainConfig = {
	domain: 'ai',
	description: 'AI/LLM systems and prompt engineering',
	guidance: `- Prompt engineering (CoT, few-shot, structured output)
- Context window management, token optimization
- Model selection tradeoffs (cost, latency, capability)
- Agent orchestration patterns (delegation, handoff)
- RAG architectures, embedding strategies
- Fine-tuning vs prompting decisions
- Safety/alignment considerations
- Tool use and function calling patterns`,
};
