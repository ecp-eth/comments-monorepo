import {
  UnknownKeysParam,
  z,
  type ZodObject,
  type ZodRawShape,
  type ZodTypeAny,
} from "zod";
import _normalizeUrl from "normalize-url";

export function normalizeUrl(url: string) {
  return _normalizeUrl(url, {
    sortQueryParameters: true,
    removeTrailingSlash: true,
    stripHash: true,
    removeSingleSlash: true,
  });
}

type ErrorFieldsType = z.ZodOptional<z.ZodArray<z.ZodString>>
type ErrorSchemaShapeCreator<SchemaType extends ZodObject<TZodRawShape, TUnknownKeysParam, ZodTypeAny>,
TZodRawShape extends ZodRawShape,
TUnknownKeysParam extends UnknownKeysParam> = {
  [K in keyof SchemaType["shape"]]: ErrorFieldsType;
}

/**
 * Convert response schema into a schema that is a list of error fields.
 * @param schema - The response schema.
 * @returns A schema with a list of error fields.
 */
export function createErrorSchema<
  SchemaType extends ZodObject<TZodRawShape, TUnknownKeysParam, ZodTypeAny>,
  TZodRawShape extends ZodRawShape,
  TUnknownKeysParam extends UnknownKeysParam
>(schema: SchemaType): ZodObject<ErrorSchemaShapeCreator<SchemaType, TZodRawShape, TUnknownKeysParam>> {
  const shape = schema.shape;
  return z.object({
    ...Object.keys(shape).reduce((acc, key: keyof SchemaType["shape"]) => {
      acc[key] = z.array(z.string()).optional();
      return acc;
    }, {} as ErrorSchemaShapeCreator<SchemaType, TZodRawShape, TUnknownKeysParam>),
  });
}
