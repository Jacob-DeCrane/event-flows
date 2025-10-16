# Value Objects

Value Objects are immutable objects defined by their **attributes** rather than identity.

## Characteristics

- **No Identity**: Compared by value, not reference
- **Immutable**: Cannot be changed after creation
- **Self-Validating**: Validate on construction
- **Side-Effect Free**: Operations return new instances

## Implementation in EventFlows

```typescript
export abstract class ValueObject<T = any> {
  public readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props); // Immutable
  }

  public equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

## Example: Money

```typescript
class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(props: { amount: number; currency: string }) {
    super(props);
  }

  static fromCents(amount: number, currency = 'USD'): Money {
    if (amount < 0) throw new Error('Amount cannot be negative');
    return new Money({ amount, currency });
  }

  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add different currencies');
    }
    return Money.fromCents(
      this.props.amount + other.props.amount,
      this.props.currency
    );
  }

  get amount(): number {
    return this.props.amount;
  }
}

// Usage
const money1 = Money.fromCents(100);
const money2 = Money.fromCents(50);
const total = money1.add(money2);
console.log(total.amount); // 150
```

See existing implementation in `packages/core/src/models/value-object.ts`

