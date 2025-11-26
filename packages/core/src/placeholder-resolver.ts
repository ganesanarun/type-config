/**
 * PlaceholderResolver - Resolves environment variable placeholders in configuration values
 * 
 * Supports syntax: ${ENV_VAR_NAME:fallback}
 * - ${VAR} - resolves to environment variable VAR, undefined if not set
 * - ${VAR:fallback} - resolves to environment variable VAR, or fallback if not set
 * - \${VAR} - escapes to literal ${VAR} (no resolution)
 */
export class PlaceholderResolver {
  // Regex pattern to match ${VAR_NAME:fallback} or ${VAR_NAME}
  // Captures: group 1 = VAR_NAME, group 2 = fallback (optional)
  private readonly placeholderPattern = /\$\{([^}:]+)(?::([^}]*))?\}/g;
  
  // Regex pattern to detect escaped placeholders \${...}
  private readonly escapedPattern = /\\\$\{([^}]+)\}/g;

  /**
   * Check if a string contains placeholder syntax
   * @param value - String to check
   * @returns true if value contains ${...} pattern
   */
  hasPlaceholder(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Reset regex state
    this.placeholderPattern.lastIndex = 0;
    
    return this.placeholderPattern.test(value);
  }

  /**
   * Resolve all placeholders in a string value
   * @param value - String that may contain ${VAR:fallback} patterns
   * @param envProvider - Function to get environment variables (defaults to process.env)
   * @returns Resolved string with all placeholders replaced, or undefined if resolution fails
   */
  resolve(
    value: string,
    envProvider: (key: string) => string | undefined = (key) => process.env[key]
  ): string | undefined {
    if (typeof value !== 'string') {
      return value;
    }

    // First, handle escaped placeholders by temporarily replacing them
    const escapedPlaceholders: string[] = [];
    const tempValue = value.replace(this.escapedPattern, (match, content) => {
      const placeholder = `__ESCAPED_${escapedPlaceholders.length}__`;
      escapedPlaceholders.push(`\${${content}}`);
      return placeholder;
    });

    // Track if we found any placeholders
    let foundPlaceholder = false;
    let allResolved = true;

    // Reset regex state
    this.placeholderPattern.lastIndex = 0;

    // Resolve actual placeholders
    const resolved = tempValue.replace(
      this.placeholderPattern,
      (match, varName, fallback) => {
        foundPlaceholder = true;
        const envValue = envProvider(varName.trim());

        if (envValue !== undefined) {
          // Environment variable exists, use its value
          return envValue;
        } else if (fallback !== undefined) {
          // Environment variable doesn't exist, use fallback (can be empty string)
          return fallback;
        } else {
          // No environment variable and no fallback - mark as unresolved
          allResolved = false;
          return match; // Keep the original placeholder
        }
      }
    );

    // If we found placeholders but couldn't resolve all of them, return undefined
    if (foundPlaceholder && !allResolved) {
      return undefined;
    }

    // Restore escaped placeholders (remove backslash)
    let finalValue = resolved;
    escapedPlaceholders.forEach((escaped, index) => {
      finalValue = finalValue.replace(`__ESCAPED_${index}__`, escaped);
    });

    return finalValue;
  }

  /**
   * Recursively resolve placeholders in an entire configuration object
   * @param config - Configuration object with potential placeholders
   * @param envProvider - Function to get environment variables
   * @returns New object with all placeholders resolved
   */
  resolveObject(
    config: Record<string, any>,
    envProvider: (key: string) => string | undefined = (key) => process.env[key]
  ): Record<string, any> {
    if (!config || typeof config !== 'object') {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map((item) => {
        if (typeof item === 'string') {
          return this.resolve(item, envProvider);
        } else if (typeof item === 'object' && item !== null) {
          return this.resolveObject(item, envProvider);
        }
        return item;
      });
    }

    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const resolvedValue = this.resolve(value, envProvider);
        // Only set the property if resolution succeeded
        // If resolvedValue is undefined, the property will be omitted
        if (resolvedValue !== undefined) {
          resolved[key] = resolvedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveObject(value, envProvider);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
