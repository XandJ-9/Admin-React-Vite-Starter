import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageShell } from './PageShell';

describe('PageShell', () => {
  it('renders page content without reserving a heading area', () => {
    const { container } = render(
      <PageShell>
        <div>页面内容</div>
      </PageShell>,
    );

    expect(screen.getByText('页面内容')).toBeInTheDocument();
    expect(container.querySelector('.page-shell__head')).not.toBeInTheDocument();
  });

});
