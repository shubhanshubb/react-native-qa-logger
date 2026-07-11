import { NetworkLogEntry } from './types';
import { safeStringify } from './serialize';

/**
 * Escape a value for safe use inside single-quoted shell strings.
 * Turns `'` into `'\''` so the command stays a single argument.
 */
function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build a runnable `curl` command from a network log entry.
 *
 * Note: request headers are stored redacted (sensitive values appear as
 * `[REDACTED]`), so the generated command may need real credentials filled
 * in before it will authenticate — this keeps secrets out of shared logs.
 */
export function buildCurlCommand(log: NetworkLogEntry): string {
  const parts: string[] = [`curl -X ${log.method.toUpperCase()}`];

  parts.push(shellEscape(log.url));

  if (log.requestHeaders) {
    Object.entries(log.requestHeaders).forEach(([key, value]) => {
      parts.push(`-H ${shellEscape(`${key}: ${value}`)}`);
    });
  }

  if (log.requestBody !== undefined && log.requestBody !== null && log.requestBody !== '') {
    const body =
      typeof log.requestBody === 'string'
        ? log.requestBody
        : safeStringify(log.requestBody);
    parts.push(`--data ${shellEscape(body)}`);
  }

  // Join with line continuations for readability
  return parts.join(' \\\n  ');
}
