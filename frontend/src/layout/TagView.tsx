import { Button, Dropdown, type MenuProps } from 'antd';
import { MoreHorizontal, X } from 'lucide-react';
import { useEffect, useRef, type WheelEvent } from 'react';
import type { TagViewItem } from '@/utils/tagView';

interface TagViewProps {
  activeKey: string | null;
  onClose: (key: string) => void;
  onCloseCurrent: () => void;
  onCloseOthers: () => void;
  onCloseRight: () => void;
  onSelect: (path: string) => void;
  tags: TagViewItem[];
}

export function TagView({
  activeKey,
  onClose,
  onCloseCurrent,
  onCloseOthers,
  onCloseRight,
  onSelect,
  tags,
}: TagViewProps) {
  const tagRefs = useRef(new Map<string, HTMLDivElement>());
  const activeIndex = tags.findIndex((tag) => tag.key === activeKey);
  const activeTag = activeIndex >= 0 ? tags[activeIndex] : null;

  useEffect(() => {
    if (!activeKey) {
      return;
    }
    tagRefs.current.get(activeKey)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeKey, tags]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (container.scrollWidth <= container.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
      return;
    }
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'close-current',
      label: '关闭当前',
      disabled: !activeTag?.closable,
      onClick: onCloseCurrent,
    },
    {
      key: 'close-others',
      label: '关闭其他',
      disabled: !activeTag || tags.every((tag) => !tag.closable || tag.key === activeKey),
      onClick: onCloseOthers,
    },
    {
      key: 'close-right',
      label: '关闭右侧',
      disabled: activeIndex < 0 || !tags.slice(activeIndex + 1).some((tag) => tag.closable),
      onClick: onCloseRight,
    },
  ];

  return (
    <div className="tag-view" aria-label="已访问页面">
      <div className="tag-view__scroll" onWheel={handleWheel}>
        {tags.map((tag) => (
          <div
            className={tag.key === activeKey ? 'tag-view__item tag-view__item--active' : 'tag-view__item'}
            key={tag.key}
            ref={(element) => {
              if (element) {
                tagRefs.current.set(tag.key, element);
              } else {
                tagRefs.current.delete(tag.key);
              }
            }}
          >
            <button className="tag-view__label" type="button" onClick={() => onSelect(tag.path)}>
              {tag.title}
            </button>
            {tag.closable ? (
              <button
                aria-label={`关闭${tag.title}`}
                className="tag-view__close"
                type="button"
                onClick={() => onClose(tag.key)}
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
        <Button aria-label="标签页操作" className="tag-view__more" icon={<MoreHorizontal size={16} />} type="text" />
      </Dropdown>
    </div>
  );
}
