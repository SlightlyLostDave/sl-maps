import path from 'node:path';

// Forbids a 'use client' module from importing server-only code:
// lib/supabase/server and lib/data/ (except lib/data/client/, which holds the
// client data functions). Aliases and relative paths are both resolved, so
// '@lib/data/x', '@/lib/data/x' and '../../lib/data/x' are all caught.
//
// Only modules that declare 'use client' themselves are checked. A hook module
// without the directive that is imported by a client component is not caught;
// `import 'server-only'` in the server modules is the runtime backstop.

const repoRoot = path.resolve(import.meta.dirname, '..');

const aliasPrefixes = [
  ['@lib/', 'lib/'],
  ['@/', ''],
];

function toRepoPath(source, filename) {
  if (source.startsWith('.')) {
    const absolute = path.resolve(path.dirname(filename), source);
    return path.relative(repoRoot, absolute).split(path.sep).join('/');
  }
  for (const [alias, target] of aliasPrefixes) {
    if (source.startsWith(alias)) return target + source.slice(alias.length);
  }
  return null;
}

function isServerOnlyPath(repoPath) {
  const withoutExtension = repoPath.replace(/\.(ts|tsx|js|mjs)$/, '');
  if (withoutExtension === 'lib/supabase/server') return true;
  const isDataModule = /^lib\/data(\/|$)/.test(withoutExtension);
  const isClientDataModule = /^lib\/data\/client(\/|$)/.test(withoutExtension);
  return isDataModule && !isClientDataModule;
}

function hasUseClientDirective(program) {
  return program.body.some(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      statement.directive === 'use client',
  );
}

const noServerImportsInClient = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow importing server-only modules from a 'use client' file",
    },
    messages: {
      serverImport:
        "'{{source}}' is server-only and cannot be imported from a 'use client' file. Read it in a Server Component, server action or route handler, or use lib/data/client/.",
    },
    schema: [],
  },
  create(context) {
    if (!hasUseClientDirective(context.sourceCode.ast)) return {};

    function check(sourceNode) {
      if (sourceNode?.type !== 'Literal') return;
      if (typeof sourceNode.value !== 'string') return;
      const repoPath = toRepoPath(sourceNode.value, context.filename);
      if (repoPath && isServerOnlyPath(repoPath)) {
        context.report({
          node: sourceNode,
          messageId: 'serverImport',
          data: { source: sourceNode.value },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

export default noServerImportsInClient;
