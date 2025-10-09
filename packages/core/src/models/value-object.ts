/**
 * Base interface for value object properties
 */
interface ValueObjectProps {
	[index: string]: any;
}

/**
 * Abstract base class for Value Objects in Domain-Driven Design.
 *
 * Value Objects are immutable objects that are defined by their attributes rather than identity.
 * Two value objects with the same attributes are considered equal, even if they are different
 * instances in memory.
 *
 * Key characteristics:
 * - Immutable: Once created, properties cannot be changed
 * - No identity: Equality is based on attributes, not reference
 * - Self-validating: Can enforce invariants in constructor
 * - Side-effect free: Methods return new instances rather than mutating state
 *
 * @template T - The shape of the value object's properties
 *
 * @example
 * // Simple value object
 * interface EmailProps {
 *   value: string;
 * }
 *
 * class Email extends ValueObject<EmailProps> {
 *   private constructor(props: EmailProps) {
 *     super(props);
 *   }
 *
 *   static create(email: string): Email {
 *     if (!email.includes('@')) {
 *       throw new Error('Invalid email format');
 *     }
 *     return new Email({ value: email.toLowerCase() });
 *   }
 *
 *   get value(): string {
 *     return this.props.value;
 *   }
 * }
 *
 * @example
 * // Using value objects
 * const email1 = Email.create('user@example.com');
 * const email2 = Email.create('USER@EXAMPLE.COM'); // Normalized to lowercase
 * console.log(email1.equals(email2)); // true - same normalized value
 *
 * const price1 = Money.create(100, 'USD');
 * const price2 = Money.create(50, 'USD');
 * const total = price1.add(price2);
 * console.log(total.amount); // 150
 */
export abstract class ValueObject<T extends ValueObjectProps = ValueObjectProps> {
	/**
	 * The immutable properties of this value object.
	 * Properties are frozen to prevent modification after construction.
	 */
	public readonly props: T;

	/**
	 * Creates a new value object instance.
	 * Constructor is protected to encourage factory method pattern with validation.
	 *
	 * @param props - The properties that define this value object
	 */
	protected constructor(props: T) {
		this.props = Object.freeze(props);
	}

	/**
	 * Compares this value object with another for equality.
	 * Two value objects are equal if they are the same type and have identical properties.
	 *
	 * Note: This performs shallow equality checking. For nested objects or arrays,
	 * reference equality is used.
	 *
	 * @param other - The value object to compare with
	 * @returns true if the value objects are equal, false otherwise
	 *
	 * @example
	 * const email1 = Email.create('user@example.com');
	 * const email2 = Email.create('user@example.com');
	 * const email3 = Email.create('other@example.com');
	 *
	 * email1.equals(email2); // true - same value
	 * email1.equals(email3); // false - different value
	 */
	public equals(other: ValueObject<T>): boolean {
		if (this.constructor !== other.constructor) {
			return false;
		}

		return (
			Object.keys(this.props).length === Object.keys(other.props).length &&
			Object.keys(this.props).every((key) => this.props[key] === other.props[key])
		);
	}
}