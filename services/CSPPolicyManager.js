/**
 * Content Security Policy Manager
 * Manages CSP violations and policy enforcement
 */

class CSPPolicyManager {
  constructor() {
    this.violations = [];
    this.policies = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:"],
      'connect-src': ["'self'", "https://huggingface.co"]
    };
    
    this.setupViolationReporting();
  }

  setupViolationReporting() {
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (event) => {
        this.handleViolation(event);
      });
    }
  }

  handleViolation(event) {
    const violation = {
      directive: event.violatedDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      timestamp: new Date().toISOString()
    };
    
    this.violations.push(violation);
    console.warn('CSP Violation:', violation);
  }

  getViolations() {
    return [...this.violations];
  }

  clearViolations() {
    this.violations = [];
  }

  generatePolicyHeader() {
    return Object.entries(this.policies)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
}

export default CSPPolicyManager;