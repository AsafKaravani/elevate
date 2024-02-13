/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from './const';
export const HOST = "https://elevate-app.hasura.app/v1/graphql"


export const HEADERS = {}
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + '?query=' + encodeURIComponent(query);
    const wsString = queryString.replace('http', 'ws');
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error('No websockets implemented');
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json() as Promise<GraphQLResponse>;
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === 'GET') {
      return fetch(`${options[0]}?query=${encodeURIComponent(query)}`, fetchOptions)
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
		
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = '',
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = [],
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return '';
    }
    if (typeof o === 'boolean' || typeof o === 'number') {
      return k;
    }
    if (typeof o === 'string') {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join('\n');
    }
    const hasOperationName = root && options?.operationName ? ' ' + options.operationName : '';
    const keyForDirectives = o.__directives ?? '';
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map((e) => ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars))
      .join('\n')}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars.map((v) => `${v.name}: ${v.graphQLType}`).join(', ');
    return `${k} ${keyForDirectives}${hasOperationName}${varsString ? `(${varsString})` : ''} ${query}`;
  };
  return ibb;
};

export const Thunder =
  (fn: FetchFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: Record<string, unknown> },
  ) =>
    fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
      ops?.variables,
    ).then((data) => {
      if (graphqlOptions?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: graphqlOptions.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, SCLR>>;

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  (fn: SubscriptionFunction) =>
  <O extends keyof typeof Ops, SCLR extends ScalarDefinition, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<SCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: (Z & ValueTypes[R]) | ValueTypes[R],
    ops?: OperationOptions & { variables?: ExtractVariables<Z> },
  ) => {
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: graphqlOptions?.scalars,
      }),
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], SCLR>;
    if (returnedFunction?.on && graphqlOptions?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (fnToCall: (args: InputType<GraphQLTypes[R], Z, SCLR>) => void) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, SCLR>) => {
          if (graphqlOptions?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: graphqlOptions.scalars,
                ops: Ops,
              }),
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) => SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>,
>(
  operation: O,
  o: (Z & ValueTypes[R]) | ValueTypes[R],
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  },
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    'Content-Type': 'application/json',
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(initialOp as string, ops[initialOp], initialZeusQuery);
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(initialOp as string, response, [ops[initialOp]]);
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (k: string, o: InputValueType | VType, p: string[] = []): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder = resolvers[currentScalarString.split('.')[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string' || !o) {
      return o;
    }
    const entries = Object.entries(o).map(([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const);
    const objectFromEntries = entries.reduce<Record<string, unknown>>((a, [k, v]) => {
      a[k] = v;
      return a;
    }, {});
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | 'enum'
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]: undefined | boolean | string | number | [any, undefined | boolean | InputValueType] | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = '|';

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (...args: infer R) => WebSocket ? R : never;
export type chainOptions = [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }] | [fetchOptions[0]];
export type FetchFunction = (query: string, variables?: Record<string, unknown>) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<F extends [infer ARGS, any] ? ARGS : undefined>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super('');
    console.error(response);
  }
  toString() {
    return 'GraphQL Response Error';
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops ? typeof Ops[O] : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (mappedParts: string[], returns: ReturnTypesType): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === 'object') {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({ ops, returns }: { returns: ReturnTypesType; ops: Operations }) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true,
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string') {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith('scalar')) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment ? pOriginals : [...pOriginals, purifyGraphQLKey(originalKey)],
          false,
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) => k.replace(/\([^)]*\)/g, '').replace(/^[^:]*\:/g, '');

const mapPart = (p: string) => {
  const [isArg, isField] = p.split('<>');
  if (isField) {
    return {
      v: isField,
      __type: 'field',
    } as const;
  }
  return {
    v: isArg,
    __type: 'arg',
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (props: AllTypesPropsType, returns: ReturnTypesType, ops: Operations) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === 'enum' && mappedParts.length === 1) {
      return 'enum';
    }
    if (typeof propsP1 === 'string' && propsP1.startsWith('scalar.') && mappedParts.length === 1) {
      return propsP1;
    }
    if (typeof propsP1 === 'object') {
      if (mappedParts.length < 2) {
        return 'not';
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === 'string') {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
      if (typeof propsP2 === 'object') {
        if (mappedParts.length < 3) {
          return 'not';
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === 'arg') {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`,
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return 'not';
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === 'object') {
      if (mappedParts.length < 2) return 'not';
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
    }
  };
  const rpp = (path: string): 'enum' | 'not' | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return 'not';
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = '', root = true): string => {
    if (typeof a === 'string') {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a.replace(START_VAR_NAME, '$').split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`,
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith('scalar.')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ...splittedScalar] = checkType.split('.');
      const scalarKey = splittedScalar.join('.');
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(', ')}]`;
    }
    if (typeof a === 'string') {
      if (checkType === 'enum') {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === 'object') {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== 'undefined')
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(',\n');
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <X, T extends keyof ResolverInputTypes, Z extends keyof ResolverInputTypes[T]>(
  type: T,
  field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any] ? Input : any,
    source: any,
  ) => Z extends keyof ModelTypes[T] ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X : never,
) => fn as (args?: any, source?: any) => ReturnType<typeof fn>;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<UnwrapPromise<ReturnType<T>>>;
export type ZeusHook<
  T extends (...args: any[]) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>,
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends 'scalar' & { name: infer T }
  ? T extends keyof SCLR
    ? SCLR[T]['decode'] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]['decode']>
      : unknown
    : unknown
  : S;
type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<SRC extends DeepAnify<DST>, DST, SCLR extends ScalarDefinition> = FlattenArray<SRC> extends
  | ZEUS_INTERFACES
  | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends '__union' & infer R
        ? P extends keyof DST
          ? IsArray<R, '__typename' extends keyof DST ? DST[P] & { __typename: true } : DST[P], SCLR>
          : IsArray<R, '__typename' extends keyof DST ? { __typename: true } : Record<string, never>, SCLR>
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends '__union' & infer R ? never : P;
          }[keyof DST]
        >,
        '__typename'
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver ? IsScalar<SRC[P], SCLR> : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<SRC, DST, SCLR extends ScalarDefinition> = SRC extends DeepAnify<DST>
  ? IsInterfaced<SRC, DST, SCLR>
  : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<SRC, DST, SCLR extends ScalarDefinition = {}> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, '__alias'>, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (fn: (e: { data?: InputType<T, Z, SCLR>; code?: number; reason?: string; message?: string }) => void) => void;
  error: (fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<SELECTOR, NAME extends keyof GraphQLTypes, SCLR extends ScalarDefinition = {}> = InputType<
  GraphQLTypes[NAME],
  SELECTOR,
  SCLR
>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <T>(t: T | V) => T;

type BuiltInVariableTypes = {
  ['String']: string;
  ['Int']: number;
  ['Float']: number;
  ['ID']: unknown;
  ['Boolean']: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> = `${T}!` | T | `[${T}]` | `[${T}]!` | `[${T}!]` | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> = T extends keyof ZEUS_VARIABLES
  ? ZEUS_VARIABLES[T]
  : T extends keyof BuiltInVariableTypes
  ? BuiltInVariableTypes[T]
  : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> & WithNonNullableKeys<T>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  ' __zeus_name': Name;
  ' __zeus_type': T;
};

export type ExtractVariablesDeep<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariablesDeep<Query[K]>> }[keyof Query]>;

export type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariablesDeep<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>> }[keyof Query]>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(name: Name, graphqlType: Type) => {
  return (START_VAR_NAME + name + GRAPHQL_TYPE_SEPARATOR + graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = never
export type ScalarCoders = {
	jsonb?: ScalarResolver;
	timestamp?: ScalarResolver;
	timestamptz?: ScalarResolver;
	uuid?: ScalarResolver;
}
type ZEUS_UNIONS = never

export type ValueTypes = {
    /** columns and relationships of "Device" */
["Device"]: AliasType<{
	/** An object relationship */
	DeviceType?:ValueTypes["DeviceType"],
	/** An object relationship */
	Profile?:ValueTypes["Profile"],
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "DeviceStatusLog" */
["DeviceStatusLog"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
status?: [{	/** JSON select path */
	path?: string | undefined | null | Variable<any, string>},boolean | `@${string}`],
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "DeviceStatusLog" */
["DeviceStatusLog_aggregate"]: AliasType<{
	aggregate?:ValueTypes["DeviceStatusLog_aggregate_fields"],
	nodes?:ValueTypes["DeviceStatusLog"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "DeviceStatusLog" */
["DeviceStatusLog_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["DeviceStatusLog_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["DeviceStatusLog_max_fields"],
	min?:ValueTypes["DeviceStatusLog_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_append_input"]: {
	status?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "DeviceStatusLog". All fields are combined with a logical 'AND'. */
["DeviceStatusLog_bool_exp"]: {
	_and?: Array<ValueTypes["DeviceStatusLog_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["DeviceStatusLog_bool_exp"]> | undefined | null | Variable<any, string>,
	board_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["jsonb_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "DeviceStatusLog" */
["DeviceStatusLog_constraint"]:DeviceStatusLog_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceStatusLog_delete_at_path_input"]: {
	status?: Array<string> | undefined | null | Variable<any, string>
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceStatusLog_delete_elem_input"]: {
	status?: number | undefined | null | Variable<any, string>
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceStatusLog_delete_key_input"]: {
	status?: string | undefined | null | Variable<any, string>
};
	/** input type for inserting data into table "DeviceStatusLog" */
["DeviceStatusLog_insert_input"]: {
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["DeviceStatusLog_max_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["DeviceStatusLog_min_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "DeviceStatusLog" */
["DeviceStatusLog_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["DeviceStatusLog"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "DeviceStatusLog" */
["DeviceStatusLog_on_conflict"]: {
	constraint: ValueTypes["DeviceStatusLog_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["DeviceStatusLog_update_column"]> | Variable<any, string>,
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "DeviceStatusLog". */
["DeviceStatusLog_order_by"]: {
	board_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: DeviceStatusLog */
["DeviceStatusLog_pk_columns_input"]: {
	id: ValueTypes["uuid"] | Variable<any, string>
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_prepend_input"]: {
	status?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>
};
	/** select columns of table "DeviceStatusLog" */
["DeviceStatusLog_select_column"]:DeviceStatusLog_select_column;
	/** input type for updating data in table "DeviceStatusLog" */
["DeviceStatusLog_set_input"]: {
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "DeviceStatusLog" */
["DeviceStatusLog_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["DeviceStatusLog_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["DeviceStatusLog_stream_cursor_value_input"]: {
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "DeviceStatusLog" */
["DeviceStatusLog_update_column"]:DeviceStatusLog_update_column;
	["DeviceStatusLog_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceStatusLog_append_input"] | undefined | null | Variable<any, string>,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null | Variable<any, string>,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceStatusLog_delete_elem_input"] | undefined | null | Variable<any, string>,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceStatusLog_delete_key_input"] | undefined | null | Variable<any, string>,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceStatusLog_prepend_input"] | undefined | null | Variable<any, string>,
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceStatusLog_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["DeviceStatusLog_bool_exp"] | Variable<any, string>
};
	/** columns and relationships of "DeviceType" */
["DeviceType"]: AliasType<{
Devices?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
Devices_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device_aggregate"]],
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
status_fields?: [{	/** JSON select path */
	path?: string | undefined | null | Variable<any, string>},boolean | `@${string}`],
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "DeviceType" */
["DeviceType_aggregate"]: AliasType<{
	aggregate?:ValueTypes["DeviceType_aggregate_fields"],
	nodes?:ValueTypes["DeviceType"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "DeviceType" */
["DeviceType_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["DeviceType_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["DeviceType_max_fields"],
	min?:ValueTypes["DeviceType_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceType_append_input"]: {
	status_fields?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "DeviceType". All fields are combined with a logical 'AND'. */
["DeviceType_bool_exp"]: {
	Devices?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>,
	Devices_aggregate?: ValueTypes["Device_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["DeviceType_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["DeviceType_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	status_fields?: ValueTypes["jsonb_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "DeviceType" */
["DeviceType_constraint"]:DeviceType_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceType_delete_at_path_input"]: {
	status_fields?: Array<string> | undefined | null | Variable<any, string>
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceType_delete_elem_input"]: {
	status_fields?: number | undefined | null | Variable<any, string>
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceType_delete_key_input"]: {
	status_fields?: string | undefined | null | Variable<any, string>
};
	/** input type for inserting data into table "DeviceType" */
["DeviceType_insert_input"]: {
	Devices?: ValueTypes["Device_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	status_fields?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["DeviceType_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["DeviceType_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "DeviceType" */
["DeviceType_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["DeviceType"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "DeviceType" */
["DeviceType_obj_rel_insert_input"]: {
	data: ValueTypes["DeviceType_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["DeviceType_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "DeviceType" */
["DeviceType_on_conflict"]: {
	constraint: ValueTypes["DeviceType_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["DeviceType_update_column"]> | Variable<any, string>,
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "DeviceType". */
["DeviceType_order_by"]: {
	Devices_aggregate?: ValueTypes["Device_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	status_fields?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: DeviceType */
["DeviceType_pk_columns_input"]: {
	id: ValueTypes["uuid"] | Variable<any, string>
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceType_prepend_input"]: {
	status_fields?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>
};
	/** select columns of table "DeviceType" */
["DeviceType_select_column"]:DeviceType_select_column;
	/** input type for updating data in table "DeviceType" */
["DeviceType_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	status_fields?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "DeviceType" */
["DeviceType_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["DeviceType_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["DeviceType_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	name?: string | undefined | null | Variable<any, string>,
	status_fields?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "DeviceType" */
["DeviceType_update_column"]:DeviceType_update_column;
	["DeviceType_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceType_append_input"] | undefined | null | Variable<any, string>,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceType_delete_at_path_input"] | undefined | null | Variable<any, string>,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceType_delete_elem_input"] | undefined | null | Variable<any, string>,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceType_delete_key_input"] | undefined | null | Variable<any, string>,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceType_prepend_input"] | undefined | null | Variable<any, string>,
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceType_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["DeviceType_bool_exp"] | Variable<any, string>
};
	/** aggregated selection of "Device" */
["Device_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Device_aggregate_fields"],
	nodes?:ValueTypes["Device"],
		__typename?: boolean | `@${string}`
}>;
	["Device_aggregate_bool_exp"]: {
	count?: ValueTypes["Device_aggregate_bool_exp_count"] | undefined | null | Variable<any, string>
};
	["Device_aggregate_bool_exp_count"]: {
	arguments?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,
	distinct?: boolean | undefined | null | Variable<any, string>,
	filter?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>,
	predicate: ValueTypes["Int_comparison_exp"] | Variable<any, string>
};
	/** aggregate fields of "Device" */
["Device_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Device_max_fields"],
	min?:ValueTypes["Device_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "Device" */
["Device_aggregate_order_by"]: {
	count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	max?: ValueTypes["Device_max_order_by"] | undefined | null | Variable<any, string>,
	min?: ValueTypes["Device_min_order_by"] | undefined | null | Variable<any, string>
};
	/** input type for inserting array relation for remote table "Device" */
["Device_arr_rel_insert_input"]: {
	data: Array<ValueTypes["Device_insert_input"]> | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Device_on_conflict"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to filter rows from the table "Device". All fields are combined with a logical 'AND'. */
["Device_bool_exp"]: {
	DeviceType?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Device_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Device_bool_exp"]> | undefined | null | Variable<any, string>,
	board_id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Device" */
["Device_constraint"]:Device_constraint;
	/** input type for inserting data into table "Device" */
["Device_insert_input"]: {
	DeviceType?: ValueTypes["DeviceType_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_obj_rel_insert_input"] | undefined | null | Variable<any, string>,
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Device_max_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "Device" */
["Device_max_order_by"]: {
	board_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** aggregate min on columns */
["Device_min_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "Device" */
["Device_min_order_by"]: {
	board_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** response of any mutation on the table "Device" */
["Device_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Device"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "Device" */
["Device_on_conflict"]: {
	constraint: ValueTypes["Device_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Device_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Device". */
["Device_order_by"]: {
	DeviceType?: ValueTypes["DeviceType_order_by"] | undefined | null | Variable<any, string>,
	Profile?: ValueTypes["Profile_order_by"] | undefined | null | Variable<any, string>,
	board_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Device */
["Device_pk_columns_input"]: {
	id: ValueTypes["uuid"] | Variable<any, string>
};
	/** select columns of table "Device" */
["Device_select_column"]:Device_select_column;
	/** input type for updating data in table "Device" */
["Device_set_input"]: {
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Device" */
["Device_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Device_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Device_stream_cursor_value_input"]: {
	board_id?: string | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	profile_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	type_id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "Device" */
["Device_update_column"]:Device_update_column;
	["Device_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Device_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Device_bool_exp"] | Variable<any, string>
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined | null | Variable<any, string>,
	_gt?: number | undefined | null | Variable<any, string>,
	_gte?: number | undefined | null | Variable<any, string>,
	_in?: Array<number> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: number | undefined | null | Variable<any, string>,
	_lte?: number | undefined | null | Variable<any, string>,
	_neq?: number | undefined | null | Variable<any, string>,
	_nin?: Array<number> | undefined | null | Variable<any, string>
};
	/** columns and relationships of "Profile" */
["Profile"]: AliasType<{
Devices?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
Devices_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device_aggregate"]],
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: AliasType<{
	aggregate?:ValueTypes["Profile_aggregate_fields"],
	nodes?:ValueTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["Profile_max_fields"],
	min?:ValueTypes["Profile_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	Devices?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>,
	Devices_aggregate?: ValueTypes["Device_aggregate_bool_exp"] | undefined | null | Variable<any, string>,
	_and?: Array<ValueTypes["Profile_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["Profile_bool_exp"]> | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	first_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid_comparison_exp"] | undefined | null | Variable<any, string>,
	last_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	Devices?: ValueTypes["Device_arr_rel_insert_input"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["Profile_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Profile_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ValueTypes["Profile_insert_input"] | Variable<any, string>,
	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ValueTypes["Profile_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["Profile_update_column"]> | Variable<any, string>,
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	Devices_aggregate?: ValueTypes["Device_aggregate_order_by"] | undefined | null | Variable<any, string>,
	created_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	email?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	first_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	last_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	phone?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	picture_url?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: ValueTypes["uuid"] | Variable<any, string>
};
	/** select columns of table "Profile" */
["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["Profile_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	first_name?: string | undefined | null | Variable<any, string>,
	id?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	last_name?: string | undefined | null | Variable<any, string>,
	phone?: string | undefined | null | Variable<any, string>,
	picture_url?: string | undefined | null | Variable<any, string>,
	updated_at?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>
};
	/** update columns of table "Profile" */
["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined | null | Variable<any, string>,
	_gt?: string | undefined | null | Variable<any, string>,
	_gte?: string | undefined | null | Variable<any, string>,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined | null | Variable<any, string>,
	_in?: Array<string> | undefined | null | Variable<any, string>,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	/** does the column match the given pattern */
	_like?: string | undefined | null | Variable<any, string>,
	_lt?: string | undefined | null | Variable<any, string>,
	_lte?: string | undefined | null | Variable<any, string>,
	_neq?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined | null | Variable<any, string>,
	_nin?: Array<string> | undefined | null | Variable<any, string>,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined | null | Variable<any, string>,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined | null | Variable<any, string>,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined | null | Variable<any, string>,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined | null | Variable<any, string>
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: AliasType<{
	aggregate?:ValueTypes["_prisma_migrations_aggregate_fields"],
	nodes?:ValueTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: AliasType<{
	avg?:ValueTypes["_prisma_migrations_avg_fields"],
count?: [{	columns?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	distinct?: boolean | undefined | null | Variable<any, string>},boolean | `@${string}`],
	max?:ValueTypes["_prisma_migrations_max_fields"],
	min?:ValueTypes["_prisma_migrations_min_fields"],
	stddev?:ValueTypes["_prisma_migrations_stddev_fields"],
	stddev_pop?:ValueTypes["_prisma_migrations_stddev_pop_fields"],
	stddev_samp?:ValueTypes["_prisma_migrations_stddev_samp_fields"],
	sum?:ValueTypes["_prisma_migrations_sum_fields"],
	var_pop?:ValueTypes["_prisma_migrations_var_pop_fields"],
	var_samp?:ValueTypes["_prisma_migrations_var_samp_fields"],
	variance?:ValueTypes["_prisma_migrations_variance_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ValueTypes["_prisma_migrations_bool_exp"]> | undefined | null | Variable<any, string>,
	_not?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>,
	_or?: Array<ValueTypes["_prisma_migrations_bool_exp"]> | undefined | null | Variable<any, string>,
	applied_steps_count?: ValueTypes["Int_comparison_exp"] | undefined | null | Variable<any, string>,
	checksum?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	logs?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	migration_name?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ValueTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ValueTypes["_prisma_migrations_constraint"] | Variable<any, string>,
	update_columns: Array<ValueTypes["_prisma_migrations_update_column"]> | Variable<any, string>,
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	checksum?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	id?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	logs?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	migration_name?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["order_by"] | undefined | null | Variable<any, string>
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string | Variable<any, string>
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ValueTypes["_prisma_migrations_stream_cursor_value_input"] | Variable<any, string>,
	/** cursor ordering */
	ordering?: ValueTypes["cursor_ordering"] | undefined | null | Variable<any, string>
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined | null | Variable<any, string>,
	checksum?: string | undefined | null | Variable<any, string>,
	finished_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	id?: string | undefined | null | Variable<any, string>,
	logs?: string | undefined | null | Variable<any, string>,
	migration_name?: string | undefined | null | Variable<any, string>,
	rolled_back_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	started_at?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,
	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,
	/** filter the rows which have to be updated */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** ordering argument of a cursor */
["cursor_ordering"]:cursor_ordering;
	["jsonb"]:unknown;
	["jsonb_cast_exp"]: {
	String?: ValueTypes["String_comparison_exp"] | undefined | null | Variable<any, string>
};
	/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
["jsonb_comparison_exp"]: {
	_cast?: ValueTypes["jsonb_cast_exp"] | undefined | null | Variable<any, string>,
	/** is the column contained in the given json value */
	_contained_in?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	/** does the column contain the given json value at the top level */
	_contains?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_eq?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	/** does the string exist as a top-level key in the column */
	_has_key?: string | undefined | null | Variable<any, string>,
	/** do all of these strings exist as top-level keys in the column */
	_has_keys_all?: Array<string> | undefined | null | Variable<any, string>,
	/** do any of these strings exist as top-level keys in the column */
	_has_keys_any?: Array<string> | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["jsonb"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["jsonb"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["jsonb"]> | undefined | null | Variable<any, string>
};
	/** mutation root */
["mutation_root"]: AliasType<{
delete_Device?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Device_bool_exp"] | Variable<any, string>},ValueTypes["Device_mutation_response"]],
delete_DeviceStatusLog?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["DeviceStatusLog_bool_exp"] | Variable<any, string>},ValueTypes["DeviceStatusLog_mutation_response"]],
delete_DeviceStatusLog_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
delete_DeviceType?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["DeviceType_bool_exp"] | Variable<any, string>},ValueTypes["DeviceType_mutation_response"]],
delete_DeviceType_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceType"]],
delete_Device_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Device"]],
delete_Profile?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
delete_Profile_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Profile"]],
delete__prisma_migrations?: [{	/** filter the rows which have to be deleted */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
delete__prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
insert_Device?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Device_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Device_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Device_mutation_response"]],
insert_DeviceStatusLog?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["DeviceStatusLog_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["DeviceStatusLog_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog_mutation_response"]],
insert_DeviceStatusLog_one?: [{	/** the row to be inserted */
	object: ValueTypes["DeviceStatusLog_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["DeviceStatusLog_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
insert_DeviceType?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["DeviceType_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["DeviceType_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType_mutation_response"]],
insert_DeviceType_one?: [{	/** the row to be inserted */
	object: ValueTypes["DeviceType_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["DeviceType_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType"]],
insert_Device_one?: [{	/** the row to be inserted */
	object: ValueTypes["Device_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Device_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
insert_Profile?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["Profile_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
insert_Profile_one?: [{	/** the row to be inserted */
	object: ValueTypes["Profile_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["Profile_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
insert__prisma_migrations?: [{	/** the rows to be inserted */
	objects: Array<ValueTypes["_prisma_migrations_insert_input"]> | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["_prisma_migrations_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
insert__prisma_migrations_one?: [{	/** the row to be inserted */
	object: ValueTypes["_prisma_migrations_insert_input"] | Variable<any, string>,	/** upsert condition */
	on_conflict?: ValueTypes["_prisma_migrations_on_conflict"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
update_Device?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Device_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Device_bool_exp"] | Variable<any, string>},ValueTypes["Device_mutation_response"]],
update_DeviceStatusLog?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceStatusLog_append_input"] | undefined | null | Variable<any, string>,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null | Variable<any, string>,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceStatusLog_delete_elem_input"] | undefined | null | Variable<any, string>,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceStatusLog_delete_key_input"] | undefined | null | Variable<any, string>,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceStatusLog_prepend_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceStatusLog_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["DeviceStatusLog_bool_exp"] | Variable<any, string>},ValueTypes["DeviceStatusLog_mutation_response"]],
update_DeviceStatusLog_by_pk?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceStatusLog_append_input"] | undefined | null | Variable<any, string>,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null | Variable<any, string>,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceStatusLog_delete_elem_input"] | undefined | null | Variable<any, string>,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceStatusLog_delete_key_input"] | undefined | null | Variable<any, string>,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceStatusLog_prepend_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceStatusLog_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["DeviceStatusLog_pk_columns_input"] | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
update_DeviceStatusLog_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["DeviceStatusLog_updates"]> | Variable<any, string>},ValueTypes["DeviceStatusLog_mutation_response"]],
update_DeviceType?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceType_append_input"] | undefined | null | Variable<any, string>,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceType_delete_at_path_input"] | undefined | null | Variable<any, string>,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceType_delete_elem_input"] | undefined | null | Variable<any, string>,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceType_delete_key_input"] | undefined | null | Variable<any, string>,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceType_prepend_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceType_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["DeviceType_bool_exp"] | Variable<any, string>},ValueTypes["DeviceType_mutation_response"]],
update_DeviceType_by_pk?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ValueTypes["DeviceType_append_input"] | undefined | null | Variable<any, string>,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ValueTypes["DeviceType_delete_at_path_input"] | undefined | null | Variable<any, string>,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ValueTypes["DeviceType_delete_elem_input"] | undefined | null | Variable<any, string>,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ValueTypes["DeviceType_delete_key_input"] | undefined | null | Variable<any, string>,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ValueTypes["DeviceType_prepend_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["DeviceType_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["DeviceType_pk_columns_input"] | Variable<any, string>},ValueTypes["DeviceType"]],
update_DeviceType_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["DeviceType_updates"]> | Variable<any, string>},ValueTypes["DeviceType_mutation_response"]],
update_Device_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Device_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Device_pk_columns_input"] | Variable<any, string>},ValueTypes["Device"]],
update_Device_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Device_updates"]> | Variable<any, string>},ValueTypes["Device_mutation_response"]],
update_Profile?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["Profile_bool_exp"] | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
update_Profile_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["Profile_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["Profile_pk_columns_input"] | Variable<any, string>},ValueTypes["Profile"]],
update_Profile_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["Profile_updates"]> | Variable<any, string>},ValueTypes["Profile_mutation_response"]],
update__prisma_migrations?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,	/** filter the rows which have to be updated */
	where: ValueTypes["_prisma_migrations_bool_exp"] | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
update__prisma_migrations_by_pk?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ValueTypes["_prisma_migrations_inc_input"] | undefined | null | Variable<any, string>,	/** sets the columns of the filtered rows to the given values */
	_set?: ValueTypes["_prisma_migrations_set_input"] | undefined | null | Variable<any, string>,	pk_columns: ValueTypes["_prisma_migrations_pk_columns_input"] | Variable<any, string>},ValueTypes["_prisma_migrations"]],
update__prisma_migrations_many?: [{	/** updates to execute, in order */
	updates: Array<ValueTypes["_prisma_migrations_updates"]> | Variable<any, string>},ValueTypes["_prisma_migrations_mutation_response"]],
		__typename?: boolean | `@${string}`
}>;
	/** column ordering options */
["order_by"]:order_by;
	["query_root"]: AliasType<{
Device?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
DeviceStatusLog?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceStatusLog_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceStatusLog_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
DeviceStatusLog_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceStatusLog_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceStatusLog_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog_aggregate"]],
DeviceStatusLog_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
DeviceType?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceType_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceType_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType"]],
DeviceType_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceType_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceType_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType_aggregate"]],
DeviceType_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceType"]],
Device_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device_aggregate"]],
Device_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Device"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Profile"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["subscription_root"]: AliasType<{
Device?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
DeviceStatusLog?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceStatusLog_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceStatusLog_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
DeviceStatusLog_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceStatusLog_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceStatusLog_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog_aggregate"]],
DeviceStatusLog_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
DeviceStatusLog_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["DeviceStatusLog_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceStatusLog_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceStatusLog"]],
DeviceType?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceType_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceType_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType"]],
DeviceType_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["DeviceType_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["DeviceType_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType_aggregate"]],
DeviceType_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["DeviceType"]],
DeviceType_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["DeviceType_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["DeviceType_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["DeviceType"]],
Device_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Device_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Device_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device_aggregate"]],
Device_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Device"]],
Device_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Device_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Device_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Device"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["Profile_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["Profile_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: ValueTypes["uuid"] | Variable<any, string>},ValueTypes["Profile"]],
Profile_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["Profile_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["Profile_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["Profile"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ValueTypes["_prisma_migrations_select_column"]> | undefined | null | Variable<any, string>,	/** limit the number of rows returned */
	limit?: number | undefined | null | Variable<any, string>,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null | Variable<any, string>,	/** sort the rows by one or more columns */
	order_by?: Array<ValueTypes["_prisma_migrations_order_by"]> | undefined | null | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string | Variable<any, string>},ValueTypes["_prisma_migrations"]],
_prisma_migrations_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number | Variable<any, string>,	/** cursor to stream the results returned by the query */
	cursor: Array<ValueTypes["_prisma_migrations_stream_cursor_input"] | undefined | null> | Variable<any, string>,	/** filter the rows returned */
	where?: ValueTypes["_prisma_migrations_bool_exp"] | undefined | null | Variable<any, string>},ValueTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["timestamp"]:unknown;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["timestamp"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["timestamp"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["timestamp"]> | undefined | null | Variable<any, string>
};
	["timestamptz"]:unknown;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["timestamptz"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["timestamptz"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["timestamptz"]> | undefined | null | Variable<any, string>
};
	["uuid"]:unknown;
	/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
["uuid_comparison_exp"]: {
	_eq?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_gt?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_gte?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_in?: Array<ValueTypes["uuid"]> | undefined | null | Variable<any, string>,
	_is_null?: boolean | undefined | null | Variable<any, string>,
	_lt?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_lte?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_neq?: ValueTypes["uuid"] | undefined | null | Variable<any, string>,
	_nin?: Array<ValueTypes["uuid"]> | undefined | null | Variable<any, string>
}
  }

export type ResolverInputTypes = {
    ["schema"]: AliasType<{
	query?:ResolverInputTypes["query_root"],
	mutation?:ResolverInputTypes["mutation_root"],
	subscription?:ResolverInputTypes["subscription_root"],
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "Device" */
["Device"]: AliasType<{
	/** An object relationship */
	DeviceType?:ResolverInputTypes["DeviceType"],
	/** An object relationship */
	Profile?:ResolverInputTypes["Profile"],
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** columns and relationships of "DeviceStatusLog" */
["DeviceStatusLog"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
status?: [{	/** JSON select path */
	path?: string | undefined | null},boolean | `@${string}`],
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "DeviceStatusLog" */
["DeviceStatusLog_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["DeviceStatusLog_aggregate_fields"],
	nodes?:ResolverInputTypes["DeviceStatusLog"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "DeviceStatusLog" */
["DeviceStatusLog_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["DeviceStatusLog_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["DeviceStatusLog_max_fields"],
	min?:ResolverInputTypes["DeviceStatusLog_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_append_input"]: {
	status?: ResolverInputTypes["jsonb"] | undefined | null
};
	/** Boolean expression to filter rows from the table "DeviceStatusLog". All fields are combined with a logical 'AND'. */
["DeviceStatusLog_bool_exp"]: {
	_and?: Array<ResolverInputTypes["DeviceStatusLog_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["DeviceStatusLog_bool_exp"]> | undefined | null,
	board_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	status?: ResolverInputTypes["jsonb_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "DeviceStatusLog" */
["DeviceStatusLog_constraint"]:DeviceStatusLog_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceStatusLog_delete_at_path_input"]: {
	status?: Array<string> | undefined | null
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceStatusLog_delete_elem_input"]: {
	status?: number | undefined | null
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceStatusLog_delete_key_input"]: {
	status?: string | undefined | null
};
	/** input type for inserting data into table "DeviceStatusLog" */
["DeviceStatusLog_insert_input"]: {
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	status?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["DeviceStatusLog_max_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["DeviceStatusLog_min_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "DeviceStatusLog" */
["DeviceStatusLog_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["DeviceStatusLog"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "DeviceStatusLog" */
["DeviceStatusLog_on_conflict"]: {
	constraint: ResolverInputTypes["DeviceStatusLog_constraint"],
	update_columns: Array<ResolverInputTypes["DeviceStatusLog_update_column"]>,
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "DeviceStatusLog". */
["DeviceStatusLog_order_by"]: {
	board_id?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	status?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: DeviceStatusLog */
["DeviceStatusLog_pk_columns_input"]: {
	id: ResolverInputTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_prepend_input"]: {
	status?: ResolverInputTypes["jsonb"] | undefined | null
};
	/** select columns of table "DeviceStatusLog" */
["DeviceStatusLog_select_column"]:DeviceStatusLog_select_column;
	/** input type for updating data in table "DeviceStatusLog" */
["DeviceStatusLog_set_input"]: {
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	status?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "DeviceStatusLog" */
["DeviceStatusLog_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["DeviceStatusLog_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["DeviceStatusLog_stream_cursor_value_input"]: {
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	status?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "DeviceStatusLog" */
["DeviceStatusLog_update_column"]:DeviceStatusLog_update_column;
	["DeviceStatusLog_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceStatusLog_append_input"] | undefined | null,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceStatusLog_delete_elem_input"] | undefined | null,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceStatusLog_delete_key_input"] | undefined | null,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceStatusLog_prepend_input"] | undefined | null,
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceStatusLog_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["DeviceStatusLog_bool_exp"]
};
	/** columns and relationships of "DeviceType" */
["DeviceType"]: AliasType<{
Devices?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device"]],
Devices_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device_aggregate"]],
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
status_fields?: [{	/** JSON select path */
	path?: string | undefined | null},boolean | `@${string}`],
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "DeviceType" */
["DeviceType_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["DeviceType_aggregate_fields"],
	nodes?:ResolverInputTypes["DeviceType"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "DeviceType" */
["DeviceType_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["DeviceType_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["DeviceType_max_fields"],
	min?:ResolverInputTypes["DeviceType_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceType_append_input"]: {
	status_fields?: ResolverInputTypes["jsonb"] | undefined | null
};
	/** Boolean expression to filter rows from the table "DeviceType". All fields are combined with a logical 'AND'. */
["DeviceType_bool_exp"]: {
	Devices?: ResolverInputTypes["Device_bool_exp"] | undefined | null,
	Devices_aggregate?: ResolverInputTypes["Device_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["DeviceType_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["DeviceType_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	status_fields?: ResolverInputTypes["jsonb_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "DeviceType" */
["DeviceType_constraint"]:DeviceType_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceType_delete_at_path_input"]: {
	status_fields?: Array<string> | undefined | null
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceType_delete_elem_input"]: {
	status_fields?: number | undefined | null
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceType_delete_key_input"]: {
	status_fields?: string | undefined | null
};
	/** input type for inserting data into table "DeviceType" */
["DeviceType_insert_input"]: {
	Devices?: ResolverInputTypes["Device_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	name?: string | undefined | null,
	status_fields?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["DeviceType_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["DeviceType_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "DeviceType" */
["DeviceType_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["DeviceType"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "DeviceType" */
["DeviceType_obj_rel_insert_input"]: {
	data: ResolverInputTypes["DeviceType_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["DeviceType_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "DeviceType" */
["DeviceType_on_conflict"]: {
	constraint: ResolverInputTypes["DeviceType_constraint"],
	update_columns: Array<ResolverInputTypes["DeviceType_update_column"]>,
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "DeviceType". */
["DeviceType_order_by"]: {
	Devices_aggregate?: ResolverInputTypes["Device_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	name?: ResolverInputTypes["order_by"] | undefined | null,
	status_fields?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: DeviceType */
["DeviceType_pk_columns_input"]: {
	id: ResolverInputTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceType_prepend_input"]: {
	status_fields?: ResolverInputTypes["jsonb"] | undefined | null
};
	/** select columns of table "DeviceType" */
["DeviceType_select_column"]:DeviceType_select_column;
	/** input type for updating data in table "DeviceType" */
["DeviceType_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	name?: string | undefined | null,
	status_fields?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "DeviceType" */
["DeviceType_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["DeviceType_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["DeviceType_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	name?: string | undefined | null,
	status_fields?: ResolverInputTypes["jsonb"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "DeviceType" */
["DeviceType_update_column"]:DeviceType_update_column;
	["DeviceType_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceType_append_input"] | undefined | null,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceType_delete_at_path_input"] | undefined | null,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceType_delete_elem_input"] | undefined | null,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceType_delete_key_input"] | undefined | null,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceType_prepend_input"] | undefined | null,
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceType_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["DeviceType_bool_exp"]
};
	/** aggregated selection of "Device" */
["Device_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Device_aggregate_fields"],
	nodes?:ResolverInputTypes["Device"],
		__typename?: boolean | `@${string}`
}>;
	["Device_aggregate_bool_exp"]: {
	count?: ResolverInputTypes["Device_aggregate_bool_exp_count"] | undefined | null
};
	["Device_aggregate_bool_exp_count"]: {
	arguments?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,
	distinct?: boolean | undefined | null,
	filter?: ResolverInputTypes["Device_bool_exp"] | undefined | null,
	predicate: ResolverInputTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Device" */
["Device_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Device_max_fields"],
	min?:ResolverInputTypes["Device_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** order by aggregate values of table "Device" */
["Device_aggregate_order_by"]: {
	count?: ResolverInputTypes["order_by"] | undefined | null,
	max?: ResolverInputTypes["Device_max_order_by"] | undefined | null,
	min?: ResolverInputTypes["Device_min_order_by"] | undefined | null
};
	/** input type for inserting array relation for remote table "Device" */
["Device_arr_rel_insert_input"]: {
	data: Array<ResolverInputTypes["Device_insert_input"]>,
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Device_on_conflict"] | undefined | null
};
	/** Boolean expression to filter rows from the table "Device". All fields are combined with a logical 'AND'. */
["Device_bool_exp"]: {
	DeviceType?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Device_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Device_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Device_bool_exp"]> | undefined | null,
	board_id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	profile_id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	type_id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Device" */
["Device_constraint"]:Device_constraint;
	/** input type for inserting data into table "Device" */
["Device_insert_input"]: {
	DeviceType?: ResolverInputTypes["DeviceType_obj_rel_insert_input"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_obj_rel_insert_input"] | undefined | null,
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	profile_id?: ResolverInputTypes["uuid"] | undefined | null,
	type_id?: ResolverInputTypes["uuid"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["Device_max_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by max() on columns of table "Device" */
["Device_max_order_by"]: {
	board_id?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	type_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** aggregate min on columns */
["Device_min_fields"]: AliasType<{
	board_id?:boolean | `@${string}`,
	created_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	profile_id?:boolean | `@${string}`,
	type_id?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** order by min() on columns of table "Device" */
["Device_min_order_by"]: {
	board_id?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	type_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** response of any mutation on the table "Device" */
["Device_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Device"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "Device" */
["Device_on_conflict"]: {
	constraint: ResolverInputTypes["Device_constraint"],
	update_columns: Array<ResolverInputTypes["Device_update_column"]>,
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Device". */
["Device_order_by"]: {
	DeviceType?: ResolverInputTypes["DeviceType_order_by"] | undefined | null,
	Profile?: ResolverInputTypes["Profile_order_by"] | undefined | null,
	board_id?: ResolverInputTypes["order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	profile_id?: ResolverInputTypes["order_by"] | undefined | null,
	type_id?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Device */
["Device_pk_columns_input"]: {
	id: ResolverInputTypes["uuid"]
};
	/** select columns of table "Device" */
["Device_select_column"]:Device_select_column;
	/** input type for updating data in table "Device" */
["Device_set_input"]: {
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	profile_id?: ResolverInputTypes["uuid"] | undefined | null,
	type_id?: ResolverInputTypes["uuid"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "Device" */
["Device_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Device_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Device_stream_cursor_value_input"]: {
	board_id?: string | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	profile_id?: ResolverInputTypes["uuid"] | undefined | null,
	type_id?: ResolverInputTypes["uuid"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "Device" */
["Device_update_column"]:Device_update_column;
	["Device_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Device_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Device_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined | null,
	_gt?: number | undefined | null,
	_gte?: number | undefined | null,
	_in?: Array<number> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: number | undefined | null,
	_lte?: number | undefined | null,
	_neq?: number | undefined | null,
	_nin?: Array<number> | undefined | null
};
	/** columns and relationships of "Profile" */
["Profile"]: AliasType<{
Devices?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device"]],
Devices_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device_aggregate"]],
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["Profile_aggregate_fields"],
	nodes?:ResolverInputTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: AliasType<{
count?: [{	columns?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["Profile_max_fields"],
	min?:ResolverInputTypes["Profile_min_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	Devices?: ResolverInputTypes["Device_bool_exp"] | undefined | null,
	Devices_aggregate?: ResolverInputTypes["Device_aggregate_bool_exp"] | undefined | null,
	_and?: Array<ResolverInputTypes["Profile_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["Profile_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["Profile_bool_exp"]> | undefined | null,
	created_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null,
	email?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	first_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["uuid_comparison_exp"] | undefined | null,
	last_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	phone?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	picture_url?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	updated_at?: ResolverInputTypes["timestamp_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	Devices?: ResolverInputTypes["Device_arr_rel_insert_input"] | undefined | null,
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** aggregate max on columns */
["Profile_max_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["Profile_min_fields"]: AliasType<{
	created_at?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	first_name?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	last_name?:boolean | `@${string}`,
	phone?:boolean | `@${string}`,
	picture_url?:boolean | `@${string}`,
	updated_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["Profile"],
		__typename?: boolean | `@${string}`
}>;
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ResolverInputTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ResolverInputTypes["Profile_constraint"],
	update_columns: Array<ResolverInputTypes["Profile_update_column"]>,
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	Devices_aggregate?: ResolverInputTypes["Device_aggregate_order_by"] | undefined | null,
	created_at?: ResolverInputTypes["order_by"] | undefined | null,
	email?: ResolverInputTypes["order_by"] | undefined | null,
	first_name?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	last_name?: ResolverInputTypes["order_by"] | undefined | null,
	phone?: ResolverInputTypes["order_by"] | undefined | null,
	picture_url?: ResolverInputTypes["order_by"] | undefined | null,
	updated_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: ResolverInputTypes["uuid"]
};
	/** select columns of table "Profile" */
["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ResolverInputTypes["timestamp"] | undefined | null,
	email?: string | undefined | null,
	first_name?: string | undefined | null,
	id?: ResolverInputTypes["uuid"] | undefined | null,
	last_name?: string | undefined | null,
	phone?: string | undefined | null,
	picture_url?: string | undefined | null,
	updated_at?: ResolverInputTypes["timestamp"] | undefined | null
};
	/** update columns of table "Profile" */
["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Profile_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined | null,
	_gt?: string | undefined | null,
	_gte?: string | undefined | null,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined | null,
	_in?: Array<string> | undefined | null,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined | null,
	_is_null?: boolean | undefined | null,
	/** does the column match the given pattern */
	_like?: string | undefined | null,
	_lt?: string | undefined | null,
	_lte?: string | undefined | null,
	_neq?: string | undefined | null,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined | null,
	_nin?: Array<string> | undefined | null,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined | null,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined | null,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined | null,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined | null,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined | null,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined | null
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: AliasType<{
	aggregate?:ResolverInputTypes["_prisma_migrations_aggregate_fields"],
	nodes?:ResolverInputTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: AliasType<{
	avg?:ResolverInputTypes["_prisma_migrations_avg_fields"],
count?: [{	columns?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	distinct?: boolean | undefined | null},boolean | `@${string}`],
	max?:ResolverInputTypes["_prisma_migrations_max_fields"],
	min?:ResolverInputTypes["_prisma_migrations_min_fields"],
	stddev?:ResolverInputTypes["_prisma_migrations_stddev_fields"],
	stddev_pop?:ResolverInputTypes["_prisma_migrations_stddev_pop_fields"],
	stddev_samp?:ResolverInputTypes["_prisma_migrations_stddev_samp_fields"],
	sum?:ResolverInputTypes["_prisma_migrations_sum_fields"],
	var_pop?:ResolverInputTypes["_prisma_migrations_var_pop_fields"],
	var_samp?:ResolverInputTypes["_prisma_migrations_var_samp_fields"],
	variance?:ResolverInputTypes["_prisma_migrations_variance_fields"],
		__typename?: boolean | `@${string}`
}>;
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ResolverInputTypes["_prisma_migrations_bool_exp"]> | undefined | null,
	_not?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null,
	_or?: Array<ResolverInputTypes["_prisma_migrations_bool_exp"]> | undefined | null,
	applied_steps_count?: ResolverInputTypes["Int_comparison_exp"] | undefined | null,
	checksum?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null,
	id?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	logs?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	migration_name?: ResolverInputTypes["String_comparison_exp"] | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz_comparison_exp"] | undefined | null
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined | null
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
	checksum?:boolean | `@${string}`,
	finished_at?:boolean | `@${string}`,
	id?:boolean | `@${string}`,
	logs?:boolean | `@${string}`,
	migration_name?:boolean | `@${string}`,
	rolled_back_at?:boolean | `@${string}`,
	started_at?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: AliasType<{
	/** number of rows affected by the mutation */
	affected_rows?:boolean | `@${string}`,
	/** data from the rows affected by the mutation */
	returning?:ResolverInputTypes["_prisma_migrations"],
		__typename?: boolean | `@${string}`
}>;
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ResolverInputTypes["_prisma_migrations_constraint"],
	update_columns: Array<ResolverInputTypes["_prisma_migrations_update_column"]>,
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ResolverInputTypes["order_by"] | undefined | null,
	checksum?: ResolverInputTypes["order_by"] | undefined | null,
	finished_at?: ResolverInputTypes["order_by"] | undefined | null,
	id?: ResolverInputTypes["order_by"] | undefined | null,
	logs?: ResolverInputTypes["order_by"] | undefined | null,
	migration_name?: ResolverInputTypes["order_by"] | undefined | null,
	rolled_back_at?: ResolverInputTypes["order_by"] | undefined | null,
	started_at?: ResolverInputTypes["order_by"] | undefined | null
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ResolverInputTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ResolverInputTypes["cursor_ordering"] | undefined | null
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined | null,
	checksum?: string | undefined | null,
	finished_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	id?: string | undefined | null,
	logs?: string | undefined | null,
	migration_name?: string | undefined | null,
	rolled_back_at?: ResolverInputTypes["timestamptz"] | undefined | null,
	started_at?: ResolverInputTypes["timestamptz"] | undefined | null
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,
	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,
	/** filter the rows which have to be updated */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: AliasType<{
	applied_steps_count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	/** ordering argument of a cursor */
["cursor_ordering"]:cursor_ordering;
	["jsonb"]:unknown;
	["jsonb_cast_exp"]: {
	String?: ResolverInputTypes["String_comparison_exp"] | undefined | null
};
	/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
["jsonb_comparison_exp"]: {
	_cast?: ResolverInputTypes["jsonb_cast_exp"] | undefined | null,
	/** is the column contained in the given json value */
	_contained_in?: ResolverInputTypes["jsonb"] | undefined | null,
	/** does the column contain the given json value at the top level */
	_contains?: ResolverInputTypes["jsonb"] | undefined | null,
	_eq?: ResolverInputTypes["jsonb"] | undefined | null,
	_gt?: ResolverInputTypes["jsonb"] | undefined | null,
	_gte?: ResolverInputTypes["jsonb"] | undefined | null,
	/** does the string exist as a top-level key in the column */
	_has_key?: string | undefined | null,
	/** do all of these strings exist as top-level keys in the column */
	_has_keys_all?: Array<string> | undefined | null,
	/** do any of these strings exist as top-level keys in the column */
	_has_keys_any?: Array<string> | undefined | null,
	_in?: Array<ResolverInputTypes["jsonb"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["jsonb"] | undefined | null,
	_lte?: ResolverInputTypes["jsonb"] | undefined | null,
	_neq?: ResolverInputTypes["jsonb"] | undefined | null,
	_nin?: Array<ResolverInputTypes["jsonb"]> | undefined | null
};
	/** mutation root */
["mutation_root"]: AliasType<{
delete_Device?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Device_bool_exp"]},ResolverInputTypes["Device_mutation_response"]],
delete_DeviceStatusLog?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["DeviceStatusLog_bool_exp"]},ResolverInputTypes["DeviceStatusLog_mutation_response"]],
delete_DeviceStatusLog_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceStatusLog"]],
delete_DeviceType?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["DeviceType_bool_exp"]},ResolverInputTypes["DeviceType_mutation_response"]],
delete_DeviceType_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceType"]],
delete_Device_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Device"]],
delete_Profile?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["Profile_bool_exp"]},ResolverInputTypes["Profile_mutation_response"]],
delete_Profile_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Profile"]],
delete__prisma_migrations?: [{	/** filter the rows which have to be deleted */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]},ResolverInputTypes["_prisma_migrations_mutation_response"]],
delete__prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
insert_Device?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Device_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Device_on_conflict"] | undefined | null},ResolverInputTypes["Device_mutation_response"]],
insert_DeviceStatusLog?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["DeviceStatusLog_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["DeviceStatusLog_on_conflict"] | undefined | null},ResolverInputTypes["DeviceStatusLog_mutation_response"]],
insert_DeviceStatusLog_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["DeviceStatusLog_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["DeviceStatusLog_on_conflict"] | undefined | null},ResolverInputTypes["DeviceStatusLog"]],
insert_DeviceType?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["DeviceType_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["DeviceType_on_conflict"] | undefined | null},ResolverInputTypes["DeviceType_mutation_response"]],
insert_DeviceType_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["DeviceType_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["DeviceType_on_conflict"] | undefined | null},ResolverInputTypes["DeviceType"]],
insert_Device_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Device_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Device_on_conflict"] | undefined | null},ResolverInputTypes["Device"]],
insert_Profile?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["Profile_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null},ResolverInputTypes["Profile_mutation_response"]],
insert_Profile_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["Profile_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["Profile_on_conflict"] | undefined | null},ResolverInputTypes["Profile"]],
insert__prisma_migrations?: [{	/** the rows to be inserted */
	objects: Array<ResolverInputTypes["_prisma_migrations_insert_input"]>,	/** upsert condition */
	on_conflict?: ResolverInputTypes["_prisma_migrations_on_conflict"] | undefined | null},ResolverInputTypes["_prisma_migrations_mutation_response"]],
insert__prisma_migrations_one?: [{	/** the row to be inserted */
	object: ResolverInputTypes["_prisma_migrations_insert_input"],	/** upsert condition */
	on_conflict?: ResolverInputTypes["_prisma_migrations_on_conflict"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
update_Device?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Device_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Device_bool_exp"]},ResolverInputTypes["Device_mutation_response"]],
update_DeviceStatusLog?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceStatusLog_append_input"] | undefined | null,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceStatusLog_delete_elem_input"] | undefined | null,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceStatusLog_delete_key_input"] | undefined | null,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceStatusLog_prepend_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceStatusLog_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["DeviceStatusLog_bool_exp"]},ResolverInputTypes["DeviceStatusLog_mutation_response"]],
update_DeviceStatusLog_by_pk?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceStatusLog_append_input"] | undefined | null,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceStatusLog_delete_at_path_input"] | undefined | null,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceStatusLog_delete_elem_input"] | undefined | null,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceStatusLog_delete_key_input"] | undefined | null,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceStatusLog_prepend_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceStatusLog_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["DeviceStatusLog_pk_columns_input"]},ResolverInputTypes["DeviceStatusLog"]],
update_DeviceStatusLog_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["DeviceStatusLog_updates"]>},ResolverInputTypes["DeviceStatusLog_mutation_response"]],
update_DeviceType?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceType_append_input"] | undefined | null,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceType_delete_at_path_input"] | undefined | null,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceType_delete_elem_input"] | undefined | null,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceType_delete_key_input"] | undefined | null,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceType_prepend_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceType_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["DeviceType_bool_exp"]},ResolverInputTypes["DeviceType_mutation_response"]],
update_DeviceType_by_pk?: [{	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ResolverInputTypes["DeviceType_append_input"] | undefined | null,	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ResolverInputTypes["DeviceType_delete_at_path_input"] | undefined | null,	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ResolverInputTypes["DeviceType_delete_elem_input"] | undefined | null,	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ResolverInputTypes["DeviceType_delete_key_input"] | undefined | null,	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ResolverInputTypes["DeviceType_prepend_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["DeviceType_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["DeviceType_pk_columns_input"]},ResolverInputTypes["DeviceType"]],
update_DeviceType_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["DeviceType_updates"]>},ResolverInputTypes["DeviceType_mutation_response"]],
update_Device_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Device_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Device_pk_columns_input"]},ResolverInputTypes["Device"]],
update_Device_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Device_updates"]>},ResolverInputTypes["Device_mutation_response"]],
update_Profile?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["Profile_bool_exp"]},ResolverInputTypes["Profile_mutation_response"]],
update_Profile_by_pk?: [{	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["Profile_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["Profile_pk_columns_input"]},ResolverInputTypes["Profile"]],
update_Profile_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["Profile_updates"]>},ResolverInputTypes["Profile_mutation_response"]],
update__prisma_migrations?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,	/** filter the rows which have to be updated */
	where: ResolverInputTypes["_prisma_migrations_bool_exp"]},ResolverInputTypes["_prisma_migrations_mutation_response"]],
update__prisma_migrations_by_pk?: [{	/** increments the numeric columns with given value of the filtered values */
	_inc?: ResolverInputTypes["_prisma_migrations_inc_input"] | undefined | null,	/** sets the columns of the filtered rows to the given values */
	_set?: ResolverInputTypes["_prisma_migrations_set_input"] | undefined | null,	pk_columns: ResolverInputTypes["_prisma_migrations_pk_columns_input"]},ResolverInputTypes["_prisma_migrations"]],
update__prisma_migrations_many?: [{	/** updates to execute, in order */
	updates: Array<ResolverInputTypes["_prisma_migrations_updates"]>},ResolverInputTypes["_prisma_migrations_mutation_response"]],
		__typename?: boolean | `@${string}`
}>;
	/** column ordering options */
["order_by"]:order_by;
	["query_root"]: AliasType<{
Device?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device"]],
DeviceStatusLog?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceStatusLog_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceStatusLog_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null},ResolverInputTypes["DeviceStatusLog"]],
DeviceStatusLog_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceStatusLog_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceStatusLog_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null},ResolverInputTypes["DeviceStatusLog_aggregate"]],
DeviceStatusLog_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceStatusLog"]],
DeviceType?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceType_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceType_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null},ResolverInputTypes["DeviceType"]],
DeviceType_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceType_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceType_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null},ResolverInputTypes["DeviceType_aggregate"]],
DeviceType_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceType"]],
Device_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device_aggregate"]],
Device_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Device"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Profile"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["subscription_root"]: AliasType<{
Device?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device"]],
DeviceStatusLog?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceStatusLog_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceStatusLog_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null},ResolverInputTypes["DeviceStatusLog"]],
DeviceStatusLog_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceStatusLog_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceStatusLog_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null},ResolverInputTypes["DeviceStatusLog_aggregate"]],
DeviceStatusLog_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceStatusLog"]],
DeviceStatusLog_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["DeviceStatusLog_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceStatusLog_bool_exp"] | undefined | null},ResolverInputTypes["DeviceStatusLog"]],
DeviceType?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceType_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceType_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null},ResolverInputTypes["DeviceType"]],
DeviceType_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["DeviceType_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["DeviceType_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null},ResolverInputTypes["DeviceType_aggregate"]],
DeviceType_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["DeviceType"]],
DeviceType_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["DeviceType_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["DeviceType_bool_exp"] | undefined | null},ResolverInputTypes["DeviceType"]],
Device_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Device_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Device_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device_aggregate"]],
Device_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Device"]],
Device_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Device_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Device_bool_exp"] | undefined | null},ResolverInputTypes["Device"]],
Profile?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
Profile_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["Profile_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["Profile_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile_aggregate"]],
Profile_by_pk?: [{	id: ResolverInputTypes["uuid"]},ResolverInputTypes["Profile"]],
Profile_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["Profile_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["Profile_bool_exp"] | undefined | null},ResolverInputTypes["Profile"]],
_prisma_migrations?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_aggregate?: [{	/** distinct select on columns */
	distinct_on?: Array<ResolverInputTypes["_prisma_migrations_select_column"]> | undefined | null,	/** limit the number of rows returned */
	limit?: number | undefined | null,	/** skip the first n rows. Use only with order_by */
	offset?: number | undefined | null,	/** sort the rows by one or more columns */
	order_by?: Array<ResolverInputTypes["_prisma_migrations_order_by"]> | undefined | null,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations_aggregate"]],
_prisma_migrations_by_pk?: [{	id: string},ResolverInputTypes["_prisma_migrations"]],
_prisma_migrations_stream?: [{	/** maximum number of rows returned in a single batch */
	batch_size: number,	/** cursor to stream the results returned by the query */
	cursor: Array<ResolverInputTypes["_prisma_migrations_stream_cursor_input"] | undefined | null>,	/** filter the rows returned */
	where?: ResolverInputTypes["_prisma_migrations_bool_exp"] | undefined | null},ResolverInputTypes["_prisma_migrations"]],
		__typename?: boolean | `@${string}`
}>;
	["timestamp"]:unknown;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ResolverInputTypes["timestamp"] | undefined | null,
	_gt?: ResolverInputTypes["timestamp"] | undefined | null,
	_gte?: ResolverInputTypes["timestamp"] | undefined | null,
	_in?: Array<ResolverInputTypes["timestamp"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["timestamp"] | undefined | null,
	_lte?: ResolverInputTypes["timestamp"] | undefined | null,
	_neq?: ResolverInputTypes["timestamp"] | undefined | null,
	_nin?: Array<ResolverInputTypes["timestamp"]> | undefined | null
};
	["timestamptz"]:unknown;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ResolverInputTypes["timestamptz"] | undefined | null,
	_gt?: ResolverInputTypes["timestamptz"] | undefined | null,
	_gte?: ResolverInputTypes["timestamptz"] | undefined | null,
	_in?: Array<ResolverInputTypes["timestamptz"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["timestamptz"] | undefined | null,
	_lte?: ResolverInputTypes["timestamptz"] | undefined | null,
	_neq?: ResolverInputTypes["timestamptz"] | undefined | null,
	_nin?: Array<ResolverInputTypes["timestamptz"]> | undefined | null
};
	["uuid"]:unknown;
	/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
["uuid_comparison_exp"]: {
	_eq?: ResolverInputTypes["uuid"] | undefined | null,
	_gt?: ResolverInputTypes["uuid"] | undefined | null,
	_gte?: ResolverInputTypes["uuid"] | undefined | null,
	_in?: Array<ResolverInputTypes["uuid"]> | undefined | null,
	_is_null?: boolean | undefined | null,
	_lt?: ResolverInputTypes["uuid"] | undefined | null,
	_lte?: ResolverInputTypes["uuid"] | undefined | null,
	_neq?: ResolverInputTypes["uuid"] | undefined | null,
	_nin?: Array<ResolverInputTypes["uuid"]> | undefined | null
}
  }

export type ModelTypes = {
    ["schema"]: {
	query?: ModelTypes["query_root"] | undefined,
	mutation?: ModelTypes["mutation_root"] | undefined,
	subscription?: ModelTypes["subscription_root"] | undefined
};
	/** columns and relationships of "Device" */
["Device"]: {
		/** An object relationship */
	DeviceType: ModelTypes["DeviceType"],
	/** An object relationship */
	Profile: ModelTypes["Profile"],
	board_id: string,
	created_at: ModelTypes["timestamp"],
	id: ModelTypes["uuid"],
	profile_id: ModelTypes["uuid"],
	type_id: ModelTypes["uuid"],
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** columns and relationships of "DeviceStatusLog" */
["DeviceStatusLog"]: {
		board_id: string,
	created_at: ModelTypes["timestamp"],
	id: ModelTypes["uuid"],
	status?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "DeviceStatusLog" */
["DeviceStatusLog_aggregate"]: {
		aggregate?: ModelTypes["DeviceStatusLog_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["DeviceStatusLog"]>
};
	/** aggregate fields of "DeviceStatusLog" */
["DeviceStatusLog_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["DeviceStatusLog_max_fields"] | undefined,
	min?: ModelTypes["DeviceStatusLog_min_fields"] | undefined
};
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_append_input"]: {
	status?: ModelTypes["jsonb"] | undefined
};
	/** Boolean expression to filter rows from the table "DeviceStatusLog". All fields are combined with a logical 'AND'. */
["DeviceStatusLog_bool_exp"]: {
	_and?: Array<ModelTypes["DeviceStatusLog_bool_exp"]> | undefined,
	_not?: ModelTypes["DeviceStatusLog_bool_exp"] | undefined,
	_or?: Array<ModelTypes["DeviceStatusLog_bool_exp"]> | undefined,
	board_id?: ModelTypes["String_comparison_exp"] | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	id?: ModelTypes["uuid_comparison_exp"] | undefined,
	status?: ModelTypes["jsonb_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["DeviceStatusLog_constraint"]:DeviceStatusLog_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceStatusLog_delete_at_path_input"]: {
	status?: Array<string> | undefined
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceStatusLog_delete_elem_input"]: {
	status?: number | undefined
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceStatusLog_delete_key_input"]: {
	status?: string | undefined
};
	/** input type for inserting data into table "DeviceStatusLog" */
["DeviceStatusLog_insert_input"]: {
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	status?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["DeviceStatusLog_max_fields"]: {
		board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["DeviceStatusLog_min_fields"]: {
		board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "DeviceStatusLog" */
["DeviceStatusLog_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["DeviceStatusLog"]>
};
	/** on_conflict condition type for table "DeviceStatusLog" */
["DeviceStatusLog_on_conflict"]: {
	constraint: ModelTypes["DeviceStatusLog_constraint"],
	update_columns: Array<ModelTypes["DeviceStatusLog_update_column"]>,
	where?: ModelTypes["DeviceStatusLog_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "DeviceStatusLog". */
["DeviceStatusLog_order_by"]: {
	board_id?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	status?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: DeviceStatusLog */
["DeviceStatusLog_pk_columns_input"]: {
	id: ModelTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_prepend_input"]: {
	status?: ModelTypes["jsonb"] | undefined
};
	["DeviceStatusLog_select_column"]:DeviceStatusLog_select_column;
	/** input type for updating data in table "DeviceStatusLog" */
["DeviceStatusLog_set_input"]: {
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	status?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "DeviceStatusLog" */
["DeviceStatusLog_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["DeviceStatusLog_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["DeviceStatusLog_stream_cursor_value_input"]: {
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	status?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["DeviceStatusLog_update_column"]:DeviceStatusLog_update_column;
	["DeviceStatusLog_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ModelTypes["DeviceStatusLog_append_input"] | undefined,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ModelTypes["DeviceStatusLog_delete_at_path_input"] | undefined,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ModelTypes["DeviceStatusLog_delete_elem_input"] | undefined,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ModelTypes["DeviceStatusLog_delete_key_input"] | undefined,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ModelTypes["DeviceStatusLog_prepend_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["DeviceStatusLog_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["DeviceStatusLog_bool_exp"]
};
	/** columns and relationships of "DeviceType" */
["DeviceType"]: {
		/** An array relationship */
	Devices: Array<ModelTypes["Device"]>,
	/** An aggregate relationship */
	Devices_aggregate: ModelTypes["Device_aggregate"],
	created_at: ModelTypes["timestamp"],
	id: ModelTypes["uuid"],
	name: string,
	status_fields: ModelTypes["jsonb"],
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "DeviceType" */
["DeviceType_aggregate"]: {
		aggregate?: ModelTypes["DeviceType_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["DeviceType"]>
};
	/** aggregate fields of "DeviceType" */
["DeviceType_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["DeviceType_max_fields"] | undefined,
	min?: ModelTypes["DeviceType_min_fields"] | undefined
};
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceType_append_input"]: {
	status_fields?: ModelTypes["jsonb"] | undefined
};
	/** Boolean expression to filter rows from the table "DeviceType". All fields are combined with a logical 'AND'. */
["DeviceType_bool_exp"]: {
	Devices?: ModelTypes["Device_bool_exp"] | undefined,
	Devices_aggregate?: ModelTypes["Device_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["DeviceType_bool_exp"]> | undefined,
	_not?: ModelTypes["DeviceType_bool_exp"] | undefined,
	_or?: Array<ModelTypes["DeviceType_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	id?: ModelTypes["uuid_comparison_exp"] | undefined,
	name?: ModelTypes["String_comparison_exp"] | undefined,
	status_fields?: ModelTypes["jsonb_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["DeviceType_constraint"]:DeviceType_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceType_delete_at_path_input"]: {
	status_fields?: Array<string> | undefined
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceType_delete_elem_input"]: {
	status_fields?: number | undefined
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceType_delete_key_input"]: {
	status_fields?: string | undefined
};
	/** input type for inserting data into table "DeviceType" */
["DeviceType_insert_input"]: {
	Devices?: ModelTypes["Device_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["DeviceType_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["DeviceType_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	name?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "DeviceType" */
["DeviceType_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["DeviceType"]>
};
	/** input type for inserting object relation for remote table "DeviceType" */
["DeviceType_obj_rel_insert_input"]: {
	data: ModelTypes["DeviceType_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["DeviceType_on_conflict"] | undefined
};
	/** on_conflict condition type for table "DeviceType" */
["DeviceType_on_conflict"]: {
	constraint: ModelTypes["DeviceType_constraint"],
	update_columns: Array<ModelTypes["DeviceType_update_column"]>,
	where?: ModelTypes["DeviceType_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "DeviceType". */
["DeviceType_order_by"]: {
	Devices_aggregate?: ModelTypes["Device_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	name?: ModelTypes["order_by"] | undefined,
	status_fields?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: DeviceType */
["DeviceType_pk_columns_input"]: {
	id: ModelTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceType_prepend_input"]: {
	status_fields?: ModelTypes["jsonb"] | undefined
};
	["DeviceType_select_column"]:DeviceType_select_column;
	/** input type for updating data in table "DeviceType" */
["DeviceType_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "DeviceType" */
["DeviceType_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["DeviceType_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["DeviceType_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: ModelTypes["jsonb"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["DeviceType_update_column"]:DeviceType_update_column;
	["DeviceType_updates"]: {
	/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: ModelTypes["DeviceType_append_input"] | undefined,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: ModelTypes["DeviceType_delete_at_path_input"] | undefined,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: ModelTypes["DeviceType_delete_elem_input"] | undefined,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: ModelTypes["DeviceType_delete_key_input"] | undefined,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: ModelTypes["DeviceType_prepend_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["DeviceType_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["DeviceType_bool_exp"]
};
	/** aggregated selection of "Device" */
["Device_aggregate"]: {
		aggregate?: ModelTypes["Device_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Device"]>
};
	["Device_aggregate_bool_exp"]: {
	count?: ModelTypes["Device_aggregate_bool_exp_count"] | undefined
};
	["Device_aggregate_bool_exp_count"]: {
	arguments?: Array<ModelTypes["Device_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: ModelTypes["Device_bool_exp"] | undefined,
	predicate: ModelTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Device" */
["Device_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Device_max_fields"] | undefined,
	min?: ModelTypes["Device_min_fields"] | undefined
};
	/** order by aggregate values of table "Device" */
["Device_aggregate_order_by"]: {
	count?: ModelTypes["order_by"] | undefined,
	max?: ModelTypes["Device_max_order_by"] | undefined,
	min?: ModelTypes["Device_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "Device" */
["Device_arr_rel_insert_input"]: {
	data: Array<ModelTypes["Device_insert_input"]>,
	/** upsert condition */
	on_conflict?: ModelTypes["Device_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "Device". All fields are combined with a logical 'AND'. */
["Device_bool_exp"]: {
	DeviceType?: ModelTypes["DeviceType_bool_exp"] | undefined,
	Profile?: ModelTypes["Profile_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Device_bool_exp"]> | undefined,
	_not?: ModelTypes["Device_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Device_bool_exp"]> | undefined,
	board_id?: ModelTypes["String_comparison_exp"] | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	id?: ModelTypes["uuid_comparison_exp"] | undefined,
	profile_id?: ModelTypes["uuid_comparison_exp"] | undefined,
	type_id?: ModelTypes["uuid_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["Device_constraint"]:Device_constraint;
	/** input type for inserting data into table "Device" */
["Device_insert_input"]: {
	DeviceType?: ModelTypes["DeviceType_obj_rel_insert_input"] | undefined,
	Profile?: ModelTypes["Profile_obj_rel_insert_input"] | undefined,
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	profile_id?: ModelTypes["uuid"] | undefined,
	type_id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Device_max_fields"]: {
		board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	profile_id?: ModelTypes["uuid"] | undefined,
	type_id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "Device" */
["Device_max_order_by"]: {
	board_id?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	type_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["Device_min_fields"]: {
		board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	profile_id?: ModelTypes["uuid"] | undefined,
	type_id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "Device" */
["Device_min_order_by"]: {
	board_id?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	type_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** response of any mutation on the table "Device" */
["Device_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Device"]>
};
	/** on_conflict condition type for table "Device" */
["Device_on_conflict"]: {
	constraint: ModelTypes["Device_constraint"],
	update_columns: Array<ModelTypes["Device_update_column"]>,
	where?: ModelTypes["Device_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Device". */
["Device_order_by"]: {
	DeviceType?: ModelTypes["DeviceType_order_by"] | undefined,
	Profile?: ModelTypes["Profile_order_by"] | undefined,
	board_id?: ModelTypes["order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	profile_id?: ModelTypes["order_by"] | undefined,
	type_id?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Device */
["Device_pk_columns_input"]: {
	id: ModelTypes["uuid"]
};
	["Device_select_column"]:Device_select_column;
	/** input type for updating data in table "Device" */
["Device_set_input"]: {
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	profile_id?: ModelTypes["uuid"] | undefined,
	type_id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Device" */
["Device_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Device_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Device_stream_cursor_value_input"]: {
	board_id?: string | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	id?: ModelTypes["uuid"] | undefined,
	profile_id?: ModelTypes["uuid"] | undefined,
	type_id?: ModelTypes["uuid"] | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["Device_update_column"]:Device_update_column;
	["Device_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Device_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Device_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
	_eq?: number | undefined,
	_gt?: number | undefined,
	_gte?: number | undefined,
	_in?: Array<number> | undefined,
	_is_null?: boolean | undefined,
	_lt?: number | undefined,
	_lte?: number | undefined,
	_neq?: number | undefined,
	_nin?: Array<number> | undefined
};
	/** columns and relationships of "Profile" */
["Profile"]: {
		/** An array relationship */
	Devices: Array<ModelTypes["Device"]>,
	/** An aggregate relationship */
	Devices_aggregate: ModelTypes["Device_aggregate"],
	created_at: ModelTypes["timestamp"],
	email: string,
	first_name?: string | undefined,
	id: ModelTypes["uuid"],
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: {
		aggregate?: ModelTypes["Profile_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["Profile"]>
};
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: {
		count: number,
	max?: ModelTypes["Profile_max_fields"] | undefined,
	min?: ModelTypes["Profile_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
	Devices?: ModelTypes["Device_bool_exp"] | undefined,
	Devices_aggregate?: ModelTypes["Device_aggregate_bool_exp"] | undefined,
	_and?: Array<ModelTypes["Profile_bool_exp"]> | undefined,
	_not?: ModelTypes["Profile_bool_exp"] | undefined,
	_or?: Array<ModelTypes["Profile_bool_exp"]> | undefined,
	created_at?: ModelTypes["timestamp_comparison_exp"] | undefined,
	email?: ModelTypes["String_comparison_exp"] | undefined,
	first_name?: ModelTypes["String_comparison_exp"] | undefined,
	id?: ModelTypes["uuid_comparison_exp"] | undefined,
	last_name?: ModelTypes["String_comparison_exp"] | undefined,
	phone?: ModelTypes["String_comparison_exp"] | undefined,
	picture_url?: ModelTypes["String_comparison_exp"] | undefined,
	updated_at?: ModelTypes["timestamp_comparison_exp"] | undefined
};
	["Profile_constraint"]:Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
	Devices?: ModelTypes["Device_arr_rel_insert_input"] | undefined,
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: ModelTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Profile_max_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: ModelTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Profile_min_fields"]: {
		created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: ModelTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["Profile"]>
};
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
	data: ModelTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: ModelTypes["Profile_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
	constraint: ModelTypes["Profile_constraint"],
	update_columns: Array<ModelTypes["Profile_update_column"]>,
	where?: ModelTypes["Profile_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
	Devices_aggregate?: ModelTypes["Device_aggregate_order_by"] | undefined,
	created_at?: ModelTypes["order_by"] | undefined,
	email?: ModelTypes["order_by"] | undefined,
	first_name?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	last_name?: ModelTypes["order_by"] | undefined,
	phone?: ModelTypes["order_by"] | undefined,
	picture_url?: ModelTypes["order_by"] | undefined,
	updated_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
	id: ModelTypes["uuid"]
};
	["Profile_select_column"]:Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: ModelTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
	created_at?: ModelTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: ModelTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: ModelTypes["timestamp"] | undefined
};
	["Profile_update_column"]:Profile_update_column;
	["Profile_updates"]: {
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["Profile_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["Profile_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
	_eq?: string | undefined,
	_gt?: string | undefined,
	_gte?: string | undefined,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined,
	_in?: Array<string> | undefined,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined,
	_is_null?: boolean | undefined,
	/** does the column match the given pattern */
	_like?: string | undefined,
	_lt?: string | undefined,
	_lte?: string | undefined,
	_neq?: string | undefined,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined,
	_nin?: Array<string> | undefined,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: {
		applied_steps_count: number,
	checksum: string,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id: string,
	logs?: string | undefined,
	migration_name: string,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at: ModelTypes["timestamptz"]
};
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: {
		aggregate?: ModelTypes["_prisma_migrations_aggregate_fields"] | undefined,
	nodes: Array<ModelTypes["_prisma_migrations"]>
};
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: {
		avg?: ModelTypes["_prisma_migrations_avg_fields"] | undefined,
	count: number,
	max?: ModelTypes["_prisma_migrations_max_fields"] | undefined,
	min?: ModelTypes["_prisma_migrations_min_fields"] | undefined,
	stddev?: ModelTypes["_prisma_migrations_stddev_fields"] | undefined,
	stddev_pop?: ModelTypes["_prisma_migrations_stddev_pop_fields"] | undefined,
	stddev_samp?: ModelTypes["_prisma_migrations_stddev_samp_fields"] | undefined,
	sum?: ModelTypes["_prisma_migrations_sum_fields"] | undefined,
	var_pop?: ModelTypes["_prisma_migrations_var_pop_fields"] | undefined,
	var_samp?: ModelTypes["_prisma_migrations_var_samp_fields"] | undefined,
	variance?: ModelTypes["_prisma_migrations_variance_fields"] | undefined
};
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: {
		applied_steps_count?: number | undefined
};
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
	_and?: Array<ModelTypes["_prisma_migrations_bool_exp"]> | undefined,
	_not?: ModelTypes["_prisma_migrations_bool_exp"] | undefined,
	_or?: Array<ModelTypes["_prisma_migrations_bool_exp"]> | undefined,
	applied_steps_count?: ModelTypes["Int_comparison_exp"] | undefined,
	checksum?: ModelTypes["String_comparison_exp"] | undefined,
	finished_at?: ModelTypes["timestamptz_comparison_exp"] | undefined,
	id?: ModelTypes["String_comparison_exp"] | undefined,
	logs?: ModelTypes["String_comparison_exp"] | undefined,
	migration_name?: ModelTypes["String_comparison_exp"] | undefined,
	rolled_back_at?: ModelTypes["timestamptz_comparison_exp"] | undefined,
	started_at?: ModelTypes["timestamptz_comparison_exp"] | undefined
};
	["_prisma_migrations_constraint"]:_prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
	applied_steps_count?: number | undefined
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: {
		/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<ModelTypes["_prisma_migrations"]>
};
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
	constraint: ModelTypes["_prisma_migrations_constraint"],
	update_columns: Array<ModelTypes["_prisma_migrations_update_column"]>,
	where?: ModelTypes["_prisma_migrations_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
	applied_steps_count?: ModelTypes["order_by"] | undefined,
	checksum?: ModelTypes["order_by"] | undefined,
	finished_at?: ModelTypes["order_by"] | undefined,
	id?: ModelTypes["order_by"] | undefined,
	logs?: ModelTypes["order_by"] | undefined,
	migration_name?: ModelTypes["order_by"] | undefined,
	rolled_back_at?: ModelTypes["order_by"] | undefined,
	started_at?: ModelTypes["order_by"] | undefined
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
	id: string
};
	["_prisma_migrations_select_column"]:_prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: {
		applied_steps_count?: number | undefined
};
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
	/** Stream column input with initial value */
	initial_value: ModelTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: ModelTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: ModelTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: ModelTypes["timestamptz"] | undefined,
	started_at?: ModelTypes["timestamptz"] | undefined
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: {
		applied_steps_count?: number | undefined
};
	["_prisma_migrations_update_column"]:_prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: ModelTypes["_prisma_migrations_inc_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: ModelTypes["_prisma_migrations_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: ModelTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: {
		applied_steps_count?: number | undefined
};
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: {
		applied_steps_count?: number | undefined
};
	["cursor_ordering"]:cursor_ordering;
	["jsonb"]:any;
	["jsonb_cast_exp"]: {
	String?: ModelTypes["String_comparison_exp"] | undefined
};
	/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
["jsonb_comparison_exp"]: {
	_cast?: ModelTypes["jsonb_cast_exp"] | undefined,
	/** is the column contained in the given json value */
	_contained_in?: ModelTypes["jsonb"] | undefined,
	/** does the column contain the given json value at the top level */
	_contains?: ModelTypes["jsonb"] | undefined,
	_eq?: ModelTypes["jsonb"] | undefined,
	_gt?: ModelTypes["jsonb"] | undefined,
	_gte?: ModelTypes["jsonb"] | undefined,
	/** does the string exist as a top-level key in the column */
	_has_key?: string | undefined,
	/** do all of these strings exist as top-level keys in the column */
	_has_keys_all?: Array<string> | undefined,
	/** do any of these strings exist as top-level keys in the column */
	_has_keys_any?: Array<string> | undefined,
	_in?: Array<ModelTypes["jsonb"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["jsonb"] | undefined,
	_lte?: ModelTypes["jsonb"] | undefined,
	_neq?: ModelTypes["jsonb"] | undefined,
	_nin?: Array<ModelTypes["jsonb"]> | undefined
};
	/** mutation root */
["mutation_root"]: {
		/** delete data from the table: "Device" */
	delete_Device?: ModelTypes["Device_mutation_response"] | undefined,
	/** delete data from the table: "DeviceStatusLog" */
	delete_DeviceStatusLog?: ModelTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** delete single row from the table: "DeviceStatusLog" */
	delete_DeviceStatusLog_by_pk?: ModelTypes["DeviceStatusLog"] | undefined,
	/** delete data from the table: "DeviceType" */
	delete_DeviceType?: ModelTypes["DeviceType_mutation_response"] | undefined,
	/** delete single row from the table: "DeviceType" */
	delete_DeviceType_by_pk?: ModelTypes["DeviceType"] | undefined,
	/** delete single row from the table: "Device" */
	delete_Device_by_pk?: ModelTypes["Device"] | undefined,
	/** delete data from the table: "Profile" */
	delete_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** delete single row from the table: "Profile" */
	delete_Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** delete data from the table: "_prisma_migrations" */
	delete__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** delete single row from the table: "_prisma_migrations" */
	delete__prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** insert data into the table: "Device" */
	insert_Device?: ModelTypes["Device_mutation_response"] | undefined,
	/** insert data into the table: "DeviceStatusLog" */
	insert_DeviceStatusLog?: ModelTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** insert a single row into the table: "DeviceStatusLog" */
	insert_DeviceStatusLog_one?: ModelTypes["DeviceStatusLog"] | undefined,
	/** insert data into the table: "DeviceType" */
	insert_DeviceType?: ModelTypes["DeviceType_mutation_response"] | undefined,
	/** insert a single row into the table: "DeviceType" */
	insert_DeviceType_one?: ModelTypes["DeviceType"] | undefined,
	/** insert a single row into the table: "Device" */
	insert_Device_one?: ModelTypes["Device"] | undefined,
	/** insert data into the table: "Profile" */
	insert_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** insert a single row into the table: "Profile" */
	insert_Profile_one?: ModelTypes["Profile"] | undefined,
	/** insert data into the table: "_prisma_migrations" */
	insert__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** insert a single row into the table: "_prisma_migrations" */
	insert__prisma_migrations_one?: ModelTypes["_prisma_migrations"] | undefined,
	/** update data of the table: "Device" */
	update_Device?: ModelTypes["Device_mutation_response"] | undefined,
	/** update data of the table: "DeviceStatusLog" */
	update_DeviceStatusLog?: ModelTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** update single row of the table: "DeviceStatusLog" */
	update_DeviceStatusLog_by_pk?: ModelTypes["DeviceStatusLog"] | undefined,
	/** update multiples rows of table: "DeviceStatusLog" */
	update_DeviceStatusLog_many?: Array<ModelTypes["DeviceStatusLog_mutation_response"] | undefined> | undefined,
	/** update data of the table: "DeviceType" */
	update_DeviceType?: ModelTypes["DeviceType_mutation_response"] | undefined,
	/** update single row of the table: "DeviceType" */
	update_DeviceType_by_pk?: ModelTypes["DeviceType"] | undefined,
	/** update multiples rows of table: "DeviceType" */
	update_DeviceType_many?: Array<ModelTypes["DeviceType_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Device" */
	update_Device_by_pk?: ModelTypes["Device"] | undefined,
	/** update multiples rows of table: "Device" */
	update_Device_many?: Array<ModelTypes["Device_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Profile" */
	update_Profile?: ModelTypes["Profile_mutation_response"] | undefined,
	/** update single row of the table: "Profile" */
	update_Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** update multiples rows of table: "Profile" */
	update_Profile_many?: Array<ModelTypes["Profile_mutation_response"] | undefined> | undefined,
	/** update data of the table: "_prisma_migrations" */
	update__prisma_migrations?: ModelTypes["_prisma_migrations_mutation_response"] | undefined,
	/** update single row of the table: "_prisma_migrations" */
	update__prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** update multiples rows of table: "_prisma_migrations" */
	update__prisma_migrations_many?: Array<ModelTypes["_prisma_migrations_mutation_response"] | undefined> | undefined
};
	["order_by"]:order_by;
	["query_root"]: {
		/** fetch data from the table: "Device" */
	Device: Array<ModelTypes["Device"]>,
	/** fetch data from the table: "DeviceStatusLog" */
	DeviceStatusLog: Array<ModelTypes["DeviceStatusLog"]>,
	/** fetch aggregated fields from the table: "DeviceStatusLog" */
	DeviceStatusLog_aggregate: ModelTypes["DeviceStatusLog_aggregate"],
	/** fetch data from the table: "DeviceStatusLog" using primary key columns */
	DeviceStatusLog_by_pk?: ModelTypes["DeviceStatusLog"] | undefined,
	/** fetch data from the table: "DeviceType" */
	DeviceType: Array<ModelTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "DeviceType" */
	DeviceType_aggregate: ModelTypes["DeviceType_aggregate"],
	/** fetch data from the table: "DeviceType" using primary key columns */
	DeviceType_by_pk?: ModelTypes["DeviceType"] | undefined,
	/** fetch aggregated fields from the table: "Device" */
	Device_aggregate: ModelTypes["Device_aggregate"],
	/** fetch data from the table: "Device" using primary key columns */
	Device_by_pk?: ModelTypes["Device"] | undefined,
	/** fetch data from the table: "Profile" */
	Profile: Array<ModelTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: ModelTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<ModelTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: ModelTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined
};
	["subscription_root"]: {
		/** fetch data from the table: "Device" */
	Device: Array<ModelTypes["Device"]>,
	/** fetch data from the table: "DeviceStatusLog" */
	DeviceStatusLog: Array<ModelTypes["DeviceStatusLog"]>,
	/** fetch aggregated fields from the table: "DeviceStatusLog" */
	DeviceStatusLog_aggregate: ModelTypes["DeviceStatusLog_aggregate"],
	/** fetch data from the table: "DeviceStatusLog" using primary key columns */
	DeviceStatusLog_by_pk?: ModelTypes["DeviceStatusLog"] | undefined,
	/** fetch data from the table in a streaming manner: "DeviceStatusLog" */
	DeviceStatusLog_stream: Array<ModelTypes["DeviceStatusLog"]>,
	/** fetch data from the table: "DeviceType" */
	DeviceType: Array<ModelTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "DeviceType" */
	DeviceType_aggregate: ModelTypes["DeviceType_aggregate"],
	/** fetch data from the table: "DeviceType" using primary key columns */
	DeviceType_by_pk?: ModelTypes["DeviceType"] | undefined,
	/** fetch data from the table in a streaming manner: "DeviceType" */
	DeviceType_stream: Array<ModelTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "Device" */
	Device_aggregate: ModelTypes["Device_aggregate"],
	/** fetch data from the table: "Device" using primary key columns */
	Device_by_pk?: ModelTypes["Device"] | undefined,
	/** fetch data from the table in a streaming manner: "Device" */
	Device_stream: Array<ModelTypes["Device"]>,
	/** fetch data from the table: "Profile" */
	Profile: Array<ModelTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: ModelTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: ModelTypes["Profile"] | undefined,
	/** fetch data from the table in a streaming manner: "Profile" */
	Profile_stream: Array<ModelTypes["Profile"]>,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<ModelTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: ModelTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: ModelTypes["_prisma_migrations"] | undefined,
	/** fetch data from the table in a streaming manner: "_prisma_migrations" */
	_prisma_migrations_stream: Array<ModelTypes["_prisma_migrations"]>
};
	["timestamp"]:any;
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
	_eq?: ModelTypes["timestamp"] | undefined,
	_gt?: ModelTypes["timestamp"] | undefined,
	_gte?: ModelTypes["timestamp"] | undefined,
	_in?: Array<ModelTypes["timestamp"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["timestamp"] | undefined,
	_lte?: ModelTypes["timestamp"] | undefined,
	_neq?: ModelTypes["timestamp"] | undefined,
	_nin?: Array<ModelTypes["timestamp"]> | undefined
};
	["timestamptz"]:any;
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
	_eq?: ModelTypes["timestamptz"] | undefined,
	_gt?: ModelTypes["timestamptz"] | undefined,
	_gte?: ModelTypes["timestamptz"] | undefined,
	_in?: Array<ModelTypes["timestamptz"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["timestamptz"] | undefined,
	_lte?: ModelTypes["timestamptz"] | undefined,
	_neq?: ModelTypes["timestamptz"] | undefined,
	_nin?: Array<ModelTypes["timestamptz"]> | undefined
};
	["uuid"]:any;
	/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
["uuid_comparison_exp"]: {
	_eq?: ModelTypes["uuid"] | undefined,
	_gt?: ModelTypes["uuid"] | undefined,
	_gte?: ModelTypes["uuid"] | undefined,
	_in?: Array<ModelTypes["uuid"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: ModelTypes["uuid"] | undefined,
	_lte?: ModelTypes["uuid"] | undefined,
	_neq?: ModelTypes["uuid"] | undefined,
	_nin?: Array<ModelTypes["uuid"]> | undefined
}
    }

export type GraphQLTypes = {
    /** columns and relationships of "Device" */
["Device"]: {
	__typename: "Device",
	/** An object relationship */
	DeviceType: GraphQLTypes["DeviceType"],
	/** An object relationship */
	Profile: GraphQLTypes["Profile"],
	board_id: string,
	created_at: GraphQLTypes["timestamp"],
	id: GraphQLTypes["uuid"],
	profile_id: GraphQLTypes["uuid"],
	type_id: GraphQLTypes["uuid"],
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** columns and relationships of "DeviceStatusLog" */
["DeviceStatusLog"]: {
	__typename: "DeviceStatusLog",
	board_id: string,
	created_at: GraphQLTypes["timestamp"],
	id: GraphQLTypes["uuid"],
	status?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "DeviceStatusLog" */
["DeviceStatusLog_aggregate"]: {
	__typename: "DeviceStatusLog_aggregate",
	aggregate?: GraphQLTypes["DeviceStatusLog_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["DeviceStatusLog"]>
};
	/** aggregate fields of "DeviceStatusLog" */
["DeviceStatusLog_aggregate_fields"]: {
	__typename: "DeviceStatusLog_aggregate_fields",
	count: number,
	max?: GraphQLTypes["DeviceStatusLog_max_fields"] | undefined,
	min?: GraphQLTypes["DeviceStatusLog_min_fields"] | undefined
};
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_append_input"]: {
		status?: GraphQLTypes["jsonb"] | undefined
};
	/** Boolean expression to filter rows from the table "DeviceStatusLog". All fields are combined with a logical 'AND'. */
["DeviceStatusLog_bool_exp"]: {
		_and?: Array<GraphQLTypes["DeviceStatusLog_bool_exp"]> | undefined,
	_not?: GraphQLTypes["DeviceStatusLog_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["DeviceStatusLog_bool_exp"]> | undefined,
	board_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	status?: GraphQLTypes["jsonb_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "DeviceStatusLog" */
["DeviceStatusLog_constraint"]: DeviceStatusLog_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceStatusLog_delete_at_path_input"]: {
		status?: Array<string> | undefined
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceStatusLog_delete_elem_input"]: {
		status?: number | undefined
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceStatusLog_delete_key_input"]: {
		status?: string | undefined
};
	/** input type for inserting data into table "DeviceStatusLog" */
["DeviceStatusLog_insert_input"]: {
		board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	status?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["DeviceStatusLog_max_fields"]: {
	__typename: "DeviceStatusLog_max_fields",
	board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["DeviceStatusLog_min_fields"]: {
	__typename: "DeviceStatusLog_min_fields",
	board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "DeviceStatusLog" */
["DeviceStatusLog_mutation_response"]: {
	__typename: "DeviceStatusLog_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["DeviceStatusLog"]>
};
	/** on_conflict condition type for table "DeviceStatusLog" */
["DeviceStatusLog_on_conflict"]: {
		constraint: GraphQLTypes["DeviceStatusLog_constraint"],
	update_columns: Array<GraphQLTypes["DeviceStatusLog_update_column"]>,
	where?: GraphQLTypes["DeviceStatusLog_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "DeviceStatusLog". */
["DeviceStatusLog_order_by"]: {
		board_id?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	status?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: DeviceStatusLog */
["DeviceStatusLog_pk_columns_input"]: {
		id: GraphQLTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceStatusLog_prepend_input"]: {
		status?: GraphQLTypes["jsonb"] | undefined
};
	/** select columns of table "DeviceStatusLog" */
["DeviceStatusLog_select_column"]: DeviceStatusLog_select_column;
	/** input type for updating data in table "DeviceStatusLog" */
["DeviceStatusLog_set_input"]: {
		board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	status?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "DeviceStatusLog" */
["DeviceStatusLog_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["DeviceStatusLog_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["DeviceStatusLog_stream_cursor_value_input"]: {
		board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	status?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "DeviceStatusLog" */
["DeviceStatusLog_update_column"]: DeviceStatusLog_update_column;
	["DeviceStatusLog_updates"]: {
		/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: GraphQLTypes["DeviceStatusLog_append_input"] | undefined,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: GraphQLTypes["DeviceStatusLog_delete_at_path_input"] | undefined,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: GraphQLTypes["DeviceStatusLog_delete_elem_input"] | undefined,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: GraphQLTypes["DeviceStatusLog_delete_key_input"] | undefined,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: GraphQLTypes["DeviceStatusLog_prepend_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["DeviceStatusLog_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["DeviceStatusLog_bool_exp"]
};
	/** columns and relationships of "DeviceType" */
["DeviceType"]: {
	__typename: "DeviceType",
	/** An array relationship */
	Devices: Array<GraphQLTypes["Device"]>,
	/** An aggregate relationship */
	Devices_aggregate: GraphQLTypes["Device_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	id: GraphQLTypes["uuid"],
	name: string,
	status_fields: GraphQLTypes["jsonb"],
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "DeviceType" */
["DeviceType_aggregate"]: {
	__typename: "DeviceType_aggregate",
	aggregate?: GraphQLTypes["DeviceType_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["DeviceType"]>
};
	/** aggregate fields of "DeviceType" */
["DeviceType_aggregate_fields"]: {
	__typename: "DeviceType_aggregate_fields",
	count: number,
	max?: GraphQLTypes["DeviceType_max_fields"] | undefined,
	min?: GraphQLTypes["DeviceType_min_fields"] | undefined
};
	/** append existing jsonb value of filtered columns with new jsonb value */
["DeviceType_append_input"]: {
		status_fields?: GraphQLTypes["jsonb"] | undefined
};
	/** Boolean expression to filter rows from the table "DeviceType". All fields are combined with a logical 'AND'. */
["DeviceType_bool_exp"]: {
		Devices?: GraphQLTypes["Device_bool_exp"] | undefined,
	Devices_aggregate?: GraphQLTypes["Device_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["DeviceType_bool_exp"]> | undefined,
	_not?: GraphQLTypes["DeviceType_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["DeviceType_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	name?: GraphQLTypes["String_comparison_exp"] | undefined,
	status_fields?: GraphQLTypes["jsonb_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "DeviceType" */
["DeviceType_constraint"]: DeviceType_constraint;
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
["DeviceType_delete_at_path_input"]: {
		status_fields?: Array<string> | undefined
};
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
["DeviceType_delete_elem_input"]: {
		status_fields?: number | undefined
};
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
["DeviceType_delete_key_input"]: {
		status_fields?: string | undefined
};
	/** input type for inserting data into table "DeviceType" */
["DeviceType_insert_input"]: {
		Devices?: GraphQLTypes["Device_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["DeviceType_max_fields"]: {
	__typename: "DeviceType_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["DeviceType_min_fields"]: {
	__typename: "DeviceType_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	name?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "DeviceType" */
["DeviceType_mutation_response"]: {
	__typename: "DeviceType_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["DeviceType"]>
};
	/** input type for inserting object relation for remote table "DeviceType" */
["DeviceType_obj_rel_insert_input"]: {
		data: GraphQLTypes["DeviceType_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["DeviceType_on_conflict"] | undefined
};
	/** on_conflict condition type for table "DeviceType" */
["DeviceType_on_conflict"]: {
		constraint: GraphQLTypes["DeviceType_constraint"],
	update_columns: Array<GraphQLTypes["DeviceType_update_column"]>,
	where?: GraphQLTypes["DeviceType_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "DeviceType". */
["DeviceType_order_by"]: {
		Devices_aggregate?: GraphQLTypes["Device_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	name?: GraphQLTypes["order_by"] | undefined,
	status_fields?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: DeviceType */
["DeviceType_pk_columns_input"]: {
		id: GraphQLTypes["uuid"]
};
	/** prepend existing jsonb value of filtered columns with new jsonb value */
["DeviceType_prepend_input"]: {
		status_fields?: GraphQLTypes["jsonb"] | undefined
};
	/** select columns of table "DeviceType" */
["DeviceType_select_column"]: DeviceType_select_column;
	/** input type for updating data in table "DeviceType" */
["DeviceType_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "DeviceType" */
["DeviceType_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["DeviceType_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["DeviceType_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	name?: string | undefined,
	status_fields?: GraphQLTypes["jsonb"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "DeviceType" */
["DeviceType_update_column"]: DeviceType_update_column;
	["DeviceType_updates"]: {
		/** append existing jsonb value of filtered columns with new jsonb value */
	_append?: GraphQLTypes["DeviceType_append_input"] | undefined,
	/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
	_delete_at_path?: GraphQLTypes["DeviceType_delete_at_path_input"] | undefined,
	/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
	_delete_elem?: GraphQLTypes["DeviceType_delete_elem_input"] | undefined,
	/** delete key/value pair or string element. key/value pairs are matched based on their key value */
	_delete_key?: GraphQLTypes["DeviceType_delete_key_input"] | undefined,
	/** prepend existing jsonb value of filtered columns with new jsonb value */
	_prepend?: GraphQLTypes["DeviceType_prepend_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["DeviceType_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["DeviceType_bool_exp"]
};
	/** aggregated selection of "Device" */
["Device_aggregate"]: {
	__typename: "Device_aggregate",
	aggregate?: GraphQLTypes["Device_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Device"]>
};
	["Device_aggregate_bool_exp"]: {
		count?: GraphQLTypes["Device_aggregate_bool_exp_count"] | undefined
};
	["Device_aggregate_bool_exp_count"]: {
		arguments?: Array<GraphQLTypes["Device_select_column"]> | undefined,
	distinct?: boolean | undefined,
	filter?: GraphQLTypes["Device_bool_exp"] | undefined,
	predicate: GraphQLTypes["Int_comparison_exp"]
};
	/** aggregate fields of "Device" */
["Device_aggregate_fields"]: {
	__typename: "Device_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Device_max_fields"] | undefined,
	min?: GraphQLTypes["Device_min_fields"] | undefined
};
	/** order by aggregate values of table "Device" */
["Device_aggregate_order_by"]: {
		count?: GraphQLTypes["order_by"] | undefined,
	max?: GraphQLTypes["Device_max_order_by"] | undefined,
	min?: GraphQLTypes["Device_min_order_by"] | undefined
};
	/** input type for inserting array relation for remote table "Device" */
["Device_arr_rel_insert_input"]: {
		data: Array<GraphQLTypes["Device_insert_input"]>,
	/** upsert condition */
	on_conflict?: GraphQLTypes["Device_on_conflict"] | undefined
};
	/** Boolean expression to filter rows from the table "Device". All fields are combined with a logical 'AND'. */
["Device_bool_exp"]: {
		DeviceType?: GraphQLTypes["DeviceType_bool_exp"] | undefined,
	Profile?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Device_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Device_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Device_bool_exp"]> | undefined,
	board_id?: GraphQLTypes["String_comparison_exp"] | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	profile_id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	type_id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Device" */
["Device_constraint"]: Device_constraint;
	/** input type for inserting data into table "Device" */
["Device_insert_input"]: {
		DeviceType?: GraphQLTypes["DeviceType_obj_rel_insert_input"] | undefined,
	Profile?: GraphQLTypes["Profile_obj_rel_insert_input"] | undefined,
	board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	profile_id?: GraphQLTypes["uuid"] | undefined,
	type_id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Device_max_fields"]: {
	__typename: "Device_max_fields",
	board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	profile_id?: GraphQLTypes["uuid"] | undefined,
	type_id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by max() on columns of table "Device" */
["Device_max_order_by"]: {
		board_id?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	type_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** aggregate min on columns */
["Device_min_fields"]: {
	__typename: "Device_min_fields",
	board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	profile_id?: GraphQLTypes["uuid"] | undefined,
	type_id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** order by min() on columns of table "Device" */
["Device_min_order_by"]: {
		board_id?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	type_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** response of any mutation on the table "Device" */
["Device_mutation_response"]: {
	__typename: "Device_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Device"]>
};
	/** on_conflict condition type for table "Device" */
["Device_on_conflict"]: {
		constraint: GraphQLTypes["Device_constraint"],
	update_columns: Array<GraphQLTypes["Device_update_column"]>,
	where?: GraphQLTypes["Device_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Device". */
["Device_order_by"]: {
		DeviceType?: GraphQLTypes["DeviceType_order_by"] | undefined,
	Profile?: GraphQLTypes["Profile_order_by"] | undefined,
	board_id?: GraphQLTypes["order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	profile_id?: GraphQLTypes["order_by"] | undefined,
	type_id?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Device */
["Device_pk_columns_input"]: {
		id: GraphQLTypes["uuid"]
};
	/** select columns of table "Device" */
["Device_select_column"]: Device_select_column;
	/** input type for updating data in table "Device" */
["Device_set_input"]: {
		board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	profile_id?: GraphQLTypes["uuid"] | undefined,
	type_id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Device" */
["Device_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Device_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Device_stream_cursor_value_input"]: {
		board_id?: string | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	profile_id?: GraphQLTypes["uuid"] | undefined,
	type_id?: GraphQLTypes["uuid"] | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "Device" */
["Device_update_column"]: Device_update_column;
	["Device_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Device_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Device_bool_exp"]
};
	/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
["Int_comparison_exp"]: {
		_eq?: number | undefined,
	_gt?: number | undefined,
	_gte?: number | undefined,
	_in?: Array<number> | undefined,
	_is_null?: boolean | undefined,
	_lt?: number | undefined,
	_lte?: number | undefined,
	_neq?: number | undefined,
	_nin?: Array<number> | undefined
};
	/** columns and relationships of "Profile" */
["Profile"]: {
	__typename: "Profile",
	/** An array relationship */
	Devices: Array<GraphQLTypes["Device"]>,
	/** An aggregate relationship */
	Devices_aggregate: GraphQLTypes["Device_aggregate"],
	created_at: GraphQLTypes["timestamp"],
	email: string,
	first_name?: string | undefined,
	id: GraphQLTypes["uuid"],
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregated selection of "Profile" */
["Profile_aggregate"]: {
	__typename: "Profile_aggregate",
	aggregate?: GraphQLTypes["Profile_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["Profile"]>
};
	/** aggregate fields of "Profile" */
["Profile_aggregate_fields"]: {
	__typename: "Profile_aggregate_fields",
	count: number,
	max?: GraphQLTypes["Profile_max_fields"] | undefined,
	min?: GraphQLTypes["Profile_min_fields"] | undefined
};
	/** Boolean expression to filter rows from the table "Profile". All fields are combined with a logical 'AND'. */
["Profile_bool_exp"]: {
		Devices?: GraphQLTypes["Device_bool_exp"] | undefined,
	Devices_aggregate?: GraphQLTypes["Device_aggregate_bool_exp"] | undefined,
	_and?: Array<GraphQLTypes["Profile_bool_exp"]> | undefined,
	_not?: GraphQLTypes["Profile_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["Profile_bool_exp"]> | undefined,
	created_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined,
	email?: GraphQLTypes["String_comparison_exp"] | undefined,
	first_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	id?: GraphQLTypes["uuid_comparison_exp"] | undefined,
	last_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	phone?: GraphQLTypes["String_comparison_exp"] | undefined,
	picture_url?: GraphQLTypes["String_comparison_exp"] | undefined,
	updated_at?: GraphQLTypes["timestamp_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "Profile" */
["Profile_constraint"]: Profile_constraint;
	/** input type for inserting data into table "Profile" */
["Profile_insert_input"]: {
		Devices?: GraphQLTypes["Device_arr_rel_insert_input"] | undefined,
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate max on columns */
["Profile_max_fields"]: {
	__typename: "Profile_max_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** aggregate min on columns */
["Profile_min_fields"]: {
	__typename: "Profile_min_fields",
	created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** response of any mutation on the table "Profile" */
["Profile_mutation_response"]: {
	__typename: "Profile_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["Profile"]>
};
	/** input type for inserting object relation for remote table "Profile" */
["Profile_obj_rel_insert_input"]: {
		data: GraphQLTypes["Profile_insert_input"],
	/** upsert condition */
	on_conflict?: GraphQLTypes["Profile_on_conflict"] | undefined
};
	/** on_conflict condition type for table "Profile" */
["Profile_on_conflict"]: {
		constraint: GraphQLTypes["Profile_constraint"],
	update_columns: Array<GraphQLTypes["Profile_update_column"]>,
	where?: GraphQLTypes["Profile_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "Profile". */
["Profile_order_by"]: {
		Devices_aggregate?: GraphQLTypes["Device_aggregate_order_by"] | undefined,
	created_at?: GraphQLTypes["order_by"] | undefined,
	email?: GraphQLTypes["order_by"] | undefined,
	first_name?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	last_name?: GraphQLTypes["order_by"] | undefined,
	phone?: GraphQLTypes["order_by"] | undefined,
	picture_url?: GraphQLTypes["order_by"] | undefined,
	updated_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: Profile */
["Profile_pk_columns_input"]: {
		id: GraphQLTypes["uuid"]
};
	/** select columns of table "Profile" */
["Profile_select_column"]: Profile_select_column;
	/** input type for updating data in table "Profile" */
["Profile_set_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** Streaming cursor of the table "Profile" */
["Profile_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["Profile_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["Profile_stream_cursor_value_input"]: {
		created_at?: GraphQLTypes["timestamp"] | undefined,
	email?: string | undefined,
	first_name?: string | undefined,
	id?: GraphQLTypes["uuid"] | undefined,
	last_name?: string | undefined,
	phone?: string | undefined,
	picture_url?: string | undefined,
	updated_at?: GraphQLTypes["timestamp"] | undefined
};
	/** update columns of table "Profile" */
["Profile_update_column"]: Profile_update_column;
	["Profile_updates"]: {
		/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["Profile_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["Profile_bool_exp"]
};
	/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
["String_comparison_exp"]: {
		_eq?: string | undefined,
	_gt?: string | undefined,
	_gte?: string | undefined,
	/** does the column match the given case-insensitive pattern */
	_ilike?: string | undefined,
	_in?: Array<string> | undefined,
	/** does the column match the given POSIX regular expression, case insensitive */
	_iregex?: string | undefined,
	_is_null?: boolean | undefined,
	/** does the column match the given pattern */
	_like?: string | undefined,
	_lt?: string | undefined,
	_lte?: string | undefined,
	_neq?: string | undefined,
	/** does the column NOT match the given case-insensitive pattern */
	_nilike?: string | undefined,
	_nin?: Array<string> | undefined,
	/** does the column NOT match the given POSIX regular expression, case insensitive */
	_niregex?: string | undefined,
	/** does the column NOT match the given pattern */
	_nlike?: string | undefined,
	/** does the column NOT match the given POSIX regular expression, case sensitive */
	_nregex?: string | undefined,
	/** does the column NOT match the given SQL regular expression */
	_nsimilar?: string | undefined,
	/** does the column match the given POSIX regular expression, case sensitive */
	_regex?: string | undefined,
	/** does the column match the given SQL regular expression */
	_similar?: string | undefined
};
	/** columns and relationships of "_prisma_migrations" */
["_prisma_migrations"]: {
	__typename: "_prisma_migrations",
	applied_steps_count: number,
	checksum: string,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id: string,
	logs?: string | undefined,
	migration_name: string,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at: GraphQLTypes["timestamptz"]
};
	/** aggregated selection of "_prisma_migrations" */
["_prisma_migrations_aggregate"]: {
	__typename: "_prisma_migrations_aggregate",
	aggregate?: GraphQLTypes["_prisma_migrations_aggregate_fields"] | undefined,
	nodes: Array<GraphQLTypes["_prisma_migrations"]>
};
	/** aggregate fields of "_prisma_migrations" */
["_prisma_migrations_aggregate_fields"]: {
	__typename: "_prisma_migrations_aggregate_fields",
	avg?: GraphQLTypes["_prisma_migrations_avg_fields"] | undefined,
	count: number,
	max?: GraphQLTypes["_prisma_migrations_max_fields"] | undefined,
	min?: GraphQLTypes["_prisma_migrations_min_fields"] | undefined,
	stddev?: GraphQLTypes["_prisma_migrations_stddev_fields"] | undefined,
	stddev_pop?: GraphQLTypes["_prisma_migrations_stddev_pop_fields"] | undefined,
	stddev_samp?: GraphQLTypes["_prisma_migrations_stddev_samp_fields"] | undefined,
	sum?: GraphQLTypes["_prisma_migrations_sum_fields"] | undefined,
	var_pop?: GraphQLTypes["_prisma_migrations_var_pop_fields"] | undefined,
	var_samp?: GraphQLTypes["_prisma_migrations_var_samp_fields"] | undefined,
	variance?: GraphQLTypes["_prisma_migrations_variance_fields"] | undefined
};
	/** aggregate avg on columns */
["_prisma_migrations_avg_fields"]: {
	__typename: "_prisma_migrations_avg_fields",
	applied_steps_count?: number | undefined
};
	/** Boolean expression to filter rows from the table "_prisma_migrations". All fields are combined with a logical 'AND'. */
["_prisma_migrations_bool_exp"]: {
		_and?: Array<GraphQLTypes["_prisma_migrations_bool_exp"]> | undefined,
	_not?: GraphQLTypes["_prisma_migrations_bool_exp"] | undefined,
	_or?: Array<GraphQLTypes["_prisma_migrations_bool_exp"]> | undefined,
	applied_steps_count?: GraphQLTypes["Int_comparison_exp"] | undefined,
	checksum?: GraphQLTypes["String_comparison_exp"] | undefined,
	finished_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined,
	id?: GraphQLTypes["String_comparison_exp"] | undefined,
	logs?: GraphQLTypes["String_comparison_exp"] | undefined,
	migration_name?: GraphQLTypes["String_comparison_exp"] | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined,
	started_at?: GraphQLTypes["timestamptz_comparison_exp"] | undefined
};
	/** unique or primary key constraints on table "_prisma_migrations" */
["_prisma_migrations_constraint"]: _prisma_migrations_constraint;
	/** input type for incrementing numeric columns in table "_prisma_migrations" */
["_prisma_migrations_inc_input"]: {
		applied_steps_count?: number | undefined
};
	/** input type for inserting data into table "_prisma_migrations" */
["_prisma_migrations_insert_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate max on columns */
["_prisma_migrations_max_fields"]: {
	__typename: "_prisma_migrations_max_fields",
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate min on columns */
["_prisma_migrations_min_fields"]: {
	__typename: "_prisma_migrations_min_fields",
	applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** response of any mutation on the table "_prisma_migrations" */
["_prisma_migrations_mutation_response"]: {
	__typename: "_prisma_migrations_mutation_response",
	/** number of rows affected by the mutation */
	affected_rows: number,
	/** data from the rows affected by the mutation */
	returning: Array<GraphQLTypes["_prisma_migrations"]>
};
	/** on_conflict condition type for table "_prisma_migrations" */
["_prisma_migrations_on_conflict"]: {
		constraint: GraphQLTypes["_prisma_migrations_constraint"],
	update_columns: Array<GraphQLTypes["_prisma_migrations_update_column"]>,
	where?: GraphQLTypes["_prisma_migrations_bool_exp"] | undefined
};
	/** Ordering options when selecting data from "_prisma_migrations". */
["_prisma_migrations_order_by"]: {
		applied_steps_count?: GraphQLTypes["order_by"] | undefined,
	checksum?: GraphQLTypes["order_by"] | undefined,
	finished_at?: GraphQLTypes["order_by"] | undefined,
	id?: GraphQLTypes["order_by"] | undefined,
	logs?: GraphQLTypes["order_by"] | undefined,
	migration_name?: GraphQLTypes["order_by"] | undefined,
	rolled_back_at?: GraphQLTypes["order_by"] | undefined,
	started_at?: GraphQLTypes["order_by"] | undefined
};
	/** primary key columns input for table: _prisma_migrations */
["_prisma_migrations_pk_columns_input"]: {
		id: string
};
	/** select columns of table "_prisma_migrations" */
["_prisma_migrations_select_column"]: _prisma_migrations_select_column;
	/** input type for updating data in table "_prisma_migrations" */
["_prisma_migrations_set_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate stddev on columns */
["_prisma_migrations_stddev_fields"]: {
	__typename: "_prisma_migrations_stddev_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate stddev_pop on columns */
["_prisma_migrations_stddev_pop_fields"]: {
	__typename: "_prisma_migrations_stddev_pop_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate stddev_samp on columns */
["_prisma_migrations_stddev_samp_fields"]: {
	__typename: "_prisma_migrations_stddev_samp_fields",
	applied_steps_count?: number | undefined
};
	/** Streaming cursor of the table "_prisma_migrations" */
["_prisma_migrations_stream_cursor_input"]: {
		/** Stream column input with initial value */
	initial_value: GraphQLTypes["_prisma_migrations_stream_cursor_value_input"],
	/** cursor ordering */
	ordering?: GraphQLTypes["cursor_ordering"] | undefined
};
	/** Initial value of the column from where the streaming should start */
["_prisma_migrations_stream_cursor_value_input"]: {
		applied_steps_count?: number | undefined,
	checksum?: string | undefined,
	finished_at?: GraphQLTypes["timestamptz"] | undefined,
	id?: string | undefined,
	logs?: string | undefined,
	migration_name?: string | undefined,
	rolled_back_at?: GraphQLTypes["timestamptz"] | undefined,
	started_at?: GraphQLTypes["timestamptz"] | undefined
};
	/** aggregate sum on columns */
["_prisma_migrations_sum_fields"]: {
	__typename: "_prisma_migrations_sum_fields",
	applied_steps_count?: number | undefined
};
	/** update columns of table "_prisma_migrations" */
["_prisma_migrations_update_column"]: _prisma_migrations_update_column;
	["_prisma_migrations_updates"]: {
		/** increments the numeric columns with given value of the filtered values */
	_inc?: GraphQLTypes["_prisma_migrations_inc_input"] | undefined,
	/** sets the columns of the filtered rows to the given values */
	_set?: GraphQLTypes["_prisma_migrations_set_input"] | undefined,
	/** filter the rows which have to be updated */
	where: GraphQLTypes["_prisma_migrations_bool_exp"]
};
	/** aggregate var_pop on columns */
["_prisma_migrations_var_pop_fields"]: {
	__typename: "_prisma_migrations_var_pop_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate var_samp on columns */
["_prisma_migrations_var_samp_fields"]: {
	__typename: "_prisma_migrations_var_samp_fields",
	applied_steps_count?: number | undefined
};
	/** aggregate variance on columns */
["_prisma_migrations_variance_fields"]: {
	__typename: "_prisma_migrations_variance_fields",
	applied_steps_count?: number | undefined
};
	/** ordering argument of a cursor */
["cursor_ordering"]: cursor_ordering;
	["jsonb"]: "scalar" & { name: "jsonb" };
	["jsonb_cast_exp"]: {
		String?: GraphQLTypes["String_comparison_exp"] | undefined
};
	/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
["jsonb_comparison_exp"]: {
		_cast?: GraphQLTypes["jsonb_cast_exp"] | undefined,
	/** is the column contained in the given json value */
	_contained_in?: GraphQLTypes["jsonb"] | undefined,
	/** does the column contain the given json value at the top level */
	_contains?: GraphQLTypes["jsonb"] | undefined,
	_eq?: GraphQLTypes["jsonb"] | undefined,
	_gt?: GraphQLTypes["jsonb"] | undefined,
	_gte?: GraphQLTypes["jsonb"] | undefined,
	/** does the string exist as a top-level key in the column */
	_has_key?: string | undefined,
	/** do all of these strings exist as top-level keys in the column */
	_has_keys_all?: Array<string> | undefined,
	/** do any of these strings exist as top-level keys in the column */
	_has_keys_any?: Array<string> | undefined,
	_in?: Array<GraphQLTypes["jsonb"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["jsonb"] | undefined,
	_lte?: GraphQLTypes["jsonb"] | undefined,
	_neq?: GraphQLTypes["jsonb"] | undefined,
	_nin?: Array<GraphQLTypes["jsonb"]> | undefined
};
	/** mutation root */
["mutation_root"]: {
	__typename: "mutation_root",
	/** delete data from the table: "Device" */
	delete_Device?: GraphQLTypes["Device_mutation_response"] | undefined,
	/** delete data from the table: "DeviceStatusLog" */
	delete_DeviceStatusLog?: GraphQLTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** delete single row from the table: "DeviceStatusLog" */
	delete_DeviceStatusLog_by_pk?: GraphQLTypes["DeviceStatusLog"] | undefined,
	/** delete data from the table: "DeviceType" */
	delete_DeviceType?: GraphQLTypes["DeviceType_mutation_response"] | undefined,
	/** delete single row from the table: "DeviceType" */
	delete_DeviceType_by_pk?: GraphQLTypes["DeviceType"] | undefined,
	/** delete single row from the table: "Device" */
	delete_Device_by_pk?: GraphQLTypes["Device"] | undefined,
	/** delete data from the table: "Profile" */
	delete_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** delete single row from the table: "Profile" */
	delete_Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** delete data from the table: "_prisma_migrations" */
	delete__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** delete single row from the table: "_prisma_migrations" */
	delete__prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** insert data into the table: "Device" */
	insert_Device?: GraphQLTypes["Device_mutation_response"] | undefined,
	/** insert data into the table: "DeviceStatusLog" */
	insert_DeviceStatusLog?: GraphQLTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** insert a single row into the table: "DeviceStatusLog" */
	insert_DeviceStatusLog_one?: GraphQLTypes["DeviceStatusLog"] | undefined,
	/** insert data into the table: "DeviceType" */
	insert_DeviceType?: GraphQLTypes["DeviceType_mutation_response"] | undefined,
	/** insert a single row into the table: "DeviceType" */
	insert_DeviceType_one?: GraphQLTypes["DeviceType"] | undefined,
	/** insert a single row into the table: "Device" */
	insert_Device_one?: GraphQLTypes["Device"] | undefined,
	/** insert data into the table: "Profile" */
	insert_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** insert a single row into the table: "Profile" */
	insert_Profile_one?: GraphQLTypes["Profile"] | undefined,
	/** insert data into the table: "_prisma_migrations" */
	insert__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** insert a single row into the table: "_prisma_migrations" */
	insert__prisma_migrations_one?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** update data of the table: "Device" */
	update_Device?: GraphQLTypes["Device_mutation_response"] | undefined,
	/** update data of the table: "DeviceStatusLog" */
	update_DeviceStatusLog?: GraphQLTypes["DeviceStatusLog_mutation_response"] | undefined,
	/** update single row of the table: "DeviceStatusLog" */
	update_DeviceStatusLog_by_pk?: GraphQLTypes["DeviceStatusLog"] | undefined,
	/** update multiples rows of table: "DeviceStatusLog" */
	update_DeviceStatusLog_many?: Array<GraphQLTypes["DeviceStatusLog_mutation_response"] | undefined> | undefined,
	/** update data of the table: "DeviceType" */
	update_DeviceType?: GraphQLTypes["DeviceType_mutation_response"] | undefined,
	/** update single row of the table: "DeviceType" */
	update_DeviceType_by_pk?: GraphQLTypes["DeviceType"] | undefined,
	/** update multiples rows of table: "DeviceType" */
	update_DeviceType_many?: Array<GraphQLTypes["DeviceType_mutation_response"] | undefined> | undefined,
	/** update single row of the table: "Device" */
	update_Device_by_pk?: GraphQLTypes["Device"] | undefined,
	/** update multiples rows of table: "Device" */
	update_Device_many?: Array<GraphQLTypes["Device_mutation_response"] | undefined> | undefined,
	/** update data of the table: "Profile" */
	update_Profile?: GraphQLTypes["Profile_mutation_response"] | undefined,
	/** update single row of the table: "Profile" */
	update_Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** update multiples rows of table: "Profile" */
	update_Profile_many?: Array<GraphQLTypes["Profile_mutation_response"] | undefined> | undefined,
	/** update data of the table: "_prisma_migrations" */
	update__prisma_migrations?: GraphQLTypes["_prisma_migrations_mutation_response"] | undefined,
	/** update single row of the table: "_prisma_migrations" */
	update__prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** update multiples rows of table: "_prisma_migrations" */
	update__prisma_migrations_many?: Array<GraphQLTypes["_prisma_migrations_mutation_response"] | undefined> | undefined
};
	/** column ordering options */
["order_by"]: order_by;
	["query_root"]: {
	__typename: "query_root",
	/** fetch data from the table: "Device" */
	Device: Array<GraphQLTypes["Device"]>,
	/** fetch data from the table: "DeviceStatusLog" */
	DeviceStatusLog: Array<GraphQLTypes["DeviceStatusLog"]>,
	/** fetch aggregated fields from the table: "DeviceStatusLog" */
	DeviceStatusLog_aggregate: GraphQLTypes["DeviceStatusLog_aggregate"],
	/** fetch data from the table: "DeviceStatusLog" using primary key columns */
	DeviceStatusLog_by_pk?: GraphQLTypes["DeviceStatusLog"] | undefined,
	/** fetch data from the table: "DeviceType" */
	DeviceType: Array<GraphQLTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "DeviceType" */
	DeviceType_aggregate: GraphQLTypes["DeviceType_aggregate"],
	/** fetch data from the table: "DeviceType" using primary key columns */
	DeviceType_by_pk?: GraphQLTypes["DeviceType"] | undefined,
	/** fetch aggregated fields from the table: "Device" */
	Device_aggregate: GraphQLTypes["Device_aggregate"],
	/** fetch data from the table: "Device" using primary key columns */
	Device_by_pk?: GraphQLTypes["Device"] | undefined,
	/** fetch data from the table: "Profile" */
	Profile: Array<GraphQLTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: GraphQLTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<GraphQLTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: GraphQLTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined
};
	["subscription_root"]: {
	__typename: "subscription_root",
	/** fetch data from the table: "Device" */
	Device: Array<GraphQLTypes["Device"]>,
	/** fetch data from the table: "DeviceStatusLog" */
	DeviceStatusLog: Array<GraphQLTypes["DeviceStatusLog"]>,
	/** fetch aggregated fields from the table: "DeviceStatusLog" */
	DeviceStatusLog_aggregate: GraphQLTypes["DeviceStatusLog_aggregate"],
	/** fetch data from the table: "DeviceStatusLog" using primary key columns */
	DeviceStatusLog_by_pk?: GraphQLTypes["DeviceStatusLog"] | undefined,
	/** fetch data from the table in a streaming manner: "DeviceStatusLog" */
	DeviceStatusLog_stream: Array<GraphQLTypes["DeviceStatusLog"]>,
	/** fetch data from the table: "DeviceType" */
	DeviceType: Array<GraphQLTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "DeviceType" */
	DeviceType_aggregate: GraphQLTypes["DeviceType_aggregate"],
	/** fetch data from the table: "DeviceType" using primary key columns */
	DeviceType_by_pk?: GraphQLTypes["DeviceType"] | undefined,
	/** fetch data from the table in a streaming manner: "DeviceType" */
	DeviceType_stream: Array<GraphQLTypes["DeviceType"]>,
	/** fetch aggregated fields from the table: "Device" */
	Device_aggregate: GraphQLTypes["Device_aggregate"],
	/** fetch data from the table: "Device" using primary key columns */
	Device_by_pk?: GraphQLTypes["Device"] | undefined,
	/** fetch data from the table in a streaming manner: "Device" */
	Device_stream: Array<GraphQLTypes["Device"]>,
	/** fetch data from the table: "Profile" */
	Profile: Array<GraphQLTypes["Profile"]>,
	/** fetch aggregated fields from the table: "Profile" */
	Profile_aggregate: GraphQLTypes["Profile_aggregate"],
	/** fetch data from the table: "Profile" using primary key columns */
	Profile_by_pk?: GraphQLTypes["Profile"] | undefined,
	/** fetch data from the table in a streaming manner: "Profile" */
	Profile_stream: Array<GraphQLTypes["Profile"]>,
	/** fetch data from the table: "_prisma_migrations" */
	_prisma_migrations: Array<GraphQLTypes["_prisma_migrations"]>,
	/** fetch aggregated fields from the table: "_prisma_migrations" */
	_prisma_migrations_aggregate: GraphQLTypes["_prisma_migrations_aggregate"],
	/** fetch data from the table: "_prisma_migrations" using primary key columns */
	_prisma_migrations_by_pk?: GraphQLTypes["_prisma_migrations"] | undefined,
	/** fetch data from the table in a streaming manner: "_prisma_migrations" */
	_prisma_migrations_stream: Array<GraphQLTypes["_prisma_migrations"]>
};
	["timestamp"]: "scalar" & { name: "timestamp" };
	/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
["timestamp_comparison_exp"]: {
		_eq?: GraphQLTypes["timestamp"] | undefined,
	_gt?: GraphQLTypes["timestamp"] | undefined,
	_gte?: GraphQLTypes["timestamp"] | undefined,
	_in?: Array<GraphQLTypes["timestamp"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["timestamp"] | undefined,
	_lte?: GraphQLTypes["timestamp"] | undefined,
	_neq?: GraphQLTypes["timestamp"] | undefined,
	_nin?: Array<GraphQLTypes["timestamp"]> | undefined
};
	["timestamptz"]: "scalar" & { name: "timestamptz" };
	/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
["timestamptz_comparison_exp"]: {
		_eq?: GraphQLTypes["timestamptz"] | undefined,
	_gt?: GraphQLTypes["timestamptz"] | undefined,
	_gte?: GraphQLTypes["timestamptz"] | undefined,
	_in?: Array<GraphQLTypes["timestamptz"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["timestamptz"] | undefined,
	_lte?: GraphQLTypes["timestamptz"] | undefined,
	_neq?: GraphQLTypes["timestamptz"] | undefined,
	_nin?: Array<GraphQLTypes["timestamptz"]> | undefined
};
	["uuid"]: "scalar" & { name: "uuid" };
	/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
["uuid_comparison_exp"]: {
		_eq?: GraphQLTypes["uuid"] | undefined,
	_gt?: GraphQLTypes["uuid"] | undefined,
	_gte?: GraphQLTypes["uuid"] | undefined,
	_in?: Array<GraphQLTypes["uuid"]> | undefined,
	_is_null?: boolean | undefined,
	_lt?: GraphQLTypes["uuid"] | undefined,
	_lte?: GraphQLTypes["uuid"] | undefined,
	_neq?: GraphQLTypes["uuid"] | undefined,
	_nin?: Array<GraphQLTypes["uuid"]> | undefined
}
    }
/** unique or primary key constraints on table "DeviceStatusLog" */
export const enum DeviceStatusLog_constraint {
	DeviceStatusLog_pkey = "DeviceStatusLog_pkey"
}
/** select columns of table "DeviceStatusLog" */
export const enum DeviceStatusLog_select_column {
	board_id = "board_id",
	created_at = "created_at",
	id = "id",
	status = "status",
	updated_at = "updated_at"
}
/** update columns of table "DeviceStatusLog" */
export const enum DeviceStatusLog_update_column {
	board_id = "board_id",
	created_at = "created_at",
	id = "id",
	status = "status",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "DeviceType" */
export const enum DeviceType_constraint {
	DeviceType_name_key = "DeviceType_name_key",
	DeviceType_pkey = "DeviceType_pkey"
}
/** select columns of table "DeviceType" */
export const enum DeviceType_select_column {
	created_at = "created_at",
	id = "id",
	name = "name",
	status_fields = "status_fields",
	updated_at = "updated_at"
}
/** update columns of table "DeviceType" */
export const enum DeviceType_update_column {
	created_at = "created_at",
	id = "id",
	name = "name",
	status_fields = "status_fields",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "Device" */
export const enum Device_constraint {
	Device_board_id_key = "Device_board_id_key",
	Device_pkey = "Device_pkey"
}
/** select columns of table "Device" */
export const enum Device_select_column {
	board_id = "board_id",
	created_at = "created_at",
	id = "id",
	profile_id = "profile_id",
	type_id = "type_id",
	updated_at = "updated_at"
}
/** update columns of table "Device" */
export const enum Device_update_column {
	board_id = "board_id",
	created_at = "created_at",
	id = "id",
	profile_id = "profile_id",
	type_id = "type_id",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "Profile" */
export const enum Profile_constraint {
	Profile_email_key = "Profile_email_key",
	Profile_pkey = "Profile_pkey"
}
/** select columns of table "Profile" */
export const enum Profile_select_column {
	created_at = "created_at",
	email = "email",
	first_name = "first_name",
	id = "id",
	last_name = "last_name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at"
}
/** update columns of table "Profile" */
export const enum Profile_update_column {
	created_at = "created_at",
	email = "email",
	first_name = "first_name",
	id = "id",
	last_name = "last_name",
	phone = "phone",
	picture_url = "picture_url",
	updated_at = "updated_at"
}
/** unique or primary key constraints on table "_prisma_migrations" */
export const enum _prisma_migrations_constraint {
	_prisma_migrations_pkey = "_prisma_migrations_pkey"
}
/** select columns of table "_prisma_migrations" */
export const enum _prisma_migrations_select_column {
	applied_steps_count = "applied_steps_count",
	checksum = "checksum",
	finished_at = "finished_at",
	id = "id",
	logs = "logs",
	migration_name = "migration_name",
	rolled_back_at = "rolled_back_at",
	started_at = "started_at"
}
/** update columns of table "_prisma_migrations" */
export const enum _prisma_migrations_update_column {
	applied_steps_count = "applied_steps_count",
	checksum = "checksum",
	finished_at = "finished_at",
	id = "id",
	logs = "logs",
	migration_name = "migration_name",
	rolled_back_at = "rolled_back_at",
	started_at = "started_at"
}
/** ordering argument of a cursor */
export const enum cursor_ordering {
	ASC = "ASC",
	DESC = "DESC"
}
/** column ordering options */
export const enum order_by {
	asc = "asc",
	asc_nulls_first = "asc_nulls_first",
	asc_nulls_last = "asc_nulls_last",
	desc = "desc",
	desc_nulls_first = "desc_nulls_first",
	desc_nulls_last = "desc_nulls_last"
}

type ZEUS_VARIABLES = {
	["DeviceStatusLog_append_input"]: ValueTypes["DeviceStatusLog_append_input"];
	["DeviceStatusLog_bool_exp"]: ValueTypes["DeviceStatusLog_bool_exp"];
	["DeviceStatusLog_constraint"]: ValueTypes["DeviceStatusLog_constraint"];
	["DeviceStatusLog_delete_at_path_input"]: ValueTypes["DeviceStatusLog_delete_at_path_input"];
	["DeviceStatusLog_delete_elem_input"]: ValueTypes["DeviceStatusLog_delete_elem_input"];
	["DeviceStatusLog_delete_key_input"]: ValueTypes["DeviceStatusLog_delete_key_input"];
	["DeviceStatusLog_insert_input"]: ValueTypes["DeviceStatusLog_insert_input"];
	["DeviceStatusLog_on_conflict"]: ValueTypes["DeviceStatusLog_on_conflict"];
	["DeviceStatusLog_order_by"]: ValueTypes["DeviceStatusLog_order_by"];
	["DeviceStatusLog_pk_columns_input"]: ValueTypes["DeviceStatusLog_pk_columns_input"];
	["DeviceStatusLog_prepend_input"]: ValueTypes["DeviceStatusLog_prepend_input"];
	["DeviceStatusLog_select_column"]: ValueTypes["DeviceStatusLog_select_column"];
	["DeviceStatusLog_set_input"]: ValueTypes["DeviceStatusLog_set_input"];
	["DeviceStatusLog_stream_cursor_input"]: ValueTypes["DeviceStatusLog_stream_cursor_input"];
	["DeviceStatusLog_stream_cursor_value_input"]: ValueTypes["DeviceStatusLog_stream_cursor_value_input"];
	["DeviceStatusLog_update_column"]: ValueTypes["DeviceStatusLog_update_column"];
	["DeviceStatusLog_updates"]: ValueTypes["DeviceStatusLog_updates"];
	["DeviceType_append_input"]: ValueTypes["DeviceType_append_input"];
	["DeviceType_bool_exp"]: ValueTypes["DeviceType_bool_exp"];
	["DeviceType_constraint"]: ValueTypes["DeviceType_constraint"];
	["DeviceType_delete_at_path_input"]: ValueTypes["DeviceType_delete_at_path_input"];
	["DeviceType_delete_elem_input"]: ValueTypes["DeviceType_delete_elem_input"];
	["DeviceType_delete_key_input"]: ValueTypes["DeviceType_delete_key_input"];
	["DeviceType_insert_input"]: ValueTypes["DeviceType_insert_input"];
	["DeviceType_obj_rel_insert_input"]: ValueTypes["DeviceType_obj_rel_insert_input"];
	["DeviceType_on_conflict"]: ValueTypes["DeviceType_on_conflict"];
	["DeviceType_order_by"]: ValueTypes["DeviceType_order_by"];
	["DeviceType_pk_columns_input"]: ValueTypes["DeviceType_pk_columns_input"];
	["DeviceType_prepend_input"]: ValueTypes["DeviceType_prepend_input"];
	["DeviceType_select_column"]: ValueTypes["DeviceType_select_column"];
	["DeviceType_set_input"]: ValueTypes["DeviceType_set_input"];
	["DeviceType_stream_cursor_input"]: ValueTypes["DeviceType_stream_cursor_input"];
	["DeviceType_stream_cursor_value_input"]: ValueTypes["DeviceType_stream_cursor_value_input"];
	["DeviceType_update_column"]: ValueTypes["DeviceType_update_column"];
	["DeviceType_updates"]: ValueTypes["DeviceType_updates"];
	["Device_aggregate_bool_exp"]: ValueTypes["Device_aggregate_bool_exp"];
	["Device_aggregate_bool_exp_count"]: ValueTypes["Device_aggregate_bool_exp_count"];
	["Device_aggregate_order_by"]: ValueTypes["Device_aggregate_order_by"];
	["Device_arr_rel_insert_input"]: ValueTypes["Device_arr_rel_insert_input"];
	["Device_bool_exp"]: ValueTypes["Device_bool_exp"];
	["Device_constraint"]: ValueTypes["Device_constraint"];
	["Device_insert_input"]: ValueTypes["Device_insert_input"];
	["Device_max_order_by"]: ValueTypes["Device_max_order_by"];
	["Device_min_order_by"]: ValueTypes["Device_min_order_by"];
	["Device_on_conflict"]: ValueTypes["Device_on_conflict"];
	["Device_order_by"]: ValueTypes["Device_order_by"];
	["Device_pk_columns_input"]: ValueTypes["Device_pk_columns_input"];
	["Device_select_column"]: ValueTypes["Device_select_column"];
	["Device_set_input"]: ValueTypes["Device_set_input"];
	["Device_stream_cursor_input"]: ValueTypes["Device_stream_cursor_input"];
	["Device_stream_cursor_value_input"]: ValueTypes["Device_stream_cursor_value_input"];
	["Device_update_column"]: ValueTypes["Device_update_column"];
	["Device_updates"]: ValueTypes["Device_updates"];
	["Int_comparison_exp"]: ValueTypes["Int_comparison_exp"];
	["Profile_bool_exp"]: ValueTypes["Profile_bool_exp"];
	["Profile_constraint"]: ValueTypes["Profile_constraint"];
	["Profile_insert_input"]: ValueTypes["Profile_insert_input"];
	["Profile_obj_rel_insert_input"]: ValueTypes["Profile_obj_rel_insert_input"];
	["Profile_on_conflict"]: ValueTypes["Profile_on_conflict"];
	["Profile_order_by"]: ValueTypes["Profile_order_by"];
	["Profile_pk_columns_input"]: ValueTypes["Profile_pk_columns_input"];
	["Profile_select_column"]: ValueTypes["Profile_select_column"];
	["Profile_set_input"]: ValueTypes["Profile_set_input"];
	["Profile_stream_cursor_input"]: ValueTypes["Profile_stream_cursor_input"];
	["Profile_stream_cursor_value_input"]: ValueTypes["Profile_stream_cursor_value_input"];
	["Profile_update_column"]: ValueTypes["Profile_update_column"];
	["Profile_updates"]: ValueTypes["Profile_updates"];
	["String_comparison_exp"]: ValueTypes["String_comparison_exp"];
	["_prisma_migrations_bool_exp"]: ValueTypes["_prisma_migrations_bool_exp"];
	["_prisma_migrations_constraint"]: ValueTypes["_prisma_migrations_constraint"];
	["_prisma_migrations_inc_input"]: ValueTypes["_prisma_migrations_inc_input"];
	["_prisma_migrations_insert_input"]: ValueTypes["_prisma_migrations_insert_input"];
	["_prisma_migrations_on_conflict"]: ValueTypes["_prisma_migrations_on_conflict"];
	["_prisma_migrations_order_by"]: ValueTypes["_prisma_migrations_order_by"];
	["_prisma_migrations_pk_columns_input"]: ValueTypes["_prisma_migrations_pk_columns_input"];
	["_prisma_migrations_select_column"]: ValueTypes["_prisma_migrations_select_column"];
	["_prisma_migrations_set_input"]: ValueTypes["_prisma_migrations_set_input"];
	["_prisma_migrations_stream_cursor_input"]: ValueTypes["_prisma_migrations_stream_cursor_input"];
	["_prisma_migrations_stream_cursor_value_input"]: ValueTypes["_prisma_migrations_stream_cursor_value_input"];
	["_prisma_migrations_update_column"]: ValueTypes["_prisma_migrations_update_column"];
	["_prisma_migrations_updates"]: ValueTypes["_prisma_migrations_updates"];
	["cursor_ordering"]: ValueTypes["cursor_ordering"];
	["jsonb"]: ValueTypes["jsonb"];
	["jsonb_cast_exp"]: ValueTypes["jsonb_cast_exp"];
	["jsonb_comparison_exp"]: ValueTypes["jsonb_comparison_exp"];
	["order_by"]: ValueTypes["order_by"];
	["timestamp"]: ValueTypes["timestamp"];
	["timestamp_comparison_exp"]: ValueTypes["timestamp_comparison_exp"];
	["timestamptz"]: ValueTypes["timestamptz"];
	["timestamptz_comparison_exp"]: ValueTypes["timestamptz_comparison_exp"];
	["uuid"]: ValueTypes["uuid"];
	["uuid_comparison_exp"]: ValueTypes["uuid_comparison_exp"];
}