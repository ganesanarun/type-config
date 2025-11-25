import 'reflect-metadata';

export const CONFIG_PREFIX_KEY = Symbol('configPrefix');
export const CONFIG_PROPERTIES_KEY = Symbol('configProperties');
export const REQUIRED_PROPS_KEY = Symbol('requiredProps');
export const DEFAULTS_KEY = Symbol('defaults');
export const VALIDATE_KEY = Symbol('validate');
export const INJECTABLE_KEY = Symbol('injectable');
export const INJECT_KEY = Symbol('inject');

/**
 * Decorator to mark a class as a configuration properties class
 * @param prefix - Configuration prefix path (e.g., 'database', 'server.http')
 */
export function ConfigurationProperties(prefix: string) {
  return function <T extends { new (...args: any[]): NonNullable<unknown> }>(constructor: T) {
    Reflect.defineMetadata(CONFIG_PREFIX_KEY, prefix, constructor);
    return constructor;
  };
}

/**
 * Decorator to mark a property for configuration binding
 * @param propertyPath - Optional custom property path (defaults to property name)
 */
export function ConfigProperty(propertyPath?: string) {
  return function (target: any, propertyKey: string) {
    const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, target.constructor) || {};
    properties[propertyKey] = propertyPath || propertyKey;
    Reflect.defineMetadata(CONFIG_PROPERTIES_KEY, properties, target.constructor);
  };
}

/**
 * Decorator to mark a property as required
 */
export function Required() {
  return function (target: any, propertyKey: string) {
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, target.constructor) || [];
    requiredProps.push(propertyKey);
    Reflect.defineMetadata(REQUIRED_PROPS_KEY, requiredProps, target.constructor);
  };
}

/**
 * Decorator to provide a default value
 * @param value - Default value to use if configuration is not provided
 */
export function DefaultValue(value: any) {
  return function (target: any, propertyKey: string) {
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, target.constructor) || {};
    defaults[propertyKey] = value;
    Reflect.defineMetadata(DEFAULTS_KEY, defaults, target.constructor);
  };
}

/**
 * Decorator to enable validation on a configuration class using class-validator
 */
export function Validate() {
  return function <T extends { new (...args: any[]): NonNullable<unknown> }>(constructor: T) {
    Reflect.defineMetadata(VALIDATE_KEY, true, constructor);
    return constructor;
  };
}

/**
 * Decorator to mark a class as injectable in a DI container
 */
export function Injectable() {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    return target;
  };
}

/**
 * Decorator to mark a constructor parameter for injection
 * @param token - Token to inject (typically a class)
 */
export function Inject(token: any) {
  return function (target: any, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingInjections = Reflect.getMetadata(INJECT_KEY, target) || [];
    existingInjections[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_KEY, existingInjections, target);
  };
}
