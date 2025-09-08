# @baklavajs/interface-types API Reference

## Overview

`@baklavajs/interface-types` provides a comprehensive type system for node interfaces in BaklavaJS. This package enables type-safe connections between nodes, automatic value conversion, and validation of interface compatibility.

## Installation

```bash
npm install @baklavajs/interface-types
# or
yarn add @baklavajs/interface-types
```

## Basic Usage

```typescript
import { 
    BaklavaInterfaceTypes, 
    NodeInterfaceType, 
    setType,
    stringType, 
    numberType 
} from '@baklavajs/interface-types';
import { defineNode, NodeInterface } from '@baklavajs/core';

// Create interface types
const stringType = new NodeInterfaceType<string>('string');
const numberType = new NodeInterfaceType<number>('number');

// Add conversion between types
stringType.addConversion(numberType, (value) => parseInt(value, 10));
numberType.addConversion(stringType, (value) => value.toString());

// Define typed node
const TypedNode = defineNode({
    type: "TypedNode",
    inputs: {
        text: () => new NodeInterface("Text", "").use(setType, stringType),
        number: () => new NodeInterface("Number", 0).use(setType, numberType)
    },
    outputs: {
        result: () => new NodeInterface("Result", 0).use(setType, numberType)
    },
    calculate({ text, number }) {
        return { result: parseInt(text) + number };
    }
});

// Initialize type system
const interfaceTypes = new BaklavaInterfaceTypes(editor, {
    engine: engineInstance,
    viewPlugin: viewModel
});

interfaceTypes.addTypes(stringType, numberType);
```

## Core Classes

### NodeInterfaceType<T>

Represents a type that can be assigned to node interfaces.

```typescript
const stringType = new NodeInterfaceType<string>('string');
const numberType = new NodeInterfaceType<number>('number');
const booleanType = new NodeInterfaceType<boolean>('boolean');
```

#### Constructor

```typescript
new NodeInterfaceType<T>(name: string)
```

**Parameters:**
- `name` - Unique identifier for the type

#### Methods

##### `addConversion<O>(to: NodeInterfaceType<O>, transformationFunction: (value: T) => O): this`

Add a conversion rule to transform this type to another type.

**Parameters:**
- `to` - Target type to convert to
- `transformationFunction` - Function to convert values

**Returns:** The instance for chaining

```typescript
// String to number conversion
stringType.addConversion(numberType, (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
});

// Number to boolean conversion
numberType.addConversion(booleanType, (value) => value > 0);
```

### BaklavaInterfaceTypes

Main class that manages interface types and enforces type safety.

```typescript
const interfaceTypes = new BaklavaInterfaceTypes(editor, options);
```

#### Constructor

```typescript
new BaklavaInterfaceTypes(editor: Editor, options?: BaklavaInterfaceTypesOptions)
```

**Parameters:**
- `editor` - BaklavaJS editor instance
- `options` - Optional configuration for engine and view plugin integration

#### Methods

##### `addTypes(...types: Array<NodeInterfaceType<unknown>>): this`

Register interface types with the system.

```typescript
interfaceTypes.addTypes(stringType, numberType, booleanType);
```

##### `canConvert(from: string, to: string): boolean`

Check if conversion between two types is possible.

```typescript
const canConvert = interfaceTypes.canConvert('string', 'number'); // true
```

##### `convert<I, O>(from: string, to: string, value: I): O`

Convert a value from one type to another.

```typescript
const numberValue = interfaceTypes.convert('string', 'number', '42'); // 42
```

##### `getConversion<I, O>(from: string, to: string): IConversion<I, O> | null`

Get the conversion function between two types.

```typescript
const conversion = interfaceTypes.getConversion('string', 'number');
if (conversion) {
    const result = conversion.transformationFunction('42');
}
```

---

## Utility Functions

### setType<T>(intf: NodeInterface<T>, type: NodeInterfaceType<T>): void

Assign a type to a node interface.

```typescript
import { setType } from '@baklavajs/interface-types';

const inputInterface = new NodeInterface("Input", "");
setType(inputInterface, stringType);
```

### setTypeForMultipleConnections<T>(intf: NodeInterface<T[]>, type: NodeInterfaceType<T>): void

Assign a type to an interface that allows multiple connections.

```typescript
import { setTypeForMultipleConnections } from '@baklavajs/interface-types';

const multiInterface = new NodeInterface("Inputs", []);
multiInterface.allowMultipleConnections = true;
setTypeForMultipleConnections(multiInterface, stringType);
```

### getType<T>(intf: NodeInterface<T>): string | undefined

Get the type of a node interface.

```typescript
const type = getType(inputInterface); // 'string'
```

---

## Built-in Types

The package provides several pre-defined types:

### stringType

```typescript
import { stringType } from '@baklavajs/interface-types';

// Built-in conversions:
// stringType -> numberType: parseFloat
// stringType -> booleanType: value.length > 0
```

### numberType

```typescript
import { numberType } from '@baklavajs/interface-types';

// Built-in conversions:
// numberType -> stringType: toString()
// numberType -> booleanType: value !== 0
```

### booleanType

```typescript
import { booleanType } from '@baklavajs/interface-types';

// Built-in conversions:
// booleanType -> stringType: toString()
// booleanType -> numberType: value ? 1 : 0
```

### anyType

```typescript
import { anyType } from '@baklavajs/interface-types';

// Can convert to any type
// Any type can convert to anyType
```

---

## Type Definitions

### IConversion<I, O>

```typescript
interface IConversion<I, O> {
    targetType: string;
    transformationFunction(value: I): O;
}
```

### BaklavaInterfaceTypesOptions

```typescript
interface BaklavaInterfaceTypesOptions {
    viewPlugin?: IBaklavaViewModel;
    engine?: BaseEngine<any, any>;
}
```

---

## Advanced Usage

### Custom Type Creation

```typescript
// Define custom types
const colorType = new NodeInterfaceType<{ r: number; g: number; b: number }>('color');
const vectorType = new NodeInterfaceType<{ x: number; y: number; z: number }>('vector');

// Add conversions
colorType.addConversion(vectorType, (color) => ({
    x: color.r / 255,
    y: color.g / 255,
    z: color.b / 255
}));

vectorType.addConversion(colorType, (vector) => ({
    r: Math.round(vector.x * 255),
    g: Math.round(vector.y * 255),
    b: Math.round(vector.z * 255)
}));

// Register types
interfaceTypes.addTypes(colorType, vectorType);
```

### Validation Types

```typescript
// Create types with validation
const positiveNumberType = new NodeInterfaceType<number>('positiveNumber');
const nonEmptyStringType = new NodeInterfaceType<string>('nonEmptyString');

// Add validation through conversion
numberType.addConversion(positiveNumberType, (value) => {
    if (value < 0) throw new Error('Value must be positive');
    return value;
});

stringType.addConversion(nonEmptyStringType, (value) => {
    if (value.trim().length === 0) throw new Error('String cannot be empty');
    return value;
});
```

### Complex Type Hierarchies

```typescript
// Define a type hierarchy
const numericType = new NodeInterfaceType<number>('numeric');
const integerType = new NodeInterfaceType<number>('integer');
const floatType = new NodeInterfaceType<number>('float');

numericType.addConversion(integerType, Math.floor);
numericType.addConversion(floatType, (value) => value);

integerType.addConversion(floatType, (value) => value);
floatType.addConversion(integerType, Math.round);
```

---

## Integration with Other Packages

### Engine Integration

When an engine is provided, the interface types system automatically handles value conversion during execution:

```typescript
const interfaceTypes = new BaklavaInterfaceTypes(editor, {
    engine: dependencyEngine
});

// Values are automatically converted when flowing through connections
interfaceTypes.hooks.transferData.tap('MyPlugin', (value, connection) => {
    // Custom conversion logic if needed
    return value;
});
```

### View Plugin Integration

When a view plugin is provided, interfaces get visual type indicators:

```typescript
const interfaceTypes = new BaklavaInterfaceTypes(editor, {
    viewPlugin: viewModel
});

// Interfaces will have data-interface-type attributes
// <div class="interface" data-interface-type="string"></div>
```

### Graph Connection Validation

The system automatically validates connections at the graph level:

```typescript
// Connections are validated before creation
graph.events.beforeAddConnection.subscribe(({ from, to }, prevent) => {
    if (!interfaceTypes.canConvert(from.type, to.type)) {
        prevent(); // Prevent invalid connection
    }
});
```

---

## Best Practices

### Type Design

1. **Use Specific Types**: Create specific types for your domain rather than using generic types

```typescript
// Good
const priceType = new NodeInterfaceType<number>('price');
const quantityType = new NodeInterfaceType<number>('quantity');

// Less specific
const numberType = new NodeInterfaceType<number>('number');
```

2. **Provide Bidirectional Conversions**: When possible, provide conversions in both directions

```typescript
// Good: Bidirectional
stringType.addConversion(numberType, parseFloat);
numberType.addConversion(stringType, toString);

// Less flexible: Unidirectional
stringType.addConversion(numberType, parseFloat);
```

3. **Handle Edge Cases**: Make conversions robust

```typescript
// Good: Handles edge cases
stringType.addConversion(numberType, (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
});

// Problematic: No error handling
stringType.addConversion(numberType, parseFloat);
```

### Performance Considerations

1. **Minimize Conversion Chains**: Avoid long conversion chains

```typescript
// Efficient: Direct conversion
stringType.addConversion(numberType, parseFloat);

// Less efficient: Chain
stringType.addConversion(intermediateType, toIntermediate);
intermediateType.addConversion(numberType, toNumber);
```

2. **Cache Expensive Operations**: Cache results of expensive conversions

```typescript
const expensiveType = new NodeInterfaceType<ComplexData>('expensive');

expensiveType.addConversion(simpleType, (value) => {
    // Cache expensive transformations
    const cacheKey = JSON.stringify(value);
    if (conversionCache.has(cacheKey)) {
        return conversionCache.get(cacheKey);
    }
    const result = expensiveTransformation(value);
    conversionCache.set(cacheKey, result);
    return result;
});
```

### Error Handling

1. **Validate Input Types**: Validate that inputs are of the expected type

```typescript
const safeStringType = new NodeInterfaceType<string>('safeString');

stringType.addConversion(safeStringType, (value) => {
    if (typeof value !== 'string') {
        throw new Error('Expected string value');
    }
    return value.trim();
});
```

2. **Provide Fallback Values**: Handle conversion failures gracefully

```typescript
const safeNumberType = new NodeInterfaceType<number>('safeNumber');

stringType.addConversion(safeNumberType, (value) => {
    try {
        return parseFloat(value);
    } catch {
        return 0; // Fallback value
    }
});
```

---

## Examples

### Data Processing Pipeline

```typescript
// Define types for a data processing pipeline
const rawDataType = new NodeInterfaceType<string>('rawData');
const jsonType = new NodeInterfaceType<object>('json');
const filteredType = new NodeInterfaceType<Array<any>>('filtered');
const aggregatedType = new NodeInterfaceType<number>('aggregated');

// Define conversions
rawDataType.addConversion(jsonType, (data) => JSON.parse(data));
jsonType.addConversion(filteredType, (data) => {
    return Object.values(data).filter(item => item.active);
});
filteredType.addConversion(aggregatedType, (items) => {
    return items.reduce((sum, item) => sum + item.value, 0);
});

// Register types
interfaceTypes.addTypes(rawDataType, jsonType, filteredType, aggregatedType);
```

### Type-safe Math Operations

```typescript
// Define numeric types with precision
const integerType = new NodeInterfaceType<number>('integer');
const floatType = new NodeInterfaceType<number>('float');
const decimalType = new NodeInterfaceType<number>('decimal');

// Define conversions with precision handling
integerType.addConversion(floatType, (value) => value);
floatType.addConversion(decimalType, (value) => Math.round(value * 100) / 100);
decimalType.addConversion(integerType, Math.floor);

// Create math nodes with type safety
const AddNode = defineNode({
    type: "AddNode",
    inputs: {
        a: () => new NumberInterface("A", 0).use(setType, decimalType),
        b: () => new NumberInterface("B", 0).use(setType, decimalType)
    },
    outputs: {
        result: () => new NumberInterface("Result", 0).use(setType, decimalType)
    },
    calculate({ a, b }) {
        return { result: a + b };
    }
});
```

### Complex Type System

```typescript
// Define types for a graphics application
const colorType = new NodeInterfaceType<{ r: number; g: number; b: number }>('color');
const hslType = new NodeInterfaceType<{ h: number; s: number; l: number }>('hsl');
const hexType = new NodeInterfaceType<string>('hex');

// Color space conversions
colorType.addConversion(hslType, rgbToHsl);
hslType.addConversion(colorType, hslToRgb);
colorType.addConversion(hexType, rgbToHex);
hexType.addConversion(colorType, hexToRgb);

// Register types
interfaceTypes.addTypes(colorType, hslType, hexType);
```

The interface types system provides a robust foundation for type-safe node development in BaklavaJS, enabling powerful data validation, conversion, and flow control within node graphs.