import { render } from '@testing-library/react';
import React from 'react';
import '@compiled/react';
import { css } from '@compiled/react';

describe('css prop', () => {
  it('should create css from object literal', () => {
    const { getByText } = render(<div css={css({ fontSize: '13px' })}>hello world</div>);

    expect(getByText('hello world')).toHaveCompiledCss('font-size', '13px');
  });

  it('should create css from object literal call expression', () => {
    const style = css({ fontSize: '13px' });
    const { getByText } = render(<div css={style}>hello world</div>);

    expect(getByText('hello world')).toHaveCompiledCss('font-size', '13px');
  });

  it('should create css from tagged template expression', () => {
    const { getByText } = render(
      <div
        css={css`
          font-size: 13px;
        `}>
        hello world
      </div>
    );

    expect(getByText('hello world')).toHaveCompiledCss('font-size', '13px');
  });

  it('should create css from tagged template expression variable', () => {
    const style = css`
      font-size: 13px;
    `;
    const { getByText } = render(<div css={style}>hello world</div>);

    expect(getByText('hello world')).toHaveCompiledCss('font-size', '13px');
  });
});
