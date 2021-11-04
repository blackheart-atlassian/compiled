import type {
  FileInfo,
  API,
  JSCodeshift,
  Options,
  Program,
  Collection,
  TaggedTemplateExpression,
  CallExpression,
  ArrowFunctionExpression,
  MemberExpression,
  Identifier,
  ObjectExpression,
  TemplateElement,
  ObjectPattern,
  ObjectProperty,
} from 'jscodeshift';

import {
  hasImportDeclaration,
  addCommentForUnresolvedImportSpecifiers,
  withPlugin,
  applyVisitor,
  convertMixedImportToNamedImport,
} from '../../codemods-helpers';
import type { CodemodPluginInstance } from '../../plugins/types';
import defaultCodemodPlugin from '../../plugins/default';

const imports = {
  compiledStyledImportName: 'styled',
  styledComponentsSupportedImportNames: ['css'],
  styledComponentsPackageName: 'styled-components',
};

// TODO
const keyToCssProperty = (key: string) => key;

const valueToExpression = ({
  j,
  params,
  value,
}: {
  j: JSCodeshift;
  params: (Identifier | ObjectPattern)[];
  value: MemberExpression | Identifier;
}) => {
  let usedProps;
  const propsParam = params[0];

  if (propsParam.type === 'ObjectPattern') {
    const destructedProps = propsParam.properties.filter((prop) => {
      const propName = ((prop as ObjectProperty).value as Identifier).name;

      if (value.type === 'Identifier') {
        return propName === value.name;
      }

      return j(value).find(j.Identifier, (identifier) => propName === identifier.name);
    });

    usedProps = j.collection(j.objectPattern(destructedProps));
  } else {
    usedProps = j(value).find(j.Identifier, (identifier) => propsParam.name === identifier.name);
  }

  if (!usedProps.length) {
    return value;
  }

  return j.arrowFunctionExpression(usedProps.nodes(), value);
};

const functionToTemplateLiteral = ({
  j,
  styleFn,
}: {
  j: JSCodeshift;
  styleFn: ArrowFunctionExpression;
}) => {
  const body = styleFn.body;

  // throw new Error('Can not convert not object expressions as style function');
  if (body.type === 'ObjectExpression') {
    const styleFnParams = styleFn.params;
    const properties = (styleFn.body as ObjectExpression).properties;

    const { keys, expressions } = properties.reduce(
      (acc, property) => {
        if (property.type === 'ObjectProperty') {
          const key = keyToCssProperty((property.key as Identifier).name);
          const expression = valueToExpression({
            j,
            params: styleFnParams as Identifier[],
            value: property.value as MemberExpression,
          });

          acc.keys.push(key);
          acc.expressions.push(expression);
        }
        return acc;
      },
      { keys: [], expressions: [] } as {
        keys: string[];
        expressions: (Identifier | ArrowFunctionExpression | MemberExpression)[];
      }
    );

    const quasis = keys.reduce((quasis, key, i) => {
      const prefix = i === 0 ? '' : ';';
      const isLast = i === keys.length - 1;
      const element = `${prefix}\n${key}: `;

      quasis.push(j.templateElement({ cooked: element, raw: element }, false));
      isLast && quasis.push(j.templateElement({ cooked: ';\n', raw: ';\n' }, false));

      return quasis;
    }, [] as TemplateElement[]);

    return { quasis, expressions };
  }

  return { quasis: [], expressions: [] };
};

const processAttrsCallback = ({
  j,
  expression,
}: {
  j: JSCodeshift;
  expression: ArrowFunctionExpression;
}) => {
  if (expression.body.type === 'ObjectExpression') {
    const argsProperties = expression.body.properties;

    if (argsProperties.length === 1) {
      const functionCallback = argsProperties[0];

      if (functionCallback.type === 'ObjectProperty') {
        if (functionCallback.key.type === 'Identifier' && functionCallback.key.name === 'style') {
          const styleFn = functionCallback.value as ArrowFunctionExpression;

          return functionToTemplateLiteral({ j, styleFn });
        }
      }
    }
  }

  return null;
};

const convertStyledAttrs = ({
  j,
  plugins,
  templateExpressions,
}: {
  j: JSCodeshift;
  plugins: CodemodPluginInstance[];
  templateExpressions: Collection<TaggedTemplateExpression>;
}) => {
  templateExpressions.forEach((templateExpression) => {
    // const componentDeclarator = templateExpression.parentPath;
    // const componentDeclaration = componentDeclarator.parentPath.parentPath;
    // const componentName = componentDeclarator.value.id.name;
    const expressionTag = templateExpression.value.tag as CallExpression;
    const expression = expressionTag.callee as MemberExpression;
    const styledTagName = ((expression.object as MemberExpression).property as Identifier).name;

    // construct new template expression without attrs property
    const newExpressions = j.taggedTemplateExpression(
      j.memberExpression(j.identifier('styled'), j.identifier(styledTagName)),
      templateExpression.value.quasi
    );

    // const declaration = j.variableDeclaration('const', [
    //   j.variableDeclarator(j.identifier(`${componentName}Compiled`), newExpressions),
    // ]);

    const arrowFn = expressionTag.arguments[0] as ArrowFunctionExpression;

    // extract new template data from arrow function
    const newTemplateData = processAttrsCallback({ j, expression: arrowFn });

    // insert data into the new expression
    if (newTemplateData != undefined) {
      const { quasis, expressions } = newTemplateData;

      newExpressions.quasi.expressions.unshift(...expressions);
      newExpressions.quasi.quasis.unshift(...quasis);
    }

    j(templateExpression).replaceWith(newExpressions);
  });

  return { plugins };
};

const transformer = (fileInfo: FileInfo, api: API, options: Options): string => {
  const { source } = fileInfo;
  const { jscodeshift: j } = api;
  const collection = j(source);
  const plugins: Array<CodemodPluginInstance> = [
    defaultCodemodPlugin,
    ...options.normalizedPlugins,
  ].map((plugin) => plugin.create(fileInfo, api, options));

  const originalProgram: Program = j(source).find(j.Program).get();

  const hasStyledComponentsImportDeclaration = hasImportDeclaration({
    j,
    collection,
    importPath: imports.styledComponentsPackageName,
  });

  if (!hasStyledComponentsImportDeclaration) {
    return source;
  }

  addCommentForUnresolvedImportSpecifiers({
    j,
    collection,
    importPath: imports.styledComponentsPackageName,
    allowedImportSpecifierNames: imports.styledComponentsSupportedImportNames,
  });

  convertMixedImportToNamedImport({
    j,
    plugins,
    collection,
    importPath: imports.styledComponentsPackageName,
    defaultSourceSpecifierName: imports.compiledStyledImportName,
    allowedImportSpecifierNames: imports.styledComponentsSupportedImportNames,
  });

  const templateExpressions = collection.find(
    j.TaggedTemplateExpression,
    ({ tag: expression }) =>
      expression.callee.object.object.name === 'styled' &&
      expression.callee.property.name === 'attrs'
  );

  if (templateExpressions.length) {
    convertStyledAttrs({
      j,
      plugins,
      templateExpressions,
    });
  }

  applyVisitor({
    plugins,
    originalProgram,
    currentProgram: collection.find(j.Program).get(),
  });

  return collection.toSource(options.printOptions || { quote: 'single' });
};

export default withPlugin(transformer);
