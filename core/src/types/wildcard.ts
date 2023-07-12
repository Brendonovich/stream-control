import { ReactiveSet } from "@solid-primitives/set";
import {
  Accessor,
  createEffect,
  createRoot,
  createSignal,
  getOwner,
  onCleanup,
  runWithOwner,
  Setter,
  untrack,
} from "solid-js";
import { z } from "zod";
import { BaseType } from "./base";
import { None, Option, Some } from "./option";
import { t, TypeVariant } from ".";
import { DataInput, DataOutput } from "../models";
import { ReactiveMap } from "@solid-primitives/map";

/**
 * A Wildcard that belongs to a Node.
 */
export class Wildcard {
  types = new ReactiveSet<t.Wildcard>();

  dispose: () => void;

  value: Accessor<Option<t.Any>>;
  private setRawValue: Setter<Option<t.Any>>;

  constructor(public id: string) {
    const [value, setValue] = createSignal<Option<BaseType>>(None);

    const { dispose, owner } = createRoot((dispose) => ({
      dispose,
      owner: getOwner(),
    }));

    this.dispose = dispose;
    this.value = value;
    this.setRawValue = setValue;

    runWithOwner(owner, () => createEffect(() => this.calculateValue()));
  }

  private setValue(value: Option<t.Any>) {
    this.setRawValue((old) => {
      if (old.eq(value)) return old;
      return value;
    });
  }

  calculateValue() {
    const surroundingValues = (() => {
      let arr: BaseType[] = [];

      for (const type of this.types) {
        for (const connection of type.connections.values()) {
          arr.push(connection.getOpposite(type));
        }
      }

      return arr;
    })();

    if (
      untrack(() => this.value())
        .map((v) => !!surroundingValues.find((sv) => sv === v))
        .unwrapOr(false)
    )
      return;

    const [firstValue] = surroundingValues;

    const newValue = (() => {
      if (firstValue === undefined) return None;

      const nonWildcardType = surroundingValues.find(
        (t) => !(t instanceof WildcardType)
      );

      if (nonWildcardType) return Some(nonWildcardType);

      const selectedValue = firstValue as WildcardType;

      createEffect(() => {
        this.setValue(selectedValue.wildcard.value());
      });
    })();

    if (newValue) this.setValue(newValue);
  }
}

class WildcardTypeConnector {
  private _dispose: () => void;

  constructor(public a: t.Any, public b: t.Any) {
    const { dispose } = createRoot((dispose) => {
      createEffect(() => {
        if (a instanceof t.Wildcard === b instanceof t.Wildcard) return;

        let connection: WildcardTypeConnector | undefined;

        function connectWildcards(a: t.Any, b: t.Any) {
          if (a instanceof t.Wildcard) {
            const wildcardValue = a.wildcard.value();

            wildcardValue.map((wildcardValue) => {
              if (wildcardValue === b) return;

              connection = connectWildcardsInTypes(wildcardValue, b);
            });
          }
        }

        connectWildcards(a, b);
        connectWildcards(b, a);

        onCleanup(() => connection?.dispose());
      });

      return { dispose };
    });

    this._dispose = dispose;
  }

  getOpposite(a: BaseType) {
    return a === this.a ? this.b : this.a;
  }

  dispose() {
    if (this.a instanceof t.Wildcard) this.a.removeConnection(this);
    if (this.b instanceof t.Wildcard) this.b.removeConnection(this);

    this._dispose();
  }
}

/**
 * A type that is linked to a Wildcard.
 * May be owned by an AnyType or data IO.
 */
export class WildcardType extends BaseType {
  connections = new ReactiveMap<t.Any, WildcardTypeConnector>();

  dispose: () => void;

  constructor(public wildcard: Wildcard) {
    super();

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    wildcard.types.add(this);

    runWithOwner(owner, () => {
      onCleanup(() => {
        wildcard.types.delete(this);
      });
    });
  }

  addConnection(connection: WildcardTypeConnector) {
    const opposite = connection.getOpposite(this);

    this.connections.set(opposite, connection);
  }

  removeConnection(connection: WildcardTypeConnector) {
    const opposite = connection.getOpposite(this);

    this.connections.delete(opposite);
  }

  default(): any {
    return this.wildcard.value().map((v) => v.default());
  }

  variant(): TypeVariant {
    return this.wildcard
      .value()
      .map((v) => v.variant())
      .unwrapOr("wildcard");
  }

  toString(): string {
    return this.wildcard
      .value()
      .map((v) => `Wildcard(${v.toString()})`)
      .unwrapOr("Wildcard");
  }

  asZodType(): z.ZodType {
    return this.wildcard
      .value()
      .map((v) => v.asZodType())
      .unwrapOrElse(() => z.any());
  }

  getWildcards(): Wildcard[] {
    return this.wildcard
      .value()
      .map((v) => v.getWildcards())
      .unwrapOrElse(() => [this.wildcard]);
  }

  eq(other: t.Any) {
    return other instanceof t.Wildcard && other.wildcard === this.wildcard;
  }
}

export function connectWildcardsInIO(output: DataOutput, input: DataInput) {
  connectWildcardsInTypes(output.type, input.type);
}

export function connectWildcardsInTypes(
  a: BaseType,
  b: BaseType
): WildcardTypeConnector | undefined {
  if (a === b) return;

  if (a instanceof t.Wildcard || b instanceof t.Wildcard) {
    const connection = new WildcardTypeConnector(a, b);

    if (a instanceof t.Wildcard) a.addConnection(connection);
    if (b instanceof t.Wildcard) b.addConnection(connection);

    return connection;
  } else if (a instanceof t.Map && b instanceof t.Map)
    return connectWildcardsInTypes(a.value, b.value);
  else if (a instanceof t.List && b instanceof t.List)
    return connectWildcardsInTypes(a.item, b.item);
  else if (a instanceof t.Option && b instanceof t.Option)
    return connectWildcardsInTypes(a.inner, b.inner);
}

export function disconnectWildcardsInIO(output: DataOutput, input: DataInput) {
  disconnectWildcardsInTypes(output.type, input.type);
}

export function disconnectWildcardsInTypes(a: t.Any, b: t.Any) {
  if (a instanceof t.Wildcard || b instanceof t.Wildcard) {
    let connection: WildcardTypeConnector | undefined;

    if (a instanceof t.Wildcard) connection = a.connections.get(b);
    if (b instanceof t.Wildcard) connection = b.connections.get(a);

    if (connection) connection.dispose();
  } else if (a instanceof t.Map && b instanceof t.Map) {
    disconnectWildcardsInTypes(a.value, b.value);
  } else if (a instanceof t.List && b instanceof t.List)
    disconnectWildcardsInTypes(a.item, b.item);
  else if (a instanceof t.Option && b instanceof t.Option)
    disconnectWildcardsInTypes(a.inner, b.inner);
}
