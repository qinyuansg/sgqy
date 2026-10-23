/* Content for the Normanton Park #05-20 analysis video.
   Each scene: id, chapter, layout, items (visual components), narration (sentences; also used as captions),
   minDuration (visuals need at least this long). On-screen uses digits; narration uses Chinese numerals for TTS. */
const G = 'var(--green)', R = 'var(--red)', B = 'var(--sky)', Y = 'var(--gold)', V = 'var(--violet)';
window.SCENES = [

// ───────────────────────── 00 OPENING ─────────────────────────
{ id: 'open', chapter: '00 · OPENING', layout: 'center', minDuration: 9, items: [
  { type: 'kicker', text: 'Singapore Property Intelligence · 2026.10.23' },
  { type: 'title', text: '你的房子，本质上是什么？', size: 100 },
  { type: 'sub', text: 'Normanton Park · Block 49 #05-20 · 3 Bedroom Premium · 1,098 sqft', size: 34 },
  { type: 'spacer', h: 10 },
  { type: 'pills', items: [{ text: '资产本质' }, { text: '真实估值' }, { text: '三条路径' }, { text: '未来走势' }, { text: '行动清单' }] }
], narration: [
  '二零二六年十月二十三日。',
  '今天我们不聊房价涨了多少，我们聊一个更根本的问题。',
  '你在 Normanton Park 的这套房子，本质上是一个什么样的资产？它现在值多少？接下来该怎么配置？',
  '以下所有判断，都建立在可核实的成交数据和官方政策之上。'
] },

// ───────────────────────── 01 ASSET FILE ─────────────────────────
{ id: 'file', chapter: '01 · 资产档案', minDuration: 12, items: [
  { type: 'kicker', text: 'ASSET FILE · 你的单位' },
  { type: 'title', text: 'Block 49 · #05-20 · 3 Bedroom Premium' },
  { type: 'row', gap: 24, items: [
    { type: 'col', flex: 1, items: [
      { type: 'statRow', cols: 2, items: [
        { label: '买入日期', value: '2021-11-09', note: '持有满 3 年，已无 SSD' },
        { label: '面积', value: '1,098 sqft', note: '约 102 平方米' },
        { label: '买入总价', value: 2002000, format: 'money', note: '含装修前' },
        { label: '买入单价', value: 1823, format: 'psf', note: '2021 年项目成交水平附近' }
      ] }
    ] },
    { type: 'card', title: 'Normanton Park · 项目基因', accent: B, width: 640, body: [
      '<b>1,862</b> 个住宅单位 · 9 座 24 层高楼 + 排屋',
      '<b>99 年地契</b>（2019-07-22 起算）· 2023 年初 TOP · 开发商 Kingsford',
      '第 5 邮区 · URA 划归 <b>RCR 其他中央区</b>',
      '前身 HUDC · 2017 年集体出售 S$830.1M · 2021-01 开售，18 个月售罄',
      '邻近 one-north · 肯特岗 · 科学园 · 国大 · AYE'
    ] }
  ] }
], narration: [
  '先看档案。',
  '第四十九座，零五零二零，三房 Premium，一千零九十八平方英尺。',
  '二零二一年十一月九日，你以二百万零二千新币买入，每平方英尺一千八百二十三新币。',
  '项目 Normanton Park，一千八百六十二个单位，九十九年地契从二零一九年七月起算，二零二三年落成。',
  '它在第五邮区，被市区重建局划入其他中央区，也就是 RCR。',
  '持有已超过三年，今天出售不需要缴纳卖方印花税。'
] },

// ───────────────────────── 02 VERDICT ─────────────────────────
{ id: 'verdict', chapter: '02 · 今日核心判断', minDuration: 12, items: [
  { type: 'kicker', text: "TODAY'S VERDICT" },
  { type: 'bigquote', text: '值得认真评估出售，<span class="hi">不值得盲目追价。</span>', size: 84 },
  { type: 'sub', text: '决定你能否拿到钱的，不是指数，而是：实际成交能力、按揭余额、CPF 退款、以及换购后的可用现金。' },
  { type: 'statRow', cols: 3, items: [
    { label: '基准估算成交价', value: 2260000, format: 'moneyM', big: true, note: '非银行估价 · 需现场核验' },
    { label: '相对买入毛增值', value: 258000, format: 'moneyK', color: G, big: true, note: '+12.9% · 未扣任何持有成本' },
    { label: '估算三房毛租金回报', value: '3.08%', color: B, big: true, note: '以 S$5,800/月 及 S$2.26M 计' }
  ] }
], narration: [
  '今天的核心判断只有一句话：值得认真评估出售，但不值得盲目追价。',
  '按可比成交推算，基准估值约二百二十六万新币。',
  '比买入价高出约二十五万八千，五年账面涨幅百分之十二点九。',
  '以每月五千八百新币的租金中位数计算，毛租金回报约百分之三点零八。',
  '注意，这三个数字都是账面数字，还没有扣除任何成本。'
] },

// ───────────────────────── 03 MARKET ─────────────────────────
{ id: 'market', chapter: '03 · 市场快照 Q3 2026', minDuration: 14, items: [
  { type: 'kicker', text: 'URA · HDB · MAS · 2026-10-23 公布' },
  { type: 'title', text: '私宅走强，组屋微跌；<span class="gold">你的板块在横盘。</span>' },
  { type: 'statRow', items: [
    { label: '私人住宅价格 · Q3 环比', value: 1.4, format: 'pct', color: G, note: '连续上涨，涨幅扩大' },
    { label: 'RCR 非有地 · Q3 环比', value: 0.0, format: 'pct', color: Y, note: 'Normanton Park 所在市场' },
    { label: 'HDB 转售价 · Q3 环比', value: -0.1, format: 'pct', color: R, note: '连续第三季下跌 · 成交量 +19.5%' },
    { label: '3M SORA', value: '1.2568%', note: '2026-10-22 · 不含银行利差' }
  ] },
  { type: 'row', gap: 40, items: [
    { type: 'col', flex: 1.3, items: [
      { type: 'hbars', items: [{ label: 'CCR 核心中央区', value: 0.3, color: B }, { label: 'RCR 其他中央区', value: 0.0, color: Y, text: '0.0%' }, { label: 'OCR 中央区以外', value: 2.3, color: G }], max: 2.6, format: 'pct', labelw: 240, valw: 130 }
    ] },
    { type: 'card', title: '供应与空置', accent: R, width: 560, body: [
      '未来 1–2 年约 <b>32,800</b> 套未售私宅及 EC',
      '私宅空置率 <b>7.2%</b>（上季 6.4%）',
      'Q3 新房销量 1,183 套，环比 <b class="bad">−44.7%</b>'
    ] }
  ] }
], narration: [
  '再看今天刚公布的第三季度官方数据。',
  '私人住宅价格环比上涨百分之一点四，但你所在的 RCR 非有地住宅，环比是零。',
  '涨的是郊区 OCR，加百分之二点三；核心区微涨；你的板块在横盘。',
  '组屋转售价格微跌百分之零点一，但成交量大增近两成，买家在重新寻找价格。',
  '三个月 SORA 已经降到百分之一点二六左右，融资成本是今年最友好的变量。',
  '另一边，未来一到两年约有三万两千八百套未售供应，空置率升到百分之七点二。',
  '一句话：资金便宜了，但供应也多了。'
] },

// ───────────────────────── 04 REAL COMPS ─────────────────────────
{ id: 'comps', chapter: '04 · 真实成交 vs 挂牌', minDuration: 15, items: [
  { type: 'kicker', text: 'REAL COMPS · 2026 年 9 月 · 面积接近的三房（非你的单位）' },
  { type: 'title', text: '估值来自真实成交，<span class="hi">不是挂牌价。</span>' },
  { type: 'row', gap: 40, items: [
    { type: 'col', flex: 1.4, items: [
      { type: 'table', head: ['楼栋 / 楼层', '面积', '真实成交价', '成交 PSF'], colw: [300, 220, 320, 220], rows: [
        ['Blk 45 · #09-XX', '1,087 sqft', 'S$2,235,000', 'S$2,056'],
        ['Blk 53 · #11-XX', '1,087 sqft', 'S$2,233,000', 'S$2,054'],
        ['Blk 59 · #22-XX', '1,066 sqft', 'S$2,350,000', 'S$2,205']
      ] },
      { type: 'sub', text: '近 12 个月三房成交 16 笔，均价约 S$2,102 psf；2026 年至今全项目均价约 S$1,982 psf（Stacked Homes，截至 2026-10）。楼层、朝向、装修不同，不可直接套用。', size: 22 }
    ] },
    { type: 'col', width: 560, items: [
      { type: 'card', title: '挂牌 ≠ 成交', accent: Y, body: [
        '1,087 sqft · SRX 叫价 <b>S$2,399,999</b>',
        '1,098 sqft · 99.co 叫价 <b>S$2,618,888</b>',
        '叫价比成交高 <b class="gold">7%–17%</b>，没有证据买家会接受'
      ] },
      { type: 'card', title: '你的 5 楼意味着什么', accent: B, body: [
        '低楼层相对中高层通常折让 <b>2%–4%</b>',
        '22 楼的 S$2,205 psf 不能直接套用到 #05-20'
      ] }
    ] }
  ] }
], narration: [
  '估值从哪里来？从真实成交，而不是挂牌价。',
  '九月有三笔可比成交。',
  '四十五座九楼，一千零八十七尺，二百二十三万五千。',
  '五十三座十一楼，同样面积，二百二十三万三千。',
  '五十九座二十二楼，一千零六十六尺，二百三十五万。',
  '而挂牌价二百四十万到二百六十二万，只是卖家的愿望，不是市场的答案。',
  '你的单位在五楼，低楼层通常要比中高楼层折让百分之二到四。',
  '所以二十二楼的高价，不能直接套在零五零二零上。'
] },

// ───────────────────────── 05 SCENARIOS ─────────────────────────
{ id: 'scen', chapter: '05 · 条件性估值', minDuration: 12, items: [
  { type: 'kicker', text: 'SCENARIOS · #05-20 · 1,098 sqft · 研究情景，非正式估值' },
  { type: 'title', text: '三个成交情景' },
  { type: 'scenarios', items: [
    { name: '保守 · 成交情景', color: Y, value: 'S$2.18M', sub: '~S$1,985 psf · 相对买入 +S$178K', points: ['低楼层折让 + 同项目多套竞争', '买家压价，三个月内必须成交'] },
    { name: '基准 · 成交情景', color: B, value: 'S$2.26M', sub: '~S$2,059 psf · 相对买入 +S$258K', points: ['对齐 9 月 1,087 sqft 中楼层成交', '工作估值，用于所有后续计算'] },
    { name: '乐观 · 成交情景', color: G, value: 'S$2.35M', sub: '~S$2,140 psf · 相对买入 +S$348K', points: ['需要装修 / 景观 / 急切买家支撑', '5 楼单位不要默认拿到'] }
  ] },
  { type: 'sub', text: '每 S$50 psf 的差异 ≈ S$55K 总价。谈判的核心变量：楼层、朝向、装修状态、以及同一时间有多少同户型在卖。', size: 26 }
], narration: [
  '所以给你三个情景。',
  '保守，二百一十八万，约一千九百八十五 psf。',
  '基准，二百二十六万，约二千零五十九 psf，这是我们后面所有计算的工作估值。',
  '乐观，二百三十五万，约二千一百四十 psf，需要装修、景观或者急切买家来支撑。',
  '记住一个换算：每平方英尺差五十新币，总价就差五万五千。'
] },

// ───────────────────────── 06 ESSENCE 1: TIME & SCALE ─────────────────────────
{ id: 'ess1', chapter: '06 · 本质一：时间与规模', minDuration: 15, items: [
  { type: 'kicker', text: 'FIRST PRINCIPLES · 01' },
  { type: 'title', text: '这是一份 99 年的租约，<span class="hi">装在一个 1,862 户的巨型项目里。</span>' },
  { type: 'row', gap: 24, items: [
    { type: 'card', title: '时间：地契折旧', accent: B, body: [
      '99 年地契 · 2019 年起算 · 剩余约 92 年',
      '未来 10 年内地契折价 <b>并不显著</b>',
      '真正的时间风险在第 30–40 年之后出现'
    ] },
    { type: 'card', title: '规模：内部供应', accent: Y, body: [
      '1,862 户 = 任何时候都有数十套同户型在卖',
      '价格很难出现 <b>稀缺溢价</b>',
      '卖家之间互相定价，买家永远有替代选择'
    ] },
    { type: 'card', title: '位置：现金流锚', accent: G, body: [
      'one-north · 科学园 · 国大 · 国大医院 的租客池',
      '租金中位数 S$5,800 · 季度 39 笔三房租约',
      '租赁需求稳定，是这个项目的 <b>底层价值</b>'
    ] }
  ] },
  { type: 'bigquote', text: '结论：它是一个<span class="ok">现金流型</span>资产，不是<span class="bad">稀缺型</span>资产。', size: 52 }
], narration: [
  '现在进入本质。第一层，时间与规模。',
  '这是一份九十九年的租约，不是永久的土地。',
  '地契从二零一九年起算，今天还剩约九十二年，未来十年之内，地契折旧不会是主要风险。',
  '真正的结构性因素，是它是一个一千八百六十二户的超大项目。',
  '任何时候都有几十套同户型在出售，卖家之间互相定价，价格很难出现稀缺溢价。',
  '它的底层价值，来自纬壹科技城、科学园、国大和医院带来的稳定租客池。',
  '所以结论是：它是一个现金流型资产，而不是稀缺型资产。',
  '现金流型资产的正确玩法，是收租和等待，而不是博取暴涨。'
] },

// ───────────────────────── 07 ESSENCE 2: PRICE ANCHORS ─────────────────────────
{ id: 'ess2', chapter: '07 · 本质二：价格被什么锚定', minDuration: 16, items: [
  { type: 'kicker', text: 'FIRST PRINCIPLES · 02' },
  { type: 'title', text: '你的价格被三个锚定住' },
  { type: 'row', gap: 24, align: 'stretch', items: [
    { type: 'col', flex: 1.25, items: [
      { type: 'vbars', height: 300, width: 1000, barw: 150, items: [
        { label: '你的买入价<br>2021-11', value: 1823, color: '#64748B' },
        { label: 'Normanton Park<br>2026 基准', value: 2059, color: B },
        { label: 'Parc Clematis<br>2026 项目中位', value: 2266, color: V },
        { label: '周边新盘<br>2025–26 发售 / 预期', value: 2600, color: Y, text: '~S$2,470–2,900' }
      ] }
    ] },
    { type: 'col', width: 640, gap: 16, items: [
      { type: 'card', title: '① 替代成本', accent: Y, body: 'Bloomsbury（Media Circle，2025）均价 S$2,474 psf；Dover Drive 地块预期 S$2,800–2,950。二手 S$2,059 折让 <b>15%–30%</b>：安全垫，也是天花板。' },
      { type: 'card', title: '② 收益率 vs 资金成本', accent: G, body: '毛租金 3.08% 对 2026-10 房贷约 <b>1.5%（浮动）–2.4%（两年固定）</b>。持有已出现<b>正利差</b>；净回报约 2.3% 仍只是『不烧钱』。' },
      { type: 'card', title: '③ 内部供应与流动性', accent: R, body: '同项目卖家是你最大的竞争对手。想高价卖出，只能靠<b>装修、时机与耐心</b>。' }
    ] }
  ] }
], narration: [
  '本质第二层：你的价格被三个锚定住。',
  '第一个锚，替代成本。',
  '周边新盘每平方英尺卖二千四百七十到二千九百新币。',
  'Normanton Park 二千零五十九的二手价格，相对新盘有百分之十五到三十的折让。',
  '这是你的安全垫，但同时也是涨幅的天花板，因为买家随时可以多付一点去买新的。',
  '第二个锚，租金收益率对资金成本。',
  '百分之三点零八的毛回报，对目前约百分之一点五到二点四的房贷利率，已经出现正利差。',
  '持有这套房子，今天不烧现金，但扣掉税费和空置之后，也只是小赚。',
  '第三个锚，内部供应。',
  '同一个项目里的其他卖家，才是你最大的竞争对手。'
] },

// ───────────────────────── 08 REAL RETURN WATERFALL ─────────────────────────
{ id: 'ret', chapter: '08 · 账面 vs 真实回报', minDuration: 20, items: [
  { type: 'kicker', text: 'SELLER MATH · 示例假设 · 以基准 S$2.26M 成交' },
  { type: 'title', text: '账面赚 S$258K，<span class="hi">真实回报来自『住』，不是来自『涨』。</span>' },
  { type: 'waterfall', height: 400, steps: [
    { label: '账面毛增值', value: 258000, color: G, sub: '2.26M − 2.002M' },
    { label: '中介 + 律师', value: -51768, sub: '2% + 9% GST · 律师' },
    { label: '2021 买方印花税', value: -64680, sub: 'BSD · 旧税率' },
    { label: '5 年持有成本', value: -230000, sub: '利息+管理费+税（假设）' },
    { label: '价格部分净结果', total: true, color: R, text: '−S$88K', sub: '只靠涨价是亏的' },
    { label: '5 年居住价值', value: 318000, color: B, sub: '省下的租金 ~S$5,300/月' },
    { label: '真实经济回报', total: true, color: G, text: '≈ +S$230K', sub: '对 ~S$570K 自有资金' }
  ] },
  { type: 'sub', text: '持有成本按 S$1.5M 贷款、平均利率约 2.8%、管理费 S$400/月、自住物业税估算；你的真实数字请以银行与 CPF 对账单为准。', size: 22 }
], narration: [
  '现在把账面数字变成真实回报。',
  '账面赚二十五万八千。',
  '扣掉中介和律师，约五万二千。',
  '扣掉二零二一年买入时的买方印花税，约六万五千。',
  '再扣掉五年的贷款利息、管理费和物业税，示例假设约二十三万。',
  '你会发现，单看价格，这笔投资其实是负八万八千。',
  '真正把它拉回正数的，是你五年没有付的房租，按每月五千三百计算，约三十一万八千。',
  '所以真实经济回报约二十三万，对应约五十七万的自有资金，年化大约百分之七。',
  '结论很扎心，也很重要：你的回报来自居住和杠杆，而不是来自房价本身。',
  '这决定了后面每一条路径的逻辑。'
] },

// ───────────────────────── 09 COUNTERFACTUAL ─────────────────────────
{ id: 'cf', chapter: '09 · 反事实：Parc Clematis', minDuration: 14, items: [
  { type: 'kicker', text: 'COUNTERFACTUAL · 同样本金，不同结果 · 项目级估算' },
  { type: 'title', text: '如果 2021 年买的是 Parc Clematis？' },
  { type: 'row', gap: 40, items: [
    { type: 'col', flex: 1.2, items: [
      { type: 'hbars', height: 64, labelw: 440, valw: 180, max: 30, format: 'pct', items: [
        { label: 'Normanton Park 2021→2026', value: 12.9, color: B, text: '+12.9%' },
        { label: 'Parc Clematis 2021→2026', value: 28.3, color: V, text: '+28.3%' }
      ] },
      { type: 'statRow', cols: 2, items: [
        { label: '实际 · Normanton Park 账面', value: '≈ +S$258K', note: '以你的单位基准估值计' },
        { label: '假设 · Parc Clematis 账面', value: '≈ +S$567K', color: V, note: '同样本金，按项目涨幅推算' }
      ] }
    ] },
    { type: 'card', title: '为什么差了约 S$300K+', accent: V, width: 600, body: [
      '<b>买入价更低</b>：S$1,766 vs S$1,823 psf，安全边际更大',
      '<b>买家池更深</b>：金文泰成熟社区 + 学校，大三房自住需求明确',
      '<b>退出更顺</b>：自住需求稳定，接盘者更容易理解价值',
      '<b>不是地段高级与否</b>，是『买入成本 × 需求深度 × 退出效率』'
    ] }
  ] }
], narration: [
  '再看一个反事实。',
  '如果二零二一年同样的钱买在金文泰的 Parc Clematis，按项目中位数推算，今天账面大概率多赚三十万以上。',
  '差别不在于谁的地段更高级，而在于三件事：买入价更低，家庭买家更深，退出更顺。',
  '这个对比不是用来后悔的，是用来校准下一次决策的。',
  '以后选房，先看买入价和退出流动性，再看故事。'
] },

// ───────────────────────── 10 THREE PATHS ─────────────────────────
{ id: 'paths', chapter: '10 · 三条路径', minDuration: 24, items: [
  { type: 'kicker', text: 'ALLOCATION · 作为已拥有的资产，怎么配置' },
  { type: 'title', text: '三条路径，三种本质不同的选择' },
  { type: 'row', gap: 22, items: [
    { type: 'card', title: 'A · 继续持有（自住或出租）', accent: G, body: [
      '租金 S$5,800/月 · 毛回报 3.08%',
      '房贷约 1.5–2.4%，持有成本由负转正（正利差）',
      '预期价格年化 <b>+2%–3%</b>，杠杆后权益回报 <b>5%–8%</b>',
      '风险：2027–28 供应释放 · 同项目竞争 · 利率反弹'
    ] },
    { type: 'card', title: 'B · 卖出 → 换购转售组屋', accent: B, body: [
      '释放现金约 <b>S$0.5–0.7M</b>（视贷款余额，示例）',
      '2026-07-28 起：符合条件者免 15 个月等待',
      '零负债 + 锁定居住成本，释放资金另行投资',
      '代价：失去私宅升值 · 5 年 MOP · 再买私宅门槛高'
    ] },
    { type: 'card', title: 'C · 卖出 → 换另一套私宅', accent: Y, body: [
      '往返交易成本约 <b>6%–8%</b>（BSD + 中介 + 律师）',
      '新标的必须 <b>跑赢 10%–15%</b> 才值得',
      '你已无 SSD，但新房有 4 年 SSD 锁定期',
      '只有在标的明显更优（买入价 / 稀缺性）时才做'
    ] }
  ] },
  { type: 'html', html: '<span class="mut">决策不是比较哪条路『赚得多』，而是比较哪条路与你的<b style="color:#fff">家庭现金流、居住需求、风险承受</b>最匹配。</span>' }
], narration: [
  '作为已经拥有的资产，你有三条路径。',
  '路径 A，继续持有。',
  '租金五千八，房贷利率已降到百分之一点五到二点四，持有成本由负转正。',
  '预期价格每年涨百分之二到三，杠杆之后权益回报大约百分之五到八。',
  '风险是二零二七到二八年的供应释放，以及同项目的竞争。',
  '路径 B，卖出换购转售组屋。',
  '示例情况下可以释放五十万到七十万现金，做到零负债，锁定居住成本，把资金另行配置。',
  '代价是失去私宅升值，组屋有五年最低居住期，再买私宅门槛很高。',
  '路径 C，卖出换另一套私宅。',
  '往返交易成本约百分之六到八，新标的必须跑赢百分之十到十五才划算，而且新房有四年的卖方印花税锁定期。',
  '决策的关键，不是哪条路赚得多，而是哪条路和你的家庭现金流、居住需求、风险承受最匹配。'
] },

// ───────────────────────── 11 HDB POLICY WINDOW ─────────────────────────
{ id: 'hdb', chapter: '11 · 政策窗口：换购组屋', minDuration: 18, items: [
  { type: 'kicker', text: 'HDB · 2026-07-28 起生效 · 私宅业主购买转售组屋' },
  { type: 'title', text: '15 个月等待期：<span class="ok">符合条件者已取消</span>' },
  { type: 'row', gap: 40, items: [
    { type: 'col', flex: 1.2, items: [
      { type: 'steps', items: [
        { title: '核对资格', text: '购买无津贴转售组屋，且不使用 HDB 贷款 → 免 15 个月等待' },
        { title: '先申请 HFE（购屋资格信）', text: '银行贷款、收入、公民身份、家庭核心成员都在这一步定案' },
        { title: '时序安排', text: '可先买组屋，但须在组屋购入后 6 个月内售出私宅；或先卖后买更稳妥' },
        { title: '若需津贴或 HDB 贷款', text: '30 个月规定仍然适用，不要混淆两套规则' }
      ] }
    ] },
    { type: 'col', width: 560, gap: 16, items: [
      { type: 'card', title: '示例：现金释放（假设）', accent: B, body: [
        '售价 S$2.26M − 费用 S$52K',
        '− 贷款余额 <b>S$1.35M</b>（假设）',
        '− CPF 退款 <b>S$250K</b>（本金+利息，回 CPF）',
        '= 现金约 <b class="ok">S$600K</b> + CPF S$250K'
      ] },
      { type: 'card', title: '目标组屋（示例）', accent: G, body: [
        '女皇镇 / 金文泰 5 房或公寓式 S$0.9–1.2M',
        'BSD 约 S$27K · 可用 CPF + 现金全款或小额银行贷'
      ] }
    ] }
  ] }
], narration: [
  '今年最重要的政策变化，正好对应路径 B。',
  '二零二六年七月二十八日起，符合条件的私宅业主购买无津贴转售组屋，并且不使用建屋局贷款，不再需要等待十五个月。',
  '流程是：先核对资格，再申请购屋资格信 HFE。',
  '可以先买组屋，但必须在购入后六个月内售出私宅；稳妥的做法是先卖后买。',
  '如果你需要津贴或者建屋局贷款，三十个月的规定仍然适用，不要混淆两套规则。',
  '按示例假设，二百二十六万售价扣掉费用、贷款余额和公积金退款，大约能拿到六十万现金，外加二十五万回到公积金户口。',
  '这笔钱够买一套女皇镇或金文泰的五房组屋，而且几乎不需要贷款。',
  '但请记住，贷款余额和公积金退款是假设数，你的真实数字必须先核对。'
] },

// ───────────────────────── 12 OUTLOOK ─────────────────────────
{ id: 'outlook', chapter: '12 · 未来走势 2027–2030', minDuration: 22, items: [
  { type: 'kicker', text: 'OUTLOOK · #05-20 情景路径 · 非预测，是决策用的区间' },
  { type: 'title', text: '没有暴涨，也没有崩盘：<span class="hi">一个成熟市场里大型 99 年项目的真实命运</span>', size: 54 },
  { type: 'row', gap: 40, align: 'center', items: [
    { type: 'line', width: 1120, height: 420, ymin: 1.9, ymax: 2.8, yfmt: v => 'S$' + v.toFixed(2) + 'M', legend: [['乐观 +4.5%/年', G], ['基准 +2.5%/年', B], ['悲观 先跌后平', R], ['2021 买入 → 2026 估值', '#94A3B8']],
      xlabels: [[2021.85, '2021'], [2023, '2023'], [2024, '2024'], [2025, '2025'], [2026, '2026'], [2027, '2027'], [2028, '2028'], [2029, '2029'], [2030, '2030']],
      bands: [{ from: 2026.8, to: 2028.2, color: '#EF4444' }],
      series: [
        { label: '乐观', color: G, points: [[2026.8, 2.26], [2027, 2.28], [2028, 2.38], [2029, 2.49], [2030, 2.70]] },
        { label: '基准', color: B, points: [[2026.8, 2.26], [2027, 2.27], [2028, 2.33], [2029, 2.40], [2030, 2.50]] },
        { label: '悲观', color: R, points: [[2026.8, 2.26], [2027, 2.21], [2028, 2.15], [2029, 2.16], [2030, 2.19]] },
        { label: '', color: '#94A3B8', width: 4, dash: '10 10', points: [[2021.85, 2.002], [2026.8, 2.26]] }
      ] },
    { type: 'col', width: 560, gap: 16, items: [
      { type: 'card', title: '向上驱动', accent: G, body: ['SORA 1.26% → 房贷 1.5–2.4%，正利差', '环线 2026 闭环 · GSW / one-north 逐步兑现', 'Dover Drive 等新盘定价拉高替代成本'] },
      { type: 'card', title: '向下压力', accent: R, body: ['2027–28 未售供应 32,800 套 · 2027 年竣工约 1.1 万套', '空置率 7.2% 且上升 · 新房销量 −44.7%', '降温措施风险 · 1,862 户同项目竞争'] }
    ] }
  ] }
], narration: [
  '未来走势怎么看？我给你三个情景，而不是一个预测。',
  '基准情景：利率下行对冲供应压力，RCR 每年涨百分之二到三，二零三零年你的单位约二百五十万。',
  '乐观情景：环线闭环、大南部濒水区和纬壹科技城逐步兑现，新盘定价拉高替代成本，每年百分之四到五，接近二百七十万。',
  '悲观情景：二零二七到二八年的未售供应集中释放，空置率继续上升，先跌百分之三到五再横盘，回到二百二十万附近。',
  '请注意，没有一个情景是暴涨，也没有一个是崩盘。',
  '这就是一个大型九十九年项目在成熟市场里的真实命运：稳定、平庸、靠时间和租金赚钱。',
  '这意味着，你的决策不应该建立在猜顶上，而应该建立在你家庭的现金流需求上。'
] },

// ───────────────────────── 13 DECISION TRIGGERS ─────────────────────────
{ id: 'trig', chapter: '13 · 决策触发器', minDuration: 16, items: [
  { type: 'kicker', text: 'DECISION RULES · 把判断写成可执行的条件' },
  { type: 'title', text: '不猜顶，用触发器做决定' },
  { type: 'row', gap: 24, items: [
    { type: 'card', title: '倾向出售，当满足其中两条', accent: Y, body: [
      '同户型真实成交稳定在 <b>≥ S$2,150 psf</b>',
      '目标组屋已锁定，HFE 已批',
      '家庭需要降杠杆或释放现金',
      '房贷重新定价后利率 <b>> 3.5%</b>'
    ] },
    { type: 'card', title: '倾向持有，当满足其中两条', accent: G, body: [
      '租金 <b>≥ S$5,800</b> 且空置 < 1 个月',
      '房贷利率 <b>≤ 2.5%</b>（正利差）',
      '没有明显更优的替代资产',
      '未来 3–5 年仍需在这一带居住'
    ] },
    { type: 'card', title: '永远不做', accent: R, body: [
      '因为『指数涨了』就急着卖',
      '因为『挂牌价高』就定高底价',
      '没算清贷款余额与 CPF 退款就签约',
      '为了省 15 个月而先买后卖却没备好过桥现金'
    ] }
  ] }
], narration: [
  '怎么避免情绪化？把判断写成触发器。',
  '倾向出售，当以下条件满足两条：同户型成交稳定在二千一百五十 psf 以上；目标组屋已经锁定；家庭需要降杠杆；或者房贷重新定价后利率高于百分之三点五。',
  '倾向持有，当以下条件满足两条：租金稳定在五千八以上；房贷利率在百分之二点五以下；没有明显更优的替代资产；或者未来三到五年仍要住在这一带。',
  '永远不做的事：因为指数涨了就急着卖，因为挂牌价高就定高底价，没算清贷款和公积金就签约。'
] },

// ───────────────────────── 14 NEXT ACTIONS ─────────────────────────
{ id: 'actions', chapter: '14 · 下一步计划', minDuration: 16, items: [
  { type: 'kicker', text: 'NEXT ACTIONS · 未来 30 / 60 / 90 天' },
  { type: 'title', text: '先把净现金算清楚，再谈价格与时间表' },
  { type: 'steps', color: B, items: [
    { title: '30 天内：核对剩余房贷与 CPF 本息', text: '向银行索取 redemption statement，向 CPF 查询应退本金 + 累计利息；没有这两个数字，无法算净现金' },
    { title: '30 天内：取得 2 份独立经纪意见 + 1 份银行估价', text: '对照 9 月三笔同户型成交，明确 #05-20 的楼层 / 朝向折让；叫价锚定成交，不锚定挂牌' },
    { title: '60 天内：做完『先卖后买』的总现金流表', text: '售价情景 × 费用 × 贷款 × CPF × 目标组屋价格 × BSD；算出三种情景下的可支配现金' },
    { title: '90 天内：决定方向，设定底价与时间表', text: '若卖：申请 HFE，Q1 2027 前挂牌，避开农历新年淡季；若持：锁定低利率重贷，提升租金与装修' }
  ] }
], narration: [
  '最后是你的下一步计划。',
  '三十天内，向银行索取贷款赎回报表，向公积金局查询应退本金和累计利息。没有这两个数字，一切净现金计算都是空谈。',
  '同时取得两份独立经纪意见和一份银行估价，对照九月的三笔同户型成交，明确你五楼单位的折让。',
  '六十天内，做完先卖后买的总现金流表，把售价情景、费用、贷款、公积金和目标组屋价格全部放进去。',
  '九十天内，决定方向。',
  '如果卖，申请购屋资格信，二零二七年第一季前挂牌，避开农历新年淡季。',
  '如果持有，趁利率低锁定重贷，并用租金和装修提升资产质量。'
] },

// ───────────────────────── 15 CLOSING ─────────────────────────
{ id: 'close', chapter: '15 · 总结', layout: 'center', minDuration: 14, items: [
  { type: 'kicker', text: 'SINGAPORE PROPERTY INTELLIGENCE · NORMANTON PARK · BLK 49 #05-20' },
  { type: 'bigquote', text: '数据是真实的，判断是独立的，结论是可行动的。', size: 72 },
  { type: 'sub', text: '资产本质：现金流型、非稀缺型的 99 年大型项目 · 基准估值 S$2.26M · 真实回报来自居住与杠杆 · 决策看家庭现金流，不看猜顶', size: 30 },
  { type: 'spacer', h: 10 },
  { type: 'sub', text: '数据：URA / HDB / MAS（2026-10-23）· EdgeProp / 99.co / SRX / PLB 成交与挂牌 · HDB / IRAS / CPF 官方政策。估值为研究情景，非银行估价；贷款余额与 CPF 退款为示例假设。本视频不构成投资建议。', size: 20 }
], narration: [
  '总结一下。',
  '你的房子，本质上是一个现金流型、非稀缺型的九十九年大型项目单位。',
  '基准估值二百二十六万，真实回报来自居住与杠杆，而不是来自房价。',
  '出售值得认真评估，但不值得盲目追价；换购组屋的政策窗口已经打开，但净现金必须先算清。',
  '数据是真实的，判断是独立的，结论是可行动的。',
  '下一期，我们只讲一件事：相比今天，真正发生了什么变化。'
] }
];
