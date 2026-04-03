import { AvatarId } from '../types';

export const AVATARS: Record<AvatarId, { label: string; image: any }> = {
  operator_a: {
    label: 'Operator A',
    image: require('../assets/characters/operator_a.png'),
  },
  operator_b: {
    label: 'Operator B',
    image: require('../assets/characters/operator_b.png'),
  },
};
