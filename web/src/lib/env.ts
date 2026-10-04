// Public configuration only. Never put keys or tokens here (NEXT_PUBLIC_* is bundled into client JavaScript).
export const AGENT_URL: string | null = process.env.NEXT_PUBLIC_AGENT_URL || null;
export const isLiveConfigured: boolean = AGENT_URL !== null;
