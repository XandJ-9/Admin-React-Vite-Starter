import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TagView } from './TagView';

const tags = [
  { key: '/dashboard', path: '/dashboard', title: '工作台', closable: false },
  { key: '/system/roles', path: '/system/roles', title: '角色管理', closable: true },
];

describe('TagView', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('selects and closes visited pages while keeping home fixed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <TagView
        activeKey="/system/roles"
        onClose={onClose}
        onCloseCurrent={vi.fn()}
        onCloseOthers={vi.fn()}
        onCloseRight={vi.fn()}
        onSelect={onSelect}
        tags={tags}
      />,
    );

    await user.click(screen.getByRole('button', { name: '工作台' }));
    expect(onSelect).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByRole('button', { name: '关闭工作台' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭角色管理' }));
    expect(onClose).toHaveBeenCalledWith('/system/roles');
  });

  it('scrolls the active tag into the visible area', () => {
    const { rerender } = render(
      <TagView
        activeKey="/dashboard"
        onClose={vi.fn()}
        onCloseCurrent={vi.fn()}
        onCloseOthers={vi.fn()}
        onCloseRight={vi.fn()}
        onSelect={vi.fn()}
        tags={tags}
      />,
    );

    scrollIntoView.mockClear();
    rerender(
      <TagView
        activeKey="/system/roles"
        onClose={vi.fn()}
        onCloseCurrent={vi.fn()}
        onCloseOthers={vi.fn()}
        onCloseRight={vi.fn()}
        onSelect={vi.fn()}
        tags={tags}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  });

  it('uses the mouse wheel to scroll an overflowing tag row horizontally', () => {
    const { container } = render(
      <TagView
        activeKey="/system/roles"
        onClose={vi.fn()}
        onCloseCurrent={vi.fn()}
        onCloseOthers={vi.fn()}
        onCloseRight={vi.fn()}
        onSelect={vi.fn()}
        tags={tags}
      />,
    );
    const scrollContainer = container.querySelector('.tag-view__scroll') as HTMLDivElement;
    Object.defineProperties(scrollContainer, {
      clientWidth: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 500 },
    });

    fireEvent.wheel(scrollContainer, { deltaX: 0, deltaY: 80 });

    expect(scrollContainer.scrollLeft).toBe(80);
  });
});
