// ═══════════════════════════════════════════════════════
// App — Main entry point
// ═══════════════════════════════════════════════════════

import { Platform } from './platform.js';
import { API } from './api.js';
import { PlaylistManager } from './playlist.js';
import { Player } from './player.js';
import { ShortcutHandler } from './shortcuts.js';
import { GestureHandler } from './gestures.js';
import { Visualizer } from './visualizer.js';
import { formatTime, generateId } from './utils.js';

// ── Song Manifest (baked in at build time) ──
// Run `npm run sync-manifest` to update from B2
export const SONGS_MANIFEST = [
  { id: '李志-09我爱南京现场-live-01事情要从1995年说起', title: '事情要从1995年说起', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/01事情要从1995年说起.flac', size: 19831555, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-02黑色信封', title: '黑色信封', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/02黑色信封.flac', size: 62157297, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-03董卓瑶', title: '董卓瑶', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/03董卓瑶.flac', size: 41649684, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-04春末的南方城市', title: '春末的南方城市', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/04春末的南方城市.flac', size: 44836802, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-05来了', title: '来了', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/05来了.flac', size: 74574722, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-06广场', title: '广场', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/06广场.flac', size: 42044747, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-07青春', title: '青春', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/07青春.flac', size: 32900624, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-08他们', title: '他们', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/08他们.flac', size: 50072718, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-09被禁忌的游戏', title: '被禁忌的游戏', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/09被禁忌的游戏.flac', size: 55960032, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-10这个世界会好吗', title: '这个世界会好吗', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/10这个世界会好吗.flac', size: 42180416, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-11妈妈', title: '妈妈', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/11妈妈.flac', size: 30352864, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-12听妈妈讲那过去的事情', title: '听妈妈讲那过去的事情', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/12听妈妈讲那过去的事情.flac', size: 17380011, contentType: 'audio/flac' },
  { id: '李志-09我爱南京现场-live-13倒影', title: '倒影', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/13倒影.mp3', size: 2933044, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-14鸵鸟', title: '鸵鸟', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/14鸵鸟.mp3', size: 4549300, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-15天空之城', title: '天空之城', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/15天空之城.mp3', size: 3813172, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-16苍井空', title: '苍井空', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/16苍井空.mp3', size: 4181044, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-17意味', title: '意味', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/17意味.mp3', size: 3061300, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-18家乡-草他妈版', title: '家乡（草他妈版）', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/18家乡（草他妈版）.mp3', size: 4869172, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-1990年的春天', title: '1990年的春天', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/1990年的春天.mp3', size: 4821172, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-20冬妮娅', title: '冬妮娅', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/20冬妮娅.mp3', size: 3429172, contentType: 'audio/mpeg' },
  { id: '李志-09我爱南京现场-live-21末尾曲', title: '末尾曲', artist: '李志', album: '09我爱南京现场 Live', duration: 0, coverUrl: '', fileName: '李志/09我爱南京现场 Live/21末尾曲.mp3', size: 4357300, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-阿兰', title: '阿兰', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/阿兰.mp3', size: 10563500, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-倒影', title: '倒影', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/倒影.mp3', size: 6696333, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-董卓瑶', title: '董卓瑶', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/董卓瑶.mp3', size: 7986785, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-关于郑州的记忆', title: '关于郑州的记忆', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/关于郑州的记忆.mp3', size: 3685260, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-广场', title: '广场', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/广场.mp3', size: 5061172, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-和你在一起', title: '和你在一起', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/和你在一起.mp3', size: 8529093, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-和你在一起合唱', title: '和你在一起合唱', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/和你在一起合唱.mp3', size: 3317454, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-黑色信封', title: '黑色信封', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/黑色信封.mp3', size: 13087980, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-忽然', title: '忽然', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/忽然.mp3', size: 7820643, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-姐姐', title: '姐姐', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/姐姐.mp3', size: 16460904, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-尽头', title: '尽头', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/尽头.mp3', size: 11603174, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-来了', title: '来了', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/来了.mp3', size: 21217280, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-墙上的向日葵', title: '墙上的向日葵', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/墙上的向日葵.mp3', size: 21221471, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-青春', title: '青春', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/青春.mp3', size: 6663941, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-人民不需要自由', title: '人民不需要自由', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/人民不需要自由.mp3', size: 19603972, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-山阴路的夏天', title: '山阴路的夏天', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/山阴路的夏天.mp3', size: 12685700, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-山阴路独白版', title: '山阴路独白版', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/山阴路独白版.mp3', size: 4245321, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-她-我们不能失去信仰-1990年的春天', title: '她+我们不能失去信仰+1990年的春天', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/她+我们不能失去信仰+1990年的春天.mp3', size: 38565876, contentType: 'audio/mpeg' },
  { id: '李志-108-个关键词-2012-live-下雨', title: '下雨', artist: '李志', album: '108 个关键词 2012 Live', duration: 0, coverUrl: '', fileName: '李志/108 个关键词 2012 Live/下雨.mp3', size: 12682553, contentType: 'audio/mpeg' },
  { id: '李志-2005-被禁忌的游戏-阿兰', title: '阿兰', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/阿兰.wav', size: 29341046, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-被禁忌的游戏', title: '被禁忌的游戏', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/被禁忌的游戏.wav', size: 66690814, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-黑色信封', title: '黑色信封', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/黑色信封.wav', size: 50716026, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-红色气球', title: '红色气球', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/红色气球.wav', size: 30622890, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-欢愉', title: '欢愉', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/欢愉.wav', size: 36636950, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-卡夫卡', title: '卡夫卡', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/卡夫卡.wav', size: 31243816, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-离婚', title: '离婚', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/离婚.wav', size: 52223654, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-罗庄的冬天', title: '罗庄的冬天', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/罗庄的冬天.wav', size: 72523772, contentType: 'audio/vnd.wave' },
  { id: '李志-2005-被禁忌的游戏-青春', title: '青春', artist: '李志', album: '2005 被禁忌的游戏', duration: 0, coverUrl: '', fileName: '李志/2005 被禁忌的游戏/青春.wav', size: 34009766, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-海的女儿', title: '海的女儿', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/海的女儿.wav', size: 37228074, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-和你在一起', title: '和你在一起', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/和你在一起.wav', size: 44462828, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-交河', title: '交河', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/交河.wav', size: 38552246, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-卡纳斯', title: '卡纳斯', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/卡纳斯.wav', size: 56468696, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-妈妈', title: '妈妈', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/妈妈.wav', size: 43081174, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-人民不需要自由', title: '人民不需要自由', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/人民不需要自由.flac', size: 34674724, contentType: 'audio/flac' },
  { id: '李志-2006-这个世界会好吗-他们', title: '他们', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/他们.wav', size: 52411494, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-翁庆年的六英镑', title: '翁庆年的六英镑', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/翁庆年的六英镑.wav', size: 45264864, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-我们不能失去信仰-献给刘艺', title: '我们不能失去信仰——献给刘艺', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/我们不能失去信仰——献给刘艺.wav', size: 44458142, contentType: 'audio/vnd.wave' },
  { id: '李志-2006-这个世界会好吗-这个世界会好吗', title: '这个世界会好吗', artist: '李志', album: '2006 这个世界会好吗', duration: 0, coverUrl: '', fileName: '李志/2006 这个世界会好吗/这个世界会好吗.wav', size: 42026320, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-暧昧', title: '暧昧', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/暧昧.wav', size: 38433642, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-春末的南方城市', title: '春末的南方城市', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/春末的南方城市.wav', size: 43568296, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-董卓谣', title: '董卓谣', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/董卓谣.wav', size: 34931820, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-梵高先生', title: '梵高先生', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/梵高先生.wav', size: 44102684, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-广场', title: '广场', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/广场.wav', size: 44377146, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-来了', title: '来了', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/来了.wav', size: 55009628, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-你离开了南京-从此没有人和我说话', title: '你离开了南京，从此没有人和我说话', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/你离开了南京，从此没有人和我说话.wav', size: 12710072, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-人民不需要自由', title: '人民不需要自由', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/人民不需要自由.flac', size: 34674724, contentType: 'audio/flac' },
  { id: '李志-2007-梵高先生-想起了他', title: '想起了他', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/想起了他.wav', size: 48288450, contentType: 'audio/vnd.wave' },
  { id: '李志-2007-梵高先生-斜', title: '斜', artist: '李志', album: '2007 梵高先生', duration: 0, coverUrl: '', fileName: '李志/2007 梵高先生/斜.wav', size: 38278636, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-01-冬妮娅', title: '冬妮娅', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/01 冬妮娅.wav', size: 41014292, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-01-意味', title: '意味', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/01 意味.wav', size: 35617262, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-02-苍井空', title: '苍井空', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/02 苍井空.wav', size: 45966684, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-02-听妈妈讲那过去的事情', title: '听妈妈讲那过去的事情', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/02 听妈妈讲那过去的事情.wav', size: 29950602, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-03-结婚', title: '结婚', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/03 结婚.wav', size: 62255846, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-03-美丽的梭罗河', title: '美丽的梭罗河', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/03 美丽的梭罗河.wav', size: 26360070, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-04-米店', title: '米店', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/04 米店.wav', size: 37237078, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-04-鸵鸟', title: '鸵鸟', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/04 鸵鸟.wav', size: 47185070, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-05-思念观世音', title: '思念观世音', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/05 思念观世音.wav', size: 34094412, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-05-天空之城', title: '天空之城', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/05 天空之城.wav', size: 39360674, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-06-倒影', title: '倒影', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/06 倒影.wav', size: 32298622, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-06-在那遥远的地方', title: '在那遥远的地方', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/06 在那遥远的地方.wav', size: 30322432, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-07-爱', title: '爱', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/07 爱.wav', size: 35466736, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-07-再见', title: '再见', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/07 再见.wav', size: 15695024, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-08-家乡', title: '家乡', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/08 家乡.wav', size: 60612494, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-09-1990年的春天', title: '1990年的春天', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/09 1990年的春天.wav', size: 47589842, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-爸爸在天上看我-我爱南京未发表歌曲', title: '爸爸在天上看我（我爱南京未发表歌曲）', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/爸爸在天上看我（我爱南京未发表歌曲）.wav', size: 34737342, contentType: 'audio/vnd.wave' },
  { id: '李志-2009-我爱南京-歌-我爱南京未发表歌曲', title: '歌（我爱南京未发表歌曲）', artist: '李志', album: '2009 我爱南京', duration: 0, coverUrl: '', fileName: '李志/2009 我爱南京/歌（我爱南京未发表歌曲）.wav', size: 30580358, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-1铅笔', title: '铅笔', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/1铅笔.wav', size: 48459700, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-1墙上的向日葵', title: '墙上的向日葵', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/1墙上的向日葵.wav', size: 52255836, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-3关于郑州的记忆', title: '关于郑州的记忆', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/3关于郑州的记忆.wav', size: 40260638, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-4忽然', title: '忽然', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/4忽然.wav', size: 22392484, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-5秋天的老狼', title: '秋天的老狼', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/5秋天的老狼.wav', size: 41697706, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-6带亲', title: '带亲', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/6带亲.wav', size: 39195172, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-7她', title: '她', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/7她.wav', size: 43703490, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-8路-李志-邵夷贝', title: '路 (李志、邵夷贝)', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/8路 (李志、邵夷贝).wav', size: 25301912, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-9夜', title: '夜', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/9夜.wav', size: 48492626, contentType: 'audio/vnd.wave' },
  { id: '李志-2010-你好-郑州-铅笔-吉松浩版', title: '铅笔(吉松浩版)', artist: '李志', album: '2010 你好，郑州', duration: 0, coverUrl: '', fileName: '李志/2010 你好，郑州/铅笔(吉松浩版).wav', size: 48803102, contentType: 'audio/vnd.wave' },
  { id: '李志-2011-imagine跨年音乐会-cd1-01-青春', title: 'CD1 / 01. 青春', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/01. 青春.flac', size: 24143970, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-02-离婚', title: 'CD1 / 02. 离婚', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/02. 离婚.flac', size: 46932960, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-03-我们不能失去信仰', title: 'CD1 / 03. 我们不能失去信仰', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/03. 我们不能失去信仰.flac', size: 34537871, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-04-喀纳斯', title: 'CD1 / 04. 喀纳斯', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/04. 喀纳斯.flac', size: 36360874, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-05-天空之城', title: 'CD1 / 05. 天空之城', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/05. 天空之城.flac', size: 24826401, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-06-苍井空', title: 'CD1 / 06. 苍井空', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/06. 苍井空.flac', size: 33028973, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-07-关于郑州的记忆', title: 'CD1 / 07. 关于郑州的记忆', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/07. 关于郑州的记忆.flac', size: 27944495, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-08-海的女儿', title: 'CD1 / 08. 海的女儿', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/08. 海的女儿.flac', size: 30837986, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-09-她', title: 'CD1 / 09. 她', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/09. 她.flac', size: 44472561, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd1-10-家乡', title: 'CD1 / 10. 家乡', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD1/10. 家乡.flac', size: 39421956, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-01-结婚', title: 'CD2 / 01. 结婚', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/01. 结婚.flac', size: 49576120, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-02-红色气球', title: 'CD2 / 02. 红色气球', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/02. 红色气球.flac', size: 31342923, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-03-被禁忌的游戏', title: 'CD2 / 03. 被禁忌的游戏', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/03. 被禁忌的游戏.flac', size: 33214192, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-04-寻找', title: 'CD2 / 04. 寻找', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/04. 寻找.flac', size: 25319570, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-05-斜', title: 'CD2 / 05. 斜', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/05. 斜.flac', size: 20931056, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-06-和你在一起', title: 'CD2 / 06. 和你在一起', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/06. 和你在一起.flac', size: 23100405, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-07-门', title: 'CD2 / 07. 门', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/07. 门.flac', size: 53394228, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-08-尽头', title: 'CD2 / 08. 尽头', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/08. 尽头.flac', size: 37943344, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-09-女神', title: 'CD2 / 09. 女神', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/09. 女神.flac', size: 36308688, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-10-杭州', title: 'CD2 / 10. 杭州', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/10. 杭州.flac', size: 31435224, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-11-翁庆年的六英镑', title: 'CD2 / 11. 翁庆年的六英镑', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/11. 翁庆年的六英镑.flac', size: 32576464, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-12-秋天的老狼', title: 'CD2 / 12. 秋天的老狼', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/12. 秋天的老狼.flac', size: 34271504, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-13-1990的春天', title: 'CD2 / 13. 1990的春天', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/13. 1990的春天.flac', size: 40877399, contentType: 'audio/flac' },
  { id: '李志-2011-imagine跨年音乐会-cd2-14-结尾', title: 'CD2 / 14. 结尾', artist: '李志', album: '2011 - IMAGINE跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/2011 - IMAGINE跨年音乐会/CD2/14. 结尾.flac', size: 7200633, contentType: 'audio/flac' },
  { id: '李志-2014-1701-1-01-大象-李志', title: '大象-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.01.大象-李志.wav', size: 57625418, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-02-鼠说-李志', title: '鼠说-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.02.鼠说-李志.wav', size: 57292184, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-03-定西-李志', title: '定西-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.03.定西-李志.wav', size: 52208290, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-04-看见-李志', title: '看见-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.04.看见-李志.wav', size: 44732694, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-05-不多-李志', title: '不多-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.05.不多-李志.wav', size: 42730056, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-06-热河-李志', title: '热河-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.06.热河-李志.wav', size: 71728010, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-07-好威武支持有希望-李志', title: '好威武支持有希望-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.07.好威武支持有希望-李志.wav', size: 65039232, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-1701-1-08-方式-李志', title: '方式-李志', artist: '李志', album: '2014 1701', duration: 0, coverUrl: '', fileName: '李志/2014 1701/1.08.方式-李志.wav', size: 44410036, contentType: 'audio/vnd.wave' },
  { id: '李志-2014-f-01-寻找', title: '寻找', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/01 - 寻找 .flac', size: 21367645, contentType: 'audio/flac' },
  { id: '李志-2014-f-02-尽头', title: '尽头', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/02 - 尽头 .flac', size: 29083795, contentType: 'audio/flac' },
  { id: '李志-2014-f-03-门', title: '门', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/03 - 门 .flac', size: 39208280, contentType: 'audio/flac' },
  { id: '李志-2014-f-04-下雨', title: '下雨', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/04 - 下雨 .flac', size: 30907589, contentType: 'audio/flac' },
  { id: '李志-2014-f-05-山阴路的夏天', title: '山阴路的夏天', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/05 - 山阴路的夏天 .flac', size: 25688069, contentType: 'audio/flac' },
  { id: '李志-2014-f-06-女神', title: '女神', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/06 - 女神 .flac', size: 31483241, contentType: 'audio/flac' },
  { id: '李志-2014-f-07-你的早晨', title: '你的早晨', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/07 - 你的早晨 .flac', size: 27529433, contentType: 'audio/flac' },
  { id: '李志-2014-f-08-杭州', title: '杭州', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/08 - 杭州 .flac', size: 28767132, contentType: 'audio/flac' },
  { id: '李志-2014-f-09-日', title: '日', artist: '李志', album: '2014 F', duration: 0, coverUrl: '', fileName: '李志/2014 F/09 - 日 .flac', size: 10560491, contentType: 'audio/flac' },
  { id: '李志-2014年-勾三搭四-李志-1990年的春天2013版live', title: '1990年的春天2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 1990年的春天2013版LIVE.mp3', size: 13415447, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-被禁忌的游戏2013版live', title: '被禁忌的游戏2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 被禁忌的游戏2013版LIVE.mp3', size: 20154021, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-春末的南方城市2013版live', title: '春末的南方城市2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 春末的南方城市2013版LIVE.mp3', size: 11290155, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-董卓瑶2013版live', title: '董卓瑶2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 董卓瑶2013版LIVE.mp3', size: 12411290, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-杭州-我们不能失去信仰2013版live', title: '杭州&我们不能失去信仰2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 杭州&我们不能失去信仰2013版LIVE.mp3', size: 21918833, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-和你在一起2013版live', title: '和你在一起2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 和你在一起2013版LIVE.mp3', size: 10680974, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-黑色信封2013版live', title: '黑色信封2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 黑色信封2013版LIVE.mp3', size: 13300500, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-来了2013版live', title: '来了2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 来了2013版LIVE.mp3', size: 17356790, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-离婚2013版live', title: '离婚2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 离婚2013版LIVE.mp3', size: 11412397, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-妈妈2013版live', title: '妈妈2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 妈妈2013版LIVE.mp3', size: 10355974, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-门2013版live', title: '门2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 门2013版LIVE.mp3', size: 16130109, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-你的早晨-天空之城2013版live', title: '你的早晨&天空之城2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 你的早晨&天空之城2013版LIVE.mp3', size: 22121570, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-铅笔2013版live', title: '铅笔2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 铅笔2013版LIVE.mp3', size: 9979842, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-墙上的向日葵2013版live', title: '墙上的向日葵2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 墙上的向日葵2013版LIVE.mp3', size: 18043327, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-秋天的老狼2013版live', title: '秋天的老狼2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 秋天的老狼2013版LIVE.mp3', size: 17522966, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-山阴路的夏天2013版live', title: '山阴路的夏天2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 山阴路的夏天2013版LIVE.mp3', size: 13729958, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-翁庆年的六英镑2013版live', title: '翁庆年的六英镑2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 翁庆年的六英镑2013版LIVE.mp3', size: 11009045, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-下雨2013版live', title: '下雨2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 下雨2013版LIVE.mp3', size: 11673621, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-斜2013版live', title: '斜2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 斜2013版LIVE.mp3', size: 8305914, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-意味2013版live', title: '意味2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 意味2013版LIVE.mp3', size: 13384088, contentType: 'audio/mpeg' },
  { id: '李志-2014年-勾三搭四-李志-这个世界会好吗2013版live', title: '这个世界会好吗2013版LIVE', artist: '李志', album: '2014年《勾三搭四》', duration: 0, coverUrl: '', fileName: '李志/2014年《勾三搭四》/李志 - 这个世界会好吗2013版LIVE.mp3', size: 12361143, contentType: 'audio/mpeg' },
  { id: '李志-2016-8-李志-采蘑菇的小姑娘', title: '采蘑菇的小姑娘', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 采蘑菇的小姑娘.flac', size: 14182682, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-歌声与微笑', title: '歌声与微笑', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 歌声与微笑.flac', size: 23324204, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-兰花草', title: '兰花草', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 兰花草.flac', size: 17348674, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-朋友越多越快乐', title: '朋友越多越快乐', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 朋友越多越快乐.flac', size: 16616071, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-数鸭子', title: '数鸭子', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 数鸭子.flac', size: 16562186, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-送别', title: '送别', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 送别.flac', size: 19115560, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-蜗牛与黄鹂鸟', title: '蜗牛与黄鹂鸟', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 蜗牛与黄鹂鸟.flac', size: 17764322, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-小螺号', title: '小螺号', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - 小螺号.flac', size: 20223538, contentType: 'audio/flac' },
  { id: '李志-2016-8-李志-hey-jude', title: 'Hey Jude', artist: '李志', album: '2016 8', duration: 0, coverUrl: '', fileName: '李志/2016 8/李志 - Hey Jude.flac', size: 24959160, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-春末的南方城市-2016-unplugged', title: '春末的南方城市 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/春末的南方城市 (2016 unplugged).flac', size: 51830453, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-大象-2016-unplugged', title: '大象 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/大象 (2016 unplugged).flac', size: 38388258, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-定西-2016-unplugged', title: '定西 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/定西 (2016 unplugged).flac', size: 52844443, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-关于郑州的记忆-2016-unplugged', title: '关于郑州的记忆 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/关于郑州的记忆 (2016 unplugged).flac', size: 27019478, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-杭州-2016-unplugged', title: '杭州 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/杭州 (2016 unplugged).flac', size: 25163877, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-黑色信封-2016-unplugged', title: '黑色信封 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/黑色信封 (2016 unplugged).flac', size: 31966072, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-结婚-2016-unplugged', title: '结婚 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/结婚 (2016 unplugged) .flac', size: 48322958, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-热河-2016-unplugged', title: '热河 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/热河 (2016 unplugged) .flac', size: 41253183, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-山阴路的夏天-2016-unplugged', title: '山阴路的夏天 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/山阴路的夏天 (2016 unplugged) .flac', size: 36050252, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-鼠说-2016-unplugged', title: '鼠说 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/鼠说 (2016 unplugged).flac', size: 57384310, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-鸵鸟-2016-unplugged', title: '鸵鸟 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/鸵鸟 (2016 unplugged).flac', size: 27947163, contentType: 'audio/flac' },
  { id: '李志-2016-北京不插电现场-这个世界会好吗-2016-unplugged', title: '这个世界会好吗 (2016 unplugged)', artist: '李志', album: '2016 北京不插电现场', duration: 0, coverUrl: '', fileName: '李志/2016 北京不插电现场/这个世界会好吗 (2016 unplugged).flac', size: 31677830, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-彩色派对', title: '彩色派对', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 彩色派对.flac', size: 27347306, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-克兰河', title: '克兰河', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 克兰河.flac', size: 37379786, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-你好明天', title: '你好明天', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 你好明天.flac', size: 27230224, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-哦吼', title: '哦吼', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 哦吼.flac', size: 31206361, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-死人', title: '死人', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 死人.flac', size: 21545864, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-一个夜晚', title: '一个夜晚', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 一个夜晚.flac', size: 31662797, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-一头偶像', title: '一头偶像', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 一头偶像.flac', size: 28093614, contentType: 'audio/flac' },
  { id: '李志-2016-在每一条伤心的应天大街上-李志-在每一条伤心的应天大街上', title: '在每一条伤心的应天大街上', artist: '李志', album: '2016 在每一条伤心的应天大街上', duration: 0, coverUrl: '', fileName: '李志/2016 在每一条伤心的应天大街上/李志 - 在每一条伤心的应天大街上.flac', size: 54882952, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-春末的南方城市', title: '春末的南方城市', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 春末的南方城市.flac', size: 33404364, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-大象', title: '大象', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 大象.flac', size: 49261994, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-定西', title: '定西', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 定西.flac', size: 41011634, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-杭州', title: '杭州', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 杭州.flac', size: 42936726, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-和你在一起', title: '和你在一起', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 和你在一起.flac', size: 31813474, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-黑色信封', title: '黑色信封', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 黑色信封.flac', size: 40579762, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-回答', title: '回答', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 回答.flac', size: 43304736, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-尽头', title: '尽头', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 尽头.flac', size: 29303980, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-门', title: '门', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 门.flac', size: 44768073, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-铅笔', title: '铅笔', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 铅笔.flac', size: 38769548, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-墙上的向日葵', title: '墙上的向日葵', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 墙上的向日葵.flac', size: 56561923, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-李志-序曲', title: '序曲', artist: '李志', album: '电声与管弦乐 Ⅰ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅰ/李志 - 序曲.flac', size: 35544830, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-家乡-相信未来版-李志', title: '家乡 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/家乡 (相信未来版) - 李志.flac', size: 36419195, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-你好明天-相信未来版-李志', title: '你好明天 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/你好明天 (相信未来版) - 李志.flac', size: 32598397, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-哦吼-相信未来版-李志', title: '哦吼 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/哦吼 (相信未来版) - 李志.flac', size: 36624012, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-山阴路的夏天-相信未来版-李志', title: '山阴路的夏天 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/山阴路的夏天 (相信未来版) - 李志.flac', size: 27953720, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-天空之城-相信未来版-李志', title: '天空之城 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/天空之城 (相信未来版) - 李志.flac', size: 29504013, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-相信未来序曲-乐曲-李志', title: '相信未来序曲 (乐曲)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/相信未来序曲 (乐曲) - 李志.flac', size: 32681368, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-寻找-相信未来版-李志', title: '寻找 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/寻找 (相信未来版) - 李志.flac', size: 29814396, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-一头偶像-相信未来版-李志', title: '一头偶像 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/一头偶像 (相信未来版) - 李志.flac', size: 35646035, contentType: 'audio/flac' },
  { id: '李志-电声与管弦乐-这个世界会好吗-相信未来版-李志', title: '这个世界会好吗 (相信未来版)', artist: '李志', album: '电声与管弦乐 Ⅱ', duration: 0, coverUrl: '', fileName: '李志/电声与管弦乐 Ⅱ/这个世界会好吗 (相信未来版) - 李志.flac', size: 40725097, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-地方-2015动静版', title: '地方 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/地方 (2015动静版).flac', size: 38737640, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-定西-2015动静版-李志', title: '定西 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/定西 (2015动静版) - 李志.flac', size: 28102610, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-好威武支持有希望-倒影-青春-人民不需要自由-2015动静版', title: '好威武支持有希望&倒影&青春&人民不需要自由 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/好威武支持有希望&倒影&青春&人民不需要自由 (2015动静版).flac', size: 84284155, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-和你在一起-2015动静版-李志', title: '和你在一起 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/和你在一起 (2015动静版) - 李志.flac', size: 30562404, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-忽然-2015动静版', title: '忽然（2015动静版）', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/忽然（2015动静版）.flac', size: 27205838, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-尽头-2015动静版-李志', title: '尽头 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/尽头 (2015动静版) - 李志.flac', size: 21459078, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-李志-定西-2015动静版', title: '定西 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/李志 - 定西 (2015动静版).flac', size: 28119284, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-李志-和你在一起-2015动静版', title: '和你在一起 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/李志 - 和你在一起 (2015动静版).flac', size: 30579078, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-李志-墙上的向日葵-2015动静版', title: '墙上的向日葵 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/李志 - 墙上的向日葵 (2015动静版).flac', size: 46323754, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-你的早晨-2015动静版-李志', title: '你的早晨 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/你的早晨 (2015动静版) - 李志.flac', size: 40013843, contentType: 'audio/flac' },
  { id: '李志-动静-2015-live-这个世界会好吗-2015动静版', title: '这个世界会好吗 (2015动静版)', artist: '李志', album: '动静 2015 Live', duration: 0, coverUrl: '', fileName: '李志/动静 2015 Live/这个世界会好吗 (2015动静版).flac', size: 32338892, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-1990年的春天', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 1990年的春天', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/1990年的春天.flac', size: 32930552, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-被禁忌的游戏', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 被禁忌的游戏', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/被禁忌的游戏.flac', size: 30555216, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-苍井空', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 苍井空', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/苍井空.flac', size: 28592374, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-春末的南方城市', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 春末的南方城市', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/春末的南方城市.flac', size: 23436110, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-达摩流浪者', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 达摩流浪者', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/达摩流浪者.flac', size: 20331999, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-倒影', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 倒影', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/倒影.flac', size: 22898765, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-冬妮娅', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 冬妮娅', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/冬妮娅.flac', size: 18602206, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-董卓瑶', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 董卓瑶', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/董卓瑶.flac', size: 22586163, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-广场', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 广场', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/广场.flac', size: 22795940, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-狐貍', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 狐貍', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/狐貍.flac', size: 27437901, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-虎口脱险', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 虎口脱险', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/虎口脱险.flac', size: 28538431, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-家乡', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 家乡', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/家乡.flac', size: 29495249, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-结婚', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 结婚', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/结婚.flac', size: 31133201, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-来了', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 来了', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/来了.flac', size: 40250687, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-来自我心', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 来自我心', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/来自我心.flac', size: 22701461, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-恋恋风尘', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 恋恋风尘', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/恋恋风尘.flac', size: 28863516, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-妈妈', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 妈妈', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/妈妈 .flac', size: 17203573, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-鸟语', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 鸟语', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/鸟语.flac', size: 36579597, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-青春', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 青春', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/青春.flac', size: 17698859, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-他们', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 他们', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/他们.flac', size: 26762069, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-天空之城', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 天空之城', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/天空之城 .flac', size: 22497290, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-听妈妈讲那过去的故事', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 听妈妈讲那过去的故事', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/听妈妈讲那过去的故事.flac', size: 9051440, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-陀螺', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 陀螺', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/陀螺.flac', size: 29800779, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-鸵鸟', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 鸵鸟', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/鸵鸟.flac', size: 32145239, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-信封', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 信封', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/信封.flac', size: 33125654, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-意味', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 意味', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/意味.flac', size: 14716893, contentType: 'audio/flac' },
  { id: '李志-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-二零零九年十月十六日事件-这个世界会好吗', title: '二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 二零零九年十月十六日事件 / 这个世界会好吗', artist: '李志', album: '二零零九年十月十六日事件', duration: 0, coverUrl: '', fileName: '李志/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/二零零九年十月十六日事件/这个世界会好吗.flac', size: 22540955, contentType: 'audio/flac' },
  { id: '李志-非官方-20140417李志郑州站音频文件-被禁忌的游戏', title: '20140417李志郑州站音频文件 / 被禁忌的游戏', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/被禁忌的游戏.mp3', size: 10643819, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-苍井空', title: '20140417李志郑州站音频文件 / 苍井空', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/苍井空.mp3', size: 9565739, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-春末的南方城市', title: '20140417李志郑州站音频文件 / 春末的南方城市', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/春末的南方城市.mp3', size: 16371179, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-忽然-余赣宁', title: '20140417李志郑州站音频文件 / 忽然 余赣宁', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/忽然 余赣宁.mp3', size: 6541739, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-结婚', title: '20140417李志郑州站音频文件 / 结婚', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/结婚.mp3', size: 16593899, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-喀纳斯', title: '20140417李志郑州站音频文件 / 喀纳斯', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/喀纳斯.mp3', size: 16553579, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-开场关于郑州的记忆', title: '20140417李志郑州站音频文件 / 开场关于郑州的记忆', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/开场关于郑州的记忆.mp3', size: 9184619, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-来了', title: '20140417李志郑州站音频文件 / 来了', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/来了.mp3', size: 18884459, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-妈妈', title: '20140417李志郑州站音频文件 / 妈妈', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/妈妈.mp3', size: 13788779, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-你的早晨-天空之城-和你在一起', title: '20140417李志郑州站音频文件 / 你的早晨 天空之城 和你在一起', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/你的早晨 天空之城 和你在一起.mp3', size: 27875819, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-你离开了南京从此没有人陪我说话-合唱关于郑州的记忆', title: '20140417李志郑州站音频文件 / 你离开了南京从此没有人陪我说话，合唱关于郑州的记忆', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/你离开了南京从此没有人陪我说话，合唱关于郑州的记忆.mp3', size: 18704939, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-铅笔', title: '20140417李志郑州站音频文件 / 铅笔', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/铅笔.mp3', size: 10433579, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-墙上的向日葵', title: '20140417李志郑州站音频文件 / 墙上的向日葵', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/墙上的向日葵.mp3', size: 17210219, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-人民不需要自由', title: '20140417李志郑州站音频文件 / 人民不需要自由', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/人民不需要自由.mp3', size: 8839979, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-山阴路的夏天', title: '20140417李志郑州站音频文件 / 山阴路的夏天', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/山阴路的夏天.mp3', size: 10586219, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-他们-广场', title: '20140417李志郑州站音频文件 / 他们 广场', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/他们 广场.mp3', size: 18801899, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-我们不能失去信仰-1990年的春天', title: '20140417李志郑州站音频文件 / 我们不能失去信仰 1990年的春天', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/我们不能失去信仰 1990年的春天.mp3', size: 27466859, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-寻找', title: '20140417李志郑州站音频文件 / 寻找', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/寻找.mp3', size: 7664939, contentType: 'audio/mpeg' },
  { id: '李志-非官方-20140417李志郑州站音频文件-这个世界会好吗', title: '20140417李志郑州站音频文件 / 这个世界会好吗', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/20140417李志郑州站音频文件/这个世界会好吗.mp3', size: 14144939, contentType: 'audio/mpeg' },
  { id: '李志-非官方-梵高先生live', title: '梵高先生Live', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/梵高先生Live.mp3', size: 6634408, contentType: 'audio/mpeg' },
  { id: '李志-非官方-公路之光', title: '公路之光', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/公路之光.mp3', size: 8778154, contentType: 'audio/mpeg' },
  { id: '李志-非官方-广场-live', title: '广场.Live', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/广场.Live.mp3', size: 13711538, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-10妈妈', title: '李志20150808杭州酒球会一身酒气 / 10妈妈', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/10妈妈.mp3', size: 4738950, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-11寻找', title: '李志20150808杭州酒球会一身酒气 / 11寻找', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/11寻找.mp3', size: 3237640, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-12他们', title: '李志20150808杭州酒球会一身酒气 / 12他们', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/12他们.mp3', size: 5805163, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-13广场', title: '李志20150808杭州酒球会一身酒气 / 13广场', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/13广场.mp3', size: 4993069, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-14和你在一起', title: '李志20150808杭州酒球会一身酒气 / 14和你在一起', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/14和你在一起.mp3', size: 4430913, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-15门', title: '李志20150808杭州酒球会一身酒气 / 15门', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/15门.mp3', size: 9865219, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-16结婚', title: '李志20150808杭州酒球会一身酒气 / 16结婚', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/16结婚.mp3', size: 4978858, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-17春末的南方城市', title: '李志20150808杭州酒球会一身酒气 / 17春末的南方城市', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/17春末的南方城市.mp3', size: 4155478, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-18关于郑州的记忆', title: '李志20150808杭州酒球会一身酒气 / 18关于郑州的记忆', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/18关于郑州的记忆.mp3', size: 3931452, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-19热河', title: '李志20150808杭州酒球会一身酒气 / 19热河', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/19热河.mp3', size: 7712729, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-1墙上的向日葵', title: '李志20150808杭州酒球会一身酒气 / 1墙上的向日葵', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/1墙上的向日葵.mp3', size: 6739302, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-20下雨', title: '李志20150808杭州酒球会一身酒气 / 20下雨', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/20下雨.mp3', size: 5425657, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-21杭州-倒影-天空之城', title: '李志20150808杭州酒球会一身酒气 / 21杭州&倒影&天空之城', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/21杭州&倒影&天空之城.mp3', size: 10816494, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-22来了', title: '李志20150808杭州酒球会一身酒气 / 22来了', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/22来了.mp3', size: 5316569, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-23山阴路的夏天', title: '李志20150808杭州酒球会一身酒气 / 23山阴路的夏天', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/23山阴路的夏天.mp3', size: 5324093, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-24千年等一回', title: '李志20150808杭州酒球会一身酒气 / 24千年等一回', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/24千年等一回.mp3', size: 3885477, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-25虎口脱险', title: '李志20150808杭州酒球会一身酒气 / 25虎口脱险', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/25虎口脱险.mp3', size: 4570929, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-2铅笔', title: '李志20150808杭州酒球会一身酒气 / 2铅笔', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/2铅笔.mp3', size: 5836092, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-3黑色信封', title: '李志20150808杭州酒球会一身酒气 / 3黑色信封', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/3黑色信封.mp3', size: 4720141, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-4苍井空', title: '李志20150808杭州酒球会一身酒气 / 4苍井空', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/4苍井空.mp3', size: 4963394, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-5定西', title: '李志20150808杭州酒球会一身酒气 / 5定西', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/5定西.mp3', size: 4749816, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-6大象', title: '李志20150808杭州酒球会一身酒气 / 6大象', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/6大象.mp3', size: 5089618, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-7-1990年的春天', title: '李志20150808杭州酒球会一身酒气 / 7 1990年的春天', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/7 1990年的春天.mp3', size: 5379263, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-8这个世界会好吗', title: '李志20150808杭州酒球会一身酒气 / 8这个世界会好吗', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/8这个世界会好吗.mp3', size: 5178224, contentType: 'audio/mpeg' },
  { id: '李志-非官方-李志20150808杭州酒球会一身酒气-9董卓瑶', title: '李志20150808杭州酒球会一身酒气 / 9董卓瑶', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/李志20150808杭州酒球会一身酒气/9董卓瑶.mp3', size: 4478979, contentType: 'audio/mpeg' },
  { id: '李志-非官方-鹿港小镇', title: '鹿港小镇', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/鹿港小镇.mp3', size: 3928112, contentType: 'audio/mpeg' },
  { id: '李志-非官方-山阴路的夏天live', title: '山阴路的夏天Live', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/山阴路的夏天Live.mp3', size: 5326690, contentType: 'audio/mpeg' },
  { id: '李志-非官方-新年好呀live', title: '新年好呀Live', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/新年好呀Live.mp3', size: 676967, contentType: 'audio/mpeg' },
  { id: '李志-非官方-长安县', title: '长安县', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/长安县.mp3', size: 6513760, contentType: 'audio/mpeg' },
  { id: '李志-非官方-走进新时代', title: '走进新时代', artist: '李志', album: '非官方', duration: 0, coverUrl: '', fileName: '李志/非官方/走进新时代.mp3', size: 3502305, contentType: 'audio/mpeg' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-阿兰', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 阿兰', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/阿兰.m4a', size: 7672326, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-暧昧', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 暧昧', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/暧昧.m4a', size: 6986766, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-被禁忌的游戏', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 被禁忌的游戏', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/被禁忌的游戏.m4a', size: 11513728, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-春末的南方城市', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 春末的南方城市', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/春末的南方城市.m4a', size: 7200983, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-董卓瑶', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 董卓瑶', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/董卓瑶.m4a', size: 7148926, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-和你在一起', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 和你在一起', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/和你在一起.m4a', size: 8204066, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-黑色信封', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 黑色信封', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/黑色信封.m4a', size: 10120978, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-红色气球', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 红色气球', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/红色气球.m4a', size: 7868814, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-结婚', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 结婚', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/结婚.m4a', size: 9323074, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-卡夫卡', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 卡夫卡', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/卡夫卡.m4a', size: 7315788, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-来了', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 来了', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/来了.m4a', size: 11260302, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-青春', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 青春', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/青春.m4a', size: 5288413, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-他们', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 他们', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/他们.m4a', size: 9076546, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-想起了她', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 想起了她', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/想起了她.m4a', size: 26105172, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-月亮代表我的心', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 月亮代表我的心', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/月亮代表我的心.m4a', size: 4214546, contentType: 'audio/mp4' },
  { id: '李志-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-工体东路没有人-2009-live-这个世界会好吗', title: '工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 工体东路没有人 2009 Live / 这个世界会好吗', artist: '李志', album: '工体东路没有人 2009 Live', duration: 0, coverUrl: '', fileName: '李志/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/工体东路没有人 2009 Live/这个世界会好吗.m4a', size: 9053709, contentType: 'audio/mp4' },
  { id: '李志-爵士与不插电新编12首-爱-相信未来版-李志', title: '爱 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/爱 (相信未来版)-李志.flac', size: 27477243, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-董卓瑶-相信未来版-李志', title: '董卓瑶 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/董卓瑶 (相信未来版)-李志.flac', size: 30957665, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-关于郑州的记忆-相信未来版-李志', title: '关于郑州的记忆 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/关于郑州的记忆 (相信未来版)-李志.flac', size: 71655230, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-卡夫卡-相信未来版-李志', title: '卡夫卡 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/卡夫卡 (相信未来版)-李志.flac', size: 61774140, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-看见-相信未来版-李志', title: '看见 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/看见 (相信未来版)-李志.flac', size: 49990301, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-离婚-相信未来版-李志', title: '离婚 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/离婚 (相信未来版)-李志.flac', size: 59480713, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-热河-相信未来版-李志', title: '热河 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/热河 (相信未来版)-李志.flac', size: 97827587, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-鼠说-相信未来版-李志', title: '鼠说 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/鼠说 (相信未来版)-李志.flac', size: 55398991, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-死人-相信未来版-李志', title: '死人 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/死人 (相信未来版)-李志.flac', size: 25864662, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-鸵鸟-相信未来版-李志', title: '鸵鸟 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/鸵鸟 (相信未来版)-李志.flac', size: 53198078, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-翁庆年的六英镑-相信未来版-李志', title: '翁庆年的六英镑 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/翁庆年的六英镑 (相信未来版)-李志.flac', size: 37762239, contentType: 'audio/flac' },
  { id: '李志-爵士与不插电新编12首-一个夜晚-相信未来版-李志', title: '一个夜晚 (相信未来版)-李志', artist: '李志', album: '爵士与不插电新编12首', duration: 0, coverUrl: '', fileName: '李志/爵士与不插电新编12首/一个夜晚 (相信未来版)-李志.flac', size: 36412974, contentType: 'audio/flac' },
  { id: '李志-看见-2015-live-李志-苍井空-2015现场版', title: '苍井空 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 苍井空 2015现场版.mp3', size: 12610247, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-春末的南方城市-2015现场版', title: '春末的南方城市 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 春末的南方城市 2015现场版.mp3', size: 10214328, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-董卓瑶-2015现场版', title: '董卓瑶 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 董卓瑶 2015现场版.mp3', size: 11462949, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-梵高先生-2015伴奏版', title: '梵高先生 2015伴奏版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 梵高先生 2015伴奏版.mp3', size: 6973077, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-黑色信封-2015现场版', title: '黑色信封 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 黑色信封 2015现场版.mp3', size: 11996894, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-看见-2015现场版', title: '看见 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 看见 2015现场版.mp3', size: 5907225, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-离婚-2015现场版', title: '离婚 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 离婚 2015现场版.mp3', size: 11874637, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-你离开了南京-从此没有人和我说话-2015现场版', title: '你离开了南京，从此没有人和我说话 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 你离开了南京，从此没有人和我说话 2015现场版.mp3', size: 5293942, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-李志-热河-2015现场版', title: '热河 2015现场版', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/李志 - 热河 2015现场版.mp3', size: 19688384, contentType: 'audio/mpeg' },
  { id: '李志-看见-2015-live-下雨-看见live', title: '下雨（看见Live）', artist: '李志', album: '看见 2015 Live', duration: 0, coverUrl: '', fileName: '李志/看见 2015 Live/下雨（看见Live）.mp3', size: 13619596, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-被禁忌的游戏', title: '被禁忌的游戏', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/被禁忌的游戏.flac', size: 24958756, contentType: 'audio/flac' },
  { id: '李志-洗心革面-2019跨年音乐会-梵高先生-玩偶之主录音棚', title: '梵高先生 - 玩偶之主录音棚', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/梵高先生 - 玩偶之主录音棚.flac', size: 10127298, contentType: 'audio/flac' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-被禁忌的游戏-洗心革面版', title: '被禁忌的游戏（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 被禁忌的游戏（洗心革面版）.mp3', size: 13621653, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-大象-洗心革面版', title: '大象（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 大象（洗心革面版）.mp3', size: 15202270, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-倒影-洗心革面版', title: '倒影（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 倒影（洗心革面版）.mp3', size: 12056695, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-定西-洗心革面版', title: '定西（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 定西（洗心革面版）.mp3', size: 11949163, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-董卓瑶-春末的南方城市-洗心革面版', title: '董卓瑶&春末的南方城市（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 董卓瑶&春末的南方城市（洗心革面版）.mp3', size: 21065378, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-方式-洗心革面版', title: '方式（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 方式（洗心革面版）.mp3', size: 10888461, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-关于郑州的回忆-洗心革面版', title: '关于郑州的回忆（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 关于郑州的回忆（洗心革面版）.mp3', size: 15541570, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-和你在一起-洗心革面版', title: '和你在一起（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 和你在一起（洗心革面版）.mp3', size: 10784061, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-黑色信封-洗心革面版', title: '黑色信封（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 黑色信封（洗心革面版）.mp3', size: 11361393, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-结婚-洗心革面版', title: '结婚（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 结婚（洗心革面版）.mp3', size: 18295738, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-尽头-来了-洗心革面版', title: '尽头&来了（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 尽头&来了（洗心革面版）.mp3', size: 20843006, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-路-洗心革面版', title: '路（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 路（洗心革面版）.mp3', size: 9033273, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-门-洗心革面版', title: '门（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 门（洗心革面版）.mp3', size: 17166038, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-你好明天-不多-杭州-洗心革面版', title: '你好明天&不多&杭州（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 你好明天&不多&杭州（洗心革面版）.mp3', size: 30637814, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-你离开了南京-从此没有人和我说话-洗心革面版', title: '你离开了南京，从此没有人和我说话（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 你离开了南京，从此没有人和我说话（洗心革面版）.mp3', size: 7796133, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-哦吼-洗心革面版', title: '哦吼（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 哦吼（洗心革面版）.mp3', size: 13450437, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-墙上的向日葵-洗心革面版', title: '墙上的向日葵（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 墙上的向日葵（洗心革面版）.mp3', size: 20551728, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-山阴路的夏天-洗心革面版', title: '山阴路的夏天（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 山阴路的夏天（洗心革面版）.mp3', size: 16630466, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-死人-洗心革面版', title: '死人（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 死人（洗心革面版）.mp3', size: 14653126, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-天空之城-洗心革面版', title: '天空之城（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 天空之城（洗心革面版）.mp3', size: 9212841, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-鸵鸟-洗心革面版', title: '鸵鸟（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 鸵鸟（洗心革面版）.mp3', size: 18978418, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-寻找-忽然-热河-洗心革面版', title: '寻找&忽然&热河（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 寻找&忽然&热河（洗心革面版）.mp3', size: 32944010, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-一个夜晚-洗心革面版', title: '一个夜晚（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 一个夜晚（洗心革面版）.mp3', size: 17347691, contentType: 'audio/mpeg' },
  { id: '李志-洗心革面-2019跨年音乐会-李志-这个世界会好吗-洗心革面版', title: '这个世界会好吗（洗心革面版）', artist: '李志', album: '洗心革面 - 2019跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/洗心革面 - 2019跨年音乐会/李志 - 这个世界会好吗（洗心革面版）.mp3', size: 8060263, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-01-intro', title: 'Intro', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/01.Intro.mp3', size: 2892307, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-02-杭州', title: '杭州', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/02.杭州.mp3', size: 10118221, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-03-关于郑州的记忆', title: '关于郑州的记忆', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/03.关于郑州的记忆.mp3', size: 9514391, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-04-墙上的向日葵', title: '墙上的向日葵', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/04.墙上的向日葵.mp3', size: 20917269, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-05-黑色信封', title: '黑色信封', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/05.黑色信封.mp3', size: 12666065, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-06-春末的南方城市', title: '春末的南方城市', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/06.春末的南方城市.mp3', size: 10754711, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-07-被禁忌的游戏', title: '被禁忌的游戏', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/07.被禁忌的游戏.mp3', size: 16333269, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-08-铅笔', title: '铅笔', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/08.铅笔.mp3', size: 15751501, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-09-来了', title: '来了', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/09.来了.mp3', size: 12528781, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-10-我们是比较慢热的-talking', title: '我们是比较慢热的（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/10.我们是比较慢热的（Talking）.mp3', size: 4347691, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-12-苍井空', title: '苍井空', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/12.苍井空.mp3', size: 13709583, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-13-寻找', title: '寻找', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/13.寻找.mp3', size: 11727181, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-14-我们试试看-好吧-talking', title: '我们试试看，好吧（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/14.我们试试看，好吧（Talking）.mp3', size: 6606571, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-15-1990年的春天', title: '1990年的春天', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/15.1990年的春天.mp3', size: 13831513, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-16-你的早晨', title: '你的早晨', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/16.你的早晨.mp3', size: 11374865, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-17-他们', title: '他们', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/17.他们.mp3', size: 8974861, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-18-广场', title: '广场', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/18.广场.mp3', size: 11685901, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-19-这个世界会好吗', title: '这个世界会好吗', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/19.这个世界会好吗.mp3', size: 11875991, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-20-妈妈', title: '妈妈', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/20.妈妈.mp3', size: 13625101, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-21-坦白说到现在为止我们没有去年演得好但是我可以再努力嘛-talking', title: '坦白说到现在为止我们没有去年演得好但是我可以再努力嘛（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/21.坦白说到现在为止我们没有去年演得好但是我可以再努力嘛（Talking）.mp3', size: 8939407, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-22-大象', title: '大象', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/22.大象.mp3', size: 13939021, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-23-鼠说', title: '鼠说', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/23.鼠说.mp3', size: 13430221, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-24-定西', title: '定西', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/24.定西.mp3', size: 15725581, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-25-看见', title: '看见', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/25.看见.mp3', size: 11239501, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-26-不多', title: '不多', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/26.不多.mp3', size: 11759821, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-27-方式', title: '方式', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/27.方式.mp3', size: 11988301, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-28-热河', title: '热河', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/28.热河.mp3', size: 21003661, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-29-不知不觉-talking', title: '不知不觉（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/29.不知不觉（Talking）.mp3', size: 2526563, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-30-确定是谁的时候就尖叫一下吧-talking', title: '确定是谁的时候就尖叫一下吧（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/30.确定是谁的时候就尖叫一下吧（Talking）.mp3', size: 14943219, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-31-傲慢的上校-朴树', title: '傲慢的上校（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/31.傲慢的上校（朴树）.mp3', size: 12964633, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-32-radio-in-my-head-朴树', title: 'Radio In My Head（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/32.Radio In My Head（朴树）.mp3', size: 9908015, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-33-colorful-days-朴树', title: 'Colorful Days（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/33.Colorful Days（朴树）.mp3', size: 10525289, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-34-可能一直会跟李志在一块儿混-朴树-talking', title: '可能一直会跟李志在一块儿混（朴树 Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/34.可能一直会跟李志在一块儿混（朴树 Talking）.mp3', size: 7782585, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-35-白桦林-朴树', title: '白桦林（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/35.白桦林（朴树）.mp3', size: 11160789, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-36-那些花儿-朴树', title: '那些花儿（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/36.那些花儿（朴树）.mp3', size: 14416151, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-37-旅途-朴树', title: '旅途（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/37.旅途（朴树）.mp3', size: 12019027, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-38-我去2000年-朴树', title: '我去2000年（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/38.我去2000年（朴树）.mp3', size: 14112797, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-39-生如夏花', title: '生如夏花', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/39.生如夏花.mp3', size: 13684623, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-40-平凡之路-朴树', title: '平凡之路（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/40.平凡之路（朴树）.mp3', size: 13620311, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-41-在希望的田野上-朴树', title: '在希望的田野上（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/41.在希望的田野上（朴树）.mp3', size: 16953437, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-42-别-千万别-法语版-朴树', title: '别，千万别 法语版（朴树）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/42.别，千万别 法语版（朴树）.mp3', size: 23226083, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-43-我-现在可以-正儿八经地-正大光明地-搞摇滚乐了-talking', title: '我，现在可以，正儿八经地，正大光明地，搞摇滚乐了（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/43.我，现在可以，正儿八经地，正大光明地，搞摇滚乐了（Talking）.mp3', size: 14597643, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-44-和你在一起', title: '和你在一起', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/44.和你在一起.mp3', size: 10603987, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-45-离婚', title: '离婚', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/45.离婚.mp3', size: 12787021, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-46-秋天的老狼', title: '秋天的老狼', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/46.秋天的老狼.mp3', size: 18379987, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-47-鸵鸟', title: '鸵鸟', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/47.鸵鸟.mp3', size: 9460621, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-48-天空之城-我们不能失去信仰', title: '天空之城&我们不能失去信仰', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/48.天空之城&我们不能失去信仰.mp3', size: 16864163, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-49-意味', title: '意味', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/49.意味.mp3', size: 13342861, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-50-山阴路的夏天', title: '山阴路的夏天', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/50.山阴路的夏天.mp3', size: 13664469, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-51-你离开了南京-从此没有人和我说话', title: '你离开了南京，从此没有人和我说话', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/51.你离开了南京，从此没有人和我说话.mp3', size: 6925289, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-52-致谢-谢幕-talking', title: '致谢&谢幕（Talking）', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/52.致谢&谢幕（Talking）.mp3', size: 22913125, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-01-杭州', title: '专辑版 / 01 杭州', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/01 杭州.mp3', size: 10733067, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-02-墙上的向日葵', title: '专辑版 / 02 墙上的向日葵', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/02 墙上的向日葵.mp3', size: 20118349, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-03-铅笔', title: '专辑版 / 03 铅笔', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/03 铅笔.mp3', size: 15797688, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-04-来了', title: '专辑版 / 04 来了', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/04 来了.mp3', size: 12269067, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-05-下雨-董卓瑶-忽然', title: '专辑版 / 05 下雨 & 董卓瑶 & 忽然', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/05 下雨 & 董卓瑶 & 忽然.mp3', size: 13712960, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-06-这个世界会好吗', title: '专辑版 / 06 这个世界会好吗', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/06 这个世界会好吗.mp3', size: 11445698, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-07-妈妈', title: '专辑版 / 07 妈妈', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/07 妈妈.mp3', size: 12765394, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-08-定西', title: '专辑版 / 08 定西', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/08 定西.mp3', size: 12891826, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-09-方式', title: '专辑版 / 09 方式', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/09 方式.mp3', size: 11285818, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-10-鸵鸟-天空之城-我们不能失去信仰', title: '专辑版 / 10 鸵鸟 & 天空之城 & 我们不能失去信仰', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/10 鸵鸟 & 天空之城 & 我们不能失去信仰.mp3', size: 25073277, contentType: 'audio/mpeg' },
  { id: '李志-io-2014-2015-跨年音乐会-专辑版-11-山阴路的夏天', title: '专辑版 / 11 山阴路的夏天', artist: '李志', album: 'IO 2014-2015 跨年音乐会', duration: 0, coverUrl: '', fileName: '李志/IO 2014-2015 跨年音乐会/专辑版/11 山阴路的夏天.mp3', size: 13355769, contentType: 'audio/mpeg' },
];

// ═══════════════════════════════════════════════════════
//  App Controller
// ═══════════════════════════════════════════════════════

export class App {
  #platform;
  #api;
  #playlist;
  #player;
  #shortcuts;
  #gestures;
  #visualizer = new Visualizer();
  #streamCache = new Map();

  constructor() {
    this.#platform = Platform;
    this.#api = new API('');
    this.#playlist = new PlaylistManager();
    this.#player = new Player();

    this.#playlist.onSongsLoaded = (songs) => this.renderPlaylists(songs);
    this.#playlist.onFilterChange = (songs, filter) => this.renderPlaylists(songs);
    this.#playlist.onFavoriteChange = (id, isFav) => this.updateFavoriteUI(id, isFav);

    this.#player.onPlayStateChange = (playing) => this.updatePlayButtons(playing);
    this.#player.onTimeUpdate = (current, total) => this.updateProgress(current, total);
    this.#player.onSongChange = (song) => this.onSongChanged(song);
    this.#player.onLoaded = (duration) => this.onSongLoaded(duration);
    this.#player.onError = (err) => this.showToast(err);

    document.addEventListener('songended', () => this.playNext());
    document.addEventListener('play-song', (e) => {
      const detail = e.detail;
      this.playSong(detail.songId);
    });
    document.addEventListener('play-next', () => this.playNext());
    document.addEventListener('play-prev', () => this.playPrev());
  }

  async init() {
    Platform.init();
    this.#playlist.setSongs(SONGS_MANIFEST);

    if (this.#platform.isDesktop) {
      this.initDesktop();
    } else if (this.#platform.isIOS) {
      this.initIOS();
    }

    this.setupGlobalListeners();
    this.registerServiceWorker();
    console.log(`🎵 MyMusic v1.0 ready — ${SONGS_MANIFEST.length} songs — platform: ${this.#platform.type}`);
  }

  // ═══════════════════════════════════════════════════
  //  Desktop Initialization
  // ═══════════════════════════════════════════════════

  initDesktop() {
    const desktop = document.getElementById('app-desktop');
    const ios = document.getElementById('app-ios');
    desktop?.classList.add('visible');
    ios?.classList.add('hidden');

    const searchInput = document.getElementById('search-desktop');
    this.#shortcuts = new ShortcutHandler(this.#player, this.#playlist);
    this.#shortcuts.init(searchInput);

    const visCanvas = document.getElementById('visualizer-desktop');
    if (visCanvas) {
      this.#visualizer.init(visCanvas);
    }

    searchInput?.addEventListener('input', (e) => {
      const target = e.target;
      this.#playlist.setSearchQuery(target.value);
    });

    this.bindDesktopControls();
    this.bindPlaylistEvents();
    this.renderAlbumList();

    document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-queue')?.addEventListener('click', () => {
      this.renderQueue();
      document.getElementById('queue-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-queue')?.addEventListener('click', () => {
      document.getElementById('queue-modal')?.classList.add('hidden');
    });

    document.getElementById('queue-backdrop')?.addEventListener('click', () => {
      document.getElementById('queue-modal')?.classList.add('hidden');
    });

    this.bindContextMenu();

    document.querySelectorAll('.modal-backdrop').forEach((bg) => {
      bg.addEventListener('click', () => {
        bg.closest('.modal')?.classList.add('hidden');
      });
    });
  }

  // ═══════════════════════════════════════════════════
  //  Album List
  // ═══════════════════════════════════════════════════

  renderAlbumList() {
    const container = document.getElementById('album-list');
    if (!container) return;

    const albums = this.#playlist.getAlbums();
    container.innerHTML = albums.map(album => {
      const initial = album.name.charAt(0).toUpperCase();
      return `
        <a href="#" class="album-item" data-album="${this.escapeHtml(album.name)}">
          <div class="album-item-icon">${initial}</div>
          <div class="album-item-info">
            <div class="album-item-name">${this.escapeHtml(album.name)}</div>
          </div>
          <div class="album-item-count">${album.songs.length} 首</div>
        </a>
      `;
    }).join('');

    container.querySelectorAll('.album-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const albumName = item.dataset.album;
        this.#playlist.setAlbumFilter(albumName);
        this.updateAlbumListActive(item);
        this.updatePlaylistTitle(albumName);
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      });
    });
  }

  updateAlbumListActive(activeItem) {
    document.querySelectorAll('.album-item').forEach(item => {
      item.classList.remove('active');
    });
    activeItem?.classList.add('active');
  }

  updatePlaylistTitle(title) {
    const titleEl = document.getElementById('playlist-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  // ═══════════════════════════════════════════════════
  //  iOS Initialization
  // ═══════════════════════════════════════════════════

  initIOS() {
    const desktop = document.getElementById('app-desktop');
    const ios = document.getElementById('app-ios');
    desktop?.classList.add('hidden');
    ios?.classList.remove('hidden');

    this.#gestures = new GestureHandler(this.#player, this.#playlist);
    this.#gestures.init();

    document.getElementById('btn-ios-search')?.addEventListener('click', () => {
      document.getElementById('ios-search-bar')?.classList.remove('hidden');
      const input = document.getElementById('search-ios');
      input?.focus();
    });

    document.getElementById('btn-ios-search-cancel')?.addEventListener('click', () => {
      document.getElementById('ios-search-bar')?.classList.add('hidden');
      const input = document.getElementById('search-ios');
      if (input) {
        input.value = '';
        this.#playlist.setSearchQuery('');
      }
    });

    const searchInput = document.getElementById('search-ios');
    searchInput?.addEventListener('input', (e) => {
      const target = e.target;
      this.#playlist.setSearchQuery(target.value);
    });

    document.querySelectorAll('.ios-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ios-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        this.#playlist.setFilter(filter);
      });
    });

    document.getElementById('btn-play-mini')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#player.toggle();
    });

    document.getElementById('btn-next-mini')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playNext();
    });

    document.getElementById('btn-play-ios')?.addEventListener('click', () => this.#player.toggle());
    document.getElementById('btn-prev-ios')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-next-ios')?.addEventListener('click', () => this.playNext());

    document.getElementById('btn-ios-collapse')?.addEventListener('click', () => {
      this.#gestures['collapseFullPlayer']?.();
    });

    document.getElementById('btn-fav-ios')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    document.getElementById('btn-ios-action-cancel')?.addEventListener('click', () => {
      document.getElementById('ios-action-sheet')?.classList.add('hidden');
    });

    document.getElementById('ios-action-backdrop')?.addEventListener('click', () => {
      document.getElementById('ios-action-sheet')?.classList.add('hidden');
    });
  }

  // ═══════════════════════════════════════════════════
  //  Playback
  // ═══════════════════════════════════════════════════

  async playSong(songId) {
    const song = this.#playlist.getSongById(songId);
    if (!song) return;

    this.#playlist.currentSongId = songId;

    if (this.#playlist.queue.length === 0) {
      this.#playlist.setQueue(this.#playlist.filteredSongs);
    }

    try {
      let streamData = this.#streamCache.get(songId);
      if (!streamData || Date.now() > streamData.expiresAt) {
        streamData = await this.#api.getStreamUrl(songId);
        this.#streamCache.set(songId, streamData);
      }
      await this.#player.loadAndPlay(song, streamData.url);
    } catch (err) {
      console.error('Failed to get stream URL:', err);
      this.showToast('无法获取播放链接');
    }

    this.updateActiveSong(songId);
  }

  playNext() {
    const current = this.#player.currentSong;
    if (!current) return;

    const next = this.#playlist.getNextSong(current.id);
    if (next) {
      this.playSong(next.id);
    } else if (this.#player.repeatMode === 'all') {
      const first = this.#playlist.queue[0];
      if (first) this.playSong(first.id);
    }
  }

  playPrev() {
    const current = this.#player.currentSong;
    if (!current) return;

    if (this.#player.audio.currentTime > 3) {
      this.#player.seek(0);
      return;
    }

    const prev = this.#playlist.getPrevSong(current.id);
    if (prev) {
      this.playSong(prev.id);
    }
  }

  // ═══════════════════════════════════════════════════
  //  UI Rendering
  // ═══════════════════════════════════════════════════

  renderPlaylists(songs) {
    this.#playlist.setQueue(songs);

    const desktopList = document.getElementById('playlist-desktop');
    if (desktopList) {
      desktopList.innerHTML = songs.map((song, i) => this.renderDesktopItem(song, i)).join('');
      document.getElementById('playlist-empty-desktop')?.classList.add('hidden');
    }

    const iosList = document.getElementById('playlist-ios');
    if (iosList) {
      iosList.innerHTML = songs.map((song, i) => this.renderIOSItem(song, i)).join('');
      document.getElementById('ios-list-empty')?.classList.add('hidden');
    }

    document.getElementById('song-count').textContent = `${songs.length} 首`;

    if (this.#playlist.currentFilter !== 'album') {
      document.querySelectorAll('.album-item').forEach(item => item.classList.remove('active'));
    }
  }

  renderDesktopItem(song, index) {
    const isActive = song.id === this.#playlist.currentSongId;
    const isFav = this.#playlist.isFavorite(song.id);
    const duration = formatTime(song.duration || 0);

    return `
      <div class="playlist-item ${isActive ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${index}">
        <div class="item-index">
          <span class="item-index-num">${index + 1}</span>
          <svg class="item-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-album">${this.escapeHtml(song.album || '')}</div>
        <div class="item-duration">${duration}</div>
        <div class="item-actions">
          <button class="item-action-btn btn-fav ${isFav ? 'favorited' : ''}"
                  data-action="favorite" data-song-id="${song.id}"
                  title="${isFav ? '取消收藏' : '收藏'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderIOSItem(song, index) {
    const isActive = song.id === this.#playlist.currentSongId;
    const isFav = this.#playlist.isFavorite(song.id);
    const duration = formatTime(song.duration || 0);

    return `
      <div class="playlist-item ${isActive ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${index}">
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-duration">${duration}</div>
        <div class="item-actions">
          <button class="item-action-btn btn-fav ${isFav ? 'favorited' : ''}"
                  data-action="favorite" data-song-id="${song.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="item-action-btn" data-action="more" data-song-id="${song.id}" title="更多">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  UI Updates
  // ═══════════════════════════════════════════════════

  updatePlayButtons(playing) {
    const playIconClass = playing ? 'icon-pause' : 'icon-play';
    const pauseIconClass = playing ? 'icon-play' : 'icon-pause';

    document.querySelectorAll('#btn-play-desktop .icon-play, #btn-play-desktop .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-bar .icon-play, #btn-play-bar .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-mini .icon-play, #btn-play-mini .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-ios .icon-play, #btn-play-ios .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });
  }

  updateProgress(current, total) {
    const percent = total > 0 ? (current / total) * 100 : 0;
    const currentStr = formatTime(current);
    const totalStr = formatTime(total);

    this.setProgress('np-progress-fill', percent);
    this.setProgress('bar-progress-fill', percent);
    this.setProgress('ios-progress-fill', percent);

    document.getElementById('np-time-current').textContent = currentStr;
    document.getElementById('np-time-total').textContent = totalStr;
    document.getElementById('bar-time-current').textContent = currentStr;
    document.getElementById('bar-time-total').textContent = totalStr;
    document.getElementById('ios-time-current').textContent = currentStr;
    document.getElementById('ios-time-total').textContent = totalStr;

    const miniFill = document.getElementById('ios-mini-progress');
    if (miniFill) {
      const fill = document.createElement('div');
      fill.className = 'ios-mini-progress-fill';
      fill.style.width = `${percent}%`;
      miniFill.innerHTML = '';
      miniFill.appendChild(fill);
    }

    if (this.#player.currentSong) {
      document.title = `${this.#player.currentSong.title} — ${this.#player.currentSong.artist} | MyMusic`;
    }

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: total,
          playbackRate: this.#player.audio.playbackRate,
          position: current,
        });
      } catch { /* ignore */ }
    }
  }

  setProgress(elementId, percent) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.width = `${percent}%`;
    }
  }

  onSongChanged(song) {
    if (!song) return;

    document.getElementById('np-title').textContent = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    document.getElementById('np-cover').src = song.coverUrl || '/icon-512.png';

    document.getElementById('bar-title').textContent = song.title;
    document.getElementById('bar-artist').textContent = song.artist;
    document.getElementById('bar-cover').src = song.coverUrl || '/icon-192.png';

    document.getElementById('ios-full-title').textContent = song.title;
    document.getElementById('ios-full-artist').textContent = song.artist;
    document.getElementById('ios-full-cover').src = song.coverUrl || '/icon-512.png';
    document.getElementById('ios-full-source').textContent = this.#platform.isIOS ? '本地音乐' : 'Cloudflare + B2';

    document.getElementById('ios-mini-title').textContent = song.title;
    document.getElementById('ios-mini-artist').textContent = song.artist;
    document.getElementById('ios-mini-cover').src = song.coverUrl || '/icon-192.png';

    const fullBg = document.getElementById('ios-full-bg');
    if (fullBg && song.coverUrl) {
      fullBg.style.backgroundImage = `url(${song.coverUrl})`;
    }

    document.getElementById('np-placeholder')?.classList.add('hidden');
    document.getElementById('np-active')?.classList.remove('hidden');
    document.getElementById('ios-mini-player')?.classList.remove('hidden');

    this.#visualizer.connect(this.#player.audio);
    this.#visualizer.start();

    this.setupMediaSession(song);
    this.updateActiveSong(song.id);
  }

  onSongLoaded(duration) {
    if (this.#player.currentSong) {
      this.#player.currentSong.duration = duration;
    }
  }

  updateActiveSong(songId) {
    document.querySelectorAll('.playlist-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.songId === songId);
    });
  }

  updateFavoriteUI(songId, isFav) {
    document.querySelectorAll(`.item-action-btn[data-song-id="${songId}"]`).forEach((btn) => {
      if ((btn).dataset.action === 'favorite') {
        btn.classList.toggle('favorited', isFav);
        const svg = btn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════
  //  Media Session
  // ═══════════════════════════════════════════════════

  setupMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'MyMusic',
        artwork: [
          { src: song.coverUrl || '/icon-192.png', sizes: '96x96', type: 'image/png' },
          { src: song.coverUrl || '/icon-512.png', sizes: '256x256', type: 'image/png' },
          { src: song.coverUrl || '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => this.#player.play());
      navigator.mediaSession.setActionHandler('pause', () => this.#player.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        this.#player.seek(details.seekTime);
      });
    } catch { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════
  //  Desktop Controls Binding
  // ═══════════════════════════════════════════════════

  bindDesktopControls() {
    document.getElementById('btn-play-desktop')?.addEventListener('click', () => this.#player.toggle());
    document.getElementById('btn-play-bar')?.addEventListener('click', () => this.#player.toggle());

    document.getElementById('btn-prev-desktop')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-prev-bar')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-next-desktop')?.addEventListener('click', () => this.playNext());
    document.getElementById('btn-next-bar')?.addEventListener('click', () => this.playNext());

    document.getElementById('btn-shuffle')?.addEventListener('click', (e) => {
      const on = this.#player.toggleShuffle();
      e.currentTarget.classList.toggle('active', on);
    });

    document.getElementById('btn-repeat')?.addEventListener('click', (e) => {
      const mode = this.#player.cycleRepeat();
      const el = e.currentTarget;
      el.classList.toggle('active', mode !== 'none');
      if (mode === 'one') {
        el.setAttribute('title', '单曲循环');
      } else if (mode === 'all') {
        el.setAttribute('title', '列表循环');
      } else {
        el.setAttribute('title', '不循环');
      }
    });

    document.getElementById('btn-fav-desktop')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    document.getElementById('btn-fav-bar')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    const volSlider = document.getElementById('volume-slider-desktop');
    const volSliderBar = document.getElementById('volume-slider-bar');

    volSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      this.#player.setVolume(val);
      if (volSliderBar) volSliderBar.value = e.target.value;
    });

    volSliderBar?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      this.#player.setVolume(val);
      if (volSlider) volSlider.value = e.target.value;
    });

    document.getElementById('btn-volume-desktop')?.addEventListener('click', () => this.#player.toggleMute());
    document.getElementById('btn-volume-bar')?.addEventListener('click', () => this.#player.toggleMute());

    this.bindProgressBar('np-progress-bar');
    this.bindProgressBar('bar-progress-bar');

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        const filter = item.dataset.filter;
        this.#playlist.setFilter(filter);
        document.getElementById('playlist-title').textContent =
          filter === 'favorites' ? '我的收藏' : '全部歌曲';
        document.querySelectorAll('.album-item').forEach(a => a.classList.remove('active'));
      });
    });
  }

  bindContextMenu() {
    const desktopList = document.getElementById('playlist-desktop');
    if (!desktopList) return;

    desktopList.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const item = e.target.closest('.playlist-item');
      if (!item) return;
      this.showContextMenu(e.clientX, e.clientY, item.dataset.songId || '');
    });
  }

  bindProgressBar(elementId) {
    const bar = document.getElementById(elementId);
    if (!bar) return;

    let isDragging = false;

    const seek = (e) => {
      const rect = bar.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
      const duration = this.#player.audio.duration || 0;
      this.#player.seek(pct * duration);
    };

    bar.addEventListener('mousedown', (e) => {
      isDragging = true;
      seek(e);
    });

    bar.addEventListener('touchstart', (e) => {
      isDragging = true;
      seek(e);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) seek(e);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) seek(e);
    }, { passive: true });

    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });
  }

  // ═══════════════════════════════════════════════════
  //  Playlist Event Binding
  // ═══════════════════════════════════════════════════

  bindPlaylistEvents() {
    const desktopList = document.getElementById('playlist-desktop');

    desktopList?.addEventListener('click', (e) => {
      const btn = e.target.closest('.item-action-btn');
      if (btn) {
        e.stopPropagation();
        const action = btn.dataset.action;
        const songId = btn.dataset.songId;
        if (action === 'favorite' && songId) {
          this.#playlist.toggleFavorite(songId);
        }
        return;
      }

      const item = e.target.closest('.playlist-item');
      if (item) {
        const songId = item.dataset.songId;
        if (songId) this.playSong(songId);
      }
    });

    desktopList?.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.playlist-item');
      if (item) {
        const songId = item.dataset.songId;
        if (songId) this.playSong(songId);
      }
    });

    desktopList?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const item = e.target.closest('.playlist-item');
      if (!item) return;
      this.showContextMenu(e.clientX, e.clientY, item.dataset.songId || '');
    });
  }

  showContextMenu(x, y, songId) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 8}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 8}px`;
      }
    });

    menu.querySelectorAll('.ctx-item').forEach((item) => {
      item.onclick = () => {
        const action = item.dataset.action;
        this.handleContextAction(action, songId);
        menu.classList.add('hidden');
      };
    });

    const close = () => {
      menu.classList.add('hidden');
      document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  handleContextAction(action, songId) {
    switch (action) {
      case 'play':
        this.playSong(songId);
        break;
      case 'play-next':
        const current = this.#player.currentSong;
        if (current) {
          const song = this.#playlist.getSongById(songId);
          if (song) {
            const idx = this.#playlist.queue.findIndex((s) => s.id === current.id);
            this.#playlist.queue.splice(idx + 1, 0, song);
            this.showToast('已添加到下一首播放');
          }
        }
        break;
      case 'favorite':
        this.#playlist.toggleFavorite(songId);
        break;
      case 'copy-name':
        const song = this.#playlist.getSongById(songId);
        if (song) {
          navigator.clipboard.writeText(song.fileName).then(() => {
            this.showToast('已复制文件名');
          });
        }
        break;
    }
  }

  renderQueue() {
    const list = document.getElementById('queue-list');
    if (!list) return;

    const currentIdx = this.#playlist.queue.findIndex((s) => s.id === this.#player.currentSong?.id);

    list.innerHTML = this.#playlist.queue.map((song, i) => `
      <div class="playlist-item ${i === currentIdx ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${i}">
        <div class="item-index">
          <span class="item-index-num">${i + 1}</span>
        </div>
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-duration">${formatTime(song.duration || 0)}</div>
      </div>
    `).join('');
  }

  // ═══════════════════════════════════════════════════
  //  Global Listeners
  // ═══════════════════════════════════════════════════

  setupGlobalListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#player.isPlaying) {
        // Page hidden, keep playing
      }
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }

  // ═══════════════════════════════════════════════════
  //  Toast Notifications
  // ═══════════════════════════════════════════════════

  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // ═══════════════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════════════

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ═══════════════════════════════════════════════════════
//  Bootstrap
// ═══════════════════════════════════════════════════════

const app = new App();
app.init().catch(console.error);
