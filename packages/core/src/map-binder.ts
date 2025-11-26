import 'reflect-metadata';
import { RECORD_TYPE_KEY } from './decorators';

/**
 * Utility class for detecting and binding Map-typed properties
 * 
 * Note: Automatic validation of Map/Record entries is NOT supported.
 * This is a limitation of class-validator, which requires known properties
 * at compile time. Use manual validation for Map/Record entries.
 */
export class MapBinder {
  /**
   * Check if a property should be bound as a Map
   * @param target - Class instance
   * @param propertyKey - Property name
   * @returns true if property is Map-typed
   */
  isMapProperty(target: any, propertyKey: string): boolean {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    return type === Map;
  }

  /**
   * Check if a property is a Record type (object with string keys)
   * Record types have design:type of Object but should not be converted to Map
   * @param target - Class instance
   * @param propertyKey - Property name
   * @returns true if property is Record-typed
   */
  isRecordProperty(target: any, propertyKey: string): boolean {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    // Record types appear as Object in reflect-metadata
    // We need to distinguish them from other Object types
    // Check if the property has been explicitly marked as a Record type
    const isRecord = Reflect.getMetadata(RECORD_TYPE_KEY, target, propertyKey);
    return type === Object && isRecord === true;
  }

  /**
   * Convert a plain object to a Map instance
   * @param obj - Plain object from configuration
   * @param valueType - Optional type constructor for map values
   * @returns Map instance
   */
  objectToMap<T = any>(obj: Record<string, any>, valueType?: new () => T): Map<string, T> {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('Expected object for Map binding');
    }

    const map = new Map<string, T>();

    for (const [key, value] of Object.entries(obj)) {
      // If valueType is provided, instantiate and populate it
      if (valueType) {
        const instance = new valueType();
        // Copy properties from value to instance
        Object.assign(instance as object, value);
        map.set(key, instance);
      } else {
        // Otherwise, use the value as-is (preserving nested structures)
        map.set(key, value as T);
      }
    }

    return map;
  }

}
