import { beforeEach, describe, expect, it } from 'vitest';
import { useTagViewStore } from './tagViewStore';

const homeTag = { key: '/dashboard', path: '/dashboard', title: '工作台', closable: false };
const rolesTag = { key: '/system/roles', path: '/system/roles', title: '角色管理', closable: true };
const usersTag = { key: '/system/users', path: '/system/users', title: '用户管理', closable: true };

describe('tagViewStore', () => {
  beforeEach(() => {
    useTagViewStore.setState({ tags: [] });
  });

  it('keeps home first and removes tags that are no longer authorized', () => {
    useTagViewStore.setState({ tags: [usersTag] });

    useTagViewStore.getState().syncTags({
      allowedTags: [homeTag, rolesTag],
      currentTag: rolesTag,
      homeTag,
    });

    expect(useTagViewStore.getState().tags).toEqual([homeTag, rolesTag]);
  });

  it('supports closing current, other and right-side tags without removing home', () => {
    useTagViewStore.setState({ tags: [homeTag, rolesTag, usersTag] });

    useTagViewStore.getState().closeRight(rolesTag.key);
    expect(useTagViewStore.getState().tags).toEqual([homeTag, rolesTag]);

    useTagViewStore.setState({ tags: [homeTag, rolesTag, usersTag] });
    useTagViewStore.getState().closeOthers(usersTag.key);
    expect(useTagViewStore.getState().tags).toEqual([homeTag, usersTag]);

    useTagViewStore.getState().closeTag(homeTag.key);
    expect(useTagViewStore.getState().tags).toEqual([homeTag, usersTag]);
  });

  it('supports pages that do not enable TagView', () => {
    useTagViewStore.setState({ tags: [rolesTag] });

    useTagViewStore.getState().syncTags({
      allowedTags: [rolesTag],
      currentTag: null,
      homeTag: null,
    });

    expect(useTagViewStore.getState().tags).toEqual([rolesTag]);
  });
});
