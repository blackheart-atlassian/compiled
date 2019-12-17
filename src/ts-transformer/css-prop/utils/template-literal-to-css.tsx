import * as ts from 'typescript';
import { ToCssReturnType, CssVariableExpressions, VariableDeclarations } from '../types';
import { getIdentifierText } from '../../utils/ast-node';
import { nextCssVariableName } from '../../utils/identifiers';

export const templateLiteralToCss = (
  node: ts.TemplateExpression,
  scopedVariables: VariableDeclarations
): ToCssReturnType => {
  const cssVariables: CssVariableExpressions[] = [];
  let css = '';

  css = node.head.text;
  node.templateSpans.forEach(span => {
    const key = getIdentifierText(span.expression);
    const variableName = `--${key}-${nextCssVariableName()}`;
    const value = scopedVariables[key];

    if (!value || !value.initializer) {
      throw new Error('variable doesnt exist in scope');
    }

    if (!ts.isStringLiteral(value.initializer)) {
      throw new Error('only string literals supported atm');
    }

    const cssVariableReference = `var(${variableName})`;
    cssVariables.push({
      name: variableName,
      expression: span.expression,
    });

    css += `${cssVariableReference}${span.literal.text}`;
  });

  return {
    css,
    cssVariables,
  };
};