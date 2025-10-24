import {
  ZodAny,
  ZodArray,
  ZodDefault,
  ZodFirstPartyTypeKind,
  ZodObject,
  ZodOptional,
  ZodSchema,
  ZodUnion,
} from "zod";

export function ZodSchemaRenderer({ schema }: { schema: ZodSchema }) {
  return <div>{renderZodSchema(schema)}</div>;
}

function renderZodSchema(
  schema: ZodSchema,
  subfix: React.ReactNode = null,
): React.ReactNode {
  const def = schema._def;

  if (!("typeName" in def)) {
    return null;
  }

  const typeName = def.typeName as ZodFirstPartyTypeKind;
  switch (typeName) {
    case "ZodEffects":
      return (
        <>
          {"schema" in def && renderZodSchema(def.schema as ZodSchema)}
          {def.description && (
            <span className="text-[#999]">{" // " + def.description}</span>
          )}
        </>
      );
    case "ZodUnion": {
      const typedSchema = schema as ZodUnion<[ZodSchema]>;
      return (
        <>
          {typedSchema.options
            .map((option) => renderZodSchema(option))
            .flatMap((x, i, arr) =>
              i < arr.length - 1
                ? [
                    x,
                    <>
                      <br />
                      <br />
                      <span>Or: </span>
                    </>,
                  ]
                : [x],
            )
            .map((x, i) => (
              <div key={i}>{x}</div>
            ))}
        </>
      );
    }
    case "ZodObject": {
      const typedSchema = schema as ZodObject<Record<string, ZodSchema>>;
      return (
        <>
          {"{"}
          <div className="ml-4">
            {Object.entries(typedSchema.shape).map(([key, value]) => (
              <div className="gap-2 flex" key={key}>
                <div>
                  <span className="text-xs font-bold">{key}</span>
                  <span className="text-xs text-[#333333]">
                    {value.isOptional() ? "?" : ""}: {renderZodSchema(value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {"}"}
          {subfix}
        </>
      );
    }
    case "ZodAny": {
      const typedSchema = schema as ZodAny;
      return <span>{typedSchema.description}</span>;
    }
    case "ZodArray": {
      const typedSchema = schema as ZodArray<ZodSchema>;
      return <>{renderZodSchema(typedSchema.element, <span>[]</span>)}</>;
    }
    case "ZodDefault": {
      const typedSchema = schema as ZodDefault<ZodSchema>;
      const defaultValue = String(typedSchema._def.defaultValue());
      return (
        <span>
          {renderZodSchema(typedSchema._def.innerType)}{" "}
          <span className="text-[#999]">
            {" // "}
            {defaultValue
              ? "default: " + defaultValue
              : typedSchema.description}
          </span>
        </span>
      );
    }
    case "ZodOptional": {
      const typedSchema = schema as ZodOptional<ZodSchema>;
      return <span>{renderZodSchema(typedSchema.unwrap())}</span>;
    }
    case "ZodBoolean":
    case "ZodString":
    case "ZodBigInt":
    case "ZodNumber": {
      return (
        <>
          <span className="inline-block rounded-md px-1 py-0.5 bg-[#f0f0f0] text-[#666]">
            {"<" + typeName.replace("Zod", "") + ">"}
          </span>
          {schema.description && (
            <span className="text-[#999]">{" // " + schema.description}</span>
          )}
        </>
      );
    }
    default:
      console.log(typeName);
      // typeName satisfies never;
      throw new Error(`Unsupported schema type: ${typeName}`);
  }
}
