import { readFile, writeFile } from 'node:fs/promises';

const contract = process.argv[2] ?? 'generation-management';
if (!['generation-management', 'adaptation-demo'].includes(contract))
  throw new Error('Unknown contract');
const specification = JSON.parse(
  await readFile(
    new URL(`../../Backend/openapi/${contract}.openapi.json`, import.meta.url),
    'utf8',
  ),
);
function schema(value) {
  if (value.const !== undefined)
    return `z.literal(${JSON.stringify(value.const)})`;
  if (value.anyOf) return `z.union([${value.anyOf.map(schema).join(', ')}])`;
  if (value.enum) return `z.enum(${JSON.stringify(value.enum)})`;
  if (value.type === 'boolean') return 'z.boolean()';
  if (value.type === 'array') return `z.array(${schema(value.items)})`;
  if (value.type === 'null') return 'z.null()';
  if (value.type === 'object')
    return `z.object({${Object.entries(value.properties)
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}: ${schema(item)}${value.required?.includes(key) ? '' : '.optional()'}`,
      )
      .join(', ')}})`;
  if (value.type === 'integer') return 'z.number().int()';
  if (value.type === 'number') return 'z.number()';
  if (value.type === 'string') return 'z.string()';
  throw new Error('Unsupported generation schema: ' + JSON.stringify(value));
}
const names = Object.keys(specification.components.schemas);
const content =
  `// Generated from Backend/openapi/${contract}.openapi.json. Do not edit.\nimport { z } from "zod";\n\n` +
  names
    .map(
      (name) =>
        `export const ${name[0].toLowerCase() + name.slice(1)}Schema = ${schema(specification.components.schemas[name])};\nexport type ${name} = z.infer<typeof ${name[0].toLowerCase() + name.slice(1)}Schema>;`,
    )
    .join('\n\n') +
  '\n';
await writeFile(
  new URL(`../src/api/generated/${contract}.ts`, import.meta.url),
  content,
);
