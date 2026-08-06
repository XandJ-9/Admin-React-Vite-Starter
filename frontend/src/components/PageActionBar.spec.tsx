import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageActionBar } from './PageActionBar';

describe('PageActionBar', () => {
  it('renders page functions in a dedicated action area', () => {
    render(
      <PageActionBar>
        <button type="button">新增</button>
      </PageActionBar>,
    );

    expect(screen.getByRole('button', { name: '新增' }).parentElement).toHaveClass('page-action-bar');
  });
});
