import { Sound, Category } from '../types/soundboard';
import { generateSyntheticSound } from '../utils/sound-generator';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-hype', roomId: '', name: '🔥 Hype & FX', orderIndex: 0, icon: 'Flame' },
  { id: 'cat-gaming', roomId: '', name: '🎮 Gaming & Arcade', orderIndex: 1, icon: 'Gamepad2' },
  { id: 'cat-reactions', roomId: '', name: '🎭 Reactions', orderIndex: 2, icon: 'Sparkles' },
];

export async function getDefaultSounds(roomId: string): Promise<Sound[]> {
  // If in browser, generate pure crisp WAVs on demand
  let airhornUrl = '';
  let boomUrl = '';
  let laserUrl = '';
  let coinUrl = '';
  let rimshotUrl = '';
  let buzzerUrl = '';
  let chimeUrl = '';
  let notifUrl = '';

  if (typeof window !== 'undefined') {
    try {
      [airhornUrl, boomUrl, laserUrl, coinUrl, rimshotUrl, buzzerUrl, chimeUrl, notifUrl] = await Promise.all([
        generateSyntheticSound('airhorn'),
        generateSyntheticSound('bass_boom'),
        generateSyntheticSound('laser'),
        generateSyntheticSound('coin'),
        generateSyntheticSound('rimshot'),
        generateSyntheticSound('buzzer'),
        generateSyntheticSound('chime'),
        generateSyntheticSound('notification'),
      ]);
    } catch (e) {
      console.warn('Procedural audio generation fallback:', e);
    }
  }

  return [
    {
      id: `sound-${roomId}-1`,
      roomId,
      categoryId: 'cat-hype',
      name: 'Air Horn Blast',
      audioUrl: airhornUrl,
      duration: 1.1,
      color: '#ef4444', // Red
      hotkey: '1',
      orderIndex: 0,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-2`,
      roomId,
      categoryId: 'cat-hype',
      name: '808 Bass Boom',
      audioUrl: boomUrl,
      duration: 1.5,
      color: '#8b5cf6', // Violet
      hotkey: '2',
      orderIndex: 1,
      volume: 1.0,
    },
    {
      id: `sound-${roomId}-3`,
      roomId,
      categoryId: 'cat-gaming',
      name: 'Sci-Fi Laser',
      audioUrl: laserUrl,
      duration: 0.4,
      color: '#06b6d4', // Cyan
      hotkey: '3',
      orderIndex: 2,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-4`,
      roomId,
      categoryId: 'cat-gaming',
      name: 'Retro Coin',
      audioUrl: coinUrl,
      duration: 0.5,
      color: '#eab308', // Yellow
      hotkey: '4',
      orderIndex: 3,
      volume: 0.8,
    },
    {
      id: `sound-${roomId}-5`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'Ba-Dum Tss (Rimshot)',
      audioUrl: rimshotUrl,
      duration: 0.8,
      color: '#10b981', // Emerald
      hotkey: '5',
      orderIndex: 4,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-6`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'Wrong Buzzer',
      audioUrl: buzzerUrl,
      duration: 0.7,
      color: '#f97316', // Orange
      hotkey: '6',
      orderIndex: 5,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-7`,
      roomId,
      categoryId: 'cat-reactions',
      name: 'Victory Chime',
      audioUrl: chimeUrl,
      duration: 1.2,
      color: '#ec4899', // Pink
      hotkey: '7',
      orderIndex: 6,
      volume: 0.9,
    },
    {
      id: `sound-${roomId}-8`,
      roomId,
      categoryId: 'cat-hype',
      name: 'Alert Notification',
      audioUrl: notifUrl,
      duration: 0.6,
      color: '#3b82f6', // Blue
      hotkey: '8',
      orderIndex: 7,
      volume: 0.85,
    },
  ];
}
