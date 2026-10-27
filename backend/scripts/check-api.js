import Parser from '@apidevtools/swagger-parser';
import { fileURLToPath } from 'node:url';

const api = await Parser.validate(fileURLToPath(new URL('../docs/openapi.yaml', import.meta.url)));
const methods = ['get', 'put', 'patch', 'post', 'delete'];
const count = Object.values(api.paths).reduce((total, path) => total + methods.filter(method => path[method]).length, 0);
console.log(`Validated OpenAPI ${api.openapi}: ${Object.keys(api.paths).length} paths, ${count} operations.`);
