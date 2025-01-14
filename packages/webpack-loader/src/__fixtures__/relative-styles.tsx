import React from 'react';
import { css, styled } from '@compiled/react';
import { blueviolet, blue, orange, purple, red, yellow } from './common/colors';
// @ts-expect-error ↓↓↓ This should not have their styles extracted ↓↓↓
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Coral } from './common/css-prop';

export const Styled = styled.span`
  color: ${blueviolet};

  :focus {
    color: ${purple};
  }

  :hover {
    color: ${blue};
  }
`;

const styles = css`
  color: ${red};

  :focus {
    color: ${orange};
  }

  :hover {
    color: ${yellow};
  }
`;

export const App = (): JSX.Element => (
  <>
    <div css={styles} />
    <Styled />
  </>
);
