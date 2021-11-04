import transformer from '../styled-components-to-compiled';

jest.disableAutomock();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defineInlineTest = require('jscodeshift/dist/testUtils').defineInlineTest;

// export const Input = styled.input\`
//       left: $\{(props) => props.left\},
//       top: $\{(props) => props.top\},
//       position: absolute;
//     \`;

describe('styled-components attributes normalize', () => {
  //   defineInlineTest(
  //     { default: transformer, parser: 'tsx' },
  //     {
  //       plugins: [],
  //     },
  //     `
  //     import styled from 'styled-components';

  //     export const Input = styled.input.attrs(props => ({
  //       style: (props) => ({
  //         left: props.left,
  //         top: props.top,
  //       }),
  //     }))\`
  //       position: absolute;
  //     \`;
  //     `,
  //     `
  //     import { styled } from '@compiled/react';

  //     export const Input = styled.input\`
  // left: $\{props => props.left\};
  // top: $\{props => props.top\};

  //   position: absolute;
  // \`;
  //     `,
  //     'default style usage'
  //   );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    export const Input = styled.input.attrs(anotherProps => ({
      style: ({ left, top }) => ({
        left: left,
        top: top,
      }),
    }))\`
      position: absolute;
    \`;
    `,
    `
    import { styled } from '@compiled/react';

    export const Input = styled.input\`
left: $\{({ left }) => left\};
top: $\{({ top }) => top\};

  position: absolute;
\`;
    `,
    'desctructed props in params'
  );
});
