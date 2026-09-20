import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeUrl, analyzeInput, escapeHtml } from "./threat-detector.ts";

test("sanitizeUrl permits valid HTTP and HTTPS URLs", () => {
  assert.equal(sanitizeUrl("https://ecode360.com/12345"), "https://ecode360.com/12345");
  assert.equal(sanitizeUrl("http://www.carrolltownship.com/"), "http://www.carrolltownship.com/");
  assert.equal(sanitizeUrl("/zoning"), "/zoning");
  assert.equal(sanitizeUrl("mailto:admin@fieldacq.com"), "mailto:admin@fieldacq.com");
  assert.equal(sanitizeUrl("tel:717-555-0100"), "tel:717-555-0100");
});

test("sanitizeUrl blocks javascript: and dangerous data: schemes", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeUrl("JAVASCRIPT:alert('xss')"), null);
  assert.equal(sanitizeUrl("vbscript:msgbox(1)"), null);
  assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(sanitizeUrl("//evil.com"), null);
  assert.equal(sanitizeUrl(null), null);
  assert.equal(sanitizeUrl(undefined), null);
});

test("analyzeInput detects XSS payloads and sanitizes", () => {
  const result = analyzeInput("<script>alert('pwned')</script>Hello");
  assert.equal(result.isThreat, true);
  assert.equal(result.threatType, "XSS");
  assert.ok(!result.sanitized.includes("<script>"));
});

test("analyzeInput detects SQL injection attempts", () => {
  const result1 = analyzeInput("' UNION SELECT username, password FROM users --");
  assert.equal(result1.isThreat, true);
  assert.equal(result1.threatType, "SQLI");

  const result2 = analyzeInput("'; DROP TABLE parcels; --");
  assert.equal(result2.isThreat, true);
  assert.equal(result2.threatType, "SQLI");

  const result3 = analyzeInput("' OR '1'='1");
  assert.equal(result3.isThreat, true);
  assert.equal(result3.threatType, "SQLI");
});

test("analyzeInput does NOT false-positive on legitimate municipal zoning queries", () => {
  const q1 = analyzeInput("Select parcels where zoning is commercial");
  assert.equal(q1.isThreat, false);
  assert.equal(q1.sanitized, "Select parcels where zoning is commercial");

  const q2 = analyzeInput("East Pennsboro -- 10 acres");
  assert.equal(q2.isThreat, false);
  assert.equal(q2.sanitized, "East Pennsboro -- 10 acres");

  const q3 = analyzeInput("What is the setback from front street?");
  assert.equal(q3.isThreat, false);
  assert.equal(q3.sanitized, "What is the setback from front street?");
});

test("analyzeInput is stateless across consecutive executions", () => {
  const payload = "' UNION SELECT 1, 2 FROM data --";
  const run1 = analyzeInput(payload);
  const run2 = analyzeInput(payload);
  assert.equal(run1.isThreat, true);
  assert.equal(run2.isThreat, true);
});

test("analyzeInput detects path traversal attempts", () => {
  const result = analyzeInput("../../etc/passwd");
  assert.equal(result.isThreat, true);
  assert.equal(result.threatType, "PATH_TRAVERSAL");
});

test("escapeHtml sanitizes raw HTML characters", () => {
  const escaped = escapeHtml('<img src=x onerror="alert(1)">');
  assert.equal(escaped, "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml(""), "");
});
