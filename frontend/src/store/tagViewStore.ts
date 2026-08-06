import { create } from 'zustand';
import { getTagViewBasePath, type TagViewItem } from '@/utils/tagView';

interface SyncTagViewInput {
  allowedTags: TagViewItem[];
  currentTag: TagViewItem | null;
  homeTag: TagViewItem | null;
}

interface TagViewState {
  tags: TagViewItem[];
  clearTags: () => void;
  closeOthers: (key: string) => void;
  closeRight: (key: string) => void;
  closeTag: (key: string) => void;
  syncTags: (input: SyncTagViewInput) => void;
}

export const useTagViewStore = create<TagViewState>((set) => ({
  tags: [],
  clearTags() {
    set({ tags: [] });
  },
  closeTag(key) {
    set((state) => ({ tags: state.tags.filter((tag) => !tag.closable || tag.key !== key) }));
  },
  closeOthers(key) {
    set((state) => ({ tags: state.tags.filter((tag) => !tag.closable || tag.key === key) }));
  },
  closeRight(key) {
    set((state) => {
      const currentIndex = state.tags.findIndex((tag) => tag.key === key);
      if (currentIndex < 0) {
        return state;
      }
      return {
        tags: state.tags.filter((tag, index) => index <= currentIndex || !tag.closable),
      };
    });
  },
  syncTags({ allowedTags, currentTag, homeTag }) {
    const allowedTagByPath = new Map(allowedTags.map((tag) => [tag.path, tag]));
    set((state) => {
      const nextTags = state.tags
        .filter((tag) => allowedTagByPath.has(getTagViewBasePath(tag)))
        .map((tag) => {
          const menuTag = allowedTagByPath.get(getTagViewBasePath(tag));
          return tag.key === menuTag?.key ? { ...tag, title: menuTag.title } : tag;
        });
      if (homeTag) {
        const homeIndex = nextTags.findIndex((tag) => tag.key === homeTag.key);
        if (homeIndex >= 0) {
          nextTags.splice(homeIndex, 1);
        }
        nextTags.unshift(homeTag);
      }

      if (currentTag && !nextTags.some((tag) => tag.key === currentTag.key)) {
        nextTags.push(currentTag);
      }

      return { tags: nextTags };
    });
  },
}));
