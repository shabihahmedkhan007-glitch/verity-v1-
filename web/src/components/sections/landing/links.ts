// External URLs are still open (UI_UX_SPEC 14, question 6). They are public, non-secret values read from the
// environment at build time. A link whose URL is unset is not rendered, so no link ever goes nowhere.
export const GITHUB_URL: string | null = process.env.NEXT_PUBLIC_GITHUB_URL || null;
export const DEVPOST_URL: string | null = process.env.NEXT_PUBLIC_DEVPOST_URL || null;
export const DEMO_VIDEO_URL: string | null = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || null;
