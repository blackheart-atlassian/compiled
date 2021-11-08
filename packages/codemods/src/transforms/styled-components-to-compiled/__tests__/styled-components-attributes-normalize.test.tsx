import transformer from '../styled-components-to-compiled';

jest.disableAutomock();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defineInlineTest = require('jscodeshift/dist/testUtils').defineInlineTest;

describe('styled-components attributes normalize', () => {
  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
      import styled from 'styled-components';

      export const Input = styled.input.attrs(props => ({
        style: (props) => ({
          left: props.left,
          top: props.top,
        }),
      }))\`
        position: absolute;
      \`;
      `,
    `
      import { styled } from '@compiled/react';

      export const Input = styled.input\`
left: $\{props => props.left\};
top: $\{props => props.top\};
  position: absolute;
\`;
      `,
    'default style usage'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
      import styled from 'styled-components';

      export const Input = styled.input.attrs(props => ({
        style: (props) => ({
          left: \`$\{props.left}$\{props.top}px\`,
        }),
      }))\`
        position: absolute;
      \`;
      `,
    `
      import { styled } from '@compiled/react';

      export const Input = styled.input\`
left: $\{(props, props) => \`$\{props.left}$\{props.top}px\`\};
  position: absolute;
\`;
      `,
    'props argument used in one attribute'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    export const Input = styled.input.attrs(props => ({
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
left: $\{(
  {
    left
  }
) => left\};
top: $\{(
  {
    top
  }
) => top\};
  position: absolute;
\`;
    `,
    'desctructed props in params'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    export const Input = styled.input.attrs(props => ({
      style: ({ left, top }) => ({
        padding: \`$\{left}$\{top}px\`,
      }),
    }))\`
      position: absolute;
    \`;
    `,
    `
    import { styled } from '@compiled/react';

    export const Input = styled.input\`
padding: $\{(
  {
    left,
    top
  }
) => \`$\{left}$\{top}px\`};
  position: absolute;
\`;
    `,
    'desctructed multiple props used in one attribute'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    export const Input = styled.input.attrs(props => ({
      style: ({ left }) => ({
        padding: \`$\{left}$\{left}px\`,
      }),
    }))\`
      position: absolute;
    \`;
    `,
    `
    import { styled } from '@compiled/react';

    export const Input = styled.input\`
padding: $\{(
  {
    left
  }
) => \`$\{left}$\{left}px\`};
  position: absolute;
\`;
    `,
    'desctructed prop used several times'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    export const Input = styled.input.attrs(props => ({
      style: ({ left }) => ({
        left,
      }),
      id: 'test-id',
      onClick: this.onClick,
    }))\`
      position: absolute;
    \`;
    `,
    `
    import { styled } from '@compiled/react';

    const CompiledInput = styled.input\`
left: $\{(
  {
    left
  }
) => left};
  position: absolute;
\`;

    export const Input = props => <CompiledInput id={'test-id'} onClick={this.onClick} {...props} />;
    `,
    'default attributes behaviour'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    const Input = styled.input.attrs(props => ({
      style: ({ left }) => ({
        left,
      }),
      id: 'test-id',
      onClick: this.onClick,
    }))\`
      position: absolute;
    \`;
    `,
    `
    import { styled } from '@compiled/react';

    const CompiledInput = styled.input\`
left: $\{(
  {
    left
  }
) => left};
  position: absolute;
\`;

    const Input = props => <CompiledInput id={'test-id'} onClick={this.onClick} {...props} />;
    `,
    'component without export'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      plugins: [],
    },
    `
    import styled from 'styled-components';

    const Input = styled.input.attrs(props => ({
      style: ({ left }) => ({
        left,
      }),
      id: 'test-id',
      onClick: this.onClick,
    }))\`
      position: absolute;
    \`;

    export default Input;
    `,
    `
    import { styled } from '@compiled/react';

    const CompiledInput = styled.input\`
left: $\{(
  {
    left
  }
) => left};
  position: absolute;
\`;

    const Input = props => <CompiledInput id={'test-id'} onClick={this.onClick} {...props} />;

    export default Input;
    `,
    'component with default export'
  );
});
