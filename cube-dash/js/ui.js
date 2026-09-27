// ─────────────────────────────────────────────────────────────
// CUBE DASH — every DOM screen, popup and ceremony (G.ui)
//
//   ui.update(rdt)               per frame: menu navigation, counters, cascades, popup queue
//   ui.go(screen, params)        'title'|'home'|'map'|'heroes'|'road'|'missions'|'shop'|'capsule'
//                                |'dex'|'achievements'|'modes'|'settings'|'parent'
//   ui.showLevelUp(choices)      level-up cards (run is frozen; calls G.run.chooseCard(id))
//   ui.showPause() / hidePause()
//   ui.showResults(results, rewards)   结算 cascade
//   ui.toast(text, icon)
//   ui.refresh()                 re-render after a language change
//   extras other modules may call: ui.queueClaim(rewards, source), ui.showFeature(feature),
//   ui.showRankUp(rank), ui.showRescue(heroId), ui.showBreak(kind), ui.showGoodnight(),
//   ui.showShare(opts)
//
// Visual language = the poster: chunky white / sky-blue panels, thick white
// lettering with a deep-blue outline, blue pill banners, keycap hints.
// All styles live in css/style.css. Menus work with mouse, touch, keyboard
// and gamepad (G.input.pressed('up'|'down'|'left'|'right'|'confirm'|'back')).
// ─────────────────────────────────────────────────────────────
import { clamp, lerp, easeOutCubic, dayKey, fmtInt, makeRng } from './core.js';
import { addStrings, t, tl, getLang } from './i18n.js';
import { DATA, heroById, cardById } from './data.js';

const TUNE = {
  toastTime: 2.6, maxToasts: 3,
  claimChain: 3,               // max chained claim popups before the rest go to the 待领取 tray
  flyIcons: 12, flyTime: 0.5, counterTick: 0.6,
  cascade: { crown: 0.36, score: 0.75, trophies: 0.6, road: 0.7, missions: 0.45, dex: 0.45, coins: 0.6, almost: 0.8, replay: 0.55, max: 5 },
  levelGuard: DATA.TUNE?.levelUpInputGuard ?? 0.6,
  pickAnim: 0.32,
  helperAfterFails: 2,
  holdGear: 3.0, holdTapMax: 0.35,
  rankCeremony: 4.0, rankSkipAfter: 1.0,
  eyeRest: 20,
  guideArrow: 6,
  healthToastMin: DATA.health?.toastMinutes ?? 30,
  healthCardMin: DATA.health?.breakCardMinutes ?? 45,
  healthRepeatMin: DATA.health?.repeatMinutes ?? 20,
};

const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOBBY_ONLY = ['feature', 'signin', 'night'];
const LOCAL_OVLS = ['stage', 'signin', 'dexd', 'names', 'titles', 'code', 'savecode', 'saveimp', 'confirm', 'gate', 'share'];   // closed when the screen changes
const FULL_SCREENS = ['map', 'road', 'missions', 'dex', 'achievements', 'modes', 'settings', 'parent', 'capsule'];
const HUB_SCREENS = ['home', 'map', 'heroes', 'road', 'missions', 'shop', 'capsule', 'dex', 'achievements', 'modes', 'settings', 'parent'];

// ============ strings (Chinese primary; English must survive 1.6× length) ============
addStrings({
  zh: {
    'ui.back': '返回', 'ui.close': '关闭', 'ui.ok': '好的!', 'ui.cancel': '取消', 'ui.yes': '好呀!', 'ui.no': '不用了',
    'ui.claim': '领取', 'ui.claimed': '已领取', 'ui.claimAll': '一键领取', 'ui.locked': '未解锁', 'ui.new': 'NEW!',
    'ui.coins': '金币', 'ui.tickets': '扭蛋券', 'ui.trophies': '奖杯', 'ui.start': '开始', 'ui.great': '太棒了!',
    // title
    'ui.pressAny': '点击任意处开始', 'ui.pressAnyTouch': '点一下开始', 'ui.keysMove': '移动', 'ui.keysDash': '冲刺',
    'ui.keysNova': '大招', 'ui.keysRetry': '失败后重开', 'ui.arrows': '/方向键', 'ui.offline': '离线游戏 · 无广告 · 无内购',
    'ui.touchLeft': '左边滑动 = 移动', 'ui.touchRight': '右边点击 = 冲刺',
    // home
    'ui.play': '开始冒险', 'ui.firstWin': '首胜×2', 'ui.rested': '休息奖励', 'ui.modes': '模式', 'ui.map': '星图',
    'ui.heroes': '英雄', 'ui.signin': '签到', 'ui.missions': '任务', 'ui.road': '银河之路', 'ui.dex': '图鉴',
    'ui.wardrobe': '衣橱', 'ui.capsule': '扭蛋机', 'ui.achievements': '成就', 'ui.settings': '设置', 'ui.tray': '待领取',
    'ui.allClear': '全部通关!', 'ui.heroPoke': '点我!',
    // map
    'ui.world': '第{n}世界', 'ui.crowns': '皇冠', 'ui.stageLocked': '先通过上一关哦', 'ui.worldLocked': '打败上一个世界的大王就能来!',
    'ui.chest': '宝箱', 'ui.chestNeed': '集齐{n}个👑', 'ui.boss': '大王关', 'ui.newEnemy': '新敌人!', 'ui.crownClear': '通关',
    'ui.crownHits': '最多丢2♥', 'ui.go': '出发!', 'ui.worldHat': '世界帽子',
    // objectives (👑3)
    'obj.chain': '一次冲刺解救{n}个', 'obj.rimBonk': '撞墙晕{n}次', 'obj.perfect': '完美冲刺{n}次', 'obj.bombMulti': '一次爆炸晕{n}个',
    'obj.bumperBonk': '弹柱撞晕{n}次', 'obj.laserDizzy': '激光晕{n}个', 'obj.bruiserBowl': '撞晕铁头{n}次', 'obj.coinCube': '抓住金币方',
    'obj.fastClear': '{n}秒内通关', 'obj.novaMulti': '一次大招解救{n}个', 'obj.iceBonk': '冰上相撞{n}次', 'obj.freeAll': '全部解救', 'obj.noNova': '不用大招',
    // heroes
    'ui.select': '选择', 'ui.selected': '使用中', 'ui.hearts': '爱心', 'ui.speed': '速度', 'ui.dashLen': '冲刺', 'ui.stamina': '体力',
    'ui.passive': '被动', 'ui.nova': '大招', 'ui.howUnlock': '如何获得', 'ui.unlockStart': '初始英雄', 'ui.unlockBoss': '打败第{n}世界大王',
    'ui.unlockSignin': '签到第{n}天', 'ui.unlockRoad': '银河之路 {n}', 'ui.or': '或者', 'ui.skins': '皮肤', 'ui.hats': '帽子', 'ui.trails': '尾迹',
    'ui.tryOn': '换装',
    // road
    'ui.freedTotal': '已解救 {n}', 'ui.roadNext': '还差 {n}', 'ui.roadDone': '全部领完啦!', 'ui.overflow': '额外宝箱', 'ui.roadHint': '解救方块，沿着银河之路前进!',
    // missions
    'ui.signinTitle': '累计签到', 'ui.day': '第{n}天', 'ui.today': '今天', 'ui.refreshTomorrow': '明天刷新', 'ui.reroll': '换一个',
    'ui.rerollLeft': '免费换 ×{n}', 'ui.dailyChest': '每日宝箱', 'ui.chestHint': '完成3个任务打开', 'ui.noMissions': '今天的任务都完成啦!',
    'ui.signinDays': '已签到 {n} 天',
    // wardrobe
    'ui.equip': '穿上', 'ui.equipped': '已穿上', 'ui.buy': '购买', 'ui.buyConfirm': '用 {n} 金币买「{name}」吗?', 'ui.notEnough': '金币不够哦',
    'ui.srcStarter': '初始', 'ui.srcShop': '商店', 'ui.srcCapsule': '扭蛋', 'ui.srcRoad': '银河之路 {n}', 'ui.srcChest': '第{n}世界宝箱',
    'ui.srcSignin': '签到第{n}天', 'ui.srcRank': '段位奖励', 'ui.bought': '买到啦!', 'ui.none': '无', 'ui.owned': '已拥有', 'ui.needHero': '先获得{hero}',
    // capsule
    'ui.pull': '扭一次', 'ui.free': '免费', 'ui.todayPulls': '今天 {n}/{max}', 'ui.odds': '概率公示', 'ui.oddsLine': '约每100次出{n}次',
    'ui.pityEpic': '距离必出史诗: {n}次', 'ui.pityLegend': '距离必出传说: {n}次', 'ui.pool': '全部奖品', 'ui.onlyNew': '只会扭出你还没有的!',
    'ui.tapOpen': '点一下打开!', 'ui.noTickets': '扭蛋券不够哦，做任务可以拿!', 'ui.capDone': '今天扭够啦，明天再来!', 'ui.allOwned': '全部集齐啦!',
    'ui.refund': '这个稀有度集齐啦，换成金币!', 'ui.capsuleOff': '扭蛋机休息中', 'ui.gotItem': '扭到了!', 'ui.ticketOnly': '只用扭蛋券 · 券只能靠玩获得',
    // dex
    'ui.dexCubes': '方块', 'ui.dexCards': '卡牌', 'ui.foundIn': '出没: 第{n}世界', 'ui.foundBoss': '出没: 大王关', 'ui.freedCount': '解救 ×{n}',
    'ui.wasName': '原来是: {name}', 'ui.milestones': '里程碑', 'ui.recipe': '进化配方', 'ui.found': '已发现 {n}/{max}',
    // profile / achievements
    'ui.profile': '名片', 'ui.rename': '换名字', 'ui.pickName': '选一个名字', 'ui.typeName': '或者自己写 (最多8个字)', 'ui.shuffle': '换一批',
    'ui.titleLbl': '称号', 'ui.noTitle': '还没有称号', 'ui.pins': '展示徽章', 'ui.pinHint': '点亮的徽章可以展示', 'ui.statFreed': '解救',
    'ui.statWave': '最佳波数', 'ui.statPerfect': '完美冲刺', 'ui.statDays': '冒险天数', 'ui.share': '分享', 'ui.rank': '段位', 'ui.pinned': '已展示',
    'ui.pickTitle': '选择称号',
    // modes
    'ui.enterCode': '输入挑战码', 'ui.codeHint': '输入朋友的6位挑战码', 'ui.codeBad': '挑战码不对哦', 'ui.best': '最佳: 第{n}波',
    'ui.todayMut': '今日花样', 'ui.medals': '奖牌', 'ui.unlockAfter': '通关第{n}世界解锁', 'ui.doneToday': '今天已完成 ✓', 'ui.codeGo': '挑战!',
    // settings
    'ui.lang': '语言', 'ui.music': '音乐', 'ui.sfx': '音效', 'ui.shake': '画面震动', 'ui.shakeOff': '关', 'ui.shakeLow': '弱', 'ui.shakeOn': '正常',
    'ui.reduceFlash': '减少闪光', 'ui.haptics': '震动反馈', 'ui.helper': '小帮手模式', 'ui.helperDesc': '多2颗心 · 敌人变慢 · 冲刺更准',
    'ui.quality': '画质', 'ui.qAuto': '自动', 'ui.qHigh': '高', 'ui.qLow': '省电', 'ui.qualityNote': '重新打开游戏后生效',
    'ui.controls': '操作说明', 'ui.kb': '键盘', 'ui.pad': '手柄', 'ui.touch': '触屏', 'ui.saveLbl': '存档', 'ui.exportSave': '导出存档码',
    'ui.importSave': '导入存档码', 'ui.copy': '复制', 'ui.copied': '已复制!', 'ui.importOk': '导入成功!', 'ui.importBad': '存档码不对',
    'ui.importConfirm': '导入会替换现在的进度，确定吗?', 'ui.parent': '家长中心', 'ui.on': '开', 'ui.off': '关', 'ui.holdHint': '长按3秒',
    'ui.pause': '暂停', 'ui.mute': '静音', 'ui.pasteHere': '把存档码粘贴到这里', 'ui.import': '导入', 'ui.sound': '声音', 'ui.screen': '画面',
    'ui.play2': '游戏',
    // parent
    'ui.gateQ': '请家长回答:', 'ui.gateWrong': '再试一次', 'ui.pledge1': '无内购', 'ui.pledge2': '无广告', 'ui.pledge3': '不联网',
    'ui.pledge4': '数据不离开设备', 'ui.weekPlay': '本周游戏时间', 'ui.minutes': '{n}分钟', 'ui.breakEvery': '休息提醒', 'ui.dailyLimit': '每日时长',
    'ui.capsuleToggle': '扭蛋机', 'ui.add15': '今天再玩15分钟', 'ui.reset': '重置存档', 'ui.resetConfirm1': '确定要清空所有进度吗?',
    'ui.resetConfirm2': '真的确定吗? 这个不能撤销!', 'ui.wd': '一,二,三,四,五,六,日', 'ui.added15': '已增加15分钟',
    // level-up
    'ui.levelUp': '升级!', 'ui.pickCard': '选一张卡', 'ui.rerollCards': '换一批', 'ui.recommended': '推荐', 'ui.evolve': '进化!', 'ui.lv': 'Lv',
    // pause
    'ui.paused': '暂停', 'ui.resume': '继续', 'ui.restart': '重来', 'ui.home': '大厅', 'ui.howTo': '玩法', 'ui.challenge': '皇冠挑战',
    // results
    'ui.win': '太棒了!', 'ui.cleared': '通关!', 'ui.oops': '哎呀!', 'ui.oopsSub': 'Oops!', 'ui.almost': '差一点!', 'ui.score': '分数',
    'ui.newBest': '新纪录!', 'ui.next': '下一关', 'ui.retry': '再来一次', 'ui.retryFlag': '从🚩继续', 'ui.retryPhase': '从第{n}阶段继续',
    'ui.skip': '跳过', 'ui.tapFast': '点击加速', 'ui.tip': '小提示', 'ui.helperOffer': '要不要试试小帮手模式?', 'ui.helperOn': '小帮手模式开启!',
    'ui.coinsRun': '本局金币', 'ui.wave': '第{n}波', 'ui.freedRun': '解救', 'ui.dexNew': '图鉴新发现!', 'ui.missionsProg': '任务进度',
    'ui.rankUpStar': '段位升星!', 'ui.total': '合计', 'ui.gameOver': '冒险结束', 'ui.medalGot': '获得奖牌!', 'ui.againMode': '再来一局',
    'cb.base': '通关', 'cb.first': '首次通关', 'cb.stars': '新皇冠', 'cb.firstWin': '首胜', 'cb.rested': '休息', 'cb.fail': '努力奖',
    'cb.freed': '解救', 'cb.boss': '打败大王', 'cb.waves': '波数', 'cb.score': '分数', 'cb.medal': '奖牌', 'cb.coin': '金币方',
    // claim / feature / ceremonies
    'ui.youGot': '恭喜获得!', 'ui.welcomeBack': '欢迎回来!', 'ui.featureNew': '新功能开启!', 'ui.pixel': '我是小像素!',
    'src.signin': '签到奖励', 'src.mission': '任务奖励', 'src.road': '银河之路', 'src.dex': '图鉴里程碑', 'src.achievement': '成就奖励',
    'src.chest': '宝箱', 'src.rank': '段位奖励', 'src.welcome': '回归礼物', 'src.daily': '每日宝箱', 'src.capsule': '扭蛋机', 'src.gift': '礼物',
    'feat.missions': '每天3个小任务，完成就有金币!', 'feat.road': '解救方块，沿着银河之路领奖励!', 'feat.dex': '你解救的方块都会记在图鉴里!',
    'feat.wardrobe': '你有新衣服啦! 去衣橱给英雄换装吧!', 'feat.capsule': '用扭蛋券扭出惊喜装扮! 先送你3次!', 'feat.modes': '新模式开启: 银河生存和更多挑战!',
    'feat.achievements': '完成挑战，赢取徽章和称号!', 'feat.heroes': '有新英雄啦! 可以换人玩了!', 'feat.map': '在星图上自由选择关卡!',
    'ui.rankUp': '段位提升!', 'ui.rescued': '救出新伙伴!', 'ui.tryHero': '马上试试', 'ui.newHero': '新英雄!',
    // health
    'ui.breakTitle': '休息一下吧', 'ui.breakBody': '已经玩了{n}分钟啦! 看看远处，眨眨眼 👀', 'ui.lookFar': '看远处', 'ui.takeBreak': '休息一下',
    'ui.keepPlaying': '再玩一会', 'ui.restBonus': '休息回来，下3局金币×1.5 🌙', 'ui.toast30': '已经玩了30分钟啦，眨眨眼休息一下吧',
    'ui.night': '夜深啦，明天再来冒险吧', 'ui.goodnight': '今天的冒险完成啦!', 'ui.goodnightSub': '小蓝要睡觉啦，明天见!', 'ui.bye': '晚安',
    'ui.parentAdd': '家长: +15分钟', 'ui.restThanks': '好好休息! 回来有奖励哦', 'ui.eyesDone': '眼睛休息好啦!',
    // share
    'ui.shareTitle': '分享海报', 'ui.saveImg': '保存图片', 'ui.shareBtn': '分享', 'ui.challengeCode': '挑战码', 'ui.challengeLine': '输入挑战码，和我比一比!',
    'ui.pBonk': 'BONK', 'ui.pCombo': '最高连击', 'ui.pCrowns': '皇冠',
  },
  en: {
    'ui.back': 'Back', 'ui.close': 'Close', 'ui.ok': 'OK!', 'ui.cancel': 'Cancel', 'ui.yes': 'Yes!', 'ui.no': 'No thanks',
    'ui.claim': 'Claim', 'ui.claimed': 'Claimed', 'ui.claimAll': 'Claim all', 'ui.locked': 'Locked', 'ui.new': 'NEW!',
    'ui.coins': 'Coins', 'ui.tickets': 'Tickets', 'ui.trophies': 'Trophies', 'ui.start': 'Start', 'ui.great': 'Great!',
    'ui.pressAny': 'Click or press any key', 'ui.pressAnyTouch': 'Tap to start', 'ui.keysMove': 'Move', 'ui.keysDash': 'Dash',
    'ui.keysNova': 'NOVA', 'ui.keysRetry': 'Retry', 'ui.arrows': '/ arrows', 'ui.offline': 'Offline · No ads · No purchases',
    'ui.touchLeft': 'Left side = move', 'ui.touchRight': 'Right side = dash',
    'ui.play': 'PLAY', 'ui.firstWin': '1st win ×2', 'ui.rested': 'Rested', 'ui.modes': 'Modes', 'ui.map': 'Map',
    'ui.heroes': 'Heroes', 'ui.signin': 'Sign-in', 'ui.missions': 'Missions', 'ui.road': 'Galaxy Road', 'ui.dex': 'Cube-dex',
    'ui.wardrobe': 'Wardrobe', 'ui.capsule': 'Capsules', 'ui.achievements': 'Badges', 'ui.settings': 'Settings', 'ui.tray': 'To claim',
    'ui.allClear': 'All clear!', 'ui.heroPoke': 'Poke!',
    'ui.world': 'World {n}', 'ui.crowns': 'Crowns', 'ui.stageLocked': 'Clear the previous stage first', 'ui.worldLocked': "Beat the last world's boss to get here!",
    'ui.chest': 'Chest', 'ui.chestNeed': 'Get {n}👑', 'ui.boss': 'Boss', 'ui.newEnemy': 'New enemy!', 'ui.crownClear': 'Clear',
    'ui.crownHits': 'Lose ≤ 2♥', 'ui.go': 'GO!', 'ui.worldHat': 'World hat',
    'obj.chain': 'Free {n} in one dash', 'obj.rimBonk': '{n} wall BONKs', 'obj.perfect': '{n} Perfect dashes', 'obj.bombMulti': 'Daze {n} with one blast',
    'obj.bumperBonk': '{n} bumper BONKs', 'obj.laserDizzy': 'Laser-daze {n} cubes', 'obj.bruiserBowl': 'Bowl over {n} Bruisers', 'obj.coinCube': 'Catch the Coin Cube',
    'obj.fastClear': 'Clear in {n}s', 'obj.novaMulti': 'Free {n} with one NOVA', 'obj.iceBonk': '{n} BONKs on ice', 'obj.freeAll': 'Free them all', 'obj.noNova': 'No NOVA',
    'ui.select': 'Select', 'ui.selected': 'In use', 'ui.hearts': 'Hearts', 'ui.speed': 'Speed', 'ui.dashLen': 'Dash', 'ui.stamina': 'Stamina',
    'ui.passive': 'Passive', 'ui.nova': 'NOVA', 'ui.howUnlock': 'How to get', 'ui.unlockStart': 'Starter hero', 'ui.unlockBoss': "Beat World {n}'s boss",
    'ui.unlockSignin': 'Sign-in day {n}', 'ui.unlockRoad': 'Galaxy Road {n}', 'ui.or': 'or', 'ui.skins': 'Skins', 'ui.hats': 'Hats', 'ui.trails': 'Trails',
    'ui.tryOn': 'Outfit',
    'ui.freedTotal': 'Freed {n}', 'ui.roadNext': '{n} more', 'ui.roadDone': 'All claimed!', 'ui.overflow': 'Bonus chest', 'ui.roadHint': 'Free cubes to travel the Galaxy Road!',
    'ui.signinTitle': 'Sign-in days', 'ui.day': 'Day {n}', 'ui.today': 'Today', 'ui.refreshTomorrow': 'New ones tomorrow', 'ui.reroll': 'Swap',
    'ui.rerollLeft': 'Free swaps ×{n}', 'ui.dailyChest': 'Daily chest', 'ui.chestHint': 'Finish 3 missions', 'ui.noMissions': 'All done for today!',
    'ui.signinDays': '{n} days signed in',
    'ui.equip': 'Wear', 'ui.equipped': 'Wearing', 'ui.buy': 'Buy', 'ui.buyConfirm': 'Buy "{name}" for {n} coins?', 'ui.notEnough': 'Not enough coins',
    'ui.srcStarter': 'Starter', 'ui.srcShop': 'Shop', 'ui.srcCapsule': 'Capsule', 'ui.srcRoad': 'Galaxy Road {n}', 'ui.srcChest': 'World {n} chest',
    'ui.srcSignin': 'Sign-in day {n}', 'ui.srcRank': 'Rank reward', 'ui.bought': 'Got it!', 'ui.none': 'None', 'ui.owned': 'Owned', 'ui.needHero': 'Unlock {hero} first',
    'ui.pull': 'Turn!', 'ui.free': 'Free', 'ui.todayPulls': 'Today {n}/{max}', 'ui.odds': 'Odds', 'ui.oddsLine': 'about {n} in 100',
    'ui.pityEpic': 'Epic guaranteed in {n}', 'ui.pityLegend': 'Legendary guaranteed in {n}', 'ui.pool': 'All prizes', 'ui.onlyNew': "Only things you don't have yet!",
    'ui.tapOpen': 'Tap to open!', 'ui.noTickets': 'No tickets — earn them in missions!', 'ui.capDone': "That's plenty for today!", 'ui.allOwned': 'Collected them all!',
    'ui.refund': 'Set complete — coins instead!', 'ui.capsuleOff': 'Capsules are resting', 'ui.gotItem': 'You got!', 'ui.ticketOnly': 'Tickets only · earned by playing',
    'ui.dexCubes': 'Cubes', 'ui.dexCards': 'Cards', 'ui.foundIn': 'Found in: World {n}', 'ui.foundBoss': 'Found in: boss stages', 'ui.freedCount': 'Freed ×{n}',
    'ui.wasName': 'Once: {name}', 'ui.milestones': 'Milestones', 'ui.recipe': 'Recipe', 'ui.found': 'Found {n}/{max}',
    'ui.profile': 'Profile', 'ui.rename': 'Rename', 'ui.pickName': 'Pick a name', 'ui.typeName': 'Or type one (max 8)', 'ui.shuffle': 'Shuffle',
    'ui.titleLbl': 'Title', 'ui.noTitle': 'No title yet', 'ui.pins': 'Showcase', 'ui.pinHint': 'Tap an earned badge to show it off', 'ui.statFreed': 'Freed',
    'ui.statWave': 'Best wave', 'ui.statPerfect': 'Perfects', 'ui.statDays': 'Play days', 'ui.share': 'Share', 'ui.rank': 'Rank', 'ui.pinned': 'Shown',
    'ui.pickTitle': 'Pick a title',
    'ui.enterCode': 'Enter code', 'ui.codeHint': "Type a friend's 6-letter code", 'ui.codeBad': "That code doesn't work", 'ui.best': 'Best: wave {n}',
    'ui.todayMut': "Today's twist", 'ui.medals': 'Medals', 'ui.unlockAfter': 'Clear World {n} to unlock', 'ui.doneToday': 'Done today ✓', 'ui.codeGo': 'Challenge!',
    'ui.lang': 'Language', 'ui.music': 'Music', 'ui.sfx': 'Sounds', 'ui.shake': 'Screen shake', 'ui.shakeOff': 'Off', 'ui.shakeLow': 'Low', 'ui.shakeOn': 'Normal',
    'ui.reduceFlash': 'Reduce flashing', 'ui.haptics': 'Rumble', 'ui.helper': 'Helper mode', 'ui.helperDesc': '+2 hearts · slower cubes · easier dashes',
    'ui.quality': 'Quality', 'ui.qAuto': 'Auto', 'ui.qHigh': 'High', 'ui.qLow': 'Battery', 'ui.qualityNote': 'Applies next time you open the game',
    'ui.controls': 'Controls', 'ui.kb': 'Keyboard', 'ui.pad': 'Gamepad', 'ui.touch': 'Touch', 'ui.saveLbl': 'Save data', 'ui.exportSave': 'Export save code',
    'ui.importSave': 'Import save code', 'ui.copy': 'Copy', 'ui.copied': 'Copied!', 'ui.importOk': 'Imported!', 'ui.importBad': 'Invalid code',
    'ui.importConfirm': 'This replaces your current progress. Sure?', 'ui.parent': 'Parent Corner', 'ui.on': 'On', 'ui.off': 'Off', 'ui.holdHint': 'Hold 3 s',
    'ui.pause': 'Pause', 'ui.mute': 'Mute', 'ui.pasteHere': 'Paste a save code here', 'ui.import': 'Import', 'ui.sound': 'Sound', 'ui.screen': 'Display',
    'ui.play2': 'Play',
    'ui.gateQ': 'Grown-ups only:', 'ui.gateWrong': 'Try again', 'ui.pledge1': 'No purchases', 'ui.pledge2': 'No ads', 'ui.pledge3': 'No internet',
    'ui.pledge4': 'Nothing leaves this device', 'ui.weekPlay': 'Play time this week', 'ui.minutes': '{n} min', 'ui.breakEvery': 'Break reminder', 'ui.dailyLimit': 'Daily limit',
    'ui.capsuleToggle': 'Capsule machine', 'ui.add15': '+15 min today', 'ui.reset': 'Reset progress', 'ui.resetConfirm1': 'Erase ALL progress?',
    'ui.resetConfirm2': "Really sure? This can't be undone!", 'ui.wd': 'M,T,W,T,F,S,S', 'ui.added15': '+15 minutes added',
    'ui.levelUp': 'LEVEL UP!', 'ui.pickCard': 'Pick a card', 'ui.rerollCards': 'Reroll', 'ui.recommended': 'Try me!', 'ui.evolve': 'EVOLVE!', 'ui.lv': 'Lv',
    'ui.paused': 'Paused', 'ui.resume': 'Resume', 'ui.restart': 'Restart', 'ui.home': 'Home', 'ui.howTo': 'How to play', 'ui.challenge': 'Crown challenge',
    'ui.win': 'Awesome!', 'ui.cleared': 'Stage clear!', 'ui.oops': 'Oops!', 'ui.oopsSub': 'Almost had it!', 'ui.almost': 'So close!', 'ui.score': 'Score',
    'ui.newBest': 'New best!', 'ui.next': 'Next', 'ui.retry': 'Retry', 'ui.retryFlag': 'Retry from 🚩', 'ui.retryPhase': 'Retry from phase {n}',
    'ui.skip': 'Skip', 'ui.tapFast': 'Tap to speed up', 'ui.tip': 'Tip', 'ui.helperOffer': 'Want to try Helper mode?', 'ui.helperOn': 'Helper mode on!',
    'ui.coinsRun': 'Coins', 'ui.wave': 'Wave {n}', 'ui.freedRun': 'Freed', 'ui.dexNew': 'New in Cube-dex!', 'ui.missionsProg': 'Missions',
    'ui.rankUpStar': 'Rank star up!', 'ui.total': 'Total', 'ui.gameOver': 'Run over', 'ui.medalGot': 'Medal won!', 'ui.againMode': 'Play again',
    'cb.base': 'Clear', 'cb.first': 'First clear', 'cb.stars': 'New crowns', 'cb.firstWin': '1st win', 'cb.rested': 'Rested', 'cb.fail': 'Good try',
    'cb.freed': 'Freed', 'cb.boss': 'Boss beaten', 'cb.waves': 'Waves', 'cb.score': 'Score', 'cb.medal': 'Medal', 'cb.coin': 'Coin Cube',
    'ui.youGot': 'You got!', 'ui.welcomeBack': 'Welcome back!', 'ui.featureNew': 'New feature!', 'ui.pixel': "I'm Pixel!",
    'src.signin': 'Sign-in gift', 'src.mission': 'Mission reward', 'src.road': 'Galaxy Road', 'src.dex': 'Cube-dex milestone', 'src.achievement': 'Badge reward',
    'src.chest': 'Chest', 'src.rank': 'Rank reward', 'src.welcome': 'Welcome-back gift', 'src.daily': 'Daily chest', 'src.capsule': 'Capsule', 'src.gift': 'Gift',
    'feat.missions': '3 little missions every day — finish them for coins!', 'feat.road': 'Free cubes to travel the Galaxy Road and grab prizes!', 'feat.dex': 'Every cube you free goes into your Cube-dex!',
    'feat.wardrobe': 'New clothes! Dress up your hero in the Wardrobe!', 'feat.capsule': 'Turn tickets into surprise outfits! Here are 3 free turns!', 'feat.modes': 'New modes: Galaxy Survival and more!',
    'feat.achievements': 'Earn badges and titles by doing cool stuff!', 'feat.heroes': 'A new hero joined — try switching!', 'feat.map': 'Pick any stage on the Galaxy Map!',
    'ui.rankUp': 'Rank up!', 'ui.rescued': 'New friend rescued!', 'ui.tryHero': 'Play as them', 'ui.newHero': 'New hero!',
    'ui.breakTitle': 'Break time!', 'ui.breakBody': "You've played {n} minutes! Look far away and blink 👀", 'ui.lookFar': 'Look far away', 'ui.takeBreak': 'Take a break',
    'ui.keepPlaying': 'A bit more', 'ui.restBonus': 'Come back rested: next 3 runs coins ×1.5 🌙', 'ui.toast30': "30 minutes played — blink and rest your eyes!",
    'ui.night': "It's late — let's adventure tomorrow", 'ui.goodnight': "Today's adventure is done!", 'ui.goodnightSub': 'Blu is off to bed. See you tomorrow!', 'ui.bye': 'Good night',
    'ui.parentAdd': 'Parent: +15 min', 'ui.restThanks': 'Rest well! A bonus is waiting', 'ui.eyesDone': 'Eyes rested!',
    'ui.shareTitle': 'Share poster', 'ui.saveImg': 'Save image', 'ui.shareBtn': 'Share', 'ui.challengeCode': 'Challenge code', 'ui.challengeLine': 'Enter my code and try to beat me!',
    'ui.pBonk': 'BONKs', 'ui.pCombo': 'Best combo', 'ui.pCrowns': 'Crowns',
  },
});

// ============ small helpers ============
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = (n) => (typeof n === 'number' ? '#' + (n >>> 0).toString(16).padStart(6, '0') : n || '#2f6bff');
function mix(a, b, k) {           // mix two '#rrggbb' colours
  const pa = parseInt(hex(a).slice(1), 16), pb = parseInt(hex(b).slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, k));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k));
  const bl = Math.round(lerp(pa & 255, pb & 255, k));
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}
const n0 = (v) => (Number.isFinite(+v) ? +v : 0);
const sumObj = (o) => (o && typeof o === 'object' ? Object.values(o).reduce((a, b) => a + n0(b), 0) : n0(o));
const rarityOf = (r) => DATA.RARITY[r] || DATA.RARITY.common;
const worldName = (i) => tl(DATA.worlds[i]?.name);
const stageName = (w, s) => tl(DATA.worlds[w]?.stages?.[s]?.name);
const stageId = (w, s) => `${w + 1}-${s + 1}`;
const worldIdx = (v) => { if (typeof v === 'number') return v; const i = DATA.worlds.findIndex((w) => w.id === v); return i < 0 ? n0(v) : i; };

// hats have no mesh preview in DOM → one friendly emoji each
const HAT_ICON = {
  none: '🚫', antenna: '📡', flower: '🌸', propeller: '🚁', cat: '🐱', headphones: '🎧', bunny: '🐰', astro: '🧑‍🚀',
  wizard: '🧙', crown: '👑', halo: '😇', w_cloud: '☁️', w_neon: '🥽', w_crystal: '🦄', w_nebula: '🪐', w_foundry: '⚙️', w_core: '💫',
};
const FEATURE_ICON = { signin: '📅', rank: '🏆', missions: '📋', road: '🚀', dex: '📖', wardrobe: '👕', capsule: '__cap', modes: '🌌', achievements: '🏅', heroes: '🦸', map: '🗺️' };

/** A clay "cube buddy" in CSS — used for avatars, heroes, dex, Pixel, ceremonies. */
function cube({ color = '#2f6bff', face = 'happy', size = 64, cls = '', hat = '', antenna = false, limbs = false, sil = false, acc = '' } = {}) {
  const c = hex(color);
  return `<div class="cube f-${face}${sil ? ' sil' : ''}${limbs ? ' limbs' : ''} ${cls}" style="--c:${c};--c2:${mix(c, '#ffffff', 0.45)};--c3:${mix(c, '#000000', 0.28)};--s:${size}px">`
    + (limbs ? '<i class="hand l"></i><i class="hand r"></i><i class="foot l"></i><i class="foot r"></i>' : '')
    + '<i class="body"></i>'
    + (antenna ? '<i class="ant"></i>' : '')
    + (acc ? `<i class="acc acc-${acc}"></i>` : '')
    + '<i class="eye l"></i><i class="eye r"></i><i class="brow l"></i><i class="brow r"></i><i class="blush l"></i><i class="blush r"></i><i class="mouth"></i>'
    + (hat ? `<b class="hat">${hat}</b>` : '')
    + '</div>';
}
const heroCube = (id, opts = {}) => {
  const h = heroById(id);
  return cube({ color: opts.color ?? h.color, face: 'happy', acc: id === 'zap' ? 'bolt' : id === 'stella' ? 'tiara' : id === 'mochi' ? 'band' : 'antenna', ...opts });
};
const ENEMY_ACC = { zippy: 'thrust', splitter: 'seam', popper: 'fuse', beamer: 'lens', bruiser: 'helmet', coin: 'tophat', king: 'crown' };
function enemyCube(type, opts = {}) {
  const def = DATA.enemies[type];
  const color = type === 'king' ? DATA.boss.color : def?.color ?? 0xef4b3c;
  return cube({ color, face: 'angry', acc: ENEMY_ACC[type] || '', ...opts });
}
function freedCube(type, opts = {}) {     // freed = happy, white-tinted form
  const def = DATA.enemies[type];
  const base = type === 'king' ? DATA.boss.color : def?.color ?? 0xef4b3c;
  return cube({ color: type === 'coin' ? '#ffe27a' : mix(hex(base), '#ffffff', 0.8), face: 'joy', acc: ENEMY_ACC[type] || '', cls: 'freed', ...opts });
}

const CROWN_SVG = '<svg viewBox="0 0 64 52" aria-hidden="true"><path d="M5 17 L18 29 L32 7 L46 29 L59 17 L54 44 Q32 50 10 44 Z"/><circle cx="5" cy="15" r="5"/><circle cx="32" cy="6" r="5"/><circle cx="59" cy="15" r="5"/></svg>';
const crown = (on, cls = '') => `<i class="crown${on ? ' on' : ''} ${cls}">${CROWN_SVG}</i>`;
const coinIco = (cls = '') => `<i class="i-coin ${cls}"></i>`;
const ticketIco = (cls = '') => `<i class="i-ticket ${cls}"></i>`;
const capIco = (cls = '') => `<i class="i-cap ${cls}"></i>`;
const featIcon = (f) => (FEATURE_ICON[f] === '__cap' ? capIco() : `<span class="emo">${FEATURE_ICON[f] || '✨'}</span>`);

function rankBadge(rank, size = 56) {
  const r = rank || {};
  const def = DATA.ranks.find((x) => x.id === r.id) || DATA.ranks[r.tier ?? 0] || DATA.ranks[0];
  const color = r.color || def.color;
  const stars = r.stars ?? 1;
  const legend = def.id === 'legend';
  return `<div class="rank-badge" style="--rc:${color};--rs:${size}px"><div class="rb-gem"><span>${r.icon || def.icon}</span></div>`
    + `<div class="rb-stars">${legend ? `<b>★${Math.max(1, stars)}</b>` : [0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}">★</i>`).join('')}</div></div>`;
}
const rankName = (rank) => {
  const def = DATA.ranks.find((x) => x.id === rank?.id) || DATA.ranks[rank?.tier ?? 0] || DATA.ranks[0];
  return tl(rank?.name || def.name);
};

// sources for cosmetics & heroes (where can a kid get this?)
function roadIndexOf(key, id) { return DATA.road.findIndex((n) => n.reward && n.reward[key] === id); }
function signinDayOf(key, id) { return DATA.signin.novice.findIndex((r) => r && r[key] === id); }
function itemSources(kind, def) {
  const out = [];
  if (!def) return out;
  if (def.default) out.push(t('ui.srcStarter'));
  const ri = roadIndexOf(kind, def.id);
  if (ri >= 0) out.push(t('ui.srcRoad', { n: DATA.road[ri].at }));
  const si = signinDayOf(kind, def.id);
  if (si >= 0) out.push(t('ui.srcSignin', { n: si + 1 }));
  if (def.source === 'chest') out.push(t('ui.srcChest', { n: (def.world ?? 0) + 1 }));
  if (def.shop) out.push(t('ui.srcCapsule'));
  return out;
}
function heroUnlockLines(h) {
  return (h.unlock || []).map((u) => {
    if (u.type === 'start') return '🎁 ' + t('ui.unlockStart');
    if (u.type === 'boss') return '👑 ' + t('ui.unlockBoss', { n: u.world + 1 });
    if (u.type === 'signin') return '📅 ' + t('ui.unlockSignin', { n: u.day });
    if (u.type === 'road') { const i = roadIndexOf('hero', h.id); return '🚀 ' + t('ui.unlockRoad', { n: i >= 0 ? DATA.road[i].at : '?' }); }
    return '✨';
  });
}

const catalog = (kind) => (kind === 'skin' ? DATA.skins : kind === 'hat' ? DATA.hats : DATA.trails);
const itemDef = (kind, id) => catalog(kind).find((x) => x.id === id);
function trailSwatch(def) {
  const cols = (def?.colors || [0x8fd3ff, 0x2f6bff]).map(hex);
  return `<i class="trail-sw" style="background:linear-gradient(90deg,${cols.join(',')})"></i>`;
}
function skinSwatch(def, size = 46) {
  if (!def) return cube({ size });
  return cube({ color: def.color, size, cls: def.pattern ? 'pat-' + def.pattern : '' });
}
/** Visual for any single reward item */
function itemVisual(kind, id, size = 52) {
  if (kind === 'coins') return coinIco('big');
  if (kind === 'tickets') return ticketIco('big');
  if (kind === 'trophies') return '<span class="emo big">🏆</span>';
  if (kind === 'skin') return skinSwatch(itemDef('skin', id), size);
  if (kind === 'hat') return `<span class="emo big">${HAT_ICON[id] || '🎩'}</span>`;
  if (kind === 'trail') return trailSwatch(itemDef('trail', id));
  if (kind === 'hero') return heroCube(id, { size });
  if (kind === 'card') return `<span class="emo big">${cardById(id)?.icon || '🃏'}</span>`;
  if (kind === 'title') return '<span class="emo big">🏷️</span>';
  return '<span class="emo big">🎁</span>';
}
/** Expand DATA-style reward objects ({coins:100}, {hat:'antenna'}, {kind,id}) into display items */
function rewardItems(rewards) {
  const out = [];
  const push = (kind, id, amount) => {
    let label = '', rarity = 'common';
    if (kind === 'coins') { label = t('ui.coins'); }
    else if (kind === 'tickets') { label = t('ui.tickets'); rarity = 'rare'; }
    else if (kind === 'trophies') { label = t('ui.trophies'); }
    else if (kind === 'hero') { label = tl(heroById(id).name); rarity = 'legend'; }
    else if (kind === 'card') { const c = cardById(id); label = tl(c?.name) || id; rarity = c?.rarity || 'epic'; }
    else if (kind === 'title') { label = tl(DATA.titles[id]) || String(id); rarity = 'epic'; }
    else if (kind === 'skin' || kind === 'hat' || kind === 'trail') { const d = itemDef(kind, id); label = tl(d?.name) || id; rarity = d?.rarity || 'common'; }
    else label = String(id ?? kind);
    out.push({ kind, id, amount, label, rarity });
    return out[out.length - 1];
  };
  for (const r of [].concat(rewards || [])) {
    if (!r) continue;
    if (r.kind) {
      const it = push(r.kind === 'coin' ? 'coins' : r.kind === 'ticket' ? 'tickets' : r.kind, r.id, r.amount ?? r.n);
      if (r.name && !['coins', 'tickets'].includes(it.kind)) it.label = r.name;
      if (r.rarity) it.rarity = r.rarity;
      continue;
    }
    for (const k of Object.keys(r)) {
      const v = r[k];
      if (v == null || v === false) continue;
      if (k === 'coins' || k === 'refund') push('coins', null, v);
      else if (k === 'tickets') push('tickets', null, v);
      else if (k === 'trophies') push('trophies', null, v);
      else if (['hat', 'skin', 'trail', 'hero', 'card', 'title'].includes(k)) push(k, v);
      else if (k === 'worldHat' && typeof v === 'string') push('hat', v);
    }
  }
  return out;
}
function rewardIconLine(rewards) {    // compact "🪙100 🎩" line for lists
  return rewardItems(rewards).map((it) => (it.kind === 'coins' ? `${coinIco()}<b>${fmtInt(it.amount)}</b>`
    : it.kind === 'tickets' ? `${ticketIco()}<b>×${it.amount}</b>` : `<span class="ri-mini">${itemVisual(it.kind, it.id, 26)}</span>`)).join(' ');
}
function objText(o) {
  if (!o) return '';
  return t('obj.' + o.kind, { n: o.target });
}

// ---------- challenge codes (6 × Crockford base32 = 30 bits: seed 22 · hero 2 · mode 2 · check 4) ----------
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function codeCheck(seed, hero, mode) { let x = (seed * 2654435761) ^ (hero * 97) ^ (mode * 31); x ^= x >>> 13; x ^= x >>> 7; return (x ^ (x >>> 4)) & 15; }
export function encodeChallenge({ seed, hero = 0, mode = 0 }) {
  seed = (seed >>> 0) & 0x3fffff; hero &= 3; mode &= 3;
  let v = ((seed * 4 + hero) * 4 + mode) * 16 + codeCheck(seed, hero, mode);
  let s = '';
  for (let i = 0; i < 6; i++) { s = B32[v % 32] + s; v = Math.floor(v / 32); }
  return s;
}
export function decodeChallenge(code) {
  const c = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (c.length !== 6) return null;
  let v = 0;
  for (const ch of c) { const i = B32.indexOf(ch); if (i < 0) return null; v = v * 32 + i; }
  const chk = v % 16; v = Math.floor(v / 16);
  const mode = v % 4; v = Math.floor(v / 4);
  const hero = v % 4; const seed = Math.floor(v / 4);
  if (codeCheck(seed, hero, mode) !== chk) return null;
  return { seed, hero, mode };
}

// kid-safe name pick-list (no free chat, ≤ 8 chars)
const NAME_PARTS = {
  zh: [['勇敢的', '闪亮的', '快乐的', '飞速的', '超酷的', '聪明的', '银河', '彩虹'], ['小蓝队长', '冲刺王', '方块侠', '星星猎人', '云朵骑士', '闪电侠', '小英雄', '探险家']],
  en: [['Brave', 'Shiny', 'Happy', 'Zippy', 'Super', 'Clever', 'Cosmic', 'Lucky'], ['Captain', 'Dasher', 'Cube Hero', 'Star Hunter', 'Knight', 'Bolt', 'Explorer', 'Buddy']],
};
function nameChoices(seed) {
  const r = makeRng(seed);
  const [a, b] = NAME_PARTS[getLang()] || NAME_PARTS.zh;
  const out = new Set();
  while (out.size < 6) out.add(getLang() === 'en' ? `${r.pick(a)} ${r.pick(b)}` : r.pick(a) + r.pick(b));
  return [...out];
}

// ═════════════════════════════════════════════════════════════
//  UI system
// ═════════════════════════════════════════════════════════════
export class UI {
  constructor(G) {
    this.G = G;
    let root = document.getElementById('ui');
    if (!root) { root = document.createElement('div'); root.id = 'ui'; document.body.appendChild(root); }
    this.root = root;
    root.classList.toggle('reduced', REDUCED);
    root.classList.toggle('q-low', G.quality === 'low');
    root.innerHTML = `
      <div class="ui-screens"></div>
      <div class="ui-wallet hidden">
        <button class="w-btn w-tray hidden" data-act="tray" data-nav title="${esc(t('ui.tray'))}"><span class="emo">📦</span><i class="dot num">0</i></button>
        <div class="w-pill w-coins">${coinIco()}<b class="w-n">0</b></div>
        <div class="w-pill w-tickets">${ticketIco()}<b class="w-n">0</b></div>
        <button class="w-btn w-lang" data-act="lang" data-nav><b>中</b><i>/</i><b>EN</b></button>
        <button class="w-btn w-gear" data-act="settings" data-hold="parent" data-nav aria-label="settings"><span class="gear">⚙</span><svg class="hold-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg></button>
      </div>
      <div class="ui-ovls"></div>
      <div class="ui-toasts"></div>
      <div class="ui-fly"></div>`;
    this.screenHost = root.querySelector('.ui-screens');
    this.ovlHost = root.querySelector('.ui-ovls');
    this.toastHost = root.querySelector('.ui-toasts');
    this.flyHost = root.querySelector('.ui-fly');
    this.walletEl = root.querySelector('.ui-wallet');

    this.time = 0;
    this.screen = null;            // {name, params, el}
    this.overlays = [];            // stack of {id, el, back, blocking}
    this.focusEl = null;
    this.kb = false;               // keyboard / gamepad focus-ring mode
    this.queue = [];               // popups & ceremonies waiting for a safe moment (never mid-run)
    this.tray = [];                // overflow claims (待领取)
    this.chain = 0;                // claim popups shown back-to-back
    this.pending = { coins: 0, tickets: 0 };   // granted but not yet "claimed" → wallet lags behind
    this.shown = { coins: 0, tickets: 0 };
    this.wAnim = null;
    this.fails = {};               // 'w-s' → failed attempts this session (Helper offer, boss slow-down)
    this.helperOffered = false;
    this.seenStage = new Set();    // results of the same stage compress on replays
    this.revealed = new Set();     // heroes already revealed (rescue / unlock)
    this.health = { active: 0, toastDone: false, nextCard: TUNE.healthCardMin, nightShown: false, events: false, extra: 0 };
    this.lastRankTier = null;
    this.pendingArrow = null;
    this.casc = null; this.lvl = null; this.hold = null; this.eye = null; this.rankT = null;
    this.signinShown = false;
    this.trayHold = false;         // pull-mode: claims left in meta.claimQueue after 3 chained popups
    this._dirty = false;
    this._lastClaimKey = ''; this._lastClaimT = -1;

    this.walletEl.querySelector('.w-lang').classList.toggle('en', getLang() === 'en');
    this._bindDom();
    this._bindBus();
  }

  // ---------- wiring ----------
  _bindDom() {
    const root = this.root;
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || !root.contains(el) || el.disabled || el.closest('.out')) return;
      if (el.dataset.hold && this._holdFired) { this._holdFired = false; return; }
      this._act(el.dataset.act, el, e);
    });
    // hold-to-open (gear → Parent Corner)
    root.addEventListener('pointerdown', (e) => {
      this._setKb(false);
      const el = e.target.closest('[data-hold]');
      if (el) this._holdStart(el);
    });
    const endHold = () => this._holdEnd();
    root.addEventListener('pointerup', endHold);
    root.addEventListener('pointercancel', endHold);
    root.addEventListener('pointerleave', endHold);
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) this._setKb(false); }, { passive: true });
    // number keys: 1/2/3 pick level-up cards; digits feed the parent gate; hold Enter on the gear
    window.addEventListener('keydown', (e) => {
      if (this._typing()) return;
      if (this.lvl && /^Digit[1-3]$|^Numpad[1-3]$/.test(e.code)) { this._pickCard(+e.code.slice(-1) - 1); e.preventDefault(); }
      const gate = this.overlays.find((o) => o.id === 'gate');
      if (gate && /^(Digit|Numpad)\d$/.test(e.code)) this._gateKey(e.code.slice(-1));
      if (gate && e.code === 'Backspace') this._gateKey('del');
      if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat && this.focusEl?.dataset.hold) this._holdStart(this.focusEl);
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Enter' || e.code === 'Space') this._holdEnd(true); });
  }

  _bindBus() {
    const bus = this.G.bus;
    if (!bus) return;
    bus.on('run:start', () => this._onRunStart());
    bus.on('meta:reward', (p) => this._onReward(p));
    bus.on('meta:rankup', (p) => this._onRankUp(p));
    bus.on('meta:unlock', (p) => this._onUnlock(p));
    bus.on('meta:feature', (p) => this.showFeature(typeof p === 'string' ? p : p?.feature ?? p?.id));
    bus.on('meta:break', (p) => { this.health.events = true; this.showBreak(p?.kind || 'card', p); });
    bus.on('meta:goodnight', () => { this.health.events = true; this.showGoodnight(); });
    bus.on('meta:welcome', (p) => { if (!this._pullMode()) this.queueClaim(p?.rewards || [p], 'welcome'); });
    bus.on('meta:change', () => { this._dirty = true; });
    bus.on('checkpoint', () => { /* HUD shows the flag; results reads run.checkpoint */ });
  }

  _emit(name, p = {}) { this.G.bus?.emit?.('ui:' + name, p); }
  /** UI blips: emit ui:* (audio listens); if nobody listens, play the sfx directly */
  _blip(name) {
    const bus = this.G.bus;
    bus?.emit?.('ui:' + name, {});
    if (!bus?.map?.get?.('ui:' + name)?.size) this._sfx(name);
  }
  _sfx(name, opts) { try { this.G.audio?.sfx?.(name, opts); } catch { /* audio optional */ } }
  /** defensive meta call: returns undefined when the method is missing or throws */
  _m(name, ...args) {
    const m = this.G.meta;
    const f = m?.[name];
    if (typeof f !== 'function') return undefined;
    try { return f.apply(m, args); } catch (err) { console.warn('[ui] meta.' + name + ' failed', err); return undefined; }
  }
  _mv(name, fallback) { try { const v = this.G.meta?.[name]; return v === undefined || v === null ? fallback : v; } catch { return fallback; } }
  /** real meta.js keeps its own claim queue (credited on grant, shown via nextClaim/ackClaim) */
  _pullMode() { const m = this.G.meta; return !!m && Array.isArray(m.claimQueue) && typeof m.nextClaim === 'function'; }
  _unlocked(feature) { const v = this._m('isUnlocked', feature); return v === undefined ? true : !!v; }
  _dots() { return this._m('redDots') || {}; }
  _settings() { return this.G.save?.profile?.settings || {}; }
  _setSetting(key, value) {
    const s = this._settings();
    s[key] = value;
    this.G.save?.commit?.();
    this.G.bus?.emit?.('settings:change', { key, value });
  }
  _typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' && a.type !== 'range' || a.tagName === 'TEXTAREA'); }

  /** true while a full-panel screen hides the 3D hub (main may skip / throttle hub rendering) */
  get coversScene() { return !!this.screen && FULL_SCREENS.includes(this.screen.name) && !this.overlays.length; }

  // ═════════ frame update ═════════
  update(rdt) {
    this.time += rdt;
    this._walletUpdate(rdt);
    if (this.casc) this._cascUpdate(rdt);
    if (this.lvl) this._levelUpdate(rdt);
    if (this.hold) this._holdUpdate(rdt);
    if (this.eye) this._eyeUpdate(rdt);
    if (this.rankT) this._rankUpdate(rdt);
    this._healthTick(rdt);
    if (this._canPopup()) this._pump();
    if (this._dirty && !this.overlays.length && this.screen?.name === 'home' && this.G.app?.state !== 'run') { this._dirty = false; this._rerender(); }
    this._navUpdate();
  }

  // ═════════ layers & navigation ═════════
  _topLayer() {
    for (let i = this.overlays.length - 1; i >= 0; i--) if (!this.overlays[i].passive) return this.overlays[i];
    return this.screen;
  }
  _navItems(layer) {
    if (!layer?.el) return [];
    const items = [...layer.el.querySelectorAll('[data-nav]')].filter((e) => !e.disabled && e.offsetParent !== null && !e.closest('.hidden'));
    if (layer === this.screen && !this.walletEl.classList.contains('hidden')) {
      for (const e of this.walletEl.querySelectorAll('[data-nav]')) if (e.offsetParent !== null && !e.classList.contains('hidden')) items.push(e);
    }
    return items;
  }
  _setKb(on) {
    if (this.kb === on) return;
    this.kb = on;
    this.root.classList.toggle('kbnav', on);
    if (!on && this.focusEl) { this.focusEl.classList.remove('nav-focus'); this.focusEl = null; }
  }
  _focus(el) {
    if (this.focusEl === el) return;
    this.focusEl?.classList.remove('nav-focus');
    this.focusEl = el || null;
    if (el) {
      el.classList.add('nav-focus');
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); } catch { /* old browsers */ }
    }
  }
  _focusDefault() {
    const items = this._navItems(this._topLayer());
    this._focus(items.find((e) => e.hasAttribute('data-default')) || items[0] || null);
  }
  _layerChanged() {
    this.focusEl?.classList.remove('nav-focus');
    this.focusEl = null;
    if (this.kb) this._focusDefault();
    this._walletVisibility();
  }
  _navMove(dir) {
    const items = this._navItems(this._topLayer());
    if (!items.length) return;
    if (!this.focusEl || !items.includes(this.focusEl)) { this._focusDefault(); return; }
    const r0 = this.focusEl.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = Infinity;
    for (const e of items) {
      if (e === this.focusEl) continue;
      const r = e.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      const cross = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      // overlap on the cross axis is strongly preferred (grids / rows)
      const overlap = dir === 'left' || dir === 'right' ? (r.bottom > r0.top && r.top < r0.bottom) : (r.right > r0.left && r.left < r0.right);
      if (main <= 2 || (!overlap && main < 16)) continue;     // must really be in that direction
      const s = main + cross * (overlap ? 0.4 : 1.6);
      if (s < bs) { bs = s; best = e; }
    }
    if (best) this._focus(best);
  }
  _navUpdate() {
    const G = this.G, inp = G.input;
    if (!inp || this._typing()) return;
    const inRun = G.app?.state === 'run' && G.run;
    const layer = this._topLayer();
    if (!layer || (inRun && !this.overlays.some((o) => !o.passive))) return;
    // title: any key starts
    if (layer === this.screen && this.screen?.name === 'title') {
      if (['confirm', 'dash', 'nova', 'up', 'down', 'left', 'right', 'back', 'pause'].some((a) => inp.pressed(a))) this._titleGo();
      return;
    }
    if (this.lvl) {   // level-up has its own ← → handling (cards in a row + guard)
      if (inp.pressed('left')) { this._setKb(true); this._lvlMove(-1); }
      if (inp.pressed('right')) { this._setKb(true); this._lvlMove(1); }
      if (inp.pressed('down') || inp.pressed('up')) { this._setKb(true); this._navMove(inp.pressed('down') ? 'down' : 'up'); }
      if (inp.pressed('confirm')) { this._setKb(true); if (this.focusEl?.dataset.card != null) this._pickCard(+this.focusEl.dataset.card); else if (this.focusEl) this.focusEl.click(); else this._lvlMove(0); }
      return;
    }
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (!inp.pressed(dir)) continue;
      const wasKb = this.kb;
      this._setKb(true);
      if (!wasKb || !this.focusEl) { this._focusDefault(); continue; }
      if ((dir === 'left' || dir === 'right') && this.focusEl?.type === 'range') {
        const r = this.focusEl;
        r.value = clamp(+r.value + (dir === 'left' ? -1 : 1) * (+r.step || 0.1), +r.min, +r.max);
        r.dispatchEvent(new Event('input', { bubbles: true }));
        r.dispatchEvent(new Event('change', { bubbles: true }));
        continue;
      }
      this._navMove(dir);
    }
    if (inp.pressed('confirm')) {
      if (this.casc && !this.casc.done) { this._cascTap(); return; }
      this._setKb(true);
      if (!this.focusEl) this._focusDefault();
      const f = this.focusEl;
      if (f && f.type !== 'range') {
        if (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA') f.focus();
        else if (!f.dataset.hold) f.click();
      }
    }
    const back = inp.pressed('back') && !(inRun && inp.pressed('pause'));
    if (back) this._back();
  }
  _back() {
    const top = this.overlays[this.overlays.length - 1];
    if (top) {
      if (top.back === false) return;
      this._blip('back');
      if (typeof top.back === 'function') top.back(); else this._close(top.id);
      return;
    }
    if (this.screen && !['home', 'title'].includes(this.screen.name) && this.G.app?.state !== 'run') {
      this._blip('back');
      this.go(this.screen.params?.from || 'home');
    }
  }

  // ---------- overlays ----------
  _open(id, html, { back, blocking = true, cls = '', passive = false } = {}) {
    this._close(id, true);
    const el = document.createElement('div');
    el.className = `ovl ovl-${id} ${cls}`;
    el.innerHTML = html;
    this.ovlHost.appendChild(el);
    const o = { id, el, back, blocking, passive };
    this.overlays.push(o);
    void el.offsetWidth;          // start transitions from the initial state
    el.classList.add('in');
    this._layerChanged();
    this._emit('open', { id });
    return o;
  }
  _close(id, instant = false) {
    const i = this.overlays.findIndex((o) => o.id === id);
    if (i < 0) return;
    const [o] = this.overlays.splice(i, 1);
    try { o.onClose?.(); } catch (err) { console.warn(err); }
    if (instant || REDUCED) o.el.remove();
    else { o.el.classList.remove('in'); o.el.classList.add('out'); setTimeout(() => o.el.remove(), 260); }
    this._layerChanged();
  }
  _isOpen(id) { return this.overlays.some((o) => o.id === id); }
  _ovl(id) { return this.overlays.find((o) => o.id === id); }

  // ═════════ screens ═════════
  go(name, params = {}) {
    const render = this['_s_' + name];
    if (!render) { console.warn('[ui] unknown screen', name); return; }
    const G = this.G;
    if (name !== 'title' && G.app?.state === 'title') { G.app.toHub?.(); if (G.app.state === 'title') G.app.state = 'hub'; }
    if (name !== 'parent' && this.screen?.name === 'parent') this.parentOk = false;
    for (const o of [...this.overlays]) if (LOCAL_OVLS.includes(o.id)) this._close(o.id, true);
    const old = this.screen?.el;
    const el = document.createElement('div');
    el.className = `scr scr-${name}`;
    this.screen = { name, params, el };
    try { el.innerHTML = render.call(this, params); }
    catch (err) { console.error('[ui] render', name, err); el.innerHTML = `<div class="scr-head">${this._backBtn()}</div>`; }
    if (old) {
      if (REDUCED) old.remove();
      else { old.classList.add('leave'); old.style.pointerEvents = 'none'; setTimeout(() => old.remove(), 240); }
    }
    this.screenHost.appendChild(el);
    try { this['_p_' + name]?.(el, params); } catch (err) { console.error('[ui] post', name, err); }
    this._layerChanged();
    this._emit('open', { screen: name });
    if (name === 'home') this._afterHome();
  }
  _clearScreen() {
    const old = this.screen?.el;
    this.screen = null;
    old?.remove();
    this._layerChanged();
  }
  /** re-render after language change / data change */
  refresh() {
    const lang = getLang();
    this.root.lang = lang;
    this.walletEl.querySelector('.w-lang').classList.toggle('en', lang === 'en');
    this.walletEl.querySelector('.w-tray').title = t('ui.tray');
    if (this.screen) { const f = this.focusEl?.dataset?.act; this.go(this.screen.name, this.screen.params); if (f && this.kb) { const e = this.screen.el.querySelector(`[data-act="${f}"]`); if (e) this._focus(e); } }
    if (this._isOpen('pause')) this.showPause();
  }
  _rerender() { if (this.screen) { const sc = this.screen.el.querySelector('.scroll'); const y = sc?.scrollTop ?? 0, x = sc?.scrollLeft ?? 0; this.go(this.screen.name, this.screen.params); const sc2 = this.screen.el.querySelector('.scroll'); if (sc2) { sc2.scrollTop = y; sc2.scrollLeft = x; } } }
  _backBtn(to) { return `<button class="btn-back" data-act="back" ${to ? `data-to="${to}"` : ''} data-nav aria-label="${esc(t('ui.back'))}"><span>‹</span></button>`; }
  _head(title, icon = '', extra = '') {
    return `<header class="scr-head">${this._backBtn()}<h2 class="ribbon">${icon ? `<span class="rib-ico">${icon}</span>` : ''}<span>${esc(title)}</span></h2><div class="head-extra">${extra}</div></header>`;
  }

  // ═════════ wallet (coins / tickets counter) ═════════
  _walletVisibility() {
    const sc = this.screen?.name;
    const hub = sc && HUB_SCREENS.includes(sc) && this.G.app?.state !== 'run';
    const ovl = this.overlays.some((o) => ['claim', 'results', 'capsuleReveal', 'shop'].includes(o.id));
    const show = !!(hub || ovl) && sc !== 'parent';
    this.walletEl.classList.toggle('hidden', !show);
    this.walletEl.classList.toggle('home', sc === 'home' && !this.overlays.length);
    this.walletEl.classList.toggle('over', ovl);
    const trayBtn = this.walletEl.querySelector('.w-tray');
    const tc = this._trayCount();
    trayBtn.classList.toggle('hidden', !tc || this.G.app?.state === 'run');
    trayBtn.querySelector('.dot').textContent = tc;
  }
  _walletUpdate(rdt) {
    if (this.walletEl.classList.contains('hidden')) return;
    const m = this.G.meta;
    const tc = m && m.displayCoins != null ? n0(m.displayCoins) : Math.max(0, n0(this._mv('coins', 0)) - this.pending.coins);
    const tt = m && m.displayTickets != null ? n0(m.displayTickets) : Math.max(0, n0(this._mv('tickets', 0)) - this.pending.tickets);
    if (this.wAnim) {
      const a = this.wAnim;
      a.t += rdt;
      const k = clamp(a.t / TUNE.counterTick, 0, 1);
      this.shown.coins = Math.round(lerp(a.fc, tc, easeOutCubic(k)));
      this.shown.tickets = Math.round(lerp(a.ft, tt, easeOutCubic(k)));
      if (a.t - a.lastBlip > 0.075 && k < 1) { a.lastBlip = a.t; a.n++; this._sfx('coin', { pitch: 1 + a.n * 0.08, volume: 0.4 }); }
      if (k >= 1) this.wAnim = null;
    } else { this.shown.coins = tc; this.shown.tickets = tt; }
    const cEl = this.walletEl.querySelector('.w-coins .w-n'), tEl = this.walletEl.querySelector('.w-tickets .w-n');
    const cs = fmtInt(this.shown.coins), ts = fmtInt(this.shown.tickets);
    if (cEl.textContent !== cs) cEl.textContent = cs;
    if (tEl.textContent !== ts) tEl.textContent = ts;
  }
  _walletTick() { this.wAnim = { t: 0, fc: this.shown.coins, ft: this.shown.tickets, lastBlip: 0, n: 0 }; this.walletEl.classList.remove('bump'); void this.walletEl.offsetWidth; this.walletEl.classList.add('bump'); }

  // ═════════ toasts ═════════
  toast(text, icon = '✨') {
    const host = this.toastHost;
    while (host.children.length >= TUNE.maxToasts) host.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="t-ico">${icon}</span><span class="t-txt">${esc(text)}</span>`;
    host.appendChild(el);
    host.classList.toggle('in-run', this.G.app?.state === 'run');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, TUNE.toastTime * 1000);
  }

  // ═════════ popup queue (claims, ceremonies, reminders — never mid-run) ═════════
  _canPopup() {
    const G = this.G;
    if (!this.screen && G.app?.state !== 'run') return false;
    if (this.screen?.name === 'title') return false;
    if (G.app?.state === 'run') {
      if (!G.run || G.run.state !== 'ended') return false;
      if (!this._isOpen('results') || (this.casc && !this.casc.done)) return false;
    }
    return !this.overlays.some((o) => o.blocking);
  }
  /** next popup: ceremonies first, then meta's claim queue (≤ 3 chained → 待领取 tray), then the rest */
  _pump() {
    const pull = this._pullMode();
    const mq = pull ? this.G.meta.claimQueue : null;
    const hi = this.queue.length && (this.queue[0].pri || 0) > 3;
    if (pull && !hi && !this.trayHold && mq.length) {
      if (this.chain >= TUNE.claimChain) {
        this.trayHold = true;
        this._walletVisibility();
        this.toast(t('ui.tray') + ' +' + mq.length, '📦');
        return;
      }
      const c = this.G.meta.nextClaim();
      if (!c) return;
      this.chain++;
      const tk = c.title && t(c.title) !== c.title ? t(c.title) : '';
      this._showClaim({ type: 'claim', rewards: c.rewards || c.items, source: c.source, title: tk, applied: false, pulled: true, uid: c.uid });
      return;
    }
    if (this.queue.length && this._drain()) return;
    if (!mq?.length) this.chain = 0;
  }
  _trayCount() { return this._pullMode() ? (this.trayHold ? this.G.meta.claimQueue.length : 0) : this.tray.length; }
  _enqueue(item) {
    this.queue.push(item);
    this.queue.sort((a, b) => (b.pri || 0) - (a.pri || 0));
  }
  _drain() {
    if (!this.queue.some((q) => q.type === 'claim')) this.chain = 0;
    // lobby-only items (feature intro + arrow, sign-in, night note) wait until the child is on Home
    const atHome = this.screen?.name === 'home' && this.G.app?.state !== 'run';
    const idx = this.queue.findIndex((q) => atHome || !LOBBY_ONLY.includes(q.type));
    if (idx < 0) return false;
    const [item] = this.queue.splice(idx, 1);
    if (item.type === 'claim') {
      if (this.chain >= TUNE.claimChain) {        // too many in a row → 待领取 tray
        const rest = [item, ...this.queue.filter((q) => q.type === 'claim')];
        this.queue = this.queue.filter((q) => q.type !== 'claim');
        this.tray.push(...rest);
        this.chain = 0;
        this._walletVisibility();
        this.toast(t('ui.tray') + ' +' + rest.length, '📦');
        return;
      }
      this.chain++;
      this._showClaim(item);
    }
    else if (item.type === 'feature') { this._m('nextFeature'); this._showFeatureNow(item.feature); }
    else if (item.type === 'rankup') this._showRankNow(item.rank, item.before, item.placement);
    else if (item.type === 'rescue') this._showRescueNow(item.hero, item.kind);
    else if (item.type === 'break') this._showBreakNow(item);
    else if (item.type === 'goodnight') this._showGoodnightNow();
    else if (item.type === 'night') { this.toast(t('ui.night'), '🌙'); }
    else if (item.type === 'toast') this.toast(item.text, item.icon);
    else if (item.type === 'signin') this._showSignin();
    return true;
  }

  // ---------- incoming meta events ----------
  _onReward(p = {}) {
    if (this._pullMode() || p.popup === false) return;     // meta.claimQueue drives popups
    const src = p.source || p.src || '';
    if (['run', 'results', 'capsule', 'silent'].includes(src)) return;
    let rewards = p.rewards;
    if (!rewards) {
      rewards = [];
      if (p.coins) rewards.push({ coins: p.coins });
      if (p.tickets) rewards.push({ tickets: p.tickets });
      if (p.gems) rewards.push({ tickets: p.gems });
      for (const it of p.items || []) rewards.push(it);
    }
    this.queueClaim(rewards, src, { applied: p.applied !== false, id: p.id, title: p.title });
  }
  /** queue a 领取 popup. applied=true: meta already added it (wallet lags until claimed) */
  queueClaim(rewards, source = '', opts = {}) {
    rewards = [].concat(rewards || []).filter(Boolean);
    if (!rewards.length) return;
    const key = JSON.stringify(rewards) + '|' + source;
    if (key === this._lastClaimKey && this.time - this._lastClaimT < 0.2) return;   // meta may both emit and call us
    this._lastClaimKey = key; this._lastClaimT = this.time;
    const applied = opts.applied !== false;
    const items = rewardItems(rewards);
    const coins = items.filter((i) => i.kind === 'coins').reduce((a, i) => a + n0(i.amount), 0);
    const tickets = items.filter((i) => i.kind === 'tickets').reduce((a, i) => a + n0(i.amount), 0);
    if (applied) { this.pending.coins += coins; this.pending.tickets += tickets; }
    this._enqueue({ type: 'claim', pri: source === 'welcome' ? 6 : 3, rewards, source, coins, tickets, applied, id: opts.id, title: opts.title });
  }
  _onRankUp(p = {}) {
    const rank = p.rank || this._mv('rank', null);
    if (!rank) return;
    const tier = rank.tier ?? DATA.ranks.findIndex((r) => r.id === rank.id);
    const before = p.before || null;
    if (this.lastRankTier == null) this.lastRankTier = before?.tier ?? Math.max(0, tier - 1);
    if (p.placement) this._enqueue({ type: 'rankup', pri: 5, rank, before: null, placement: true });
    else if (tier > this.lastRankTier || p.tierUp) this._enqueue({ type: 'rankup', pri: 5, rank, before });
    else this._enqueue({ type: 'toast', pri: 1, text: t('ui.rankUpStar') + ' ' + rankName(rank) + ' ' + '★'.repeat(rank.stars || 1), icon: rank.icon || '⭐' });
    this.lastRankTier = tier;
  }
  _onUnlock(p = {}) {
    if (p.kind === 'hero' && p.id) this.showRescue(p.id, p.source === 'rescue' ? 'rescue' : 'unlock');
    else if (p.kind === 'world') { const w = worldIdx(p.worldId ?? p.id); this._enqueue({ type: 'toast', pri: 1, text: t('ui.world', { n: w + 1 }) + ' · ' + worldName(w), icon: '🪐' }); }
    else if (p.kind === 'mode') this._enqueue({ type: 'toast', pri: 1, text: tl(DATA.modes[p.id]?.name) || String(p.id), icon: '🌌' });
  }
  showFeature(f) { if (f) this._enqueue({ type: 'feature', pri: 2, feature: f }); }
  showRankUp(rank, before) { this._enqueue({ type: 'rankup', pri: 5, rank, before }); }
  showRescue(heroId, kind = 'rescue') {
    if (!heroId || this.revealed.has(heroId)) return;
    this.revealed.add(heroId);
    this._enqueue({ type: 'rescue', pri: 7, hero: heroId, kind });
  }
  showBreak(kind = 'card', data = {}) {
    if (kind === 'toast') this._enqueue({ type: 'toast', pri: 0.5, text: t('ui.toast30'), icon: '👀' });
    else if (kind === 'night') this._enqueue({ type: 'night', pri: 0.4 });
    else if (kind === 'limit' || kind === 'goodnight') this.showGoodnight();
    else this._enqueue({ type: 'break', pri: 0.6, minutes: data.minutes });
  }
  showGoodnight() { if (!this.queue.some((q) => q.type === 'goodnight')) this._enqueue({ type: 'goodnight', pri: 0.3 }); }

  // ---------- play-time guardian (fallback when meta doesn't drive it) ----------
  _healthTick(rdt) {
    const run = this.G.run;
    if (this.G.app?.state === 'run' && run && !['paused', 'ended', 'levelup'].includes(run.state)) this.health.active += rdt;
  }
  _healthAfterRun() {
    const h = this.health, s = this._settings();
    let r = this._m('healthCheck');
    if (r === undefined && !h.events) {
      r = {};
      const min = h.active / 60;
      const every = n0(s.breakMinutes) || TUNE.healthCardMin;
      if (s.breakReminder !== false && s.breakMinutes !== 0) {
        if (min >= Math.max(every, h.nextCard)) { r.card = true; h.nextCard = min + TUNE.healthRepeatMin; }
        else if (!h.toastDone && min >= Math.min(TUNE.healthToastMin, every - 1)) { r.toast = true; h.toastDone = true; }
      }
      const lim = n0(s.dailyLimit);
      const today = n0(this._m('todayMinutes') ?? min);
      if (lim > 0 && today >= lim + h.extra) r.limit = true;
    }
    if (!r) return;
    if (r.limit) this.showGoodnight();
    else if (r.card) this.showBreak('card', { minutes: Math.round(h.active / 60) });
    else if (r.toast) this.showBreak('toast');
    if (r.night) this.showBreak('night');
  }
  _isNight() {
    const v = this._mq('isNight');
    if (v !== undefined) return !!v;
    const d = new Date(), hm = d.getHours() * 60 + d.getMinutes();
    const [sh, sm] = String(DATA.health?.nightStart || '21:30').split(':').map(Number), [eh, em] = String(DATA.health?.nightEnd || '06:30').split(':').map(Number);
    return hm >= sh * 60 + sm || hm < eh * 60 + em;
  }

  // ---------- run lifecycle ----------
  _onRunStart() {
    const claim = this._ovl('claim');                     // unclaimed popup (e.g. R-restart on results) → show it again later
    if (claim?.entry && !claim.claiming) { if (claim.entry.pulled) { this.G.meta.claimQueue.unshift?.({ uid: claim.entry.uid, source: claim.entry.source, items: claim.entry.rewards, rewards: claim.entry.rewards, title: '' }); this._m('ackClaim'); } else this.queue.unshift(claim.entry); }
    this.trayHold = false; this.chain = 0;
    for (const o of [...this.overlays]) this._close(o.id, true);
    this.casc = null; this.lvl = null; this.eye = null; this.rankT = null;
    this._clearScreen();
    this._walletVisibility();
    this.toastHost.classList.add('in-run');
  }

  // ═════════ action dispatcher (every [data-act] button) ═════════
  _act(a, el, ev) {
    const G = this.G, d = el.dataset;
    const click = () => this._blip('click');
    switch (a) {
      // --- navigation ---
      case 'back': this._blip('back'); this.go(d.to || this.screen?.params?.from || 'home'); break;
      case 'go': click(); this.go(d.to, d.w != null ? { w: +d.w } : {}); break;
      case 'close': this._blip('back'); this._close(d.id); break;
      case 'titleGo': this._titleGo(); break;
      case 'play': { click(); const n = this._nextStage(); this._startStage(n.worldId, n.stageId); break; }
      case 'poke': this._poke(); break;
      case 'lang': click(); this._setSetting('lang', getLang() === 'zh' ? 'en' : 'zh'); break;
      case 'settings': click(); if (G.app?.state === 'run') this._pauseSettings(); else this.go('settings'); break;
      case 'tray': click(); this.chain = 0; this.trayHold = false; if (!this._pullMode() && this.tray.length) { const it = this.tray.shift(); this._showClaim(it); } this._walletVisibility(); break;
      case 'profile': click(); this.go('achievements', { tab: 'profile' }); break;
      case 'signin': click(); this._showSignin(); break;
      // --- map ---
      case 'world': click(); this.go('map', { w: +d.w }); break;
      case 'worldLocked': this._blip('error'); this.toast(t('ui.worldLocked'), '🔒'); break;
      case 'stage': click(); this._stageCard(+d.w, +d.s); break;
      case 'stageLocked': this._blip('error'); this.toast(t('ui.stageLocked'), '🔒'); break;
      case 'stageGo': click(); this._close('stage', true); this._startStage(+d.w, +d.s); break;
      case 'wchest': this._claimWorldChest(+d.w, +d.i); break;
      // --- heroes / wardrobe ---
      case 'hero': click(); this._pickHero(d.id); break;
      case 'heroTab': click(); this.go('heroes', { ...this.screen.params, tab: d.tab }); break;
      case 'equip': this._equipItem(d.kind, d.id, d.hero); break;
      case 'shopTab': click(); this.go('shop', { ...this.screen.params, tab: d.tab }); break;
      case 'shopHero': click(); this.go('shop', { ...this.screen.params, hero: d.hero }); break;
      case 'shopItem': this._shopItem(d.kind, d.id); break;
      // --- road / missions / sign-in ---
      case 'roadClaim': this._claimRoad(d.i === 'overflow' ? 'overflow' : +d.i); break;
      case 'roadAll': this._claimRoadAll(); break;
      case 'misClaim': this._claimMission(+d.i); break;
      case 'misAll': this._claimMissionAll(); break;
      case 'misReroll': this._rerollMission(+d.i); break;
      case 'dailyChest': this._claimDailyChest(); break;
      case 'signinClaim': this._claimSignin(); break;
      // --- capsule ---
      case 'capPull': this._capPull(); break;
      case 'capOpen': this._capOpen(); break;
      // --- dex ---
      case 'dexTab': click(); this.go('dex', { tab: d.tab }); break;
      case 'dexEntry': click(); this._dexDetail(d.id); break;
      case 'dexClaim': this._dexClaim(d.id, +d.n); break;
      // --- achievements / profile ---
      case 'achTab': click(); this.go('achievements', { tab: d.tab }); break;
      case 'achClaim': this._achClaim(d.id); break;
      case 'achPin': this._achPin(d.id); break;
      case 'rename': click(); this._namePicker(); break;
      case 'nameShuffle': click(); this._namePicker(this.time * 1000 | 0); break;
      case 'namePick': this._setName(this._nameOpts?.[+d.i] && this._nameOpts[+d.i].a != null ? this._nameOpts[+d.i] : d.name); break;
      case 'nameType': { const v = this._ovl('names')?.el.querySelector('input')?.value || ''; if (v.trim()) this._setName(v.trim().slice(0, 8)); else this._blip('error'); break; }
      case 'titlePick': click(); this._titlePicker(); break;
      case 'titleSet': this._setProfile({ title: d.id || null }); this._close('titles'); this._blip('claim'); this._rerender(); break;
      case 'share': click(); this.showShare(); break;
      // --- modes ---
      case 'mode': click(); this._startMode(d.mode); break;
      case 'modeLocked': this._blip('error'); this.toast(el.dataset.msg || t('ui.locked'), '🔒'); break;
      case 'codeEnter': click(); this._codeEntry(); break;
      case 'codeGo': this._codeGo(); break;
      // --- settings ---
      case 'set': this._settingAct(d.key, d.v, el); break;
      case 'ctlTab': click(); this._ctlTab(el, d.tab); break;
      case 'exportSave': click(); this._exportSave(); break;
      case 'copyCode': this._copyCode(); break;
      case 'importSave': click(); this._importSave(); break;
      case 'importGo': this._importGo(); break;
      case 'parentHint': this.toast(t('ui.holdHint') + ' → ' + t('ui.parent'), '👪'); break;
      // --- parent ---
      case 'gateKey': this._gateKey(d.k); break;
      case 'pset': this._parentSet(d.key, d.v); break;
      case 'add15': this._add15(); break;
      case 'reset': this._resetSave(); break;
      // --- level-up ---
      case 'card': this._pickCard(+d.card); break;
      case 'reroll': this._rerollCards(); break;
      // --- pause ---
      case 'resume': click(); G.app?.resume?.(); break;
      case 'restart': click(); this.hidePause(); G.app?.restartRun?.(); break;
      case 'quit': click(); this._toHome(); break;
      case 'helper': this._toggleHelper(); break;
      // --- results ---
      case 'resNext': click(); this._resNext(); break;
      case 'resRetry': click(); this._resRetry(d.how); break;
      case 'resHome': click(); this._toHome(); break;
      case 'resSkip': this._cascSkip(); break;
      case 'resTap': this._cascTap(); break;
      case 'helperYes': this._setSetting('assist', true); this._blip('claim'); this.toast(t('ui.helperOn'), '🧸'); el.closest('.helper-offer')?.remove(); break;
      case 'helperNo': click(); el.closest('.helper-offer')?.remove(); break;
      // --- popups & ceremonies ---
      case 'claimOk': this._claimOk(); break;
      case 'featOk': this._featOk(); break;
      case 'rankSkip': this._rankEnd(); break;
      case 'rescueOk': click(); this._close('rescue'); break;
      case 'rescueTry': click(); this._close('rescue'); G.app?.selectHero?.(d.id); if (this.screen) this._rerender(); break;
      case 'breakRest': this._breakRest(); break;
      case 'breakMore': click(); this._m('snoozeBreak'); this.eye = null; this._close('break'); break;
      case 'gnBye': click(); this._close('goodnight'); if (G.app?.state === 'run') this._toHome(); break;
      case 'gnAdd': click(); this._openGate(() => { this._add15(); this._close('goodnight'); }); break;
      case 'shareSave': this._shareSave(); break;
      case 'shareSend': this._shareSend(); break;
      case 'confirmYes': { const o = this._ovl('confirm'); this._close('confirm'); this._blip('click'); o?.yes?.(); break; }
      case 'confirmNo': this._blip('back'); this._close('confirm'); break;
      default: console.warn('[ui] no action', a);
    }
  }

  _confirm(text, yes, { icon = '❓', yesLabel = t('ui.ok'), danger = false } = {}) {
    const o = this._open('confirm', `<div class="panel dialog pop">
      <div class="dlg-ico">${icon}</div><p class="dlg-txt">${esc(text)}</p>
      <div class="row">
        <button class="btn btn-white" data-act="confirmNo" data-nav ${danger ? 'data-default' : ''}>${esc(t('ui.cancel'))}</button>
        <button class="btn ${danger ? 'btn-red' : 'btn-blue'}" data-act="confirmYes" data-nav ${danger ? '' : 'data-default'}>${esc(yesLabel)}</button>
      </div></div>`);
    o.yes = yes;
  }

  // ---------- small meta helpers ----------
  _mq(name, ...args) {        // method-or-property
    const m = this.G.meta;
    if (!m) return undefined;
    try { const v = m[name]; return typeof v === 'function' ? v.apply(m, args) : v; } catch { return undefined; }
  }
  _crowns(w, s) {
    const f = this._m('stageCrowns', w, s);
    if (Array.isArray(f)) return [0, 1, 2].map((i) => !!f[i]);
    const v = this._m('stageStars', w, s);
    if (Array.isArray(v)) return [0, 1, 2].map((i) => !!v[i]);
    if (v && typeof v === 'object') return [!!v.clear || !!v[0], !!v.fewHits || !!v[1], !!v.objective || !!v[2]];
    const n = n0(v);
    return [n >= 1, n >= 2, n >= 3];
  }
  _stageUnlocked(w, s) {
    if (!DATA.worlds[w]?.stages?.[s]) return false;
    const v = this._m('isStageUnlocked', w, s);
    if (v !== undefined) return !!v;
    if (w === 0 && s === 0) return true;
    return s > 0 ? this._crowns(w, s - 1)[0] : this._crowns(w - 1, DATA.worlds[w - 1].stages.length - 1)[0];
  }
  _worldCrowns(w) { return (DATA.worlds[w]?.stages || []).reduce((a, _, s) => a + this._crowns(w, s).filter(Boolean).length, 0); }
  _worldCleared(w) { const st = DATA.worlds[w]?.stages; return !!st && (this._crowns(w, st.length - 1)[0] || this._stageUnlocked(w + 1, 0)); }
  _nextStage() {
    const n = this._m('nextStage');
    if (n && n.worldId != null) return n;
    let last = { worldId: 0, stageId: 0 };
    for (let w = 0; w < DATA.worlds.length; w++) {
      for (let s = 0; s < DATA.worlds[w].stages.length; s++) {
        if (!this._stageUnlocked(w, s)) return last;
        last = { worldId: w, stageId: s };
        if (!this._crowns(w, s)[0]) return last;
      }
    }
    return last;
  }
  _heroUnlocked(id) { const v = this._m('heroUnlocked', id); return v === undefined ? id === 'blu' : !!v; }
  _owns(kind, id) {
    const def = itemDef(kind, id);
    if (def?.default) return true;
    for (const fn of ['owns', 'isOwned', 'owned']) { const v = this._m(fn, kind, id); if (v !== undefined) return !!v; }
    if (kind === 'skin') { const l = this._m('ownedSkins', def?.hero || 'blu'); if (Array.isArray(l)) return l.includes(id); }
    if (kind === 'hat') { const l = this._m('ownedHats'); if (Array.isArray(l)) return l.includes(id); }
    if (kind === 'trail') { const l = this._m('ownedTrails'); if (Array.isArray(l)) return l.includes(id); }
    const o = this.G.save?.profile?.owned;
    const arr = o?.[kind + 's'] ?? o?.[kind];
    if (Array.isArray(arr)) return arr.includes(id);
    return !!arr?.[id];
  }
  _equipped(kind, heroId) {
    if (kind === 'skin') return this._m('selectedSkin', heroId) || DATA.skins.find((s) => s.hero === heroId && s.default)?.id;
    if (kind === 'hat') return this._m('selectedHat', heroId) || 'none';
    return this._m('selectedTrail') || 'default';
  }
  _profile() {
    const p = this._m('profile') || this.G.save?.profile?.profile || {};
    return { name: p.name || '', title: p.title || null, pins: Array.isArray(p.pins) ? p.pins : [], titles: p.titles || this._m('titles') || [] };
  }
  _setProfile(patch) {
    if (this._m('setProfile', patch) === undefined) {
      const pr = (this.G.save.profile.profile ||= {});
      Object.assign(pr, patch);
      this.G.save.commit?.();
    }
  }
  _playerName() {
    const n = this._profile().name;
    if (n) return n;
    const seed = [...String(this.G.save?.profile?.created || 'x')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    return nameChoices(seed)[0];
  }
  _titleName(id) {
    if (!id) return '';
    const mt = this._m('titleName', id);
    if (mt) return mt;
    if (DATA.titles[id]) return tl(DATA.titles[id]);
    const a = DATA.achievements.find((x) => x.id === id);
    return a ? tl(a.name) : String(id);
  }
  _dot(v) {
    if (!v) return '';
    const n = typeof v === 'number' ? v : Array.isArray(v) ? v.length : 1;
    return n >= 2 ? `<i class="dot num">${n > 99 ? '99+' : n}</i>` : '<i class="dot"></i>';
  }
  _startStage(w, s) {
    if (!this._stageUnlocked(w, s)) { this._blip('error'); this.toast(t('ui.stageLocked'), '🔒'); return; }
    const attempt = n0(this._m('stageFails', w, s) ?? this.fails[`${w}-${s}`]);
    this.G.app?.startRun?.({ mode: 'stage', worldId: w, stageId: s, attempt });
  }
  _toHome() {
    this.hidePause();
    for (const o of [...this.overlays]) if (['results', 'levelup', 'pause', 'settingsOvl'].includes(o.id)) this._close(o.id, true);
    this.casc = null; this.lvl = null;
    if (this.G.app?.state === 'run') this.G.app.quitRun?.();
    this.go('home');
  }
  _poke() {
    this.G.app?.pokeHero?.();
    this._sfx('whoosh');
    const host = this.screen?.el.querySelector('.home-hero');
    if (!host) return;
    const b = document.createElement('div');
    b.className = 'emote';
    b.textContent = ['😄', '💪', '🎉', '✨', '😎', '💙', '⭐'][Math.floor(Math.random() * 7)];
    host.appendChild(b);
    setTimeout(() => b.remove(), 1200);
  }

  // ═════════ TITLE ═════════
  _s_title() {
    this.G.audio?.music?.('title');
    const touch = this.G.input?.device === 'touch';
    const keys = touch
      ? `<div class="keystrip"><span class="k-grp"><span class="emo">👈</span><b>${esc(t('ui.touchLeft'))}</b></span><i class="k-sep"></i><span class="k-grp"><span class="emo">👉</span><b>${esc(t('ui.touchRight'))}</b></span></div>`
      : `<div class="keystrip">
          <span class="k-grp"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><small>${esc(t('ui.arrows'))}</small><b>${esc(t('ui.keysMove'))}</b></span><i class="k-sep"></i>
          <span class="k-grp"><kbd class="wide">Shift</kbd><small>/</small><kbd class="wide">Space</kbd><b>${esc(t('ui.keysDash'))}</b></span><i class="k-sep"></i>
          <span class="k-grp"><kbd>E</kbd><b>${esc(t('ui.keysNova'))}</b></span><i class="k-sep"></i>
          <span class="k-grp"><kbd>R</kbd><b>${esc(t('ui.keysRetry'))}</b></span></div>`;
    return `<div class="title-hit" data-act="titleGo"></div>
      <div class="title-wrap">
        <div class="logo-block">
          <i class="deco-cube c1"></i><i class="deco-cube c2"></i><i class="deco-cube c3"></i><i class="deco-cube c4"></i>
          <h1 class="logo" data-text="方块大逃跑">方块大逃跑</h1>
          <div class="logo-pill">CUBE DASH</div>
          <p class="tagline">${esc(getLang() === 'en' ? 'Dodge with style · Dash just right' : '躲得漂亮，冲得刚好')}</p>
        </div>
        <div class="press-any">${esc(touch ? t('ui.pressAnyTouch') : t('ui.pressAny'))}</div>
        ${keys}
        <div class="title-foot">${esc(t('ui.offline'))}</div>
      </div>`;
  }
  _titleGo() {
    if (this._titleLeaving || this.screen?.name !== 'title') return;
    this._titleLeaving = true;
    setTimeout(() => { this._titleLeaving = false; }, 400);
    this._blip('click');
    if (!this.G.save?.profile?.tutorialDone) {
      this._clearScreen();
      this.G.app?.startRun?.({ mode: 'stage', worldId: 0, stageId: 0 });
    } else this.go('home');
  }

  // ═════════ HOME (Cube Island lobby, Honor-of-Kings layout) ═════════
  _s_home() {
    const dots = this._dots();
    const heroId = this._mv('selectedHero', 'blu');
    const hat = this._m('selectedHat', heroId);
    const skin = itemDef('skin', this._equipped('skin', heroId));
    const rank = this._mv('rank', null);
    const prof = this._profile();
    const ib = (feat, act, to, icon, label, dot, extra = '') => (feat && !this._unlocked(feat) ? '' : `
      <button class="ibtn" data-act="${act}" ${to ? `data-to="${to}"` : ''} ${feat ? `data-feature="${feat}"` : ''} data-nav>
        <span class="ib-ico">${icon}</span><span class="ib-lbl">${esc(label)}</span>${this._dot(dot)}${extra}</button>`);
    const capOn = this._capInfo().enabled;
    const n = this._nextStage();
    const allDone = this._crowns(n.worldId, n.stageId)[0];
    const fw = this._mq('firstWinAvailable') ?? this._mq('firstWin');
    const rested = n0(this._mq('restedRuns') ?? (this._mq('rested') ? 1 : 0));
    const roadInfo = this._roadData();
    return `
      <div class="home-top">
        <button class="profile-card" data-act="profile" data-nav>
          <div class="pc-ava">${heroCube(heroId, { size: 54, color: skin?.color, hat: hat && hat !== 'none' ? HAT_ICON[hat] : '' })}</div>
          <div class="pc-info"><b class="pc-name">${esc(this._playerName())}</b>
            <span class="pc-title">${prof.title ? '🏷️ ' + esc(this._titleName(prof.title)) : esc(tl(heroById(heroId).name))}</span></div>
          ${this._unlocked('modes') && rank ? `<div class="pc-rank">${rankBadge(rank, 44)}</div>` : ''}
        </button>
      </div>
      <div class="home-col home-left">
        ${ib('signin', 'signin', '', '📅', t('ui.signin'), dots.signin)}
        ${ib('missions', 'go', 'missions', '📋', t('ui.missions'), dots.missions)}
      </div>
      <div class="home-col home-right">
        ${ib('road', 'go', 'road', '🚀', t('ui.road'), dots.road, `<i class="ib-bar"><i style="width:${Math.round(roadInfo.frac * 100)}%"></i></i>`)}
        ${ib('dex', 'go', 'dex', '📖', t('ui.dex'), dots.dex)}
        ${ib('wardrobe', 'go', 'shop', '👕', t('ui.wardrobe'), dots.wardrobe)}
        ${capOn ? ib('capsule', 'go', 'capsule', capIco(), t('ui.capsule'), dots.capsule) : ''}
        ${ib('achievements', 'go', 'achievements', '🏅', t('ui.achievements'), dots.achievements)}
      </div>
      <button class="home-hero" data-act="poke" aria-label="${esc(t('ui.heroPoke'))}"></button>
      <div class="home-bottom">
        <div class="home-sub">
          ${ib('map', 'go', 'map', '🗺️', t('ui.map'), dots.map)}
          ${ib('heroes', 'go', 'heroes', '🦸', t('ui.heroes'), dots.heroes)}
          ${ib('modes', 'go', 'modes', '🌌', t('ui.modes'), dots.modes)}
        </div>
        <button class="btn-play" data-act="play" data-nav data-default>
          <span class="bp-main" data-text="${esc(t('ui.play'))}">${esc(t('ui.play'))}</span>
          <span class="bp-sub">${allDone ? '⭐ ' + esc(t('ui.allClear')) : `${stageId(n.worldId, n.stageId)} · ${esc(stageName(n.worldId, n.stageId))}`}</span>
          ${fw ? `<i class="bp-tag">${esc(t('ui.firstWin'))}</i>` : ''}
          ${rested > 0 ? `<i class="bp-moon" title="${esc(t('ui.rested'))}">🌙<b>${rested}</b></i>` : ''}
        </button>
      </div>`;
  }
  _afterHome() {
    // daily sign-in popup once per session when claimable (max 2 popups on open)
    if (!this.signinShown && this._dots().signin && this.G.save?.profile?.tutorialDone) {
      this.signinShown = true;
      this._enqueue({ type: 'signin', pri: 1 });
    }
    if (!this.health.nightShown && !this.G.meta?.healthCheck && this.G.save?.profile?.tutorialDone && this._isNight()) { this.health.nightShown = true; this._enqueue({ type: 'night', pri: 0.4 }); }
    if (this.pendingArrow) { const f = this.pendingArrow; this.pendingArrow = null; setTimeout(() => this._guideArrow(f), 350); }
  }
  _guideArrow(feature) {
    const target = this.screen?.el.querySelector(`[data-feature="${feature}"]`);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const a = document.createElement('div');
    const left = r.left + r.width / 2 < innerWidth / 2;
    a.className = 'guide-arrow ' + (left ? 'from-right' : 'from-left');
    a.innerHTML = `${cube({ color: '#ffffff', face: 'joy', size: 34, antenna: true })}<b><i></i></b>`;
    a.style.top = r.top + r.height / 2 + 'px';
    a.style.left = (left ? r.right + 8 : r.left - 8) + 'px';
    this.screen.el.appendChild(a);
    target.classList.add('pulse-new');
    const kill = () => { a.remove(); target.classList.remove('pulse-new'); };
    setTimeout(kill, TUNE.guideArrow * 1000);
    target.addEventListener('click', kill, { once: true });
  }

  // ═════════ WORLD MAP ═════════
  _s_map(p) {
    const w = clamp(p.w ?? this._nextStage().worldId, 0, DATA.worlds.length - 1);
    const next = this._nextStage();
    const planets = DATA.worlds.map((wd, i) => {
      const un = this._stageUnlocked(i, 0);
      const pal = wd.palette;
      const cr = this._worldCrowns(i), max = wd.stages.length * 3;
      const chestDot = un && this._worldChests(i).some((c) => c.claimable);
      return `<button class="planet-btn${i === w ? ' sel' : ''}${un ? '' : ' locked'}${this._worldCleared(i) ? ' done' : ''}" data-act="${un ? 'world' : 'worldLocked'}" data-w="${i}" data-nav>
        <div class="planet p${i}" style="--p1:${hex(pal.planet)};--p2:${hex(pal.skyTop)};--p3:${hex(pal.rim)};--p4:${hex(pal.skyBottom)}"><i class="pl-ring"></i><i class="pl-shine"></i>${un ? '' : '<i class="pl-lock">🔒</i>'}${i === next.worldId ? `<i class="pl-here">${heroCube(this._mv('selectedHero', 'blu'), { size: 26 })}</i>` : ''}</div>
        <b class="pl-name">${i + 1}. ${esc(tl(wd.name))}</b>
        <span class="pl-crowns">${crown(cr > 0)}<b>${cr}/${max}</b></span>${chestDot ? '<i class="dot"></i>' : ''}
      </button>`;
    }).join('<i class="pl-path"></i>');
    const wd = DATA.worlds[w];
    const chests = this._worldChests(w).map((c, i) => `
      <button class="wchest${c.claimed ? ' open' : ''}${c.claimable ? ' ready' : ''}" data-act="wchest" data-w="${w}" data-i="${i}" data-nav>
        <i class="chest-ico"><i class="lid"></i><i class="box"></i></i><span>${crown(true)}${c.stars}</span>${c.claimable ? '<i class="dot"></i>' : ''}</button>`).join('');
    const pads = wd.stages.map((st, s) => {
      const un = this._stageUnlocked(w, s);
      const cr = this._crowns(w, s);
      const isNext = next.worldId === w && next.stageId === s && !cr[0];
      const boss = st.kind === 'boss';
      return `<button class="pad${un ? '' : ' locked'}${boss ? ' boss' : ''}${isNext ? ' next' : ''}${cr[0] ? ' clear' : ''}" data-act="${un ? 'stage' : 'stageLocked'}" data-w="${w}" data-s="${s}" data-nav ${isNext ? 'data-default' : ''}>
        ${isNext ? `<i class="pad-hero">${heroCube(this._mv('selectedHero', 'blu'), { size: 30 })}</i>` : ''}
        <span class="pad-top">${boss ? enemyCube('king', { size: 40 }) : `<b class="pad-id">${stageId(w, s)}</b>`}</span>
        <span class="pad-crowns">${cr.map((c) => crown(c)).join('')}</span>
        ${st.newEnemy && un ? `<i class="pad-new">${enemyCube(st.newEnemy, { size: 22 })}</i>` : ''}
        ${un ? '' : '<i class="pad-lock">🔒</i>'}
      </button>`;
    }).join('');
    return `${this._head(t('ui.map'), '🗺️')}
      <div class="map-planets scroll-x">${planets}</div>
      <section class="panel world-panel" style="--wc:${hex(wd.palette.rim)}">
        <div class="wp-head">
          <div class="wp-title"><b>${esc(t('ui.world', { n: w + 1 }))} · ${esc(tl(wd.name))}</b><small>${esc(tl(wd.desc))}</small></div>
          <div class="wp-chests">${chests}</div>
        </div>
        <div class="pads">${pads}</div>
      </section>`;
  }
  _p_map(el) {
    const sel = el.querySelector('.planet-btn.sel');
    const strip = el.querySelector('.map-planets');
    if (sel && strip) strip.scrollLeft = sel.offsetLeft - strip.clientWidth / 2 + sel.offsetWidth / 2;
  }
  _worldChests(w) {
    const v = this._m('worldChests', w);
    const cr = this._worldCrowns(w);
    const base = DATA.economy.worldChests;
    return base.map((c, i) => {
      const m = Array.isArray(v) ? v[i] || {} : {};
      const reward = c.reward.worldHat ? { hat: DATA.hats.find((h) => h.source === 'chest' && h.world === w)?.id } : c.reward;
      return { stars: c.stars, reward: m.reward || reward, claimed: !!m.claimed, claimable: m.claimable ?? false, have: cr };
    });
  }
  _claimWorldChest(w, i) {
    const c = this._worldChests(w)[i];
    if (!c) return;
    if (c.claimable) {
      const r = this._m('claimWorldChest', w, i);
      if (r === false) { this._blip('error'); return; }
      this._blip('claim');
      this._rerender();
      return;
    }
    this._blip(c.claimed ? 'click' : 'error');
    if (!c.claimed) this.toast(t('ui.chestNeed', { n: c.stars }) + ' (' + c.have + '/' + c.stars + ')', '🎁');
  }
  _stageCard(w, s) {
    const st = DATA.worlds[w]?.stages?.[s];
    if (!st) return;
    const cr = this._crowns(w, s);
    const o = st.objective;
    const reqs = [
      ['🏁', t('ui.crownClear')], ['💔≤2', t('ui.crownHits')], [o?.icon || '⭐', o ? objText(o) : t('obj.freeAll')],
    ].map(([ic, lb], i) => `<div class="req${cr[i] ? ' got' : ''}">${crown(cr[i])}<span class="req-ico">${ic}</span><small>${esc(lb)}</small></div>`).join('');
    const ne = st.newEnemy || (st.kind === 'boss' ? 'king' : null);
    const neName = ne === 'king' ? tl(DATA.boss.name) : tl(DATA.enemies[ne]?.name);
    this._open('stage', `<div class="panel stage-card pop">
      <button class="x-btn" data-act="close" data-id="stage" data-nav>✕</button>
      <div class="sc-id">${stageId(w, s)}</div>
      <h3 class="sc-name">${esc(tl(st.name))}</h3><small class="sc-world">🪐 ${esc(t('ui.world', { n: w + 1 }))} · ${esc(worldName(w))}</small>
      ${ne ? `<div class="sc-new"><i class="spot">${ne === 'king' ? enemyCube('king', { size: 56 }) : enemyCube(ne, { size: 52 })}</i><div><b>${esc(st.kind === 'boss' ? t('ui.boss') : t('ui.newEnemy'))}</b><span>${esc(neName)}</span></div></div>` : ''}
      <div class="sc-reqs">${reqs}</div>
      <button class="btn-play small" data-act="stageGo" data-w="${w}" data-s="${s}" data-nav data-default><span class="bp-main" data-text="${esc(t('ui.go'))}">${esc(t('ui.go'))}</span></button>
    </div>`);
  }

  // ═════════ HEROES ═════════
  _s_heroes(p) {
    const sel = this._mv('selectedHero', 'blu');
    const id = p.id || sel;
    const h = heroById(id);
    const un = this._heroUnlocked(id);
    const roster = DATA.heroes.map((hd) => {
      const u = this._heroUnlocked(hd.id);
      return `<button class="hero-card${hd.id === id ? ' sel' : ''}${u ? '' : ' locked'}" data-act="hero" data-id="${hd.id}" data-nav ${hd.id === id ? 'data-default' : ''}>
        ${heroCube(hd.id, { size: 58, sil: !u, color: u ? this._skinColor(hd.id) : undefined })}
        <b>${esc(u ? tl(hd.name) : '???')}</b>
        ${hd.id === sel ? '<i class="hc-check">✓</i>' : ''}${u ? '' : '<i class="hc-lock">🔒</i>'}</button>`;
    }).join('');
    const bar = (v, max) => `<i class="stat-bar"><i style="width:${Math.round(clamp(v / max, 0.08, 1) * 100)}%"></i></i>`;
    const stats = `
      <div class="stat"><span class="st-ico">♥</span><span class="st-lbl">${esc(t('ui.hearts'))}</span><span class="hearts">${'<i>♥</i>'.repeat(h.hearts)}</span></div>
      <div class="stat"><span class="st-ico">👟</span><span class="st-lbl">${esc(t('ui.speed'))}</span>${bar(h.speed - 4.5, 2.5)}</div>
      <div class="stat"><span class="st-ico">⚡</span><span class="st-lbl">${esc(t('ui.dashLen'))}</span>${bar(h.dashDist, 5.5)}</div>
      <div class="stat"><span class="st-ico">🔋</span><span class="st-lbl">${esc(t('ui.stamina'))}</span><span class="pips">${'<i>⚡</i>'.repeat(Math.floor(100 / h.dashCost))}</span></div>`;
    let body;
    if (un) {
      const tab = p.tab || 'skin';
      const items = (tab === 'skin' ? DATA.skins.filter((s) => s.hero === id) : catalog(tab)).filter((it) => this._owns(tab, it.id));
      const eq = this._equipped(tab, id);
      const chips = items.map((it) => `<button class="chip-item r-${it.rarity}${it.id === eq ? ' on' : ''}" data-act="equip" data-kind="${tab}" data-id="${it.id}" data-hero="${id}" data-nav>
        <span class="ci-vis">${tab === 'skin' ? skinSwatch(it, 34) : tab === 'hat' ? `<span class="emo">${HAT_ICON[it.id] || '🎩'}</span>` : trailSwatch(it)}</span><small>${esc(tl(it.name))}</small></button>`).join('');
      body = `
        <div class="kit">
          <div class="kit-row"><span class="kit-tag">${esc(t('ui.passive'))}</span><b>${esc(tl(h.passive.name))}</b><p>${esc(tl(h.passive.desc))}</p></div>
          <div class="kit-row nova"><span class="kit-tag gold">${esc(t('ui.nova'))}</span><b>${esc(tl(h.nova.name))}</b><p>${esc(tl(h.nova.desc))}</p></div>
        </div>
        ${id === sel ? `<div class="tryon"><div class="tabs">${['skin', 'hat', 'trail'].map((k) => `<button class="tab${k === tab ? ' on' : ''}" data-act="heroTab" data-tab="${k}" data-nav>${esc(t('ui.' + k + 's'))}</button>`).join('')}</div>
          <div class="chips scroll-x">${chips}</div></div>`
          : `<button class="btn btn-blue big" data-act="hero" data-id="${id}" data-nav>${esc(t('ui.select'))}</button>`}`;
    } else {
      body = `<div class="unlock-how"><b>${esc(t('ui.howUnlock'))}</b>${heroUnlockLines(h).map((l) => `<span>${esc(l)}</span>`).join(`<i class="or">${esc(t('ui.or'))}</i>`)}</div>`;
    }
    return `${this._head(t('ui.heroes'), '🦸')}
      <div class="hero-roster">${roster}</div>
      <section class="panel hero-detail" style="--hc:${hex(h.color)}">
        <div class="hd-head"><b class="hd-name">${esc(un ? tl(h.name) : '???')}</b><span class="hd-role">${esc(tl(h.role))}</span>${id === sel ? `<i class="hd-sel">✓ ${esc(t('ui.selected'))}</i>` : ''}</div>
        <p class="hd-blurb">${esc(tl(h.blurb))}</p>
        <div class="stats">${stats}</div>
        ${body}
      </section>`;
  }
  _skinColor(heroId) { return itemDef('skin', this._equipped('skin', heroId))?.color ?? heroById(heroId).color; }
  _pickHero(id) {
    if (!this._heroUnlocked(id)) { this.go('heroes', { ...this.screen?.params, id }); return; }
    if (this._mv('selectedHero', 'blu') !== id) { this.G.app?.selectHero?.(id); this._sfx('unlock'); }
    this.go('heroes', { ...this.screen?.params, id });
  }
  _equipItem(kind, id, heroId) {
    heroId = heroId || this._mv('selectedHero', 'blu');
    if (!this._owns(kind, id)) { this._blip('error'); return; }
    this._m('equip', kind, id, heroId);
    this.G.app?.refreshHub?.();
    this._blip('click');
    this._sfx('whoosh');
    this._rerender();
  }

  // ═════════ GALAXY ROAD 银河之路 ═════════
  _roadData() {
    const r = this._m('road');
    const freed = n0(r?.freed ?? this._mv('freed', 0));
    const src = Array.isArray(r) ? r : r?.nodes || r?.list || null;
    const nodes = DATA.road.map((n, i) => {
      const m = src?.[i] || {};
      const claimed = !!(m.claimed ?? (Array.isArray(r?.claimed) ? r.claimed.includes(i) : false));
      return { i, at: m.at ?? n.at, reward: m.reward ?? n.reward, claimed, claimable: m.claimable ?? (!!src && !claimed && freed >= n.at) };
    });
    let reached = -1;
    nodes.forEach((n, i) => { if (freed >= n.at) reached = i; });
    const nx = nodes[reached + 1];
    const prevAt = reached >= 0 ? nodes[reached].at : 0;
    const frac = nx ? clamp((freed - prevAt) / Math.max(1, nx.at - prevAt), 0, 1) : 1;
    const overflow = r?.overflow || null;
    return { freed, nodes, reached, next: nx, frac, overflow, claimable: nodes.filter((n) => n.claimable).length + n0(overflow?.claimable) };
  }
  _s_road() {
    const R = this._roadData();
    const step = 132, H = 300, mid = H / 2 + 6;
    const pos = (i) => ({ x: 96 + i * step, y: mid + Math.sin(i * 0.9) * 70 });
    const pts = R.nodes.map((_, i) => pos(i));
    pts.push(pos(R.nodes.length));
    let d = `M ${pts[0].x - 80} ${pts[0].y}`;
    pts.forEach((p, i) => { const q = pts[i - 1] || { x: p.x - 80, y: p.y }; const mx = (q.x + p.x) / 2; d += ` C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`; });
    const heroI = R.reached + R.frac;
    const hp = { x: lerp(pos(Math.floor(heroI)).x, pos(Math.floor(heroI) + 1).x, heroI % 1), y: 0 };
    const W = pts[pts.length - 1].x + 120;
    const nodes = R.nodes.map((n, i) => {
      const p = pos(i);
      const it = rewardItems(n.reward)[0];
      const upcoming = i > R.reached && i <= R.reached + 3;
      const cls = n.claimed ? 'claimed' : n.claimable ? 'ready' : i <= R.reached ? 'reached' : upcoming ? 'big' : 'far';
      return `<button class="rnode ${cls} r-${it?.rarity || 'common'}" style="left:${p.x}px;top:${p.y}px" data-act="roadClaim" data-i="${i}" data-nav ${n.claimable && !this._roadDef ? (this._roadDef = 'data-default') : ''}>
        <span class="rn-vis">${it ? itemVisual(it.kind, it.id, 34) : '🎁'}</span>
        ${it?.amount ? `<b class="rn-amt">×${fmtInt(it.amount)}</b>` : ''}
        <span class="rn-at">🕊️${fmtInt(n.at)}</span>${n.claimed ? '<i class="rn-check">✓</i>' : ''}${n.claimable ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');
    this._roadDef = null;
    const endP = pos(R.nodes.length);
    const next = R.next;
    const nextIt = next ? rewardItems(next.reward)[0] : null;
    return `${this._head(t('ui.road'), '🚀', `<span class="pill-stat">🕊️ ${esc(t('ui.freedTotal', { n: fmtInt(R.freed) }))}</span>`)}
      <div class="road-scroll scroll scroll-x">
        <div class="road-track" style="width:${W}px;height:${H}px">
          <svg class="road-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><clipPath id="roadClip"><rect x="0" y="0" width="${Math.max(0, hp.x)}" height="${H}"/></clipPath></defs>
            <path class="rd-base" d="${d}"/><path class="rd-dash" d="${d}"/><path class="rd-prog" d="${d}" clip-path="url(#roadClip)"/></svg>
          ${nodes}
          <button class="rnode overflow${n0(R.overflow?.claimable) ? ' ready' : ''}" style="left:${endP.x}px;top:${endP.y}px" data-act="roadClaim" data-i="overflow" data-nav><span class="rn-vis"><span class="emo">🎁</span></span><span class="rn-at">+${DATA.roadOverflow.every}</span>${n0(R.overflow?.claimable) ? this._dot(R.overflow.claimable) : ''}</button>
          <div class="road-hero" style="left:${hp.x}px;top:${lerp(pos(Math.floor(heroI)).y, pos(Math.floor(heroI) + 1).y, heroI % 1)}px">${heroCube(this._mv('selectedHero', 'blu'), { size: 40, limbs: true })}</div>
        </div>
      </div>
      <footer class="panel road-foot">
        ${next ? `<div class="rf-next"><span>${esc(t('ui.roadNext', { n: fmtInt(next.at - R.freed) }))}</span><b class="rf-arrow">→</b><span class="rf-vis">${nextIt ? itemVisual(nextIt.kind, nextIt.id, 30) : '🎁'}</span>
          <i class="bar"><i style="width:${Math.round(R.frac * 100)}%"></i></i></div>` : `<div class="rf-next"><b>${esc(t('ui.roadDone'))}</b></div>`}
        <small class="rf-hint">${esc(t('ui.roadHint'))}</small>
        ${R.claimable ? `<button class="btn btn-gold" data-act="roadAll" data-nav data-default>${esc(t('ui.claimAll'))}${this._dot(R.claimable)}</button>` : ''}
      </footer>`;
  }
  _p_road(el) {
    const sc = el.querySelector('.road-scroll');
    const hero = el.querySelector('.road-hero');
    if (sc && hero) sc.scrollLeft = hero.offsetLeft - sc.clientWidth * 0.4;
  }
  _claimRoad(i) {
    if (i === 'overflow') { const r = this._m('claimRoad', 'overflow'); this._blip(r ? 'claim' : 'error'); if (!r) this.toast(t('ui.roadNext', { n: fmtInt(Math.max(0, n0(this._roadData().overflow?.nextAt) - this._roadData().freed)) }), '🕊️'); this._rerender(); return; }
    const n = this._roadData().nodes[i];
    if (!n) return;
    if (!n.claimable) { this._blip(n.claimed ? 'click' : 'error'); if (!n.claimed) this.toast(t('ui.roadNext', { n: fmtInt(n.at - this._roadData().freed) }), '🕊️'); return; }
    const r = this._m('claimRoad', i);
    if (r === false) { this._blip('error'); return; }
    this._blip('claim');
    this._rerender();
  }
  _claimRoadAll() {
    if (typeof this.G.meta?.claimAllRoad === 'function') { const r = this._m('claimAllRoad'); this._blip(r ? 'claim' : 'error'); this._rerender(); return; }
    const R = this._roadData();
    let any = false;
    for (const n of R.nodes) if (n.claimable && this._m('claimRoad', n.i) !== false) any = true;
    this._blip(any ? 'claim' : 'error');
    this._rerender();
  }

  // ═════════ MISSIONS + SIGN-IN ═════════
  _missionData() {
    const m = this._m('missions');
    const raw = Array.isArray(m) ? m : m?.list || m?.missions || [];
    const list = raw.map((mi, i) => {
      const def = DATA.missions.find((d) => d.id === (mi.id ?? mi.def ?? mi.templateId)) || {};
      const target = n0(mi.target ?? mi.n ?? def.n?.[0] ?? 1);
      const cur = Math.min(target, n0(mi.cur ?? mi.progress ?? 0));
      const heroName = mi.hero ? tl(heroById(mi.hero).name) : '';
      const text = (mi.text ? tl(mi.text) : tl(def.text) || String(mi.id)).replace('{n}', target).replace('{hero}', heroName);
      return { i: mi.index ?? i, id: mi.id, icon: mi.icon || def.icon || '⭐', text, cur, target, done: mi.done ?? cur >= target,
        claimed: !!mi.claimed, reward: mi.reward || DATA.economy.missionReward[def.slot || 'easy'], slot: mi.slot || def.slot };
    });
    const chestRaw = m?.chest ?? this._m('dailyChest');
    const doneCount = list.filter((x) => x.done).length;
    const chest = { progress: n0(chestRaw?.progress ?? chestRaw?.done ?? doneCount), need: n0(chestRaw?.need ?? 3), claimed: !!chestRaw?.claimed,
      claimable: chestRaw?.claimable ?? false, reward: chestRaw?.reward || DATA.economy.dailyChest };
    return { list, rerolls: n0(m?.rerolls ?? m?.rerollsLeft ?? this._mq('rerollsLeft') ?? 1), chest };
  }
  _signinData() {
    const s = this._m('signin') || {};
    const count = n0(s.count ?? s.days ?? s.claimedDays ?? s.total ?? 0);
    const claimable = !!(s.canClaim ?? s.claimable ?? (s.claimedToday === undefined ? false : !s.claimedToday));
    const k = claimable ? count : Math.max(0, count - 1);
    const base = k < 7 ? 0 : 7 + Math.floor((k - 7) / 7) * 7;
    if (Array.isArray(s.days)) {       // meta.js: {days:[{n, state, items}], count, canClaim}
      const cl = !!(s.canClaim ?? claimable);
      return { count, claimable: cl, novice: !!s.novice, cards: s.days.map((d) => ({ day: n0(d.n) + 1, reward: d.items || d.reward, claimed: d.state === 'claimed', today: d.state === 'today' })) };
    }
    const table = s.rewards || (base === 0 ? DATA.signin.novice : DATA.signin.loop);
    const cards = table.slice(0, 7).map((rw, i) => ({ day: base + i + 1, reward: rw, claimed: base + i < count, today: claimable && base + i === count }));
    return { count, claimable, cards, novice: base === 0 };
  }
  _signinStrip() {
    const S = this._signinData();
    const cards = S.cards.map((c) => {
      const it = rewardItems(c.reward)[0];
      return `<div class="si-card${c.claimed ? ' claimed' : ''}${c.today ? ' today' : ''}${c.day % 7 === 0 ? ' big' : ''} r-${it?.rarity || 'common'}">
        <small>${esc(c.today ? t('ui.today') : t('ui.day', { n: c.day }))}</small>
        <span class="si-vis">${it ? itemVisual(it.kind, it.id, 32) : '🎁'}</span>
        <b>${it?.amount ? '×' + fmtInt(it.amount) : esc(it?.label || '')}</b>
        ${c.claimed ? `<i class="stamp">${esc(t('ui.claimed'))}</i>` : ''}</div>`;
    }).join('');
    return `<div class="si-head"><b>📅 ${esc(t('ui.signinTitle'))}</b><small>${esc(t('ui.signinDays', { n: S.count }))}</small></div>
      <div class="si-row">${cards}</div>
      ${S.claimable ? `<button class="btn btn-gold pulse" data-act="signinClaim" data-nav data-default>${esc(t('ui.claim'))}</button>` : ''}`;
  }
  _showSignin() {
    if (this._isOpen('signin')) return;
    this._open('signin', `<div class="panel signin-pop pop"><button class="x-btn" data-act="close" data-id="signin" data-nav>✕</button>${this._signinStrip()}</div>`);
  }
  _claimSignin() {
    const r = this._m('claimSignin');
    if (r === false || r === undefined && !this.G.meta?.claimSignin) { this._blip('error'); return; }
    this._blip('claim');
    this._close('signin', true);
    if (this.screen) this._rerender();
  }
  _s_missions() {
    const M = this._missionData();
    const rows = M.list.map((mi) => `
      <div class="mis-row${mi.done ? ' done' : ''}${mi.claimed ? ' claimed' : ''}">
        <span class="mis-ico">${mi.icon}</span>
        <div class="mis-mid"><b>${esc(mi.text)}</b><i class="bar"><i style="width:${Math.round((mi.cur / mi.target) * 100)}%"></i></i><small>${fmtInt(mi.cur)} / ${fmtInt(mi.target)}</small></div>
        <span class="mis-rw">${rewardIconLine(mi.reward)}</span>
        ${mi.claimed ? `<i class="stamp sm">${esc(t('ui.claimed'))}</i>`
          : mi.done ? `<button class="btn btn-gold sm pulse" data-act="misClaim" data-i="${mi.i}" data-nav>${esc(t('ui.claim'))}</button>`
          : M.rerolls > 0 ? `<button class="btn btn-white sm" data-act="misReroll" data-i="${mi.i}" data-nav title="${esc(t('ui.reroll'))}">🔄</button>` : ''}
      </div>`).join('') || `<div class="empty">🎉 ${esc(t('ui.noMissions'))}</div>`;
    const C = M.chest;
    const anyClaim = M.list.some((x) => x.done && !x.claimed);
    return `${this._head(t('ui.missions'), '📋')}
      <div class="scroll mis-wrap">
        <section class="panel signin-strip">${this._signinStrip()}</section>
        <section class="panel mis-list">
          <div class="mis-head"><b>📋 ${esc(t('ui.missions'))}</b><small>🔄 ${esc(t('ui.rerollLeft', { n: M.rerolls }))} · ⏰ ${esc(t('ui.refreshTomorrow'))}</small></div>
          ${rows}
          ${anyClaim ? `<button class="btn btn-gold" data-act="misAll" data-nav>${esc(t('ui.claimAll'))}</button>` : ''}
        </section>
        <section class="panel daily-chest${C.claimable ? ' ready' : ''}${C.claimed ? ' open' : ''}">
          <i class="chest-ico big"><i class="lid"></i><i class="box"></i></i>
          <div class="dc-mid"><b>${esc(t('ui.dailyChest'))}</b><span class="dc-pips">${[0, 1, 2].map((i) => `<i class="${i < C.progress ? 'on' : ''}">✓</i>`).join('')}</span><small>${esc(t('ui.chestHint'))}</small></div>
          <span class="mis-rw">${rewardIconLine(C.reward)}</span>
          ${C.claimed ? `<i class="stamp sm">${esc(t('ui.claimed'))}</i>` : C.claimable ? `<button class="btn btn-gold pulse" data-act="dailyChest" data-nav>${esc(t('ui.claim'))}</button>` : ''}
        </section>
      </div>`;
  }
  _claimMission(i) { const r = this._m('claimMission', i); this._blip(r === false ? 'error' : 'claim'); this._rerender(); }
  _claimMissionAll() {
    if (typeof this.G.meta?.claimAllMissions === 'function') { const r = this._m('claimAllMissions'); this._blip(r ? 'claim' : 'error'); this._rerender(); return; }
    const list = this._missionData().list.filter((x) => x.done && !x.claimed);
    for (const mi of list) this._m('claimMission', mi.i);
    this._blip(list.length ? 'claim' : 'error');
    this._rerender();
  }
  _rerollMission(i) {
    const r = this._m('rerollMission', i) ?? this._m('reroll', i);
    if (r === false || r === undefined) { this._blip('error'); return; }
    this._blip('click'); this._sfx('whoosh');
    this._rerender();
    this.screen?.el.querySelectorAll('.mis-row')[i]?.classList.add('flip');
  }
  _claimDailyChest() { const r = this._m('claimDailyChest'); this._blip(r === false || r === undefined ? 'error' : 'claim'); this._rerender(); }

  // ═════════ WARDROBE 衣橱 ═════════
  _s_shop(p) {
    const tab = p.tab || 'skin';
    const sel = this._mv('selectedHero', 'blu');
    const hero = p.hero || sel;
    const list = tab === 'skin' ? DATA.skins.filter((s) => s.hero === hero) : catalog(tab);
    const eq = this._equipped(tab, hero);
    const heroOk = this._heroUnlocked(hero);
    const cards = list.map((it) => {
      const own = this._owns(tab, it.id);
      const on = own && it.id === eq;
      const price = DATA.economy.prices[it.rarity];
      const src = itemSources(tab, it).filter((s) => s !== t('ui.srcCapsule') || !own);
      const foot = on ? `<span class="it-state on">✓ ${esc(t('ui.equipped'))}</span>`
        : own ? `<span class="it-state">${esc(heroOk || tab !== 'skin' ? t('ui.equip') : t('ui.owned'))}</span>`
        : it.shop ? `<span class="it-price">${coinIco()}<b>${fmtInt(price)}</b></span>`
        : `<span class="it-src">${esc(src[0] || '')}</span>`;
      const vis = tab === 'skin' ? skinSwatch(it, 58) : tab === 'hat' ? `<span class="emo big">${HAT_ICON[it.id] || '🎩'}</span>` : trailSwatch(it);
      return `<button class="item r-${it.rarity}${own ? ' owned' : ''}${on ? ' on' : ''}" data-act="shopItem" data-kind="${tab}" data-id="${it.id}" data-nav>
        <i class="it-rar">${esc(tl(rarityOf(it.rarity).name))}</i>
        <span class="it-vis">${vis}</span><b class="it-name">${esc(tl(it.name))}</b>${foot}
        ${!own && it.shop && src.length ? `<small class="it-also">${esc(src.join(' · '))}</small>` : ''}</button>`;
    }).join('');
    const heroChips = tab === 'skin' ? `<div class="hero-chips">${DATA.heroes.map((h) => `<button class="hchip${h.id === hero ? ' on' : ''}" data-act="shopHero" data-hero="${h.id}" data-nav>${heroCube(h.id, { size: 30, sil: !this._heroUnlocked(h.id) })}</button>`).join('')}</div>` : '';
    return `${this._head(t('ui.wardrobe'), '👕')}
      <section class="panel shop-panel">
        <div class="tabs">${['skin', 'hat', 'trail'].map((k) => `<button class="tab${k === tab ? ' on' : ''}" data-act="shopTab" data-tab="${k}" data-nav ${k === tab ? 'data-default' : ''}>${esc(t('ui.' + k + 's'))}</button>`).join('')}</div>
        ${heroChips}
        <div class="item-grid scroll">${cards}</div>
      </section>`;
  }
  _shopItem(kind, id) {
    const def = itemDef(kind, id);
    if (!def) return;
    const hero = kind === 'skin' ? def.hero : this.screen?.params?.hero || this._mv('selectedHero', 'blu');
    if (this._owns(kind, id)) {
      if (kind === 'skin' && !this._heroUnlocked(def.hero)) { this._blip('error'); this.toast(t('ui.needHero', { hero: tl(heroById(def.hero).name) }), '🔒'); return; }
      this._equipItem(kind, id, hero);
      return;
    }
    if (!def.shop) { this._blip('error'); this.toast(itemSources(kind, def)[0] || t('ui.locked'), '🔒'); return; }
    const price = DATA.economy.prices[def.rarity];
    if (n0(this._mv('coins', 0)) < price) { this._blip('error'); this.toast(t('ui.notEnough'), '🪙'); this._shake(this.walletEl.querySelector('.w-coins')); return; }
    this._confirm(t('ui.buyConfirm', { n: fmtInt(price), name: tl(def.name) }), () => {
      const r = this._m('buy', kind, id);
      if (r === false || r?.ok === false || r === undefined) { this._blip('error'); this.toast(t('ui.notEnough'), '🪙'); return; }
      this._blip('buy');
      this.toast(t('ui.bought') + ' ' + tl(def.name), '🛍️');
      if (kind !== 'skin' || this._heroUnlocked(def.hero)) { this._m('equip', kind, id, hero); this.G.app?.refreshHub?.(); }
      this._rerender();
    }, { icon: `<span class="dlg-vis">${itemVisual(kind, id, 60)}</span>`, yesLabel: t('ui.buy') });
  }
  _shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ═════════ CAPSULE MACHINE 扭蛋机 (tickets only) ═════════
  _capInfo() {
    const i = this._m('capsuleInfo') || {};
    const p = this.G.save?.profile?.capsule || {};
    const s = this._settings();
    return {
      enabled: i.enabled ?? (s.capsuleOn !== false && s.capsule !== false),
      today: n0(i.today ?? p.today ?? 0), cap: n0(i.cap ?? DATA.economy.capsule.dailyCap),
      free: n0(i.free ?? i.freePulls ?? p.free ?? 0),
      sinceEpic: n0(i.sinceEpic ?? p.sinceEpic ?? 0), sinceLegend: n0(i.sinceLegend ?? p.sinceLegend ?? 0),
    };
  }
  _s_capsule() {
    const C = this._capInfo(), cap = DATA.capsule;
    const pool = cap.pool().map((it) => ({ ...it, own: this._owns(it.kind, it.id) }));
    const left = pool.filter((x) => !x.own).length;
    const odds = Object.entries(cap.odds).map(([r, p]) => `<div class="odd r-${r}"><b>${esc(tl(rarityOf(r).name))}</b><i class="odd-bar"><i style="width:${Math.max(3, p * 100)}%"></i></i><small>${esc(t('ui.oddsLine', { n: Math.round(p * 100) }))}</small></div>`).join('');
    const mp = this._m('capsuleInfo')?.pity;
    const pe = n0(mp?.epicIn) || clamp(cap.epicPity - C.sinceEpic, 1, cap.epicPity), pl = n0(mp?.legendIn) || clamp(cap.legendHardPity - C.sinceLegend, 1, cap.legendHardPity);
    const grid = pool.map((it) => `<div class="pool-it r-${it.rarity}${it.own ? ' own' : ''}" title="${esc(tl(itemDef(it.kind, it.id)?.name))}">${itemVisual(it.kind, it.id, 30)}${it.own ? '<i class="ok">✓</i>' : ''}</div>`).join('');
    const canPay = C.free > 0 || n0(this._mv('tickets', 0)) > 0;
    const capsules = ['#ff7ab8', '#5fd0ff', '#ffd84a', '#b26bff', '#7dffc0', '#ff9a3c', '#8fb8ff', '#ffffff', '#ff7ab8', '#5fd0ff', '#ffd84a'].map((c, i) => `<i class="gc gc${i}" style="--gc:${c}"></i>`).join('');
    return `${this._head(t('ui.capsule'), capIco())}
      <div class="cap-layout">
        <div class="gacha-wrap">
          <div class="gacha${C.enabled ? '' : ' off'}">
            <div class="g-globe"><div class="g-glass"></div>${capsules}</div>
            <div class="g-body"><i class="g-plate">CUBE</i><button class="g-crank" data-act="capPull" aria-label="crank"><i></i></button><i class="g-chute"></i></div>
            <div class="g-tray"></div>
          </div>
          <div class="cap-actions">
            ${C.enabled ? `<button class="btn-play small${canPay ? '' : ' dim'}" data-act="capPull" data-nav data-default>
              <span class="bp-main" data-text="${esc(t('ui.pull'))}">${esc(t('ui.pull'))}</span>
              <span class="bp-sub">${C.free > 0 ? `🎁 ${esc(t('ui.free'))} ×${C.free}` : `${ticketIco()} ×1`}</span></button>` : `<div class="empty">😴 ${esc(t('ui.capsuleOff'))}</div>`}
            <small class="cap-count">${esc(t('ui.todayPulls', { n: C.today, max: C.cap }))} · ${esc(t('ui.ticketOnly'))}</small>
          </div>
        </div>
        <section class="panel cap-info scroll">
          <h4>ℹ️ ${esc(t('ui.odds'))}</h4>
          <div class="odds">${odds}</div>
          <div class="pity"><small>${esc(t('ui.pityEpic', { n: pe }))}</small><i class="bar epic"><i style="width:${Math.round((C.sinceEpic / cap.epicPity) * 100)}%"></i></i></div>
          <div class="pity"><small>${esc(t('ui.pityLegend', { n: pl }))}</small><i class="bar legend"><i style="width:${Math.round((C.sinceLegend / cap.legendHardPity) * 100)}%"></i></i></div>
          <h4>🎁 ${esc(t('ui.pool'))} <small>(${pool.length - left}/${pool.length})</small></h4>
          <p class="note">✨ ${esc(left ? t('ui.onlyNew') : t('ui.allOwned'))}</p>
          <div class="pool-grid">${grid}</div>
        </section>
      </div>`;
  }
  _capPull() {
    if (this.capBusy) return;
    const C = this._capInfo();
    if (!C.enabled) { this._blip('error'); this.toast(t('ui.capsuleOff'), '😴'); return; }
    if (C.today >= C.cap) { this._blip('error'); this.toast(t('ui.capDone'), '🌙'); return; }
    if (C.free <= 0 && n0(this._mv('tickets', 0)) <= 0) { this._blip('error'); this.toast(t('ui.noTickets'), '🎟️'); this._shake(this.walletEl.querySelector('.w-tickets')); return; }
    const prize = this._m('capsule', 'ticket');
    if (!prize || prize.ok === false || prize.error) {
      this._blip('error');
      const why = prize?.reason || prize?.error;
      this.toast(why === 'cap' ? t('ui.capDone') : why === 'off' || why === 'locked' ? t('ui.capsuleOff') : why === 'all' ? t('ui.allOwned') : t('ui.noTickets'), '🎟️');
      return;
    }
    // normalise: {kind,id,rarity} | {refund, rarity} | {item:{…}}
    const it = prize.item || prize;
    const rarity = it.rarity || itemDef(it.kind, it.id)?.rarity || 'common';
    this.capBusy = { prize: it, rarity, refund: n0(prize.refund ?? it.refund) };
    const g = this.screen?.el.querySelector('.gacha');
    this._sfx('capsule');
    if (!g || REDUCED) { this._capReveal(); return; }
    g.classList.remove('crank'); void g.offsetWidth; g.classList.add('crank');
    const tray = g.querySelector('.g-tray');
    setTimeout(() => {
      tray.innerHTML = `<button class="cap-ball r-${rarity}" data-act="capOpen" data-nav data-default><i class="top"></i><i class="bot"></i>${rarity === 'legend' ? '<i class="beam"></i>' : ''}</button><b class="tap-open">${esc(t('ui.tapOpen'))}</b>`;
      this._layerChanged();
      if (rarity === 'legend' || rarity === 'epic') this._sfx('star');
    }, 720);
    this.capAuto = setTimeout(() => this._capOpen(), 4500);
  }
  _capOpen() {
    clearTimeout(this.capAuto);
    if (!this.capBusy) return;
    const ball = this.screen?.el.querySelector('.cap-ball');
    if (ball && !REDUCED) { ball.classList.add('pop'); setTimeout(() => this._capReveal(), 380); }
    else this._capReveal();
  }
  _capReveal() {
    const b = this.capBusy;
    this.capBusy = null;
    if (!b) return;
    this._sfx(b.rarity === 'legend' ? 'rankup' : 'unlock');
    if (b.refund) this.queueClaim([{ coins: b.refund }], 'capsule', { title: t('ui.refund'), applied: !this._pullMode() });
    else this.queueClaim([{ kind: b.prize.kind, id: b.prize.id }], 'capsule', { applied: false, title: t('ui.gotItem') });
    this._afterClaim = () => { if (this.screen?.name === 'capsule') this._rerender(); };
  }

  // ═════════ CUBE-DEX 图鉴 ═════════
  _dexData() {
    const d = this._m('dex') || {};
    const src = d.entries || d.list || (Array.isArray(d) ? d : d.counts || d);
    const map = {};
    if (Array.isArray(src)) for (const e of src) map[e.id || e.type] = e;
    else if (src && typeof src === 'object') Object.assign(map, src);
    const entry = (id) => {
      const e = map[id];
      const count = typeof e === 'number' ? e : n0(e?.count ?? e?.freed ?? 0);
      const found = !!(e?.found ?? e?.discovered ?? count > 0);
      const ms = DATA.dex.milestones.map((m, i) => {
        const me = Array.isArray(e?.milestones) ? e.milestones[i] || {} : {};
        const claimed = !!(me.claimed ?? (Array.isArray(e?.claimed) ? e.claimed.includes(m.n) : false));
        return { n: m.n, reward: m.reward, claimed, claimable: me.claimable ?? false, reached: count >= m.n };
      });
      return { id, count, found, ms, tier: count >= 300 ? 'gold' : count >= 100 ? 'silver' : count >= 25 ? 'bronze' : '' };
    };
    let cards = d.cards || d.seenCards || [], evos = d.evolutions || d.seenEvolutions || [];
    if (cards && !Array.isArray(cards) && Array.isArray(cards.cards)) {   // meta.cardInfo(): {cards:[{id,seen}], evolutions:[{id,seen}]}
      evos = (cards.evolutions || []).filter((e) => e.seen).map((e) => e.id);
      cards = cards.cards.filter((c) => c.seen).map((c) => c.id);
    }
    return { entry, cards, evos };
  }
  _s_dex(p) {
    const tab = p.tab || 'cubes';
    const D = this._dexData();
    const ids = DATA.dex.entries;
    const foundN = ids.filter((id) => D.entry(id).found).length;
    let body;
    if (tab === 'cubes') {
      body = ids.map((id) => {
        const e = D.entry(id);
        const claim = e.ms.some((m) => m.claimable);
        if (!e.found) {
          const w = id === 'king' ? null : DATA.enemies[id]?.world;
          return `<button class="dex-card unknown" data-act="dexEntry" data-id="${id}" data-nav>${enemyCube(id, { size: 64, sil: true })}<b>???</b><small>${esc(w == null ? t('ui.foundBoss') : t('ui.foundIn', { n: w + 1 }))}</small></button>`;
        }
        return `<button class="dex-card ${e.tier}" data-act="dexEntry" data-id="${id}" data-nav>${freedCube(id, { size: 64 })}<b>${esc(tl(DATA.dex.freedName[id]))}</b><small>${esc(t('ui.freedCount', { n: fmtInt(e.count) }))}</small>${claim ? '<i class="dot"></i>' : ''}</button>`;
      }).join('');
      body = `<div class="dex-grid">${body}</div>`;
    } else {
      const seen = new Set(D.cards);
      const cards = DATA.cards.map((c) => (seen.has(c.id)
        ? `<div class="mini-card r-${c.rarity}"><span class="mc-ico">${c.icon}</span><b>${esc(tl(c.name))}</b><i class="mc-tag" style="--tc:${DATA.tags[c.tag].color}">${DATA.tags[c.tag].icon}</i></div>`
        : '<div class="mini-card unknown"><span class="mc-ico">?</span><b>???</b></div>')).join('');
      const evoSeen = new Set(D.evos);
      const evos = DATA.evolutions.map((e) => {
        const [a, b] = e.from.map(cardById);
        const ok = evoSeen.has(e.id);
        return `<div class="evo-row${ok ? '' : ' unknown'}"><span>${ok ? a.icon : '?'}</span><i>+</i><span>${ok ? b.icon : '?'}</span><i>→</i><span class="evo-out">${ok ? e.icon : '?'}</span><b>${esc(ok ? tl(e.name) : '???')}</b></div>`;
      }).join('');
      body = `<div class="card-grid">${cards}</div><h4 class="sub-h">🧬 ${esc(t('ui.recipe'))}</h4><div class="evo-list">${evos}</div>`;
    }
    return `${this._head(t('ui.dex'), '📖', `<span class="pill-stat">${esc(t('ui.found', { n: foundN, max: ids.length }))}</span>`)}
      <section class="panel dex-panel">
        <div class="tabs">${['cubes', 'cards'].map((k) => `<button class="tab${k === tab ? ' on' : ''}" data-act="dexTab" data-tab="${k}" data-nav ${k === tab ? 'data-default' : ''}>${esc(t(k === 'cubes' ? 'ui.dexCubes' : 'ui.dexCards'))}</button>`).join('')}</div>
        <div class="scroll dex-body">${body}</div>
      </section>`;
  }
  _p_dex() { this._m('markSeen', 'dex'); }
  _p_shop() { this._m('markSeen', 'wardrobe'); }
  _p_heroes() { this._m('markSeen', 'heroes'); }
  _dexDetail(id) {
    this._m('markSeen', 'dexEntry', id);
    const e = this._dexData().entry(id);
    const orig = id === 'king' ? tl(DATA.boss.name) : tl(DATA.enemies[id]?.name);
    if (!e.found) {
      const w = id === 'king' ? null : DATA.enemies[id]?.world;
      this._open('dexd', `<div class="panel dex-detail pop"><button class="x-btn" data-act="close" data-id="dexd" data-nav data-default>✕</button>${enemyCube(id, { size: 110, sil: true })}<h3>???</h3><p>${esc(w == null ? t('ui.foundBoss') : t('ui.foundIn', { n: w + 1 }))}</p></div>`);
      return;
    }
    const ms = e.ms.map((m) => `<button class="ms${m.claimed ? ' claimed' : m.claimable ? ' ready' : m.reached ? ' reached' : ''}" data-act="dexClaim" data-id="${id}" data-n="${m.n}" data-nav>
      <b>×${m.n}</b><span>${rewardIconLine(m.reward)}</span>${m.claimed ? '<i class="ok">✓</i>' : m.claimable ? '<i class="dot"></i>' : ''}</button>`).join('');
    this._open('dexd', `<div class="panel dex-detail pop ${e.tier}">
      <button class="x-btn" data-act="close" data-id="dexd" data-nav>✕</button>
      <div class="dd-pair"><span class="dd-before">${enemyCube(id, { size: 54 })}</span><b class="dd-arrow">➜</b><span class="dd-after">${freedCube(id, { size: 104, limbs: true })}</span></div>
      <h3>${esc(tl(DATA.dex.freedName[id]))}</h3>
      <small class="dd-was">${esc(t('ui.wasName', { name: orig }))}</small>
      <p class="dd-fact">💡 ${esc(tl(DATA.dex.fact[id]))}</p>
      <div class="dd-count">🕊️ ${esc(t('ui.freedCount', { n: fmtInt(e.count) }))}</div>
      <h4>${esc(t('ui.milestones'))}</h4><div class="ms-row">${ms}</div></div>`);
  }
  _dexClaim(id, n) {
    const m = this._dexData().entry(id).ms.find((x) => x.n === n);
    if (!m?.claimable) { this._blip(m?.claimed ? 'click' : 'error'); return; }
    const r = this._m('claimDex', id, n) ?? this._m('claimDexMilestone', id, n);
    this._blip(r === false ? 'error' : 'claim');
    this._close('dexd', true);
    this._rerender();
  }

  // ═════════ ACHIEVEMENTS + PROFILE CARD ═════════
  _achData() {
    const a = this._m('achievements');
    const stats = this.G.save?.profile?.stats || {};
    return DATA.achievements.map((def) => {
      const e = Array.isArray(a) ? a.find((x) => x.id === def.id) : a?.[def.id];
      const cur = n0(e?.cur ?? e?.value ?? stats[def.stat] ?? 0);
      const tier = Array.isArray(e?.tiers) ? e.tiers.filter((x) => x.reached).length : n0(e?.tier ?? def.tiers.filter((x) => cur >= x).length);
      return { def, cur, tier, next: def.tiers[Math.min(tier, 2)], claimable: !!e?.claimable, max: tier >= 3 };
    });
  }
  _s_achievements() {
    const A = this._achData();
    const prof = this._profile();
    const rank = this._mv('rank', null);
    const heroId = this._mv('selectedHero', 'blu');
    const st = this.G.save?.profile?.stats || {};
    const ps = this._m('profile')?.stats || {};
    const best = n0(ps.bestWave ?? this._mq('bestWave') ?? this.G.save?.profile?.best?.endless ?? st.endlessBest ?? 0);
    const days = n0(ps.playDays ?? this._mq('playDays') ?? st.days ?? 1);
    if (ps.perfects != null) st.perfects = Math.max(n0(st.perfects), n0(ps.perfects));
    const pins = prof.pins.slice(0, 3);
    const tierCls = ['', 'bronze', 'silver', 'gold'];
    const pinSlots = [0, 1, 2].map((i) => { const a = A.find((x) => x.def.id === pins[i]); return `<i class="pin-slot ${a ? tierCls[a.tier] : ''}">${a ? a.def.icon : '＋'}</i>`; }).join('');
    const badges = A.map((a) => `<button class="badge ${tierCls[a.tier]}${pins.includes(a.def.id) ? ' pinned' : ''}" data-act="${a.claimable ? 'achClaim' : 'achPin'}" data-id="${a.def.id}" data-nav>
      <span class="bd-ico">${a.def.icon}</span><b>${esc(tl(a.def.name))}</b>
      <span class="bd-tiers">${[1, 2, 3].map((k) => `<i class="${a.tier >= k ? tierCls[k] : ''}"></i>`).join('')}</span>
      ${a.max ? '<small>MAX</small>' : `<i class="bar"><i style="width:${Math.round(clamp(a.cur / a.next, 0, 1) * 100)}%"></i></i><small>${fmtInt(a.cur)}/${fmtInt(a.next)}</small>`}
      ${a.claimable ? '<i class="dot"></i>' : ''}${pins.includes(a.def.id) ? '<i class="pin">📌</i>' : ''}</button>`).join('');
    return `${this._head(t('ui.achievements'), '🏅')}
      <div class="ach-layout">
        <section class="panel profile-big">
          <div class="pb-top">${heroCube(heroId, { size: 84, color: this._skinColor(heroId) })}
            <div class="pb-id"><b class="pb-name">${esc(this._playerName())}</b>
              <button class="link" data-act="rename" data-nav>✏️ ${esc(t('ui.rename'))}</button>
              <button class="pb-title" data-act="titlePick" data-nav>🏷️ ${esc(prof.title ? this._titleName(prof.title) : t('ui.noTitle'))}</button></div>
            ${this._unlocked('modes') && rank ? `<div class="pb-rank">${rankBadge(rank, 64)}<small>${esc(rankName(rank))}</small></div>` : ''}
          </div>
          <div class="pb-pins"><small>${esc(t('ui.pins'))}</small><div>${pinSlots}</div></div>
          <div class="pb-stats">
            <div><b>${fmtInt(this._mv('freed', st.freed || 0))}</b><small>🕊️ ${esc(t('ui.statFreed'))}</small></div>
            <div><b>${best || '—'}</b><small>🌌 ${esc(t('ui.statWave'))}</small></div>
            <div><b>${fmtInt(st.perfects || 0)}</b><small>🎯 ${esc(t('ui.statPerfect'))}</small></div>
            <div><b>${fmtInt(days)}</b><small>📅 ${esc(t('ui.statDays'))}</small></div>
          </div>
          <button class="btn btn-blue" data-act="share" data-nav>📤 ${esc(t('ui.share'))}</button>
        </section>
        <section class="panel ach-panel"><small class="note">${esc(t('ui.pinHint'))}</small><div class="badge-grid scroll">${badges}</div></section>
      </div>`;
  }
  _achClaim(id) {
    const r = this._m('claimAchievement', id);
    this._blip(r === false ? 'error' : 'claim');
    this._rerender();
  }
  _achPin(id) {
    const a = this._achData().find((x) => x.def.id === id);
    if (!a || a.tier < 1) { this._blip('error'); this.toast(tl(a?.def.name) + ': ' + fmtInt(a?.cur) + '/' + fmtInt(a?.next), a?.def.icon || '🏅'); return; }
    let pins = this._profile().pins.slice();
    pins = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id].slice(-3);
    this._setProfile({ pins });
    this._blip('click');
    this._rerender();
  }
  _namePicker(seed = Date.now() & 0xffff) {
    const mc = this._m('nameChoices', 6);
    this._nameOpts = Array.isArray(mc) && mc.length ? mc : nameChoices(seed).map((text) => ({ text }));
    const names = this._nameOpts.map((c) => c.text);
    this._open('names', `<div class="panel dialog names pop">
      <button class="x-btn" data-act="close" data-id="names" data-nav>✕</button>
      <h3>${esc(t('ui.pickName'))}</h3>
      <div class="name-list">${names.map((n, i) => `<button class="btn btn-white" data-act="namePick" data-name="${esc(n)}" data-i="${i}" data-nav ${i === 0 ? 'data-default' : ''}>${esc(n)}</button>`).join('')}</div>
      <button class="btn btn-blue sm" data-act="nameShuffle" data-nav>🎲 ${esc(t('ui.shuffle'))}</button>
      <div class="name-type"><input maxlength="8" placeholder="${esc(t('ui.typeName'))}" data-nav /><button class="btn btn-gold sm" data-act="nameType" data-nav>✓</button></div></div>`);
  }
  _setName(n) {
    const ok = typeof n === 'object' ? this._m('setName', n) : undefined;
    if (ok === undefined) this._setProfile({ name: String(typeof n === 'object' ? n.text : n).slice(0, 8) });
    this._blip('claim');
    this._close('names');
    this._rerender();
  }
  _titlePicker() {
    const prof = this._profile();
    const owned = new Set(prof.titles || []);
    for (const a of this._achData()) if (a.tier >= 3) owned.add(a.def.id);
    const list = [...owned];
    this._open('titles', `<div class="panel dialog pop"><button class="x-btn" data-act="close" data-id="titles" data-nav>✕</button><h3>${esc(t('ui.pickTitle'))}</h3>
      <div class="name-list">${list.length ? list.map((id) => `<button class="btn btn-white${prof.title === id ? ' on' : ''}" data-act="titleSet" data-id="${esc(id)}" data-nav>🏷️ ${esc(this._titleName(id))}</button>`).join('') : `<p class="note">${esc(t('ui.noTitle'))}</p>`}
      ${prof.title ? `<button class="btn btn-white" data-act="titleSet" data-id="" data-nav>${esc(t('ui.none'))}</button>` : ''}</div></div>`);
  }

  // ═════════ MODES ═════════
  _dailyMutator() {
    const v = this._m('dailyMutator');
    if (v) return typeof v === 'string' ? DATA.mutators.find((m) => m.id === v) || DATA.mutators[0] : v;
    const k = dayKey();
    let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return DATA.mutators[h % DATA.mutators.length];
  }
  _modeUnlocked(id) {
    const v = this._m('modeUnlocked', id);
    if (v !== undefined) return !!v;
    return this._unlocked('modes') && this._worldCleared(DATA.modes[id]?.unlock?.world ?? 0);
  }
  _s_modes() {
    const rank = this._mv('rank', null);
    const best = n0(this._mq('bestWave') ?? this.G.save?.profile?.best?.endless ?? 0);
    const mut = this._dailyMutator();
    const dailyDone = !!this._mq('dailyDone');
    const card = (id, icon, extra, btn) => {
      const def = DATA.modes[id];
      const un = this._modeUnlocked(id);
      const msg = t('ui.unlockAfter', { n: (def.unlock?.world ?? 0) + 1 });
      return `<div class="mode-card m-${id}${un ? '' : ' locked'}">
        <div class="mc-art"><span class="mc-icon">${icon}</span></div>
        <div class="mc-body"><b class="mc-name">${esc(tl(def.name))}</b><p>${esc(tl(def.desc))}</p>${un ? extra : `<small class="lock-msg">🔒 ${esc(msg)}</small>`}</div>
        <div class="mc-btns">${un ? btn : `<button class="btn btn-white" data-act="modeLocked" data-msg="${esc(msg)}" data-nav>🔒</button>`}</div></div>`;
    };
    return `${this._head(t('ui.modes'), '🌌')}
      <div class="scroll modes-wrap">
        ${card('endless', '🌌', `<div class="mc-extra">${rank ? rankBadge(rank, 40) : ''}<span>${best ? esc(t('ui.best', { n: best })) : ''}</span></div>`,
          `<button class="btn btn-gold" data-act="mode" data-mode="endless" data-nav data-default>${esc(t('ui.start'))}</button><button class="btn btn-white sm" data-act="codeEnter" data-nav>🔑 ${esc(t('ui.enterCode'))}</button>`)}
        ${card('daily', '📅', `<div class="mc-extra mut"><span class="mut-ico">${mut.icon}</span><span><b>${esc(t('ui.todayMut'))}: ${esc(tl(mut.name))}</b><small>${esc(tl(mut.desc))}</small></span></div>${dailyDone ? `<small class="ok-msg">${esc(t('ui.doneToday'))}</small>` : ''}`,
          `<button class="btn btn-blue" data-act="mode" data-mode="daily" data-nav>${esc(t('ui.start'))}</button>`)}
        ${card('storm', '🌪️', `<div class="mc-extra medals">${DATA.modes.storm.medals.map((m, i) => `<span>${['🥉', '🥈', '🥇'][i]}<b>${m}</b></span>`).join('')}</div>`,
          `<button class="btn btn-blue" data-act="mode" data-mode="storm" data-nav>${esc(t('ui.start'))}</button>`)}
        ${card('rush', '👑', `<div class="mc-extra">${enemyCube('king', { size: 34 })}<span>×${DATA.worlds.length}</span></div>`,
          `<button class="btn btn-blue" data-act="mode" data-mode="rush" data-nav>${esc(t('ui.start'))}</button>`)}
      </div>`;
  }
  _startMode(mode, extra = {}) {
    if (!this._modeUnlocked(mode)) { this._blip('error'); return; }
    const cfg = { mode, worldId: 0, stageId: 0, ...extra };
    if (mode === 'daily' || mode === 'endless') cfg.mutatorId = cfg.mutatorId ?? this._dailyMutator()?.id;
    if (mode === 'storm') cfg.worldId = worldIdx(this._m('hubWorld') ?? 0);
    if (cfg.seed == null && mode === 'endless') cfg.seed = (Math.random() * 0x3fffff) | 0;
    this.G.app?.startRun?.(cfg);
  }
  _codeEntry() {
    this._open('code', `<div class="panel dialog code-pop pop">
      <button class="x-btn" data-act="close" data-id="code" data-nav>✕</button>
      <h3>🔑 ${esc(t('ui.enterCode'))}</h3><p class="note">${esc(t('ui.codeHint'))}</p>
      <input class="code-in" maxlength="7" autocomplete="off" spellcheck="false" placeholder="ABC123" data-nav data-default />
      <button class="btn btn-gold" data-act="codeGo" data-nav>${esc(t('ui.codeGo'))}</button></div>`);
    const inp = this._ovl('code').el.querySelector('input');
    inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this._codeGo(); } if (e.key === 'Escape') inp.blur(); });
    setTimeout(() => inp.focus(), 60);
  }
  _codeGo() {
    const inp = this._ovl('code')?.el.querySelector('input');
    const c = decodeChallenge(inp?.value);
    if (!c) { this._blip('error'); this._shake(inp); this.toast(t('ui.codeBad'), '🔑'); return; }
    inp.blur();
    this._close('code', true);
    const heroId = DATA.heroes[c.hero]?.id;
    if (heroId && this._heroUnlocked(heroId) && heroId !== this._mv('selectedHero')) this.G.app?.selectHero?.(heroId);
    this._blip('click');
    this._startMode('endless', { seed: c.seed, challenge: encodeChallenge(c) });
  }

  // ═════════ SETTINGS (screen, or overlay from pause) ═════════
  _s_settings() {
    return `${this._head(t('ui.settings'), '⚙️')}<section class="panel settings-panel scroll">${this._settingsBody()}</section>`;
  }
  _settingsBody(inRun = false) {
    const s = this._settings();
    const seg = (key, opts, cur) => `<div class="seg">${opts.map(([v, lbl]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-act="set" data-key="${key}" data-v="${v}" data-nav>${esc(lbl)}</button>`).join('')}</div>`;
    const tog = (key, on) => `<button class="toggle${on ? ' on' : ''}" data-act="set" data-key="${key}" data-v="${on ? 0 : 1}" data-nav><i></i></button>`;
    const slider = (key, v) => `<input type="range" min="0" max="1" step="0.1" value="${n0(v)}" data-key="${key}" data-nav />`;
    const shake = n0(s.shake ?? 1);
    return `
      <div class="set-group"><h4>🌐 ${esc(t('ui.lang'))}</h4>${seg('lang', [['zh', '中文'], ['en', 'English']], getLang())}</div>
      <div class="set-group"><h4>🔊 ${esc(t('ui.sound'))}</h4>
        <label class="set-row"><span>🎵 ${esc(t('ui.music'))}</span>${slider('music', s.music ?? 0.7)}</label>
        <label class="set-row"><span>🔔 ${esc(t('ui.sfx'))}</span>${slider('sfx', s.sfx ?? 0.9)}</label></div>
      <div class="set-group"><h4>📺 ${esc(t('ui.screen'))}</h4>
        <div class="set-row"><span>📳 ${esc(t('ui.shake'))}</span>${seg('shake', [[0, t('ui.shakeOff')], [0.5, t('ui.shakeLow')], [1, t('ui.shakeOn')]], shake >= 0.75 ? 1 : shake > 0 ? 0.5 : 0)}</div>
        <div class="set-row"><span>⚡ ${esc(t('ui.reduceFlash'))}</span>${tog('reduceFlash', !!s.reduceFlash)}</div>
        <div class="set-row"><span>🎮 ${esc(t('ui.haptics'))}</span>${tog('haptics', s.haptics !== false)}</div>
        ${inRun ? '' : `<div class="set-row"><span>✨ ${esc(t('ui.quality'))}</span>${seg('quality', [['auto', t('ui.qAuto')], ['high', t('ui.qHigh')], ['low', t('ui.qLow')]], s.quality || 'auto')}</div>`}</div>
      <div class="set-group helper"><h4>🧸 ${esc(t('ui.helper'))}</h4><div class="set-row"><span class="helper-desc">${esc(t('ui.helperDesc'))}</span>${tog('assist', !!s.assist)}</div></div>
      <div class="set-group"><h4>🎮 ${esc(t('ui.controls'))}</h4>
        <div class="tabs sm">${['kb', 'pad', 'touch'].map((k) => `<button class="tab${k === (this.G.input?.device === 'pad' ? 'pad' : this.G.input?.device === 'touch' ? 'touch' : 'kb') ? ' on' : ''}" data-act="ctlTab" data-tab="${k}" data-nav>${esc(t('ui.' + k))}</button>`).join('')}</div>
        <div class="ctl-diagram">${this._ctlHTML(this.G.input?.device === 'pad' ? 'pad' : this.G.input?.device === 'touch' ? 'touch' : 'kb')}</div></div>
      ${inRun ? '' : `<div class="set-group"><h4>💾 ${esc(t('ui.saveLbl'))}</h4><div class="row">
        <button class="btn btn-white sm" data-act="exportSave" data-nav>📤 ${esc(t('ui.exportSave'))}</button>
        <button class="btn btn-white sm" data-act="importSave" data-nav>📥 ${esc(t('ui.importSave'))}</button></div></div>
      <div class="set-group"><h4>👪 ${esc(t('ui.parent'))}</h4>
        <button class="btn btn-white hold-btn" data-act="parentHint" data-hold="parent" data-nav><span>🔒 ${esc(t('ui.parent'))}</span><small>${esc(t('ui.holdHint'))}</small><i class="hold-fill"></i></button></div>`}`;
  }
  _p_settings(el) { this._bindSliders(el); }
  _bindSliders(el) {
    for (const r of el.querySelectorAll('input[type=range]')) {
      const paint = () => r.style.setProperty('--v', (r.value * 100) + '%');
      paint();
      r.addEventListener('input', () => { paint(); this._setSetting(r.dataset.key, +r.value); });
      r.addEventListener('change', () => this._blip('click'));
    }
  }
  _settingAct(key, v, el) {
    let value = v;
    if (key === 'shake') value = +v;
    else if (['reduceFlash', 'haptics', 'assist'].includes(key)) value = v === '1';
    this._setSetting(key, value);
    this._blip('click');
    if (key === 'quality') this.toast(t('ui.qualityNote'), '✨');
    if (key === 'assist' && value) this.toast(t('ui.helperOn'), '🧸');
    // re-render in place (screen or pause overlay)
    const host = el.closest('.settings-panel, .settings-ovl-body');
    if (host) {
      const inRun = host.classList.contains('settings-ovl-body');
      host.innerHTML = this._settingsBody(inRun);
      this._bindSliders(host);
      const again = host.querySelector(`[data-act="set"][data-key="${key}"]`);
      if (again && this.kb) this._focus(again);
    }
    if (key === 'lang' && this.screen?.name !== 'settings' && !host) this.refresh();
  }
  _ctlTab(el, tab) {
    const box = el.closest('.set-group');
    box.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    box.querySelector('.ctl-diagram').innerHTML = this._ctlHTML(tab);
  }
  _ctlHTML(tab) {
    const L = (k) => esc(t(k));
    if (tab === 'pad') {
      return `<div class="pad-diag"><div class="pad-body"><i class="pd-stick l"></i><i class="pd-dpad"><i></i><i></i></i>
        <i class="pd-btn a">A</i><i class="pd-btn b">B</i><i class="pd-btn x">X</i><i class="pd-btn y">Y</i><i class="pd-start">≡</i></div>
        <ul class="legend"><li><b>🕹️ / ✚</b>${L('ui.keysMove')}</li><li><b>A · B · RB</b>⚡ ${L('ui.keysDash')}</li><li><b>X · Y · LB</b>✦ ${L('ui.keysNova')}</li><li><b>≡ Start</b>${L('ui.pause')}</li><li><b>⧉ Select</b>${L('ui.keysRetry')}</li></ul></div>`;
    }
    if (tab === 'touch') {
      return `<div class="touch-diag"><div class="phone"><i class="tz l"><i class="tstick"></i><small>${L('ui.keysMove')}</small></i><i class="tz r"><i class="tbtn dash">⚡</i><i class="tbtn nova">✦</i><small>${L('ui.keysDash')}</small></i></div>
        <ul class="legend"><li><b>👈</b>${L('ui.touchLeft')}</li><li><b>👉</b>${L('ui.touchRight')}</li><li><b>✦</b>${L('ui.keysNova')}</li><li><b>❚❚</b>${L('ui.pause')}</li></ul></div>`;
    }
    return `<div class="kb-diag">
      <div class="kd-row"><span class="kd-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><small>/</small><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><b>${L('ui.keysMove')}</b></div>
      <div class="kd-row"><span class="kd-keys"><kbd class="wide">Space</kbd><small>/</small><kbd class="wide">Shift</kbd></span><b>⚡ ${L('ui.keysDash')}</b></div>
      <div class="kd-row"><span class="kd-keys"><kbd>E</kbd><kbd>Q</kbd><kbd>K</kbd><kbd class="wide">Enter</kbd></span><b>✦ ${L('ui.keysNova')}</b></div>
      <div class="kd-row"><span class="kd-keys"><kbd>Esc</kbd><kbd>P</kbd></span><b>${L('ui.pause')}</b><span class="kd-keys"><kbd>R</kbd></span><b>${L('ui.keysRetry')}</b><span class="kd-keys"><kbd>M</kbd></span><b>${L('ui.mute')}</b></div></div>`;
  }
  _pauseSettings() {
    this._open('settingsOvl', `<div class="panel settings-ovl pop"><button class="x-btn" data-act="close" data-id="settingsOvl" data-nav>✕</button><h3 class="ribbon small">⚙️ ${esc(t('ui.settings'))}</h3><div class="settings-ovl-body scroll">${this._settingsBody(true)}</div></div>`);
    this._bindSliders(this._ovl('settingsOvl').el);
  }
  _exportSave() {
    const code = this.G.save?.exportCode?.() || '';
    this._open('savecode', `<div class="panel dialog pop"><button class="x-btn" data-act="close" data-id="savecode" data-nav>✕</button><h3>📤 ${esc(t('ui.exportSave'))}</h3>
      <textarea class="code-area" readonly>${esc(code)}</textarea><button class="btn btn-blue" data-act="copyCode" data-nav data-default>📋 ${esc(t('ui.copy'))}</button></div>`);
  }
  _copyCode() {
    const ta = this._ovl('savecode')?.el.querySelector('textarea');
    if (!ta) return;
    const done = () => { this._blip('claim'); this.toast(t('ui.copied'), '📋'); };
    try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); }); }
    catch { ta.select(); try { document.execCommand('copy'); done(); } catch { /* manual copy */ } }
  }
  _importSave() {
    this._open('saveimp', `<div class="panel dialog pop"><button class="x-btn" data-act="close" data-id="saveimp" data-nav>✕</button><h3>📥 ${esc(t('ui.importSave'))}</h3>
      <textarea class="code-area" placeholder="${esc(t('ui.pasteHere'))}"></textarea><button class="btn btn-gold" data-act="importGo" data-nav data-default>${esc(t('ui.import'))}</button></div>`);
  }
  _importGo() {
    const code = this._ovl('saveimp')?.el.querySelector('textarea')?.value?.trim();
    if (!code) { this._blip('error'); return; }
    this._confirm(t('ui.importConfirm'), () => {
      const r = this.G.save?.importCode?.(code);
      if (!r?.ok) { this._blip('error'); this.toast(t('ui.importBad'), '⚠️'); return; }
      this._blip('claim'); this.toast(t('ui.importOk'), '✅');
      this.G.save?.flush?.();
      setTimeout(() => location.reload(), 700);
    }, { icon: '📥', danger: true, yesLabel: t('ui.import') });
  }

  // ═════════ PARENT CORNER 家长中心 (hold gear 3 s + multiplication gate) ═════════
  _holdStart(el) {
    if (this.hold) return;
    this.hold = { el, t: 0, t0: performance.now() };
    el.classList.add('holding');
  }
  _holdEnd(fromKey = false) {
    const h = this.hold;
    if (!h) return;
    this.hold = null;
    h.el.classList.remove('holding');
    h.el.style.removeProperty('--hold');
    // a short key press on a hold button still does its normal action
    if (fromKey && h.t < TUNE.holdTapMax && !this._holdFired) h.el.click();
  }
  _holdUpdate() {
    const h = this.hold;
    h.t = (performance.now() - h.t0) / 1000;
    h.el.style.setProperty('--hold', clamp(h.t / TUNE.holdGear, 0, 1));
    if (h.t >= TUNE.holdGear) {
      this._holdFired = true;
      setTimeout(() => { this._holdFired = false; }, 600);
      h.el.classList.remove('holding');
      this.hold = null;
      this._sfx('unlock');
      this._openGate(() => this.go('parent'));
    }
  }
  _openGate(onPass) {
    const a = 23 + Math.floor(Math.random() * 67), b = 4 + Math.floor(Math.random() * 6);   // e.g. 37 × 4 (grown-ups only)
    this.gate = { ans: String(a * b), typed: '', onPass };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    this._open('gate', `<div class="panel dialog gate pop"><button class="x-btn" data-act="close" data-id="gate" data-nav>✕</button>
      <h3>👪 ${esc(t('ui.parent'))}</h3><p class="note">${esc(t('ui.gateQ'))}</p>
      <div class="gate-q">${a} × ${b} = <b class="gate-a">?</b></div>
      <div class="numpad">${keys.map((k) => `<button class="btn ${k === 'ok' ? 'btn-gold' : 'btn-white'}" data-act="gateKey" data-k="${k}" data-nav ${k === '5' ? 'data-default' : ''}>${k === 'del' ? '⌫' : k === 'ok' ? '✓' : k}</button>`).join('')}</div></div>`);
  }
  _gateKey(k) {
    const g = this.gate, o = this._ovl('gate');
    if (!g || !o) return;
    if (k === 'del') g.typed = g.typed.slice(0, -1);
    else if (k === 'ok') {
      if (g.typed === g.ans) { this._close('gate', true); this._blip('claim'); this.parentOk = true; const f = g.onPass; this.gate = null; f?.(); return; }
      this._blip('error'); this._shake(o.el.querySelector('.gate-q')); g.typed = '';
    } else if (g.typed.length < 4) { g.typed += k; this._blip('click'); }
    o.el.querySelector('.gate-a').textContent = g.typed || '?';
    if (g.typed.length === g.ans.length && g.typed === g.ans) this._gateKey('ok');
  }
  _s_parent() {
    if (!this.parentOk) return `${this._head(t('ui.parent'), '👪')}<section class="panel"><p class="note">🔒</p></section>`;
    const s = this._settings();
    const hist = this._m('playHistory') || this.G.save?.profile?.playLog || [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000), k = dayKey(d);
      const e = Array.isArray(hist) ? hist.find((x) => x.day === k) : null;
      const min = n0(e ? e.minutes ?? e.min : typeof hist === 'object' && !Array.isArray(hist) ? n0(hist[k]) / 60 : 0);
      days.push({ wd: (d.getDay() + 6) % 7, min: Math.round(min), today: i === 0 });
    }
    const wd = t('ui.wd').split(',');
    const maxM = Math.max(30, ...days.map((d) => d.min));
    const bars = days.map((d) => `<div class="pbar${d.today ? ' today' : ''}"><i style="height:${Math.round((d.min / maxM) * 100)}%"></i><b>${d.min}</b><small>${esc(wd[d.wd])}</small></div>`).join('');
    const seg = (key, opts, cur) => `<div class="seg">${opts.map((v) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-act="pset" data-key="${key}" data-v="${v}" data-nav>${v ? esc(t('ui.minutes', { n: v })) : esc(t('ui.off'))}</button>`).join('')}</div>`;
    const mpar = this.G.meta?.parent;
    const capOn = mpar ? !!mpar.capsule : this._capInfo().enabled;
    const limit = mpar ? n0(mpar.limit) : n0(s.dailyLimit);
    return `${this._head(t('ui.parent'), '👪')}
      <section class="panel parent-panel scroll">
        <div class="pledge">${[['🛍️', 'ui.pledge1'], ['📺', 'ui.pledge2'], ['📡', 'ui.pledge3'], ['🔒', 'ui.pledge4']].map(([i, k]) => `<div><span class="pl-ico">${i}<i>⃠</i></span><b>${esc(t(k))}</b></div>`).join('')}</div>
        <div class="set-group"><h4>📊 ${esc(t('ui.weekPlay'))}</h4><div class="pbars">${bars}</div></div>
        <div class="set-group"><h4>⏰ ${esc(t('ui.breakEvery'))}</h4>${seg('breakMinutes', [0, 30, 45, 60], s.breakReminder === false ? 0 : n0(s.breakMinutes) || TUNE.healthCardMin)}</div>
        <div class="set-group"><h4>🌙 ${esc(t('ui.dailyLimit'))}</h4>${seg('dailyLimit', DATA.health.parentLimits, limit)}
          <button class="btn btn-white sm" data-act="add15" data-nav>➕ ${esc(t('ui.add15'))}</button></div>
        <div class="set-group"><h4>${capIco()} ${esc(t('ui.capsuleToggle'))}</h4><div class="set-row"><span>${esc(capOn ? t('ui.on') : t('ui.off'))}</span><button class="toggle${capOn ? ' on' : ''}" data-act="pset" data-key="capsuleOn" data-v="${capOn ? 0 : 1}" data-nav><i></i></button></div></div>
        <div class="set-group danger"><button class="btn btn-red" data-act="reset" data-nav>🗑️ ${esc(t('ui.reset'))}</button></div>
      </section>`;
  }
  _parentSet(key, v) {
    let value = +v;
    if (key === 'capsuleOn') value = v === '1';
    if (key === 'breakMinutes') { this._setSetting('breakReminder', value > 0); this.health.nextCard = value || TUNE.healthCardMin; }
    this._setSetting(key, value);
    if (key === 'capsuleOn') this._m('setParent', 'capsule', value);
    else if (key === 'dailyLimit') this._m('setParent', 'limit', value);
    this._blip('click');
    this._rerender();
  }
  _add15() {
    this.health.extra += 15;
    if (this._m('extendLimit', 15) === undefined) this._m('parentExtend', 15);
    this._blip('claim');
    this.toast(t('ui.added15'), '⏰');
  }
  _resetSave() {
    this._confirm(t('ui.resetConfirm1'), () => {
      this._confirm(t('ui.resetConfirm2'), () => {
        this.G.save?.reset?.();
        this.G.save?.flush?.();
        setTimeout(() => location.reload(), 300);
      }, { icon: '⚠️', danger: true, yesLabel: t('ui.reset') });
    }, { icon: '🗑️', danger: true, yesLabel: t('ui.reset') });
  }

  // ═════════ LEVEL-UP CARDS ═════════
  _cardInfo(c) {
    const id = typeof c === 'string' ? c : c?.id;
    const def = cardById(id);
    if (!def) return null;
    const evoDef = DATA.evolutions.find((e) => e.id === id);
    const evo = !!evoDef || !!c?.evolution || !!c?.isEvolution;
    const owned = this.G.run?.cards?.find?.((x) => x.id === id);
    const level = evo ? 1 : clamp(n0(c?.level) || (n0(owned?.level) + 1), 1, DATA.cardRules.maxLevel);
    const partnerEvo = evo ? null : DATA.evolutions.find((e) => e.from.includes(id));
    const partner = partnerEvo ? cardById(partnerEvo.from.find((x) => x !== id)) : null;
    return { id, def, evo, evoDef, level, rarity: evo ? 'legend' : c?.rarity || def.rarity || 'common', partner, partnerEvo, recommended: !!c?.recommended, isNew: !owned };
  }
  _rerollsLeft() {
    const run = this.G.run;
    const hasFn = typeof run?.rerollCards === 'function' || typeof run?.reroll === 'function' || typeof run?.upgrades?.reroll === 'function';
    return hasFn ? n0(run?.rerollsLeft ?? run?.upgrades?.rerollsLeft ?? run?.upgrades?.rerolls ?? 0) : 0;
  }
  showLevelUp(choices) {
    const run = this.G.run;
    const list = [].concat(choices || []).map((c) => this._cardInfo(c)).filter(Boolean);
    if (!list.length) return;
    this.hidePause();
    this.G.input?.setTouchControls?.(false);
    let rec = list.findIndex((c) => c.recommended);
    const early = (run?.worldIndex ?? run?.stageDef?.world ?? 9) === 0 && (run?.stageDef?.index ?? 9) < 2;
    if (rec < 0 && early && !list.some((c) => c.evo)) {
      const order = ['boots', 'stars', 'punch', 'snack', 'magnet', 'quick', 'battery', 'rim', 'sats', 'core'];
      rec = list.map((c) => order.indexOf(c.id)).map((v, i) => [v < 0 ? 99 : v, i]).sort((a, b) => a[0] - b[0])[0][1];
    }
    const n = list.length;
    const cards = list.map((c, i) => {
      const rar = rarityOf(c.rarity);
      const tag = DATA.tags[c.def.tag];
      const pips = c.evo ? '' : `<span class="lc-pips">${[1, 2, 3].map((k) => `<i class="${k < c.level ? 'on' : k === c.level ? 'on new' : ''}"></i>`).join('')}</span>`;
      const recipe = c.evo ? `<span class="lc-recipe">${c.evoDef.from.map((x) => cardById(x)?.icon).join('<i>+</i>')}</span>` : '';
      return `<button class="lv-card r-${c.rarity}${c.evo ? ' evo' : ''}" data-act="card" data-card="${i}" data-nav ${i === (rec >= 0 ? rec : 0) ? 'data-default' : ''} style="--i:${i};--n:${n};--rc:${rar.color}">
        <i class="lc-rar">${esc(c.evo ? t('ui.evolve') : tl(rar.name))}</i>
        ${c.isNew && !c.evo ? `<i class="lc-new">${esc(t('ui.new'))}</i>` : ''}
        <span class="lc-ico">${c.def.icon}</span>
        <b class="lc-name">${esc(tl(c.def.name))}</b>
        <p class="lc-desc">${esc(tl(c.def.desc))}</p>
        ${pips}${recipe}
        <span class="lc-foot">${tag ? `<i class="lc-tag" style="--tc:${tag.color}">${tag.icon}</i>` : ''}${c.partner ? `<i class="lc-partner" title="${esc(tl(c.partnerEvo.name))}">${c.partner.icon}<small>→${c.partnerEvo.icon}</small></i>` : ''}</span>
        ${i === rec ? `<i class="lc-rec">👍 ${esc(t('ui.recommended'))}</i>` : ''}
        <i class="lc-key">${i + 1}</i></button>`;
    }).join('');
    const rr = this._rerollsLeft();
    this._open('levelup', `<div class="lv-dim"></div>
      <div class="lv-wrap">
        <div class="lv-head"><h2 class="lv-title" data-text="${esc(t('ui.levelUp'))}">${esc(t('ui.levelUp'))}</h2><span class="lv-level">${esc(t('ui.lv'))} ${n0(run?.level) || ''}</span></div>
        <p class="lv-sub">${esc(t('ui.pickCard'))}</p>
        <div class="lv-cards n${n}">${cards}</div>
        ${rr > 0 ? `<button class="btn btn-white sm lv-reroll" data-act="reroll" data-nav>🔄 ${esc(t('ui.rerollCards'))} ×${rr}</button>` : ''}
      </div>`, { back: false, cls: 'guard' });
    this.lvl = { list, t: 0, t0: performance.now(), picked: false };
    const evoI = list.findIndex((c) => c.evo);
    if (evoI >= 0) {
      this._sfx('star');
      const o = this._ovl('levelup');
      const wrap = o.el.querySelector('.lv-wrap'), card = o.el.querySelectorAll('.lv-card')[evoI];
      const beam = document.createElement('i');
      beam.className = 'lv-beam';
      wrap.prepend(beam);
      const place = () => { const a = wrap.getBoundingClientRect(), b = card.getBoundingClientRect(); beam.style.left = (b.left + b.width / 2 - a.left) + 'px'; beam.style.top = -a.top + 'px'; beam.style.height = Math.max(0, b.top + b.height * 0.55) + 'px'; };
      place(); setTimeout(place, 700);
    }
  }
  _levelUpdate() {
    const l = this.lvl;
    const before = l.t;
    l.t = (performance.now() - l.t0) / 1000;
    if (before < TUNE.levelGuard && l.t >= TUNE.levelGuard) this._ovl('levelup')?.el.classList.remove('guard');
  }
  _lvlMove(dir) {
    const o = this._ovl('levelup');
    if (!o) return;
    const cards = [...o.el.querySelectorAll('.lv-card')];
    const cur = this.focusEl?.dataset.card != null ? +this.focusEl.dataset.card : -1;
    const idx = cur < 0 ? Math.max(0, cards.findIndex((c) => c.hasAttribute('data-default'))) : clamp(cur + dir, 0, cards.length - 1);
    this._focus(cards[idx]);
  }
  _pickCard(i) {
    const l = this.lvl;
    if (!l || l.picked) return;
    const o = this._ovl('levelup');
    const c = l.list[i];
    if (!o || !c) return;
    if (l.t < TUNE.levelGuard) { this._shake(o.el.querySelectorAll('.lv-card')[i]); return; }
    l.picked = true;
    o.el.querySelectorAll('.lv-card').forEach((el, k) => el.classList.add(k === i ? 'chosen' : 'gone'));
    this._blip('click');
    this._sfx(c.evo ? 'unlock' : 'star');
    setTimeout(() => {
      this._close('levelup');
      this.lvl = null;
      try { this.G.run?.chooseCard?.(c.id); } catch (err) { console.error('[ui] chooseCard', err); }
      if (this.G.run && !['ended', 'paused'].includes(this.G.run.state)) this.G.input?.setTouchControls?.(true);
    }, REDUCED ? 60 : TUNE.pickAnim * 1000);
  }
  _rerollCards() {
    const run = this.G.run;
    if (!this.lvl || this.lvl.picked || this.lvl.t < TUNE.levelGuard) return;
    const r = run?.rerollCards?.() ?? run?.reroll?.() ?? run?.upgrades?.reroll?.();
    if (r === false || r === undefined && !this.lvl) { this._blip('error'); return; }
    this._sfx('whoosh');
    if (Array.isArray(r) && r.length) this.showLevelUp(r);   // (else: run re-emitted player:levelup → main re-called us)
  }

  // ═════════ PAUSE ═════════
  _rulesHTML() {
    const red = (f = 'angry', s = 30) => cube({ color: '#ef4b3c', face: f, size: s });
    const blu = (f = 'happy', s = 30) => cube({ color: '#2f6bff', face: f, size: s });
    return `<div class="rules">
      <div class="rule"><i class="rn">1</i><div class="rv">${red()}<b class="r-arr">➜</b>${blu('hurt')}</div><span class="rcap"><b class="c-pink">−1 ♥</b></span></div>
      <div class="rule"><i class="rn">2</i><div class="rv">${red()}<b class="r-boom">💥</b>${red()}</div><span class="rcap"><i class="r-stars">⭐</i>${red('dizzy', 26)}<i class="r-stars">⭐</i></span></div>
      <div class="rule"><i class="rn">3</i><div class="rv">${blu('focus')}<b class="r-zap">⚡</b>${red('dizzy')}</div><span class="rcap">${cube({ color: '#ffffff', face: 'joy', size: 24 })}<b>${esc(t('ui.r3'))}</b></span></div>
      <div class="rule"><i class="rn">4</i><div class="rv">${blu('focus')}<b class="r-bang">!</b>${red()}</div><span class="rcap"><b class="c-gold">${esc(t('ui.r4'))}</b></span></div></div>`;
  }
  showPause() {
    const run = this.G.run;
    const st = run?.stageDef;
    const o = run?.objective || (st?.objective ? { ...st.objective, cur: 0 } : null);
    const mode = run?.mode || 'stage';
    const w = run?.worldIndex ?? st?.world ?? 0;
    this.G.input?.setTouchControls?.(false);
    const assist = !!this._settings().assist;
    const stageLbl = mode === 'stage' && st ? `${stageId(w, st.index ?? 0)} · ${tl(st.name)}` : tl(DATA.modes[mode]?.name);
    this._open('pause', `<div class="ovl-dim"></div>
      <div class="panel pause-panel pop">
        <h2 class="ribbon"><span>❚❚ ${esc(t('ui.paused'))}</span></h2>
        <div class="pp-stage">${esc(stageLbl)}</div>
        ${mode === 'stage' && o ? `<div class="pp-crown3">${crown(!!o.done)}<span class="pp-ico">${o.icon || '⭐'}</span><b>${esc(objText(o))}</b><span class="pp-prog">${n0(o.cur)}/${n0(o.target)}</span></div>` : ''}
        <h4 class="pp-h">${esc(t('ui.howTo'))}</h4>
        ${this._rulesHTML()}
        <div class="pp-btns">
          <button class="btn btn-gold big" data-act="resume" data-nav data-default>▶ ${esc(t('ui.resume'))}</button>
          <button class="btn btn-blue" data-act="restart" data-nav>↻ ${esc(t('ui.restart'))}</button>
          <button class="btn btn-white" data-act="quit" data-nav>🏠 ${esc(t('ui.home'))}</button>
          <button class="btn btn-white" data-act="settings" data-nav>⚙️ ${esc(t('ui.settings'))}</button>
          <button class="btn btn-white helper-btn${assist ? ' on' : ''}" data-act="helper" data-nav>🧸 ${esc(t('ui.helper'))} <i class="toggle mini${assist ? ' on' : ''}"><i></i></i></button>
        </div>
      </div>`, { back: () => this.G.app?.resume?.() });
  }
  hidePause() {
    const was = this._isOpen('pause');
    this._close('pause');
    this._close('settingsOvl', true);
    if (was && this.G.run && !['ended'].includes(this.G.run.state)) this.G.input?.setTouchControls?.(true);
  }
  _toggleHelper() {
    const v = !this._settings().assist;
    this._setSetting('assist', v);
    this._blip('click');
    if (v) this.toast(t('ui.helperOn'), '🧸');
    const b = this._ovl('pause')?.el.querySelector('.helper-btn');
    if (b) { b.classList.toggle('on', v); b.querySelector('.toggle').classList.toggle('on', v); }
  }

  // ═════════ RESULTS CASCADE 结算 ═════════
  showResults(results = {}, rewards = {}) {
    const G = this.G;
    results = results || {}; rewards = rewards || {};
    G.input?.setTouchControls?.(false);
    for (const id of ['pause', 'levelup', 'settingsOvl', 'stage']) this._close(id, true);
    this.lvl = null;
    const run = G.run;
    const mode = results.mode || run?.mode || 'stage';
    const stageMode = mode === 'stage';
    const win = !!results.win;
    const w = n0(results.worldId ?? run?.worldIndex), s = n0(results.stageId ?? run?.stageDef?.index);
    const key = `${w}-${s}`;
    if (stageMode) this.fails[key] = win ? 0 : Math.max((this.fails[key] || 0) + 1, n0(rewards.fails));
    const replay = rewards.replay ?? this.seenStage.has(mode + key);
    this.seenStage.add(mode + key);
    const st = DATA.worlds[w]?.stages?.[s];
    const bossStage = st?.kind === 'boss';
    const heroId = results.heroId || this._mv('selectedHero', 'blu');
    const freedRun = sumObj(results.freed) || n0(results.freedCount ?? run?.freedCount);
    const total = Math.max(freedRun, n0(results.totalCubes ?? run?.totalCubes));
    const flags = results.starFlags || [n0(results.stars) >= 1, n0(results.stars) >= 2, n0(results.stars) >= 3];
    const sn = rewards.starsNew;
    const isNew = (i) => (Array.isArray(sn) ? (typeof sn[0] === 'number' ? sn.includes(i) : !!sn[i]) : false);
    const checkpoint = results.checkpoint ?? run?.checkpoint ?? null;
    const phase = n0(results.bossPhase ?? run?.boss?.phase ?? run?.bossPhase ?? 1);
    const obj = st?.objective;
    this.res = { results, rewards, mode, w, s, key, checkpoint, phase, win, bossStage };
    this.resultsDone = false;

    // ---- rows ----
    const rows = [];
    const steps = [];
    const C = TUNE.cascade;
    const q = (sel) => this._ovl('results')?.el.querySelector(sel);
    const show = (sel) => q(sel)?.classList.add('show');
    if (stageMode && win) {
      const labels = [['🏁', t('ui.crownClear')], ['💔≤2', t('ui.crownHits')], [obj?.icon || '⭐', obj ? objText(obj) : t('obj.freeAll')]];
      rows.push(`<div class="rrow crowns-row step" data-step="crowns">${labels.map(([ic, lb], i) => `<div class="rc-slot${flags[i] ? ' got' : ''}${isNew(i) ? ' new' : ''}" data-i="${i}">${crown(flags[i], 'big')}<span class="rc-ico">${ic}</span><small>${esc(lb)}</small>${isNew(i) ? `<i class="rc-new">${esc(t('ui.new'))}</i>` : ''}</div>`).join('')}</div>`);
      steps.push({ d: C.crown * 0.5, start: () => show('.crowns-row') });
      flags.forEach((f, i) => steps.push({ d: C.crown, end: () => { const el = q(`.rc-slot[data-i="${i}"]`); el?.classList.add('stamped'); if (f && !this.casc?.silent) { this._sfx('star', { pitch: 1 + i * 0.25 }); this.G.input?.rumble?.(0.2, 0.3, 60); } } }));
    }
    if (stageMode && !win) {
      const frac = total ? freedRun / total : 0;
      rows.push(`<div class="rrow almost step"><b>${esc(t('ui.almost'))}</b><i class="bar big"><i class="fill" style="width:0%"></i></i><span class="al-n"><b class="cnt">0</b>/${fmtInt(total || freedRun)}</span></div>`);
      steps.push({ d: C.almost, start: () => show('.almost'), tick: (k) => { const e = easeOutCubic(k); const f = q('.almost .fill'); if (f) f.style.width = Math.round(frac * e * 100) + '%'; const c = q('.almost .cnt'); if (c) c.textContent = fmtInt(Math.round(freedRun * e)); } });
    }
    if (!stageMode) {
      const wave = n0(results.wave ?? results.wavesCleared);
      const medal = results.medal ?? rewards.medal;
      rows.push(`<div class="rrow mode-row step"><span class="mr-wave">🌌 ${esc(t('ui.wave', { n: wave || 1 }))}</span><span class="mr-freed">🕊️ ${fmtInt(freedRun)}</span>${medal != null && medal >= 0 ? `<span class="mr-medal">${['🥉', '🥈', '🥇'][medal] || '🏅'} ${esc(t('ui.medalGot'))}</span>` : ''}</div>`);
      steps.push({ d: C.missions, start: () => show('.mode-row') });
    }
    const score = n0(results.score);
    if (score || !stageMode) {
      rows.push(`<div class="rrow score-row step"><small>${esc(t('ui.score'))}</small><b class="cnt score-n">0</b>${rewards.newBest ? `<i class="pb">${esc(t('ui.newBest'))}</i>` : ''}</div>`);
      steps.push({ d: C.score, start: () => show('.score-row'), tick: (k) => { const e = q('.score-n'); if (e) e.textContent = fmtInt(score * easeOutCubic(k)); }, end: () => { if (rewards.newBest) { q('.score-row .pb')?.classList.add('pop'); if (!this.casc?.silent) this._sfx('unlock'); } } });
    }
    const troph = n0(rewards.trophies);
    if (troph > 0 && (rewards.rankVisible ?? this._unlocked('modes'))) {
      const rk = rewards.rankAfter || this._mv('rank', null);
      rows.push(`<div class="rrow troph-row step">${rankBadge(rk, 40)}<span class="tr-name">${esc(rankName(rk))}</span><b class="tr-plus">+<b class="cnt tr-n">0</b> 🏆</b></div>`);
      steps.push({ d: C.trophies, start: () => show('.troph-row'), tick: (k) => { const e = q('.tr-n'); if (e) e.textContent = Math.round(troph * k); } });
    }
    if (this._unlocked('road')) {
      const after = n0(rewards.freedAfter ?? this._mv('freed', 0));
      const before = n0(rewards.freedBefore ?? Math.max(0, after - freedRun));
      const nb = rewards.roadNextBefore?.at ? rewards.roadNextBefore : rewards.roadNext?.at && rewards.roadNext.at > before ? rewards.roadNext : DATA.road.find((n) => n.at > before);
      if (nb) {
        const prevAt = nb.prevAt ?? [...DATA.road].reverse().find((n) => n.at <= before)?.at ?? 0;
        const span = Math.max(1, nb.at - prevAt);
        const f0 = clamp((before - prevAt) / span, 0, 1), f1 = clamp((after - prevAt) / span, 0, 1);
        const it = rewardItems(nb.items || nb.reward)[0];
        const reached = after >= nb.at;
        rows.push(`<div class="rrow road-row step"><span class="rr-ico">🚀</span><i class="bar big road"><i class="fill" style="width:${f0 * 100}%"></i></i><span class="rr-goal${reached ? ' got' : ''}">${it ? itemVisual(it.kind, it.id, 30) : '🎁'}</span><small class="rr-txt">${reached ? '🎁 ✓' : esc(t('ui.roadNext', { n: fmtInt(nb.at - after) }))}</small><b class="rr-plus">+${fmtInt(after - before)} 🕊️</b></div>`);
        steps.push({ d: C.road, start: () => show('.road-row'), tick: (k) => { const f = q('.road-row .fill'); if (f) f.style.width = lerp(f0, f1, easeOutCubic(k)) * 100 + '%'; }, end: () => { if (reached) { q('.rr-goal')?.classList.add('pop'); if (!this.casc?.silent) this._sfx('unlock'); } } });
      }
    }
    const mp = (rewards.missionsProgress || []).filter(Boolean);
    if (mp.length && this._unlocked('missions')) {
      rows.push(`<div class="rrow mis-row2 step">${mp.map((m) => { const def = DATA.missions.find((d) => d.id === m.id) || {}; const tg = n0(m.target) || 1; const done = m.done ?? n0(m.cur) >= tg; return `<span class="mchip${done ? ' done' : ''}"><i>${m.icon || def.icon || '📋'}</i><b>${fmtInt(Math.min(n0(m.cur), tg))}/${fmtInt(tg)}</b>${done ? '<em>✓</em>' : ''}</span>`; }).join('')}</div>`);
      steps.push({ d: C.missions, start: () => show('.mis-row2'), end: () => { q('.mis-row2')?.classList.add('tick'); } });
    }
    const nd = (rewards.newDex || []).filter((id) => DATA.dex.entries.includes(id));
    if (nd.length) {
      rows.push(`<div class="rrow dex-row step"><b class="dx-h">📖 ${esc(t('ui.dexNew'))}</b>${nd.map((id) => `<span class="dx-new">${freedCube(id, { size: 40 })}<small>${esc(tl(DATA.dex.freedName[id]))}</small><i>${esc(t('ui.new'))}</i></span>`).join('')}</div>`);
      steps.push({ d: C.dex, start: () => { show('.dex-row'); if (!this.casc?.silent) this._sfx('unlock'); } });
    }
    const coins = n0(rewards.coins ?? results.coins);
    const cb = (rewards.coinsBreakdown || []).map((b) => {
      const k = b.key || b.id || b.kind || '';
      const lbl = b.label ? tl(b.label) : t('cb.' + k) !== 'cb.' + k ? t('cb.' + k) : k;
      const amt = n0(b.amount ?? b.coins ?? b.value);
      const v = (b.mult ? `<i>×${b.mult}</i> ` : '') + (amt ? `+${fmtInt(amt)}` : '');
      return `<span class="cb-chip${b.mult ? ' mult' : ''}">${esc(lbl)} <b>${v}</b></span>`;
    }).join('');
    rows.push(`<div class="rrow coins-row step"><div class="cb-list">${cb}</div><span class="coin-total">${coinIco('big')}<b class="cnt coins-n">0</b></span>${n0(rewards.tickets) ? `<span class="coin-total">${ticketIco('big')}<b>×${n0(rewards.tickets)}</b></span>` : ''}</div>`);
    steps.push({ d: C.coins, start: () => show('.coins-row'), tick: (k) => { const e = q('.coins-n'); if (e) e.textContent = fmtInt(coins * easeOutCubic(k)); }, end: () => { if (coins && !this.casc?.silent) this._sfx('coin'); } });

    // fail extras: tip keyed to what hit you + Helper offer after 2 fails
    let tipHTML = '';
    if (!win) {
      const hb = results.hitBy ?? run?.hitBy ?? results.lastHitBy ?? run?.lastHitBy;
      let type = typeof hb === 'string' ? hb : hb && typeof hb === 'object' ? Object.entries(hb).sort((a, b) => n0(b[1]) - n0(a[1]))[0]?.[0] : null;
      if (type === 'boss') type = 'king';
      if (!type || !(DATA.enemies[type] || type === 'king')) type = bossStage ? 'king' : st?.newEnemy || DATA.worlds[w]?.newEnemy || 'grumpy';
      const tip = type === 'king' ? t('tip.boss') : tl(DATA.enemies[type]?.tip);
      tipHTML = `<div class="tip-card step">${enemyCube(type, { size: 48 })}<div><b>💡 ${esc(t('ui.tip'))}</b><p>${esc(tip)}</p></div></div>`;
      steps.push({ d: 0.3, start: () => show('.tip-card') });
      const offer = rewards.helperOffer ?? (this.fails[key] >= TUNE.helperAfterFails && !this._settings().assist);
      if (stageMode && offer && !this._settings().assist && !this.helperOffered) {
        this.helperOffered = true;
        tipHTML += `<div class="helper-offer step">${cube({ color: '#ffffff', face: 'joy', size: 40, antenna: true })}<span class="ho-bear">🧸</span><b>${esc(t('ui.helperOffer'))}</b>
          <button class="btn btn-gold sm" data-act="helperYes" data-nav>${esc(t('ui.yes'))}</button><button class="btn btn-white sm" data-act="helperNo" data-nav>${esc(t('ui.no'))}</button></div>`;
        steps.push({ d: 0.2, start: () => show('.helper-offer') });
      }
    }

    // ---- buttons ----
    let btns;
    if (stageMode && win) {
      const nx = this._nextAfter(w, s);
      btns = `${nx ? `<button class="btn-play small" data-act="resNext" data-nav data-default><span class="bp-main" data-text="${esc(t('ui.next'))} ▶">${esc(t('ui.next'))} ▶</span><span class="bp-sub">${stageId(nx.w, nx.s)}</span></button>` : ''}
        <button class="btn btn-blue" data-act="resRetry" data-how="plain" data-nav ${nx ? '' : 'data-default'}>↻ ${esc(t('ui.retry'))}</button>
        <button class="btn btn-white" data-act="share" data-nav>📤 ${esc(t('ui.share'))}</button>
        <button class="btn btn-white" data-act="resHome" data-nav>🏠 ${esc(t('ui.home'))}</button>`;
    } else if (stageMode) {
      btns = `<button class="btn-play small" data-act="resRetry" data-how="plain" data-nav data-default><span class="bp-main" data-text="↻ ${esc(t('ui.retry'))}">↻ ${esc(t('ui.retry'))}</span></button>
        ${checkpoint && !bossStage ? `<button class="btn btn-blue" data-act="resRetry" data-how="flag" data-nav>${esc(t('ui.retryFlag'))}</button>` : ''}
        ${bossStage && phase > 1 ? `<button class="btn btn-blue" data-act="resRetry" data-how="phase" data-nav>🚩 ${esc(t('ui.retryPhase', { n: phase }))}</button>` : ''}
        <button class="btn btn-white" data-act="resHome" data-nav>🏠 ${esc(t('ui.home'))}</button>`;
    } else {
      btns = `<button class="btn-play small" data-act="resRetry" data-how="plain" data-nav data-default><span class="bp-main" data-text="↻ ${esc(t('ui.againMode'))}">↻ ${esc(t('ui.againMode'))}</span></button>
        <button class="btn btn-white" data-act="share" data-nav>📤 ${esc(t('ui.share'))}</button>
        <button class="btn btn-white" data-act="resHome" data-nav>🏠 ${esc(t('ui.home'))}</button>`;
    }
    const head = win || !stageMode
      ? `<div class="res-hero">${heroCube(heroId, { size: 64, face: 'joy', limbs: true, color: this._skinColor(heroId) })}</div>
         <h2 class="res-title" data-text="${esc(win ? t('ui.win') : t('ui.gameOver'))}">${esc(win ? t('ui.win') : t('ui.gameOver'))}</h2>
         <div class="res-sub">${esc(stageMode ? `${stageId(w, s)} · ${tl(st?.name)} · ${t('ui.cleared')}` : tl(DATA.modes[mode]?.name))}</div>`
      : `<div class="res-hero oops">${heroCube(heroId, { size: 64, face: 'hurt', limbs: true, color: this._skinColor(heroId) })}<i class="oops-stars">⭐⭐</i></div>
         <h2 class="res-title oops" data-text="${esc(t('ui.oops'))}">${esc(t('ui.oops'))}</h2>
         <div class="res-sub">${esc(t('ui.oopsSub'))} · ${esc(`${stageId(w, s)} ${tl(st?.name)}`)}</div>`;
    this._open('results', `<div class="res-dim ${win ? 'win' : 'fail'}"></div>${win ? '<div class="rays soft"></div>' : ''}
      <div class="res-wrap ${win ? 'win' : 'fail'}">
        <div class="res-head">${head}</div>
        <div class="panel res-body" data-act="resTap">${rows.join('')}${tipHTML}<small class="res-tap">${esc(t('ui.tapFast'))}</small></div>
        <div class="res-btns">${btns}</div>
        <button class="res-skip" data-act="resSkip">${esc(t('ui.skip'))} ⏭</button>
      </div>`, { back: false, blocking: false });
    if (win) this._confetti(this._ovl('results').el, 36);
    // total ≤ 5 s; replays of the same stage compress
    const totalD = steps.reduce((a, x) => a + x.d, 0);
    let speed = replay ? 1 / C.replay : 1;
    if (totalD / speed > TUNE.cascade.max) speed = totalD / TUNE.cascade.max;
    this.casc = { steps, i: 0, speed, done: false, silent: false };
    if (REDUCED) this._cascSkip();
  }
  _nextAfter(w, s) {
    const W = DATA.worlds;
    const nx = s + 1 < W[w].stages.length ? { w, s: s + 1 } : w + 1 < W.length ? { w: w + 1, s: 0 } : null;
    return nx;
  }
  _cascUpdate(rdt) {
    const c = this.casc;
    if (c.done) return;
    const stp = c.steps[c.i];
    if (!stp) { this._cascDone(); return; }
    if (!stp.started) { stp.started = true; stp.t = 0; stp.start?.(); }
    stp.t += rdt * c.speed;
    const k = clamp(stp.t / stp.d, 0, 1);
    stp.tick?.(k);
    if (k >= 1) { stp.end?.(); c.i++; }
  }
  _cascTap() {
    const c = this.casc;
    if (!c || c.done) return;
    const stp = c.steps[c.i];
    if (stp) { if (!stp.started) { stp.started = true; stp.start?.(); } stp.t = stp.d; }
  }
  _cascSkip() {
    const c = this.casc;
    if (!c || c.done) return;
    c.silent = true;
    for (; c.i < c.steps.length; c.i++) { const s = c.steps[c.i]; if (!s.started) s.start?.(); s.tick?.(1); s.end?.(); }
    this._cascDone();
  }
  _cascDone() {
    const c = this.casc;
    if (!c || c.done) return;
    c.done = true;
    this.resultsDone = true;
    const o = this._ovl('results');
    o?.el.classList.add('done');
    this._layerChanged();
    const { rewards, results } = this.res || {};
    const rescued = rewards?.rescued || results?.rescued;
    if (rescued) this.showRescue(rescued, 'rescue');
    const tb = rewards?.rankBefore?.tier, ta = rewards?.rankAfter?.tier;
    if (ta != null && tb != null && ta > tb && !this.queue.some((x) => x.type === 'rankup') && this.lastRankTier !== ta) { this.lastRankTier = ta; this.showRankUp(rewards.rankAfter, rewards.rankBefore); }
    this._healthAfterRun();
  }
  _resNext() {
    const r = this.res;
    if (!r) return;
    const nx = this._nextAfter(r.w, r.s);
    if (!nx) { this._toHome(); return; }
    if (!this._stageUnlocked(nx.w, nx.s)) { this._toHome(); this.go('map', { w: nx.w }); return; }
    this._startStage(nx.w, nx.s);
  }
  _resRetry(how) {
    const r = this.res, G = this.G;
    const last = G.app?.lastRunCfg || {};
    const cfg = { mode: r?.mode || last.mode || 'stage', worldId: r?.w ?? last.worldId ?? 0, stageId: r?.s ?? last.stageId ?? 0 };
    if (last.mutatorId) cfg.mutatorId = last.mutatorId;
    if (last.challenge) { cfg.seed = last.seed; cfg.challenge = last.challenge; }
    if (cfg.mode === 'stage') cfg.attempt = this.fails[r?.key] || 0;
    if (how === 'flag' && r?.checkpoint) cfg.checkpoint = r.checkpoint;
    if (how === 'phase' && r?.phase > 1) cfg.bossPhase = r.phase;
    if (cfg.mode === 'endless' && cfg.seed == null) cfg.seed = (Math.random() * 0x3fffff) | 0;
    G.app?.startRun?.(cfg);
  }

  // ═════════ CLAIM POPUP 领取 ═════════
  _showClaim(entry) {
    const items = rewardItems(entry.rewards);
    if (!items.length) return;
    const title = entry.title || (entry.source === 'welcome' ? t('ui.welcomeBack') : t('ui.youGot'));
    const sk = 'src.' + entry.source;
    const src = entry.source && t(sk) !== sk ? t(sk) : '';
    const cards = items.map((it, i) => `<div class="ci r-${it.rarity}" data-kind="${it.kind}" style="--d:${120 + i * 80}ms">
      <span class="ci-vis">${itemVisual(it.kind, it.id, 60)}</span>${it.amount ? `<i class="ci-amt">×${fmtInt(it.amount)}</i>` : ''}<b class="ci-name">${esc(it.label)}</b></div>`).join('');
    const o = this._open('claim', `<div class="ovl-dim dark"></div><div class="rays"></div>
      <div class="claim-box">
        <h2 class="claim-title" data-text="${esc(title)}">${esc(title)}</h2>${src ? `<small class="claim-src">${esc(src)}</small>` : ''}
        <div class="claim-items n${Math.min(items.length, 4)}">${cards}</div>
        <button class="btn-claim" data-act="claimOk" data-nav data-default><span data-text="${esc(t('ui.claim'))}">${esc(t('ui.claim'))}</span></button>
      </div>`, { back: () => this._claimOk() });
    o.entry = entry;
    const top = items.some((i) => i.rarity === 'legend') ? 'legend' : items.some((i) => i.rarity === 'epic') ? 'epic' : '';
    if (top) { o.el.classList.add('rare-' + top); this._confetti(o.el, top === 'legend' ? 48 : 24); }
    this._sfx(top ? 'unlock' : 'star');
  }
  _claimOk() {
    const o = this._ovl('claim');
    if (!o || o.claiming) return;
    o.claiming = true;
    const e = o.entry || {};
    this._blip('claim');
    if (e.id != null) this._m('claim', e.id);
    if (e.pulled) { const it = rewardItems(e.rewards); e.coins = it.filter((x) => x.kind === 'coins').reduce((a, x) => a + n0(x.amount), 0); e.tickets = it.filter((x) => x.kind === 'tickets').reduce((a, x) => a + n0(x.amount), 0); }
    const dur = this._flyRewards(o.el, e);
    if (e.pulled) setTimeout(() => { this._m('ackClaim'); this._walletTick(); }, dur);
    const coins = e.applied ? e.coins || 0 : 0, tickets = e.applied ? e.tickets || 0 : 0;
    setTimeout(() => {
      this.pending.coins = Math.max(0, this.pending.coins - coins);
      this.pending.tickets = Math.max(0, this.pending.tickets - tickets);
      this._walletTick();
    }, dur);
    this._close('claim');
    if (rewardItems(e.rewards).some((i) => !['coins', 'tickets', 'trophies'].includes(i.kind))) this.G.app?.refreshHub?.();
    const after = this._afterClaim;
    this._afterClaim = null;
    after?.();
    if (this.screen && this.G.app?.state !== 'run' && ['home', 'road', 'missions', 'dex', 'achievements', 'map'].includes(this.screen.name) && !this.queue.length) setTimeout(() => this._rerender(), dur + 40);
  }
  _flyRewards(boxEl, e) {
    if (REDUCED || this.walletEl.classList.contains('hidden')) return 0;
    let maxT = 0;
    const layer = this.flyHost;
    for (const kind of ['coins', 'tickets']) {
      const amt = kind === 'coins' ? e.coins : e.tickets;
      if (!amt) continue;
      const src = boxEl.querySelector(`.ci[data-kind="${kind}"]`);
      const dst = this.walletEl.querySelector(kind === 'coins' ? '.w-coins i' : '.w-tickets i');
      if (!src || !dst) continue;
      const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
      const n = clamp(Math.ceil(amt / (kind === 'coins' ? 25 : 1)), 3, TUNE.flyIcons);
      for (let i = 0; i < n; i++) {
        const el = document.createElement('i');
        el.className = kind === 'coins' ? 'fly i-coin' : 'fly i-ticket';
        const sx = a.left + a.width / 2 + (Math.random() - 0.5) * 60, sy = a.top + a.height / 2 + (Math.random() - 0.5) * 40;
        const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
        el.style.left = sx + 'px'; el.style.top = sy + 'px';
        layer.appendChild(el);
        const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 220, my = Math.min(sy, ey) - 80 - Math.random() * 90;
        const pts = [];
        for (let k = 0; k <= 6; k++) {   // quadratic bezier sampled into keyframes
          const u = k / 6;
          const x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex, y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey;
          pts.push({ transform: `translate(${x - sx}px,${y - sy}px) scale(${1.2 - u * 0.5})`, opacity: u < 0.9 ? 1 : 0.6 });
        }
        const delay = i * 34;
        el.animate(pts, { duration: TUNE.flyTime * 1000, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' }).onfinish = () => el.remove();
        maxT = Math.max(maxT, TUNE.flyTime * 1000 + delay);
      }
    }
    return maxT;
  }
  _confetti(host, n = 36) {
    if (REDUCED || !host) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#ff7ab8', '#ffd84a', '#5fd0ff', '#7dffc0', '#b26bff', '#ff9a3c', '#ffffff'];
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--dx:${((Math.random() - 0.5) * 160).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;--d:${(Math.random() * 0.6).toFixed(2)}s;--t:${(1.8 + Math.random() * 1.4).toFixed(2)}s;--c:${cols[i % cols.length]};--w:${6 + (i % 3) * 3}px"></i>`;
    }
    box.innerHTML = html;
    host.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }

  // ═════════ NEW FEATURE (guide cube Pixel) ═════════
  _showFeatureNow(f) {
    const lbl = { signin: 'ui.signin', rank: 'ui.rank', missions: 'ui.missions', road: 'ui.road', dex: 'ui.dex', wardrobe: 'ui.wardrobe', capsule: 'ui.capsule', modes: 'ui.modes', achievements: 'ui.achievements', heroes: 'ui.heroes', map: 'ui.map' }[f];
    const o = this._open('feature', `<div class="ovl-dim"></div>
      <div class="panel feat-box pop">
        <div class="feat-burst"><span data-text="${esc(t('ui.featureNew'))}">${esc(t('ui.featureNew'))}</span></div>
        <div class="feat-row"><div class="pixel">${cube({ color: '#ffffff', face: 'joy', size: 70, antenna: true, limbs: true })}</div>
          <div class="bubble"><small>${esc(t('ui.pixel'))}</small><p>${esc(t('feat.' + f) !== 'feat.' + f ? t('feat.' + f) : t('meta.hint.' + f) !== 'meta.hint.' + f ? t('meta.hint.' + f) : '✨')}</p></div></div>
        <div class="feat-icon"><span class="fi-ico">${featIcon(f)}</span><b>${esc(lbl ? t(lbl) : f)}</b></div>
        <button class="btn btn-gold big" data-act="featOk" data-nav data-default>${esc(t('ui.ok'))}</button>
      </div>`, { back: () => this._featOk() });
    o.feature = f;
    this._sfx('unlock');
  }
  _featOk() {
    const o = this._ovl('feature');
    if (!o) return;
    const f = o.feature;
    this._blip('click');
    this._close('feature');
    if (this.screen?.name === 'home' && this.G.app?.state !== 'run') { this.pendingArrow = f; this._rerender(); }
    else this.pendingArrow = f;
  }

  // ═════════ RANK-UP CEREMONY 段位 ═════════
  _showRankNow(rank, before, placement = false) {
    const nr = DATA.ranks.find((x) => x.id === rank?.id) || DATA.ranks[rank?.tier ?? 1] || DATA.ranks[1];
    const ti = DATA.ranks.indexOf(nr);
    const ob = before ? DATA.ranks.find((x) => x.id === before.id) || DATA.ranks[before.tier ?? 0] : DATA.ranks[Math.max(0, ti - 1)];
    const shards = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i / 14) * 360 + Math.random() * 20}deg;--dist:${120 + Math.random() * 120}px;--sz:${10 + Math.random() * 16}px"></i>`).join('');
    this._open('rank', `<div class="ovl-dim dark"></div><div class="rays gold"></div>
      <div class="rk-stage">
        <div class="rk-cube old${placement ? ' blank' : ''}" style="--rc:${placement ? '#dfe7f3' : ob.color}"><span>${ob.icon}</span><svg class="rk-cracks" viewBox="0 0 100 100"><path d="M50 8 L44 34 L58 46 L40 70 L52 94 M44 34 L20 40 M58 46 L84 36 M40 70 L18 78"/></svg></div>
        <div class="rk-shards" style="--rc:${ob.color}">${shards}</div>
        <div class="rk-flash"></div>
        <div class="rk-cube new" style="--rc:${nr.color}"><span>${nr.icon}</span></div>
        <div class="rk-text"><small class="rk-sub">${esc(placement ? t('ui.placement') : t('ui.rankUp'))}</small><b class="rk-name" data-text="${esc(rankName(rank || nr))}">${esc(rankName(rank || nr))}</b><span class="rk-stars">${'★'.repeat(Math.max(1, n0(rank?.stars) || 1))}</span></div>
      </div>
      <button class="btn btn-gold big rk-btn" data-act="rankSkip" data-nav data-default>${esc(t('ui.great'))}</button>`, { back: () => this._rankEnd() });
    this.rankT = { t: 0, t0: performance.now() };
    setTimeout(() => { if (this._isOpen('rank')) this._confetti(this._ovl('rank').el, 50); }, REDUCED ? 0 : 3000);
  }
  _rankUpdate(rdt) {
    const r = this.rankT;
    r.t = (performance.now() - r.t0) / 1000;
    if (!r.a && r.t > 0.6) { r.a = 1; this._sfx('whoosh'); this.G.input?.rumble?.(0.3, 0.2, 120); }
    if (!r.b && r.t > 1.4) { r.b = 1; this._sfx('rankup'); this.G.input?.rumble?.(0.7, 0.5, 220); }
    if (!r.c && r.t > 3.0) { r.c = 1; this.G.app?.pokeHero?.(); }
  }
  _rankEnd() {
    if (this.rankT && this.rankT.t < TUNE.rankSkipAfter) return;
    this.rankT = null;
    this._blip('click');
    this._close('rank');
  }

  // ═════════ HERO RESCUE / NEW HERO REVEAL ═════════
  _showRescueNow(heroId, kind) {
    const h = heroById(heroId);
    const bars = Array.from({ length: 6 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
    this._open('rescue', `<div class="rescue-bg" style="--hc:${hex(h.color)};--ha:${hex(h.accent)}"></div><div class="rays"></div>
      <div class="rescue-stage">
        <div class="rs-ribbon"><span data-text="${esc(kind === 'rescue' ? t('ui.rescued') : t('ui.newHero'))}">${esc(kind === 'rescue' ? t('ui.rescued') : t('ui.newHero'))}</span></div>
        <div class="rs-hero"><div class="rs-cage">${bars}</div>${heroCube(heroId, { size: 150, limbs: true, face: 'joy' })}</div>
        <b class="rs-name" data-text="${esc(tl(h.name))}">${esc(tl(h.name))}</b>
        <span class="rs-role">${esc(tl(h.role))}</span>
        <p class="rs-blurb">${esc(tl(h.blurb))}</p>
        <div class="row"><button class="btn btn-gold big" data-act="rescueOk" data-nav data-default>${esc(t('ui.great'))}</button>
          ${this.G.app?.state !== 'run' || this.G.run?.state === 'ended' ? `<button class="btn btn-blue" data-act="rescueTry" data-id="${heroId}" data-nav>${esc(t('ui.tryHero'))}</button>` : ''}</div>
      </div>`, { back: () => this._close('rescue') });
    this._sfx('unlock');
    setTimeout(() => this._sfx('rankup'), 700);
    this._confetti(this._ovl('rescue').el, 50);
  }

  // ═════════ PLAY-TIME GUARDIAN: break card · eye rest · goodnight ═════════
  _showBreakNow(item) {
    const min = n0(item.minutes) || Math.max(1, Math.round(this.health.active / 60)) || TUNE.healthCardMin;
    this._open('break', `<div class="ovl-dim"></div>
      <div class="panel break-card pop">
        <div class="bk-scene"><i class="bk-sun"></i><i class="bk-hill h1"></i><i class="bk-hill h2"></i><i class="bk-cloud c1"></i><i class="bk-cloud c2"></i>
          <div class="bk-blu">${heroCube('blu', { size: 70, limbs: true, face: 'sleep' })}</div></div>
        <h3>${esc(t('ui.breakTitle'))}</h3>
        <p>${esc(t('ui.breakBody', { n: min }))}</p>
        <div class="eye-rest"><svg viewBox="0 0 44 44"><circle class="er-bg" cx="22" cy="22" r="19"/><circle class="er-fg" cx="22" cy="22" r="19"/></svg><b class="er-n">${TUNE.eyeRest}</b><small>👀 ${esc(t('ui.lookFar'))}</small></div>
        <small class="note">${esc(t('ui.restBonus'))}</small>
        <div class="row"><button class="btn btn-gold big" data-act="breakRest" data-nav data-default>🌙 ${esc(t('ui.takeBreak'))}</button><button class="btn btn-white" data-act="breakMore" data-nav>${esc(t('ui.keepPlaying'))}</button></div>
      </div>`, { back: false });
    this.eye = { t: 0, t0: performance.now() };
    this._sfx('star');
  }
  _eyeUpdate(rdt) {
    const o = this._ovl('break');
    if (!o) { this.eye = null; return; }
    this.eye.t = (performance.now() - this.eye.t0) / 1000;
    const left = Math.max(0, TUNE.eyeRest - this.eye.t);
    const n = o.el.querySelector('.er-n');
    const s = String(Math.ceil(left));
    if (n && n.textContent !== s && left > 0) n.textContent = s;
    o.el.querySelector('.er-fg')?.style.setProperty('--k', clamp(this.eye.t / TUNE.eyeRest, 0, 1));
    if (left <= 0 && !this.eye.done) { this.eye.done = true; n.textContent = '✓'; o.el.querySelector('.eye-rest small').textContent = t('ui.eyesDone'); this._sfx('star'); }
  }
  _breakRest() {
    this._m('takeBreak');
    this._blip('claim');
    this.eye = null;
    this._close('break');
    this.toast(t('ui.restThanks'), '🌙');
    if (this.G.app?.state === 'run') this._toHome();
  }
  _showGoodnightNow() {
    const stars = Array.from({ length: 22 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 60).toFixed(1)}%;--d:${(Math.random() * 3).toFixed(2)}s"></i>`).join('');
    this._open('goodnight', `<div class="gn-sky">${stars}<i class="gn-moon"></i></div>
      <div class="gn-stage">
        <div class="gn-blu">${heroCube('blu', { size: 120, face: 'sleep', limbs: true })}<span class="zzz"><i>z</i><i>z</i><i>Z</i></span></div>
        <h2 class="gn-title" data-text="${esc(t('ui.goodnight'))}">${esc(t('ui.goodnight'))}</h2>
        <p>${esc(t('ui.goodnightSub'))}</p>
        <div class="row"><button class="btn btn-gold big" data-act="gnBye" data-nav data-default>👋 ${esc(t('ui.bye'))}</button></div>
        <button class="link gn-parent" data-act="gnAdd" data-nav>👪 ${esc(t('ui.parentAdd'))}</button>
      </div>`, { back: false });
  }

  // ═════════ SHARE POSTER (1080×1350, poster style) + 挑战码 ═════════
  showShare(opts = {}) {
    const res = opts.results || (this._isOpen('results') ? this.res?.results : null);
    const heroId = res?.heroId || this._mv('selectedHero', 'blu');
    const last = this.G.app?.lastRunCfg;
    const seed = (last?.mode === 'endless' && last.seed != null ? last.seed : (Math.random() * 0x3fffff) | 0) & 0x3fffff;
    const code = encodeChallenge({ seed, hero: Math.max(0, DATA.heroes.findIndex((h) => h.id === heroId)) });
    let canvas;
    try { canvas = this._drawPoster({ res, heroId, code }); } catch (err) { console.error('[ui] poster', err); this._blip('error'); return; }
    const canShare = !!navigator.share;
    const o = this._open('share', `<div class="ovl-dim"></div>
      <div class="panel share-pop pop"><button class="x-btn" data-act="close" data-id="share" data-nav>✕</button>
        <h3 class="ribbon small">📤 ${esc(t('ui.shareTitle'))}</h3>
        <div class="poster-box"></div>
        <div class="share-code"><small>${esc(t('ui.challengeCode'))}</small><b>${code}</b></div>
        <div class="row"><button class="btn btn-gold" data-act="shareSave" data-nav data-default>💾 ${esc(t('ui.saveImg'))}</button>${canShare ? `<button class="btn btn-blue" data-act="shareSend" data-nav>📤 ${esc(t('ui.shareBtn'))}</button>` : ''}</div>
      </div>`);
    o.el.querySelector('.poster-box').appendChild(canvas);
    o.canvas = canvas; o.code = code;
  }
  _shareSave() {
    const o = this._ovl('share');
    if (!o) return;
    try {
      const a = document.createElement('a');
      a.download = `cubedash-${o.code}.png`;
      a.href = o.canvas.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      this._blip('claim');
    } catch { this._blip('error'); }
  }
  _shareSend() {
    const o = this._ovl('share');
    if (!o) return;
    o.canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], `cubedash-${o.code}.png`, { type: 'image/png' });
        const data = { title: '方块大逃跑 CUBE DASH', text: `${t('ui.challengeLine')} ${t('ui.challengeCode')}: ${o.code}` };
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
        await navigator.share(data);
        this._blip('claim');
      } catch { /* cancelled */ }
    }, 'image/png');
  }
  _drawPoster({ res, heroId, code }) {
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC","WenQuanYi Zen Hei",system-ui,sans-serif';
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const rng = makeRng(seedFrom(code));
    // sky
    let gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#7cc4ff'); gr.addColorStop(0.45, '#cfeaff'); gr.addColorStop(1, '#fff3fb');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // rainbow
    const rb = ['#ff8a9a', '#ffc178', '#fff08a', '#9cf0b0', '#8fd3ff', '#c3a6ff'];
    g.lineWidth = 20; g.globalAlpha = 0.5;
    rb.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(W * 0.82, 520, 520 - i * 20, Math.PI * 1.08, Math.PI * 1.62); g.stroke(); });
    g.globalAlpha = 1;
    // clouds
    const cloud = (x, y, s) => { g.fillStyle = 'rgba(255,255,255,0.92)'; for (const [dx, dy, r] of [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [-0.9, 0.1, 0.7], [0.8, 0.35, 0.8]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } };
    cloud(90, 90, 60); cloud(900, 70, 50); cloud(60, 780, 70); cloud(980, 820, 80); cloud(520, 860, 90); cloud(260, 880, 70); cloud(780, 900, 70);
    // sparkles + floating mini cubes
    const spark = (x, y, s, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill(); };
    for (let i = 0; i < 14; i++) spark(rng() * W, 60 + rng() * 760, 10 + rng() * 16, i % 2 ? '#fff6a8' : '#ffffff');
    for (let i = 0; i < 8; i++) { const x = rng() * W, y = 330 + rng() * 380, s = 18 + rng() * 22; g.save(); g.translate(x, y); g.rotate(rng() - 0.5); g.fillStyle = ['#ffb3c7', '#b3e5ff', '#fff0a8', '#c8f7d0'][i % 4]; rr(-s / 2, -s / 2, s, s, s * 0.25); g.fill(); g.restore(); }
    // logo — white chunky letters, deep-blue outline + extrusion (poster)
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = `900 168px ${FONT}`;
    const LT = '方块大逃跑';
    for (let d = 16; d > 0; d -= 2) { g.fillStyle = '#14307f'; g.strokeStyle = '#14307f'; g.lineWidth = 30; g.strokeText(LT, W / 2, 190 + d); }
    g.strokeStyle = '#1d44b8'; g.lineWidth = 30; g.strokeText(LT, W / 2, 190);
    gr = g.createLinearGradient(0, 110, 0, 270); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dbeaff');
    g.fillStyle = gr; g.fillText(LT, W / 2, 190);
    // red corner cubes on the logo
    for (const [x, y, s] of [[168, 96, 42], [900, 120, 36], [230, 270, 30], [860, 280, 30]]) { g.save(); g.translate(x, y); g.rotate(0.3); g.fillStyle = '#ef4b3c'; rr(-s / 2, -s / 2, s, s, 8); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(-s / 2 + 5, -s / 2 + 4, s * 0.45, s * 0.25, 5); g.fill(); g.restore(); }
    // CUBE DASH pill
    rr(W / 2 - 270, 290, 540, 96, 48);
    gr = g.createLinearGradient(0, 290, 0, 386); gr.addColorStop(0, '#5a97ff'); gr.addColorStop(1, '#2356e8');
    g.fillStyle = gr; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = '#ffffff'; g.font = `900 54px ${FONT}`; g.fillText('C U B E  D A S H', W / 2, 340);
    g.fillStyle = '#1b2f7a'; g.font = `800 50px ${FONT}`;
    g.fillText(getLang() === 'en' ? 'Dodge with style · Dash just right' : '躲得漂亮，冲得刚好', W / 2, 440);
    // arena floor ellipse
    gr = g.createRadialGradient(W / 2, 760, 40, W / 2, 760, 520);
    gr.addColorStop(0, '#fff6e2'); gr.addColorStop(1, '#f1ddb4');
    g.fillStyle = gr; g.beginPath(); g.ellipse(W / 2, 780, 520, 150, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6fd69a'; g.lineWidth = 22; g.stroke();
    // cubes
    const face = (x, y, s, col, angry) => {
      g.save(); g.translate(x, y);
      g.fillStyle = 'rgba(40,60,120,.18)'; g.beginPath(); g.ellipse(0, s * 0.55, s * 0.55, s * 0.14, 0, 0, Math.PI * 2); g.fill();
      const body = g.createLinearGradient(0, -s / 2, 0, s / 2); body.addColorStop(0, mix(col, '#ffffff', 0.25)); body.addColorStop(1, mix(col, '#000000', 0.12));
      g.fillStyle = body; rr(-s / 2, -s / 2, s, s, s * 0.24); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; rr(-s * 0.38, -s * 0.42, s * 0.5, s * 0.14, s * 0.07); g.fill();
      const ey = -s * 0.04, ex = s * 0.2, er = s * 0.085;
      g.fillStyle = '#16183a';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * ex, ey, er, er * 1.25, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff';
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * ex - er * 0.3, ey - er * 0.45, er * 0.38, 0, Math.PI * 2); g.fill(); }
      if (angry) { g.strokeStyle = '#16183a'; g.lineWidth = s * 0.05; g.lineCap = 'round'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (ex + er * 1.3), ey - er * 2.1); g.lineTo(sx * (ex - er * 1.2), ey - er * 1.2); g.stroke(); } }
      g.fillStyle = 'rgba(255,120,150,.55)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * s * 0.3, s * 0.12, s * 0.07, s * 0.04, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#d9465a'; g.beginPath(); g.ellipse(0, s * 0.16, s * 0.08, angry ? s * 0.07 : s * 0.09, 0, 0, Math.PI); g.fill();
      g.restore();
    };
    for (const [x, y, s] of [[200, 640, 110], [860, 620, 130], [330, 540, 70], [720, 520, 80], [120, 760, 80], [960, 770, 90]]) face(x, y, s, '#ef4b3c', true);
    const hc = hex(this._skinColor(heroId));
    g.fillStyle = hc;
    for (const [dx, dy, r] of [[-150, 60, 34], [150, 40, 34], [-70, 150, 38], [70, 150, 38]]) { g.fillStyle = mix(hc, '#000000', 0.1); g.beginPath(); g.arc(W / 2 + dx, 690 + dy, r, 0, Math.PI * 2); g.fill(); }
    face(W / 2, 690, 250, hc, false);
    // info card
    const cy = 900;
    g.save(); g.shadowColor = 'rgba(30,60,140,.25)'; g.shadowBlur = 40; g.shadowOffsetY = 12;
    rr(56, cy, W - 112, 400, 48); g.fillStyle = '#ffffff'; g.fill(); g.restore();
    rr(56, cy, W - 112, 400, 48); g.lineWidth = 6; g.strokeStyle = '#dcebff'; g.stroke();
    g.textAlign = 'left';
    g.fillStyle = '#1b2f7a'; g.font = `900 54px ${FONT}`; g.fillText(this._playerName(), 100, cy + 64);
    const prof = this._profile();
    g.fillStyle = '#5a6fae'; g.font = `700 32px ${FONT}`;
    g.fillText((prof.title ? '🏷️ ' + this._titleName(prof.title) + ' · ' : '') + tl(heroById(heroId).name), 100, cy + 116);
    const rank = this._mv('rank', null);
    if (rank && this._unlocked('modes')) {
      g.textAlign = 'center';
      g.fillStyle = rank.color || '#ffd24a'; g.beginPath(); g.arc(W - 150, cy + 70, 46, 0, Math.PI * 2); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
      g.font = `50px ${FONT}`; g.fillText(rank.icon || '🏅', W - 150, cy + 74);
      g.fillStyle = '#1b2f7a'; g.font = `800 24px ${FONT}`; g.fillText(rankName(rank) + ' ' + '★'.repeat(rank.stars || 1), W - 150, cy + 136);
    }
    const st = this.G.save?.profile?.stats || {};
    let crowns = 0; DATA.worlds.forEach((w, wi) => { crowns += this._worldCrowns(wi); });
    const stats = [
      ['🕊️', t('ui.statFreed'), res ? sumObj(res.freed) : n0(this._mv('freed', st.freed))],
      ['🏆', t('ui.score'), n0(res?.score)],
      ['👑', t('ui.pCrowns'), crowns],
      ['🎯', t('ui.statPerfect'), n0(res?.perfects ?? st.perfects)],
      ['🔥', t('ui.pCombo'), n0(res?.maxCombo ?? st.bestCombo)],
      ['💫', t('ui.pBonk'), n0(res?.bonks ?? st.bonks)],
    ];
    g.textAlign = 'center';
    stats.forEach(([ic, lb, v], i) => {
      const x = 100 + (i % 3) * 300, y = cy + 160 + Math.floor(i / 3) * 90;
      rr(x, y, 270, 78, 24); g.fillStyle = '#f0f7ff'; g.fill();
      g.font = `38px ${FONT}`; g.fillText(ic, x + 44, y + 41);
      g.fillStyle = '#1b2f7a'; g.font = `900 34px ${FONT}`; g.fillText(fmtInt(v), x + 160, y + 32);
      g.fillStyle = '#6c7fb8'; g.font = `700 21px ${FONT}`; g.fillText(lb, x + 160, y + 60);
    });
    // challenge code strip
    const sy = cy + 342;
    rr(100, sy, W - 200, 50, 25); g.fillStyle = '#e4efff'; g.fill();
    g.textAlign = 'left'; g.fillStyle = '#5a6fae'; g.font = `800 24px ${FONT}`; g.fillText(t('ui.challengeCode'), 128, sy + 26);
    g.textAlign = 'center'; g.fillStyle = '#2356e8'; g.font = `900 40px ${FONT}`; g.fillText(code.split('').join(' '), W / 2, sy + 27);
    g.textAlign = 'right'; g.fillStyle = '#8193c4'; g.font = `700 22px ${FONT}`; g.fillText(dayKey(), W - 128, sy + 26);
    g.textAlign = 'center'; g.fillStyle = '#1b2f7a'; g.font = `800 30px ${FONT}`;
    g.fillText(t('ui.challengeLine'), W / 2, H - 24);
    return cv;
  }
}

function seedFrom(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

addStrings({
  zh: { 'ui.placement': '段位定级!', 'feat.signin': '每天来点一下签到，就有礼物!', 'ui.r3': '解救!', 'ui.r4': '完美!', 'tip.boss': '大王砸地后会晕倒，冲向它发光的核心!' },
  en: { 'ui.placement': 'Your rank!', 'feat.signin': 'Tap Sign-in once a day for a gift!', 'ui.r3': 'POP!', 'ui.r4': 'PERFECT!', 'tip.boss': 'After King Glitch slams he gets dizzy — dash into his glowing core!' },
});
