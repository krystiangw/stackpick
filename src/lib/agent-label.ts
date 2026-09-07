/** Display names only; stored CLI identities and original answers stay unchanged. */
export function agentLabel(tool: string): string {
  const name = tool.split(' ')[0]
  return ({ agy: 'Antigravity', 'cursor-agent': 'Cursor', codex: 'Codex', claude: 'Claude Code' } as Record<string, string>)[name] ?? name
}
export function modelLabel(model: string): string {
  return model === 'auto' ? 'Auto (model not disclosed)' : model
}
export const AGENT_SAMPLE_LIMIT = 'These are dated samples from different tools and setups, not a controlled comparison of model quality.'
