import type {
  FileInfo,
  API,
  JSCodeshift,
  Options,
  Program,
  Collection,
  TaggedTemplateExpression,
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
    const styledTagName = 'input';

    const newExpressions = j.taggedTemplateExpression(
      j.memberExpression(j.identifier('styled'), j.identifier(styledTagName)),
      templateExpression.value.quasi
    );

    j(templateExpression).replaceWith(newExpressions);
  });

  // convert attr declartation into the regular declration
  /// create definition
  /// extract style props
  /// merge styles

  // replace original

  // create wrapper with rest props

  // append after with the component name

  return { j, plugins, templateExpressions };
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
