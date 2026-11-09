import { Sound, Category } from '../types/soundboard';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-viral', roomId: '', name: '🔥 Viral Memes', orderIndex: 0, icon: 'Flame' },
  { id: 'cat-reactions', roomId: '', name: '🚨 Reactions & FX', orderIndex: 1, icon: 'Sparkles' },
  { id: 'cat-gaming', roomId: '', name: '🎮 Gaming Memes', orderIndex: 2, icon: 'Gamepad2' },
];

export async function getDefaultSounds(roomId: string): Promise<Sound[]> {
  return [
    {
      id: `sound-${roomId}-1`,
      roomId,
      categoryId: 'cat-viral',
      name: 'Vine Boom',
      audioUrl: '/sounds/vine-boom.mp3',
      duration: 1.1,
      color: '#ef4444', // Red
      hotkey: '1',
      orderIndex: 0,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-2`,
      roomId,
      categoryId: 'cat-viral',
      name: 'Bruh Sound',
      audioUrl: '/sounds/bruh.mp3',
      duration: 0.9,
      color: '#8b5cf6', // Violet
      hotkey: '2',
      orderIndex: 1,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-3`,
      roomId,
      categoryId: 'cat-viral',
      name: 'Emotional Damage!',
      audioUrl: '/sounds/emotional-damage.mp3',
      duration: 1.5,
      color: '#f97316', // Orange
      hotkey: '3',
      orderIndex: 2,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-4`,
      roomId,
      categoryId: 'cat-viral',
      name: 'Metal Pipe Clang',
      audioUrl: '/sounds/metal-pipe.mp3',
      duration: 1.2,
      color: '#06b6d4', // Cyan
      hotkey: '4',
      orderIndex: 3,
      volume: 0.95,
    },
    {
      id: `sound-${roomId}-5`,
      roomId,
      categoryId: 'cat-viral',
      name: 'Original Sheeeesh',
      audioUrl: '/sounds/sheesh.mp3',
      duration: 2.2,
      color: '#ec4899', // Pink
      hotkey: '5',
      orderIndex: 4,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-6`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'FBI Open Up!',
      audioUrl: '/sounds/fbi-open-up.mp3',
      duration: 1.8,
      color: '#eab308', // Yellow
      hotkey: '6',
      orderIndex: 5,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-7`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'SpongeBob Fail (Womp)',
      audioUrl: '/sounds/spongebob-fail.mp3',
      duration: 1.4,
      color: '#10b981', // Emerald
      hotkey: '7',
      orderIndex: 6,
      volume: 0.95,
    },
    {
      id: `sound-${roomId}-8`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'Sad Violin Meme',
      audioUrl: '/sounds/sad-violin.mp3',
      duration: 2.5,
      color: '#6366f1', // Indigo
      hotkey: '8',
      orderIndex: 7,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-9`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'Windows XP Error',
      audioUrl: '/sounds/windows-error.mp3',
      duration: 0.6,
      color: '#3b82f6', // Blue
      hotkey: '9',
      orderIndex: 8,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-10`,
      roomId,
      categoryId: 'cat-gaming',
      name: 'Among Us Reveal',
      audioUrl: '/sounds/among-us.mp3',
      duration: 2.4,
      color: '#ef4444', // Red
      hotkey: '0',
      orderIndex: 9,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-11`,
      roomId,
      categoryId: 'cat-gaming',
      name: 'Clash Laugh (Heheheha)',
      audioUrl: '/sounds/clash-laugh.mp3',
      duration: 1.3,
      color: '#a855f7', // Purple
      hotkey: 'Q',
      orderIndex: 10,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-12`,
      roomId,
      categoryId: 'cat-reactions',
      name: '🚪 Knock Knock',
      audioUrl: '/sounds/door-knock.mp3',
      duration: 1.5,
      color: '#78716c', // Stone
      hotkey: 'W',
      orderIndex: 11,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-13`,
      roomId,
      categoryId: 'cat-viral',
      name: '🎵 Tunak Tunak Tun',
      audioUrl: '/sounds/tunak.mp3',
      duration: 5.0,
      color: '#f59e0b', // Amber
      hotkey: 'E',
      orderIndex: 12,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-14`,
      roomId,
      categoryId: 'cat-reactions',
      name: '📯 Air Horn',
      audioUrl: '/sounds/airhorn.mp3',
      duration: 1.5,
      color: '#22c55e', // Green
      hotkey: 'R',
      orderIndex: 13,
      volume: 0.85,
    },
  ];
}
