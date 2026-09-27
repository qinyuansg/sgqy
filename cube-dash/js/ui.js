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
  cascade: { crown: 0.36, score: 0.75, trophies: 0.6, road: 0.7, missions: 0.45, dex: 0.45, coins: 0.6, almost: 0.8, replay: 0.55 },
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
    'cb.base': '通关', 'cb.first': '首次通关', 'cb.stars': '新皇冠', 'cb.firstWin': '首胜×2', 'cb.rested': '休息×1.5', 'cb.fail': '努力奖',
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
    'cb.base': 'Clear', 'cb.first': 'First clear', 'cb.stars': 'New crowns', 'cb.firstWin': '1st win ×2', 'cb.rested': 'Rested ×1.5', 'cb.fail': 'Good try',
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

// hats have no mesh preview in DOM → one friendly emoji each
const HAT_ICON = {
  none: '🚫', antenna: '📡', flower: '🌸', propeller: '🚁', cat: '🐱', headphones: '🎧', bunny: '🐰', astro: '🧑‍🚀',
  wizard: '🧙', crown: '👑', halo: '😇', w_cloud: '☁️', w_neon: '🥽', w_crystal: '🦄', w_nebula: '🪐', w_foundry: '⚙️', w_core: '💫',
};
const FEATURE_ICON = { missions: '📋', road: '🚀', dex: '📖', wardrobe: '👕', capsule: '__cap', modes: '🌌', achievements: '🏅', heroes: '🦸', map: '🗺️' };

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
  return cube({ color: type === 'coin' ? '#ffe27a' : mix(hex(base), '#ffffff', 0.72), face: 'joy', acc: ENEMY_ACC[type] || '', ...opts });
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
  };
  for (const r of [].concat(rewards || [])) {
    if (!r) continue;
    if (r.kind) { push(r.kind === 'coin' ? 'coins' : r.kind === 'ticket' ? 'tickets' : r.kind, r.id, r.amount ?? r.n); continue; }
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
    this._lastClaimKey = ''; this._lastClaimT = -1;

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
    bus.on('meta:welcome', (p) => this.queueClaim(p?.rewards || [p], 'welcome'));
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
    if (this._canPopup()) {
      const mq = this._m('takeClaims');                  // optional pull-style meta queue
      if (Array.isArray(mq)) for (const c of mq) this.queueClaim(c.rewards || c, c.source, c);
      if (this.queue.length) this._drain();
    }
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
      if (main <= 2) continue;
      const s = main + cross * (overlap ? 0.4 : 2.5);
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
    trayBtn.classList.toggle('hidden', !this.tray.length || this.G.app?.state === 'run');
    trayBtn.querySelector('.dot').textContent = this.tray.length;
  }
  _walletUpdate(rdt) {
    if (this.walletEl.classList.contains('hidden')) return;
    const tc = Math.max(0, n0(this._mv('coins', 0)) - this.pending.coins);
    const tt = Math.max(0, n0(this._mv('tickets', 0)) - this.pending.tickets);
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
  _enqueue(item) {
    this.queue.push(item);
    this.queue.sort((a, b) => (b.pri || 0) - (a.pri || 0));
  }
  _drain() {
    if (!this.queue.some((q) => q.type === 'claim')) this.chain = 0;
    const item = this.queue.shift();
    if (!item) return;
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
    else if (item.type === 'feature') this._showFeatureNow(item.feature);
    else if (item.type === 'rankup') this._showRankNow(item.rank, item.before);
    else if (item.type === 'rescue') this._showRescueNow(item.hero, item.kind);
    else if (item.type === 'break') this._showBreakNow(item);
    else if (item.type === 'goodnight') this._showGoodnightNow();
    else if (item.type === 'night') { this.toast(t('ui.night'), '🌙'); }
    else if (item.type === 'toast') this.toast(item.text, item.icon);
    else if (item.type === 'signin') this._showSignin();
  }

  // ---------- incoming meta events ----------
  _onReward(p = {}) {
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
    if (tier > this.lastRankTier || p.tierUp) this._enqueue({ type: 'rankup', pri: 5, rank, before });
    else this._enqueue({ type: 'toast', pri: 1, text: t('ui.rankUpStar') + ' ' + rankName(rank) + ' ' + '★'.repeat(rank.stars || 1), icon: rank.icon || '⭐' });
    this.lastRankTier = tier;
  }
  _onUnlock(p = {}) {
    if (p.kind === 'hero' && p.id) this.showRescue(p.id, 'unlock');
    else if (p.kind === 'world') this._enqueue({ type: 'toast', pri: 1, text: t('ui.world', { n: (+p.id || 0) + 1 }) + ' · ' + worldName(+p.id || 0), icon: '🪐' });
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
      const d = new Date(), hm = d.getHours() * 60 + d.getMinutes();
      if (!h.nightShown && (hm >= 21 * 60 + 30 || hm < 6 * 60 + 30)) { r.night = true; h.nightShown = true; }
    }
    if (!r) return;
    if (r.limit) this.showGoodnight();
    else if (r.card) this.showBreak('card', { minutes: Math.round(h.active / 60) });
    else if (r.toast) this.showBreak('toast');
    if (r.night) this.showBreak('night');
  }

  // ---------- run lifecycle ----------
  _onRunStart() {
    for (const o of [...this.overlays]) this._close(o.id, true);
    this.casc = null; this.lvl = null; this.eye = null; this.rankT = null;
    this._clearScreen();
    this._walletVisibility();
    this.toastHost.classList.add('in-run');
  }
