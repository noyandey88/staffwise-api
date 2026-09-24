/** The root .env is the only file loaded; injected process env still wins. */
export function resolveEnvFiles(): string[] {
  return ['.env'];
}
