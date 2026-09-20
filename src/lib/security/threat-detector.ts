/**
 * Field ACQ Ordinance Aide - Enterprise Threat Detection & Security Enclave
 * Designed in compliance with OWASP Top 10, MITRE ATT&CK (T1059, T1190),
 * and Defense-in-Depth security engineering principles.
 */

export interface ThreatAnalysisResult {
  isThreat: boolean;
  threatType?: "XSS" | "SQLI" | "PATH_TRAVERSAL" | "PROTOTYPE_POLLUTION" | "SCRIPT_INJECTION";
  details?: string;
  sanitized: string;
}

// Stateless regex patterns (non-global to prevent regex lastIndex state retention across calls)
const PATTERNS = {
  XSS_VECTORS: /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:\s*|on\w+\s*=\s*["']?[^"'>]+["']?/i,
  HTML_TAGS: /<[a-z/][a-z0-9]*\b[^>]*>/i,
  SQL_INJECTION:
    /(?:'|")\s*(?:OR|AND)\s+['"]?[\w\d]+['"]?\s*=\s*['"]?[\w\d]+['"]?|(?:'|")\s*--|;\s*(?:DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|EXEC(?:UTE)?)\s+(?:TABLE|DATABASE|FROM|INTO)?\b|\bUNION(?:\s+ALL)?\s+SELECT\b/i,
  PATH_TRAVERSAL: /(?:\.\.[/\\])+|(?:\/|\\)etc(?:\/|\\)passwd|\bwindows[/\\]system32\b/i,
  PROTOTYPE_POLLUTION: /(?:__proto__|prototype|constructor)\s*\[/i,
  DANGEROUS_PROTOCOLS:
    /^(?:javascript:|vbscript:|data:(?!image\/(?:png|jpeg|jpg|webp|gif);base64,)|blob:)/i,
};

/**
 * Validates and sanitizes URLs before rendering them into the DOM as href attributes.
 * Prevents javascript: URI execution and DOM-based XSS attacks.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (PATTERNS.DANGEROUS_PROTOCOLS.test(trimmed)) {
    return null;
  }
  // Enforce protocol whitelist: http, https, mailto, tel, or root-relative paths
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//"))
  ) {
    return trimmed;
  }
  return null;
}

/**
 * Evaluates an untrusted input string against known threat patterns.
 */
export function analyzeInput(input: string): ThreatAnalysisResult {
  if (!input || typeof input !== "string") {
    return { isThreat: false, sanitized: "" };
  }

  // Check Prototype Pollution
  if (PATTERNS.PROTOTYPE_POLLUTION.test(input)) {
    return {
      isThreat: true,
      threatType: "PROTOTYPE_POLLUTION",
      details: "Detected attempt to manipulate object prototype chain",
      sanitized: input.replace(/(?:__proto__|prototype|constructor)\s*\[/gi, ""),
    };
  }

  // Check Path Traversal
  if (PATTERNS.PATH_TRAVERSAL.test(input)) {
    return {
      isThreat: true,
      threatType: "PATH_TRAVERSAL",
      details: "Detected path traversal sequence (directory climbing)",
      sanitized: input.replace(
        /(?:\.\.[/\\])+|(?:\/|\\)etc(?:\/|\\)passwd|\bwindows[/\\]system32\b/gi,
        "",
      ),
    };
  }

  // Check SQL Injection
  if (PATTERNS.SQL_INJECTION.test(input)) {
    return {
      isThreat: true,
      threatType: "SQLI",
      details: "Detected structured query language injection syntax",
      sanitized: input.replace(
        /(?:'|")\s*(?:OR|AND)\s+['"\d]\s*=\s*['"\d]|(?:'|")\s*--|;\s*(?:DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|EXEC(?:UTE)?)\s+(?:TABLE|DATABASE|FROM|INTO)?\b|\bUNION(?:\s+ALL)?\s+SELECT\b/gi,
        "",
      ),
    };
  }

  // Check XSS / Script Injection
  if (PATTERNS.XSS_VECTORS.test(input)) {
    return {
      isThreat: true,
      threatType: "XSS",
      details: "Detected active script tag or DOM event handler injection",
      sanitized: input
        .replace(
          /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:\s*|on\w+\s*=\s*["']?[^"'>]+["']?/gi,
          "",
        )
        .replace(/<[a-z/][a-z0-9]*\b[^>]*>/gi, ""),
    };
  }

  return {
    isThreat: false,
    sanitized: input,
  };
}

/**
 * Defense-in-depth sanitization for text rendering: escapes dangerous HTML entities.
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Telemetry log for detected threat events (in-memory buffer for auditing).
 */
export interface ThreatEvent {
  timestamp: string;
  threatType: string;
  details: string;
  sourceContext: string;
}

const threatLog: ThreatEvent[] = [];

export function logSecurityEvent(event: Omit<ThreatEvent, "timestamp">) {
  const record: ThreatEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  threatLog.unshift(record);
  if (threatLog.length > 50) {
    threatLog.pop();
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[SECURITY TELEMETRY] Threat intercepted: ${record.threatType} in ${record.sourceContext}`,
    );
  }
}

export function getThreatLog(): readonly ThreatEvent[] {
  return threatLog;
}
