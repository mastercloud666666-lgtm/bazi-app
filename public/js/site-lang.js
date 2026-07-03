(() => {
  const STORAGE_KEY = 'site_lang_pref_v2';
  const LANGS = ['zh-Hans', 'zh-Hant', 'en'];

  const TITLES = {
    'index.html': {
      'zh-Hans': '云子文化 · 专业八字性格分析',
      'zh-Hant': '雲子文化 · 專業八字性格分析',
      en: 'Yunzi Culture · Professional Personality Analysis',
    },
    'hepan.html': {
      'zh-Hans': '合盘相处分析 · 云子文化',
      'zh-Hant': '合盤相處分析 · 雲子文化',
      en: 'Compatibility Analysis · Yunzi Culture',
    },
    'result.html': {
      'zh-Hans': '八字性格分析结果 · 云子文化',
      'zh-Hant': '八字性格分析結果 · 雲子文化',
      en: 'Personality Analysis Result · Yunzi Culture',
    },
  };

  const COMMON_TEXT = {
    navHome: { 'zh-Hans': '八字排盘', 'zh-Hant': '八字排盤', en: 'Bazi Chart' },
    navHepan: { 'zh-Hans': '合盘分析', 'zh-Hant': '合盤分析', en: 'Compatibility' },
    navBlog: { 'zh-Hans': '文化知识', 'zh-Hant': '文化知識', en: 'BLOG' },
    navQiming: { 'zh-Hans': '起名服务', 'zh-Hant': '起名服務', en: 'Naming' },
    navZhanbu: { 'zh-Hans': '占卜咨询', 'zh-Hant': '占卜諮詢', en: 'Divination' },
    navFengshui: { 'zh-Hans': '风水调理', 'zh-Hant': '風水調理', en: 'Feng Shui' },
    navMyRecords: { 'zh-Hans': '我的记录', 'zh-Hant': '我的紀錄', en: 'My Records' },
    navMember: { 'zh-Hans': '会员', 'zh-Hant': '會員', en: 'Membership' },
    footerBizHtml: {
      'zh-Hans': '本站提供基于中国传统干支文化的数字内容服务（在线报告与解读）。所有付费内容为虚拟数字商品，支付成功后即时在线交付。支持支付方式：微信支付 / 支付宝（人民币），PayPal 及主流信用卡（美元）。',
      'zh-Hant': '本站提供基於中國傳統干支文化的數位內容服務（線上報告與解讀）。所有付費內容為虛擬數位商品，支付成功後即時線上交付。支援支付方式：微信支付 / 支付寶（人民幣），PayPal 及主流信用卡（美元）。',
      en: 'Yunzi Culture provides digital content services based on traditional Chinese Ganzhi culture (online reports and readings). All paid items are virtual digital goods, delivered online instantly after payment. Payment methods: PayPal and major credit/debit cards (USD); WeChat Pay / Alipay (CNY).',
    },
    footerSupportHtml: {
      'zh-Hans': '客服邮箱：<a href="mailto:tgspc2008@163.com">tgspc2008@163.com</a>（1 个工作日内回复）。购买前如有疑问，欢迎先来信咨询；退款事宜请见退款政策。',
      'zh-Hant': '客服信箱：<a href="mailto:tgspc2008@163.com">tgspc2008@163.com</a>（1 個工作日內回覆）。購買前如有疑問，歡迎先來信諮詢；退款事宜請見退款政策。',
      en: 'Customer support: <a href="mailto:tgspc2008@163.com">tgspc2008@163.com</a> (we reply within 1 business day). Questions before purchase are welcome. For refunds, please see our Refund Policy.',
    },
    footerDisclaimerHtml: {
      'zh-Hans': '<strong>免责声明：</strong>本站内容基于中国传统干支文化，所有分析结果仅供文化参考与娱乐，不构成预测、决策建议或命运判断，请理性看待、切勿迷信。付费服务为知识型数字内容，非占卜改运服务。',
      'zh-Hant': '<strong>免責聲明：</strong>本站內容基於中國傳統干支文化，所有分析結果僅供文化參考與娛樂，不構成預測、決策建議或命運判斷，請理性看待、切勿迷信。付費服務為知識型數位內容，非占卜改運服務。',
      en: '<strong>Disclaimer:</strong> The content of this website is based on traditional Chinese Ganzhi culture. All results are for cultural reference and entertainment only and do not constitute predictions, decision-making advice, or fate judgments. Please view them rationally. Paid services are knowledge-based digital content, not divination or luck-changing services.',
    },
  };
  const INDEX_DIMENSION_CARDS = {
    'zh-Hans': [
      { title: '1｜五行核心力量', desc: '从你的五行结构里，找出最主导你性格与行为的那股力量，看懂你天生的底色。' },
      { title: '2｜五行平衡结构', desc: '你性格里的张力与调和：哪些特质偏强、哪些偏弱，内在的平衡点在哪里。' },
      { title: '3｜性格底层驱动力', desc: '你做决定时，到底是理性驱动、情绪驱动、安全感驱动，还是目标导向型？看清你真实的行为逻辑。' },
      { title: '4｜天赋与优势画像', desc: '你更擅长表达、策划、整合、销售、创作、管理，还是独立执行？看清你的强项在哪。' },
      { title: '5｜适合的工作风格', desc: '你适合什么样的工作方式与发展路径：偏稳定还是偏开拓，偏执行还是偏统筹。' },
      { title: '6｜价值创造方式', desc: '你更擅长用哪种方式创造价值：专业深耕、资源整合、创意表达还是关系连接。' },
      { title: '7｜适合的领域方向', desc: '结合你的性格特质，分析最能发挥你优势的领域类型与工作场景。' },
      { title: '8｜独立与协作倾向', desc: '你更适合独立、合伙、还是团队协作；偏轻量灵活还是偏系统深耕的模式。' },
      { title: '9｜情感相处倾向', desc: '你的情感需求、相处方式与择伴倾向，理解自己在感情里真实的样子。' },
      { title: '10｜关系相处说明书', desc: '你在关系里最需要什么、最在意什么、最容易因为什么产生摩擦，如何减少误解。' },
      { title: '11｜情感中的自我模式', desc: '你在亲密关系里容易重复的模式与情绪反应，帮助你更理解自己。' },
      { title: '12｜原生家庭影响', desc: '成长环境、早年形成的性格底色，会如何影响你成年后的情绪与选择。' },
      { title: '13｜家庭角色倾向', desc: '你在家庭关系中的相处方式与角色倾向，以及如何更自在地相处。' },
      { title: '14｜人际互动风格', desc: '你容易与什么类型的人合拍、和什么类型的人容易消耗，社交中的舒适区在哪。' },
      { title: '15｜特质符号解读', desc: '从贵人、文昌、驿马、桃花、华盖等传统符号视角，补充解读你的性格特点与倾向。' },
      { title: '16｜内在张力结构', desc: '从地支的合、冲、刑、害等关系，看你性格中协调与冲突并存的一面。' },
      { title: '17｜性格中的空缺感', desc: '从空亡视角看你内心容易感到空缺或执着的主题，以及如何与之相处。' },
      { title: '18｜资源与安全感倾向', desc: '你对资源、金钱与安全感的态度：偏聚拢守成，还是偏流动开放。' },
      { title: '19｜成长阶段的性格侧重', desc: '不同人生阶段，你性格中被放大的侧重面各不相同，帮助理解阶段性的自己。' },
      { title: '20｜成长节奏参考', desc: '从文化视角看你在不同阶段的自我侧重与成长课题，帮助更从容地认识自己。' },
      { title: '21｜需要留意的性格盲点', desc: '容易消耗你的行为模式与思维惯性：情绪化、犹豫、过度付出或冲动等倾向。' },
      { title: '22｜性格成长的关键课题', desc: '你性格中最值得打磨的方向：边界、稳定、表达、独立还是自我价值感。' },
      { title: '23｜自我提升建议', desc: '从工作方式、生活习惯、人际选择几个层面，给出贴合你性格的实用建议。' },
      { title: '24｜人生核心课题总结', desc: '你这一生真正要修的主题是什么：边界、稳定、表达、责任、独立、情感、取舍、信任，还是自我价值感。' },
    ],
    'zh-Hant': [
      { title: '1｜五行核心力量', desc: '從你的五行結構裡，找出最主導你性格與行為的那股力量，看懂你天生的底色。' },
      { title: '2｜五行平衡結構', desc: '你性格裡的張力與調和：哪些特質偏強、哪些偏弱，內在的平衡點在哪裡。' },
      { title: '3｜性格底層驅動力', desc: '你做決定時，到底是理性驅動、情緒驅動、安全感驅動，還是目標導向型？看清你真實的行為邏輯。' },
      { title: '4｜天賦與優勢畫像', desc: '你更擅長表達、策劃、整合、銷售、創作、管理，還是獨立執行？看清你的強項在哪。' },
      { title: '5｜適合的工作風格', desc: '你適合什麼樣的工作方式與發展路徑：偏穩定還是偏開拓，偏執行還是偏統籌。' },
      { title: '6｜價值創造方式', desc: '你更擅長用哪種方式創造價值：專業深耕、資源整合、創意表達還是關係連接。' },
      { title: '7｜適合的領域方向', desc: '結合你的性格特質，分析最能發揮你優勢的領域類型與工作場景。' },
      { title: '8｜獨立與協作傾向', desc: '你更適合獨立、合夥、還是團隊協作；偏輕量靈活還是偏系統深耕的模式。' },
      { title: '9｜情感相處傾向', desc: '你的情感需求、相處方式與擇伴傾向，理解自己在感情裡真實的樣子。' },
      { title: '10｜關係相處說明書', desc: '你在關係裡最需要什麼、最在意什麼、最容易因為什麼產生摩擦，如何減少誤解。' },
      { title: '11｜情感中的自我模式', desc: '你在親密關係裡容易重複的模式與情緒反應，幫助你更理解自己。' },
      { title: '12｜原生家庭影響', desc: '成長環境、早年形成的性格底色，會如何影響你成年後的情緒與選擇。' },
      { title: '13｜家庭角色傾向', desc: '你在家庭關係中的相處方式與角色傾向，以及如何更自在地相處。' },
      { title: '14｜人際互動風格', desc: '你容易與什麼類型的人合拍、和什麼類型的人容易消耗，社交中的舒適區在哪。' },
      { title: '15｜特質符號解讀', desc: '從貴人、文昌、驛馬、桃花、華蓋等傳統符號視角，補充解讀你的性格特點與傾向。' },
      { title: '16｜內在張力結構', desc: '從地支的合、沖、刑、害等關係，看你性格中協調與衝突並存的一面。' },
      { title: '17｜性格中的空缺感', desc: '從空亡視角看你內心容易感到空缺或執著的主題，以及如何與之相處。' },
      { title: '18｜資源與安全感傾向', desc: '你對資源、金錢與安全感的態度：偏聚攏守成，還是偏流動開放。' },
      { title: '19｜成長階段的性格側重', desc: '不同人生階段，你性格中被放大的側重面各不相同，幫助理解階段性的自己。' },
      { title: '20｜成長節奏參考', desc: '從文化視角看你在不同階段的自我側重與成長課題，幫助更從容地認識自己。' },
      { title: '21｜需要留意的性格盲點', desc: '容易消耗你的行為模式與思維慣性：情緒化、猶豫、過度付出或衝動等傾向。' },
      { title: '22｜性格成長的關鍵課題', desc: '你性格中最值得打磨的方向：邊界、穩定、表達、獨立還是自我價值感。' },
      { title: '23｜自我提升建議', desc: '從工作方式、生活習慣、人際選擇幾個層面，給出貼合你性格的實用建議。' },
      { title: '24｜人生核心課題總結', desc: '你這一生真正要修的主題是什麼：邊界、穩定、表達、責任、獨立、情感、取捨、信任，還是自我價值感。' },
    ],
    en: [
      { title: '1 | Core Element Force', desc: 'Find the dominant five-element force that shapes your personality and behavior.' },
      { title: '2 | Five-Element Balance', desc: 'Which traits run strong or weak, and where your inner balance point sits.' },
      { title: '3 | Personality Driver', desc: 'See whether you are driven by logic, emotion, security, or targets.' },
      { title: '4 | Talent Profile', desc: 'Pinpoint your natural strengths in expression, strategy, management, or execution.' },
      { title: '5 | Work Style Fit', desc: 'What working style and path suit you: stability vs. exploration, doing vs. orchestrating.' },
      { title: '6 | Value-Creation Style', desc: 'How you create value best: deep expertise, integration, creativity, or connection.' },
      { title: '7 | Suitable Directions', desc: 'The field types and work settings where your traits shine most.' },
      { title: '8 | Solo vs. Team', desc: 'Whether you fit solo work, partnership, or team collaboration.' },
      { title: '9 | Relationship Tendencies', desc: 'Your emotional needs, relating style, and partner preferences.' },
      { title: '10 | Relationship Manual', desc: 'What you need most, what you mind most, and how to reduce friction.' },
      { title: '11 | Patterns in Love', desc: 'The recurring patterns and emotional reactions you bring to close relationships.' },
      { title: '12 | Family-of-Origin Impact', desc: 'How your upbringing shaped your emotional baseline and adult choices.' },
      { title: '13 | Family Role Style', desc: 'Your relating style and role tendencies within the family.' },
      { title: '14 | Social Style', desc: 'Who you click with, who drains you, and your social comfort zone.' },
      { title: '15 | Symbolic Traits', desc: 'A traditional-symbol lens on your personality traits and tendencies.' },
      { title: '16 | Inner Tension Map', desc: 'How branch interactions reflect the harmony and tension within your character.' },
      { title: '17 | Inner Gaps', desc: 'Themes where you tend to feel a void or fixation, and how to work with them.' },
      { title: '18 | Resource & Security Attitude', desc: 'Your relationship with resources and security: consolidating vs. open and flowing.' },
      { title: '19 | Traits by Life Stage', desc: 'Which sides of your character get amplified at different life stages.' },
      { title: '20 | Growth Rhythm', desc: 'A cultural view of your self-focus and growth themes across stages.' },
      { title: '21 | Blind Spots to Watch', desc: 'Draining patterns and mental habits: over-giving, hesitation, impulsiveness, and more.' },
      { title: '22 | Key Growth Themes', desc: 'What is most worth refining: boundaries, stability, expression, independence, self-worth.' },
      { title: '23 | Self-Improvement Tips', desc: 'Practical suggestions across work, habits, and relationships that fit your personality.' },
      { title: '24 | Life Core Theme', desc: 'Summarize your lifelong growth themes and personal evolution path.' },
    ],
  };

  const INDEX_TEXT = {
    badge: {
      'zh-Hans': '专业性格分析 · 深度自我认知报告',
      'zh-Hant': '專業性格分析 · 深度自我認知報告',
      en: 'Professional Personality Analysis · In-depth Self-Insight',
    },
    titleHtml: {
      'zh-Hans': '3 分钟更懂自己<br>性格 · 天赋 · 优势 · 适合的方向',
      'zh-Hant': '3 分鐘更懂自己<br>性格 · 天賦 · 優勢 · 適合的方向',
      en: 'Understand Yourself in 3 Minutes<br>Personality · Talents · Strengths · Fit',
    },
    subtitle: {
      'zh-Hans': '填好出生信息，免费生成你的性格分析——从传统五行结构读懂你的性格特质、天赋优势与适合的方向，帮助更了解自己。仅供文化参考与自我探索。',
      'zh-Hant': '填好出生資訊，免費生成你的性格分析——從傳統五行結構讀懂你的性格特質、天賦優勢與適合的方向，幫助更了解自己。僅供文化參考與自我探索。',
      en: 'Enter your birth details for a free personality analysis — understand your traits, talents, strengths and suitable directions from the traditional Five-Element structure. For cultural reference and self-reflection.',
    },
    hepanEntry: {
      'zh-Hans': '进入合盘分析（双人）',
      'zh-Hant': '進入合盤分析（雙人）',
      en: 'Open Compatibility Analysis (2 People)',
    },
    audienceTitle: {
      'zh-Hans': '\u8fd9\u4efd\u62a5\u544a\u9002\u5408\u4f60\uff0c\u5982\u679c\u4f60\u6b63\u5728\uff1a',
      'zh-Hant': '\u9019\u4efd\u5831\u544a\u9069\u5408\u4f60\uff0c\u5982\u679c\u4f60\u6b63\u5728\uff1a',
      en: 'Ideal if you are currently:',
    },
    audienceList: {
      'zh-Hans': [
        '\u60f3\u77e5\u9053\u81ea\u5df1\u66f4\u9002\u5408\u4e0a\u73ed\u3001\u521b\u4e1a\u8fd8\u662f\u526f\u4e1a\u53d8\u73b0',
        '\u6536\u5165\u505c\u6ede 1-2 \u5e74\uff0c\u60f3\u627e\u5230\u4e0b\u4e00\u6b21\u53d1\u529b\u7a97\u53e3',
        '\u611f\u60c5\u53cd\u590d\u5185\u8017\uff0c\u4e0d\u786e\u5b9a\u8be5\u7ee7\u7eed\u8fd8\u662f\u6b62\u635f',
        '\u9762\u4e34\u6362\u57ce\u5e02/\u6362\u884c\u4e1a\u51b3\u7b56\uff0c\u6015\u9009\u9519\u65b9\u5411',
      ],
      'zh-Hant': [
        '\u60f3\u77e5\u9053\u81ea\u5df1\u66f4\u9069\u5408\u4e0a\u73ed\u3001\u5275\u696d\u9084\u662f\u526f\u696d\u8b8a\u73fe',
        '\u6536\u5165\u505c\u6eef 1-2 \u5e74\uff0c\u60f3\u627e\u5230\u4e0b\u4e00\u6b21\u767c\u529b\u7a97\u53e3',
        '\u611f\u60c5\u53cd\u8986\u5167\u8017\uff0c\u4e0d\u78ba\u5b9a\u8a72\u7e7c\u7e8c\u9084\u662f\u6b62\u640d',
        '\u9762\u81e8\u63db\u57ce\u5e02/\u63db\u884c\u696d\u6c7a\u7b56\uff0c\u6015\u9078\u932f\u65b9\u5411',
      ],
      en: [
        'Unsure whether to focus on job, business, or side-income',
        'Income has plateaued and you need the next growth window',
        'Relationship feels draining and you need clear direction',
        'Facing relocation/career switch and afraid of wrong timing',
      ],
    },
    problemTitle: {
      'zh-Hans': '\u4f60\u53ef\u80fd\u6b63\u5361\u5728\u8fd9\u4e9b\u95ee\u9898\uff1a',
      'zh-Hant': '\u4f60\u53ef\u80fd\u6b63\u5361\u5728\u9019\u4e9b\u554f\u984c\uff1a',
      en: 'You may be stuck on these questions:',
    },
    problemList: {
      'zh-Hans': [
        '\u6211\u771f\u6b63\u7684\u4f18\u52bf\u548c\u76f2\u70b9\u662f\u4ec0\u4e48',
        '\u4ec0\u4e48\u6837\u7684\u5de5\u4f5c\u548c\u8282\u594f\u66f4\u9002\u5408\u6211',
        '\u4e3a\u4ec0\u4e48\u6211\u603b\u662f\u91cd\u590d\u540c\u6837\u7684\u6a21\u5f0f',
        '\u6211\u5728\u5173\u7cfb\u4e0e\u534f\u4f5c\u4e2d\u662f\u600e\u6837\u7684\u4eba',
      ],
      'zh-Hant': [
        '\u6211\u771f\u6b63\u7684\u512a\u52e2\u548c\u76f2\u9ede\u662f\u4ec0\u9ebc',
        '\u4ec0\u9ebc\u6a23\u7684\u5de5\u4f5c\u548c\u7bc0\u594f\u66f4\u9069\u5408\u6211',
        '\u70ba\u4ec0\u9ebc\u6211\u7e3d\u662f\u91cd\u8907\u540c\u6a23\u7684\u6a21\u5f0f',
        '\u6211\u5728\u95dc\u4fc2\u8207\u5354\u4f5c\u4e2d\u662f\u600e\u6a23\u7684\u4eba',
      ],
      en: [
        'What are my real strengths and blind spots?',
        'What kind of work and pace actually suit me?',
        'Why do I keep hitting the same patterns?',
        'How do I show up in relationships and teamwork?',
      ],
    },
    dimensionsTitle: {
      'zh-Hans': '\u5b8c\u6574\u7248 24 \u5927\u7ef4\u5ea6 \xb7 \u7cfb\u7edf\u89e3\u6790',
      'zh-Hant': '\u5b8c\u6574\u7248 24 \u5927\u7dad\u5ea6 \xb7 \u7cfb\u7d71\u89e3\u6790',
      en: 'Full 24-Dimension System Analysis',
    },
    dimensionsSub: {
      'zh-Hans': '\u6db5\u76d6\u6027\u683c\u7279\u8d28\u3001\u601d\u7ef4\u65b9\u5f0f\u3001\u5929\u8d4b\u4f18\u52bf\u3001\u9002\u5408\u7684\u5de5\u4f5c\u4e0e\u534f\u4f5c\u98ce\u683c\u3001\u4eba\u9645\u76f8\u5904\u6a21\u5f0f\uff0c\u5e2e\u52a9\u4f60\u66f4\u5168\u9762\u5730\u8ba4\u8bc6\u81ea\u5df1\u3002',
      'zh-Hant': '\u6db5\u84cb\u6027\u683c\u7279\u8cea\u3001\u601d\u7dad\u65b9\u5f0f\u3001\u5929\u8ce6\u512a\u52e2\u3001\u9069\u5408\u7684\u5de5\u4f5c\u8207\u5354\u4f5c\u98a8\u683c\u3001\u4eba\u969b\u76f8\u8655\u6a21\u5f0f\uff0c\u5e6b\u52a9\u4f60\u66f4\u5168\u9762\u5730\u8a8d\u8b58\u81ea\u5df1\u3002',
      en: 'Covers personality traits, thinking style, talents and strengths, suitable work and collaboration styles, and how you relate to others.',
    },
    dimensionCards: INDEX_DIMENSION_CARDS,
    formTitle: { 'zh-Hans': '输入您的生辰', 'zh-Hant': '輸入您的生辰', en: 'Enter Birth Details' },
    formSubtitle: {
      'zh-Hans': '获取免费的八字排盘与基础解读',
      'zh-Hant': '獲取免費的八字排盤與基礎解讀',
      en: 'Get a free Bazi chart and basic reading',
    },
    solar: { 'zh-Hans': '阳历', 'zh-Hant': '陽曆', en: 'Solar' },
    lunar: { 'zh-Hans': '农历', 'zh-Hant': '農曆', en: 'Lunar' },
    yearLabel: { 'zh-Hans': '出生年份', 'zh-Hant': '出生年份', en: 'Birth Year' },
    yearPlaceholder: { 'zh-Hans': '例如：1990', 'zh-Hant': '例如：1990', en: 'e.g. 1990' },
    monthLabel: { 'zh-Hans': '月份', 'zh-Hant': '月份', en: 'Month' },
    dayLabel: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    dayPlaceholder: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    hourLabel: { 'zh-Hans': '时辰', 'zh-Hant': '時辰', en: 'Hour' },
    genderLabel: { 'zh-Hans': '性别', 'zh-Hant': '性別', en: 'Gender' },
    male: { 'zh-Hans': '男命', 'zh-Hant': '男命', en: 'Male' },
    female: { 'zh-Hans': '女命', 'zh-Hant': '女命', en: 'Female' },
    birthplaceLabel: { 'zh-Hans': '出生地（可选）', 'zh-Hant': '出生地（可選）', en: 'Birthplace (Optional)' },
    birthplacePlaceholder: {
      'zh-Hans': '例如：北京 / 上海 / 广州',
      'zh-Hant': '例如：北京 / 上海 / 廣州',
      en: 'e.g. Beijing / Shanghai / Guangzhou',
    },
    geoHint: {
      'zh-Hans': '用于真太阳时校正，提高排盘精度',
      'zh-Hant': '用於真太陽時校正，提高排盤精度',
      en: 'Used for true-solar-time correction to improve chart accuracy',
    },
    freeBtn: { 'zh-Hans': '免费排盘解读', 'zh-Hant': '免費排盤解讀', en: 'Free Bazi Reading' },
    paidBtn: { 'zh-Hans': '立即解锁完整分析报告', 'zh-Hant': '立即解鎖完整命理報告', en: 'Unlock Full Destiny Report' },
    payTitle: { 'zh-Hans': '解锁完整深度分析报告', 'zh-Hant': '解鎖完整深度命理報告', en: 'Unlock Full In-depth Report' },
    paySub: {
      'zh-Hans': '免费版仅含基础排盘，完整报告涵盖 24 大维度 · 深度解析约 7000-9000 字',
      'zh-Hant': '免費版僅含基礎排盤，完整報告涵蓋 24 大維度 · 深度解析約 7000-9000 字',
      en: 'Free tier includes basic chart only. Full report covers 24 dimensions · around 7,000-9,000 Chinese characters',
    },
    payFeatures: {
      'zh-Hans': [
        '▸ 命局核心：用神喜忌 / 五行扶抑 / 性格驱动力 / 天赋能力',
        '▸ 现实发展：事业财运 / 赚钱方式 / 行业黄金期 / 创业副业适配',
        '▸ 婚恋关系：婚姻趋势 / 相处说明书 / 隐患预警（含二婚与出轨风险）',
        '▸ 家庭人际：原生家庭 / 子女缘分 / 贵人模式 / 关系消耗点',
        '▸ 命理结构：神煞 / 地支刑冲合会 / 空亡 / 财库',
        '▸ 运势节奏：当前与未来三步大运 + 后五年逐年建议',
        '▸ 高阶模块：风险预警 / 关键转折点 / 改运策略 / 人生核心课题',
      ],
      'zh-Hant': [
        '▸ 命局核心：用神喜忌 / 五行扶抑 / 性格驅動力 / 天賦能力',
        '▸ 現實發展：事業財運 / 賺錢方式 / 行業黃金期 / 創業副業適配',
        '▸ 婚戀關係：婚姻趨勢 / 相處說明書 / 隱患預警（含二婚與出軌風險）',
        '▸ 家庭人際：原生家庭 / 子女緣分 / 貴人模式 / 關係消耗點',
        '▸ 命理結構：神煞 / 地支刑沖合會 / 空亡 / 財庫',
        '▸ 運勢節奏：當前與未來三步大運 + 後五年逐年建議',
        '▸ 高階模組：風險預警 / 關鍵轉折點 / 改運策略 / 人生核心課題',
      ],
      en: [
        '▸ Core structure: useful elements / five-element balance / personality driver / talent profile',
        '▸ Real-world growth: career & wealth / money style / industry timing / side-business fit',
        '▸ Relationship module: marriage trend / interaction guide / hidden risks (including cheating/remarriage signals)',
        '▸ Family & social: origin-family impact / children affinity / noble-helper pattern / draining connections',
        '▸ Destiny mechanics: ShenSha / branch clash-combine matrix / void periods / wealth vault timing',
        '▸ Luck timeline: current + next three major luck cycles and next five years yearly guidance',
        '▸ Advanced modules: risk alert / key turning points / optimization strategy / life core lesson',
      ],
    },
    consultPayBtn: {
      'zh-Hans': '1对1咨询专用支付（优惠价¥{price}）',
      'zh-Hant': '1對1諮詢專用支付（優惠價¥{price}）',
      en: 'Pay for 1-on-1 Consultation (Promo ¥{price})',
    },
    consultPayNotice: {
      'zh-Hans': '免责条款：1对1咨询为虚拟服务，支付完成后不支持退款，请确认后再付款。交付方式：专属研究员 1 小时语音或电话咨询交付。',
      'zh-Hant': '免責條款：1對1諮詢為虛擬服務，支付完成後不支持退款，請確認後再付款。交付方式：專屬命理師 1 小時語音或電話諮詢交付。',
      en: 'Disclaimer: 1-on-1 consultation is a virtual service and non-refundable after payment. Delivery: 1-hour voice or phone consultation with a dedicated consultant.',
    },
    orderRecoveryEntryTitle: {
      'zh-Hans': '支付后页面关闭？可从订单找回中心继续',
      'zh-Hant': '支付後頁面關閉？可從訂單找回中心繼續',
      en: 'Page closed after payment? Continue from Order Recovery Center',
    },
    orderRecoveryEntryHint: {
      'zh-Hans': '输入订单号即可校验支付状态，并一键回到报告或下载页面。',
      'zh-Hant': '輸入訂單號即可校驗支付狀態，並一鍵回到報告或下載頁面。',
      en: 'Enter your order number to verify payment and jump back to report/download.',
    },
    orderRecoveryEntryBtn: {
      'zh-Hans': '打开订单找回中心',
      'zh-Hant': '打開訂單找回中心',
      en: 'Open Order Recovery Center',
    },
    pdfSaleTitle: {
      'zh-Hans': '《八字命理合集》PDF｜439页系统内容，反复查阅',
      'zh-Hant': '《八字命理合集》PDF｜439頁系統內容，反覆查閱',
      en: 'Bazi Compendium PDF | 439 pages for repeated reference',
    },
    pdfSaleSub: {
      'zh-Hans': '全书 439 页，覆盖八字核心知识与实用分析思路，不只看结论，更帮你建立判断框架。',
      'zh-Hant': '全書 439 頁，覆蓋八字核心知識與實用分析思路，不只看結論，更幫你建立判斷框架。',
      en: 'A complete 439-page guide covering core Bazi knowledge and practical analysis frameworks—not just conclusions.',
    },
    pdfSaleBullet1: {
      'zh-Hans': '• 小白友好：核心逻辑讲清楚，一看就懂',
      'zh-Hant': '• 新手友好：核心邏輯講清楚，一看就懂',
      en: '• Beginner-friendly: clear core logic and easy to understand',
    },
    pdfSaleBullet2: {
      'zh-Hans': '• 决策参考：看清关键年份节奏，少走弯路',
      'zh-Hant': '• 決策參考：看清關鍵年份節奏，少走彎路',
      en: '• Decision support: identify key-year rhythm and avoid detours',
    },
    pdfSaleBullet3: {
      'zh-Hans': '• 可反复查阅：支付后直接下载保存',
      'zh-Hant': '• 可反覆查閱：支付後直接下載保存',
      en: '• Reusable: instant download and save after payment',
    },
    pdfPayBtn: {
      'zh-Hans': '19.9元解锁八字命理合集PDF（原价39.9元）',
      'zh-Hant': '19.9元解鎖八字命理合集PDF（原價39.9元）',
      en: 'Unlock Bazi PDF for ¥19.9 (Regular ¥39.9)',
    },
    pdfSaleNonRefund: {
      'zh-Hans': '虚拟知识文档，支付后不支持退款，请确认后购买。',
      'zh-Hant': '虛擬知識文檔，支付後不支持退款，請確認後購買。',
      en: 'Virtual knowledge document. Purchases are non-refundable after payment.',
    },
    monthOptions: {
      'zh-Hans': ['选择月份', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      'zh-Hant': ['選擇月份', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      en: ['Select month', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    hourOptions: {
      'zh-Hans': [
        '选择时辰', '子时 23:00-01:00', '丑时 01:00-03:00', '寅时 03:00-05:00', '卯时 05:00-07:00',
        '辰时 07:00-09:00', '巳时 09:00-11:00', '午时 11:00-13:00', '未时 13:00-15:00',
        '申时 15:00-17:00', '酉时 17:00-19:00', '戌时 19:00-21:00', '亥时 21:00-23:00',
      ],
      'zh-Hant': [
        '選擇時辰', '子時 23:00-01:00', '丑時 01:00-03:00', '寅時 03:00-05:00', '卯時 05:00-07:00',
        '辰時 07:00-09:00', '巳時 09:00-11:00', '午時 11:00-13:00', '未時 13:00-15:00',
        '申時 15:00-17:00', '酉時 17:00-19:00', '戌時 19:00-21:00', '亥時 21:00-23:00',
      ],
      en: [
        'Select hour', 'Zi 23:00-01:00', 'Chou 01:00-03:00', 'Yin 03:00-05:00', 'Mao 05:00-07:00',
        'Chen 07:00-09:00', 'Si 09:00-11:00', 'Wu 11:00-13:00', 'Wei 13:00-15:00',
        'Shen 15:00-17:00', 'You 17:00-19:00', 'Xu 19:00-21:00', 'Hai 21:00-23:00',
      ],
    },
  };

  const HEPAN_TEXT = {
    pageTag: { 'zh-Hans': 'Compatibility Analysis', 'zh-Hant': 'Compatibility Analysis', en: 'Compatibility Analysis' },
    title: { 'zh-Hans': '合盘配对', 'zh-Hant': '合盤配對', en: 'Compatibility Match' },
    subtitle: {
      'zh-Hans': '输入双方生辰八字，深度分析两人命理契合度',
      'zh-Hant': '輸入雙方生辰八字，深度分析兩人命理契合度',
      en: 'Enter both birth charts for an in-depth compatibility analysis',
    },
    male: { 'zh-Hans': '男方', 'zh-Hant': '男方', en: 'Male' },
    female: { 'zh-Hans': '女方', 'zh-Hant': '女方', en: 'Female' },
    maleChart: { 'zh-Hans': '男方八字', 'zh-Hant': '男方八字', en: 'Male Chart' },
    femaleChart: { 'zh-Hans': '女方八字', 'zh-Hant': '女方八字', en: 'Female Chart' },
    solar: { 'zh-Hans': '阳历', 'zh-Hant': '陽曆', en: 'Solar' },
    lunar: { 'zh-Hans': '农历', 'zh-Hant': '農曆', en: 'Lunar' },
    yearLabel: { 'zh-Hans': '出生年份', 'zh-Hant': '出生年份', en: 'Birth Year' },
    yearPlaceholderMan: { 'zh-Hans': '例：1990', 'zh-Hant': '例：1990', en: 'e.g. 1990' },
    yearPlaceholderWoman: { 'zh-Hans': '例：1992', 'zh-Hant': '例：1992', en: 'e.g. 1992' },
    monthLabel: { 'zh-Hans': '月', 'zh-Hant': '月', en: 'Month' },
    dayLabel: { 'zh-Hans': '日', 'zh-Hant': '日', en: 'Day' },
    dayPlaceholder: { 'zh-Hans': '日期', 'zh-Hant': '日期', en: 'Day' },
    hourLabel: { 'zh-Hans': '时辰', 'zh-Hant': '時辰', en: 'Hour' },
    payEntryBtn: {
      'zh-Hans': '立即解锁合盘报告（原价268元｜限时价199元）',
      'zh-Hant': '立即解鎖合盤報告（原價268元｜限時價199元）',
      en: 'Unlock Compatibility Report (Original ¥268 | Promo ¥199)',
    },
    payBtn: {
      'zh-Hans': '立即解锁合盘报告（原价268元｜限时价199元）',
      'zh-Hant': '立即解鎖合盤報告（原價268元｜限時價199元）',
      en: 'Unlock Compatibility Report (Original ¥268 | Promo ¥199)',
    },
    payTitle: { 'zh-Hans': '至尊完整版合盘报告（10大维度·约4000+字）', 'zh-Hant': '至尊完整版合盤報告（10大維度·約4000+字）', en: 'Premium Compatibility Report (10 Dimensions, 4,000+ chars)' },
    payBriefBadge: { 'zh-Hans': '限时活动', 'zh-Hant': '限時活動', en: 'Limited Offer' },
    payBriefHeadline: {
      'zh-Hans': '10大维度深度合盘 · 约4000+字',
      'zh-Hant': '10大維度深度合盤 · 約4000+字',
      en: '10-Dimension Deep Analysis · 4,000+ chars',
    },
    payBriefMain: {
      'zh-Hans': '不只看“合不合”，更看“能不能走长久”',
      'zh-Hant': '不只看「合不合」，更看「能不能走長久」',
      en: 'Beyond match score: can this relationship truly last?',
    },
    payChip1: { 'zh-Hans': '日主关系', 'zh-Hant': '日主關係', en: 'Day Master Relation' },
    payChip2: { 'zh-Hans': '婚姻宫/婚姻星', 'zh-Hant': '婚姻宮/婚姻星', en: 'Marriage Palace / Stars' },
    payChip3: { 'zh-Hans': '大运走势', 'zh-Hant': '大運走勢', en: 'Luck-Cycle Trend' },
    payPriceLabel: { 'zh-Hans': '限时优惠价', 'zh-Hant': '限時優惠價', en: 'Limited Offer' },
    payOldPrice: { 'zh-Hans': '原价268元', 'zh-Hant': '原價268元', en: 'Original ¥268' },
    payNowPrice: { 'zh-Hans': '限时价199元', 'zh-Hant': '限時價199元', en: 'Promo ¥199' },
    payFootnote: {
      'zh-Hans': '先看清关系底层逻辑，再决定是否继续投入。少走弯路，少做错判。',
      'zh-Hant': '先看清關係底層邏輯，再決定是否繼續投入。少走彎路，少做錯判。',
      en: 'See the underlying dynamics first, then decide where to invest your emotions. Fewer detours, fewer wrong calls.',
    },
    paySubHtml: {
      'zh-Hans': '原价268元｜限时价199元',
      'zh-Hant': '原價268元｜限時價199元',
      en: 'Original ¥268 | Promo ¥199',
    },
    payFeatures: {
      'zh-Hans': [
        '▸ 日主五行 · 相生相克关系',
        '▸ 五行互补 · 扶持与消耗',
        '▸ 日支合缘 · 六合冲克分析',
        '▸ 婚姻星状态 · 配偶宫判断',
        '▸ 财运互助 · 两人财路配合',
        '▸ 感情深浅 · 桃花与婚恋',
        '▸ 感情隐患 · 第三者风险',
        '▸ 子女缘分 · 数量与时机',
        '▸ 大运配合 · 缘分起伏节点',
        '▸ 综合评价与建议 · 五行调整方向',
      ],
      'zh-Hant': [
        '▸ 日主五行 · 相生相剋關係',
        '▸ 五行互補 · 扶持與消耗',
        '▸ 日支合緣 · 六合沖剋分析',
        '▸ 婚姻星狀態 · 配偶宮判斷',
        '▸ 財運互助 · 兩人財路配合',
        '▸ 感情深淺 · 桃花與婚戀',
        '▸ 感情隱患 · 第三者風險',
        '▸ 子女緣分 · 數量與時機',
        '▸ 大運配合 · 緣分起伏節點',
        '▸ 綜合評價與建議 · 五行調整方向',
      ],
      en: [
        '▸ Day Master relation · generating / controlling dynamics',
        '▸ Five-element complement · support vs. drain',
        '▸ Marriage palace bond · 六合 / clash analysis',
        '▸ Marriage stars · spouse-palace reading',
        '▸ Wealth synergy · financial cooperation',
        '▸ Emotional depth · attraction and love pattern',
        '▸ Hidden risks · third-party interference risk',
        '▸ Children affinity · timing and tendency',
        '▸ Luck-cycle sync · key turning points',
        '▸ Final verdict & advice · practical adjustment strategy',
      ],
    },
    marketingCopy: {
      'zh-Hans': '看清这段关系能不能走得长久：从日主关系到大运走势，给你可执行的相处建议与决策参考。原价268元，限时优惠199元。',
      'zh-Hant': '看清這段關係能不能走得長久：從日主關係到大運走勢，給你可執行的相處建議與決策參考。原價268元，限時優惠199元。',
      en: 'See whether this relationship can truly last. From Day Master dynamics to luck-cycle trends, get practical advice and decision guidance. Original ¥268, promo ¥199.',
    },
    monthOptions: INDEX_TEXT.monthOptions,
    hourOptions: INDEX_TEXT.hourOptions,
    resultTitle: { 'zh-Hans': '合盘分析', 'zh-Hant': '合盤分析', en: 'Compatibility Analysis' },
    loadingHtml: {
      'zh-Hans': '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>研究员正在为您解读合盘，请稍候...',
      'zh-Hant': '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>命理師正在為您解讀合盤，請稍候...',
      en: '<div class="loading-spinner" style="margin: 0 auto 12px;"></div>Analyzing compatibility, please wait...',
    },
  };

const RESULT_TEXT = {
    birthInfo: { 'zh-Hans': '出生信息', 'zh-Hant': '出生信息', en: 'Birth Information' },
    chartTitle: { 'zh-Hans': '命局细盘（表格版）', 'zh-Hant': '命局細盤（表格版）', en: 'Natal Chart (Table)' },
    analysisTitle: { 'zh-Hans': '你的性格分析', 'zh-Hant': '你的性格分析', en: 'Your Personality Analysis' },
  paidBtn: { 'zh-Hans': '立即解锁完整性格分析报告', 'zh-Hant': '立即解鎖完整性格分析報告', en: 'Unlock Full Personality Report' },
  payBtn: { 'zh-Hans': '立即解锁完整性格分析报告', 'zh-Hant': '立即解鎖完整性格分析報告', en: 'Unlock Full Personality Report' },
  paypalBtn: { 'zh-Hans': '🌐 海外 PayPal / 信用卡支付（USD）', 'zh-Hant': '🌐 海外 PayPal／信用卡支付（USD）', en: '🌐 Pay with PayPal / Card (USD)' },
};

  function pageName() {
    const p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function pick(map, lang) {
    return map?.[lang] ?? map?.['zh-Hans'] ?? '';
  }

  function fillTpl(str, vars = {}) {
    return String(str || '').replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? ''));
  }

  function setText(selector, value) {
    if (!value) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      node.textContent = value;
      syncButtonDefault(node);
    });
  }

  function setHTML(selector, value) {
    if (!value) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => {
      node.innerHTML = value;
      syncButtonDefault(node);
    });
  }

  function setPlaceholder(id, value) {
    const input = document.getElementById(id);
    if (input && value) input.setAttribute('placeholder', value);
  }

  function setGroupLabelByInputId(id, value) {
    if (!value) return;
    const input = document.getElementById(id);
    const label = input?.closest('.form-group')?.querySelector('.form-label');
    if (label) label.textContent = value;
  }

  function setToggleLabel(id, value) {
    if (!value) return;
    const label = document.getElementById(id);
    if (!label) return;
    const input = label.querySelector('input');
    if (!input) {
      label.textContent = value;
      return;
    }
    label.innerHTML = '';
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value}`));
  }

  function setRadioLabelInContainer(containerSelector, index, value) {
    if (!value) return;
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const labels = container.querySelectorAll('.form-gender-label');
    const label = labels[index];
    if (!label) return;
    const input = label.querySelector('input');
    if (!input) {
      label.textContent = value;
      return;
    }
    label.innerHTML = '';
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value}`));
  }

  function setOptions(selectId, labels) {
    if (!labels?.length) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    const options = Array.from(select.options);
    options.forEach((opt, i) => {
      if (labels[i]) opt.textContent = labels[i];
    });
  }

  function setFeatureList(selector, labels) {
    if (!Array.isArray(labels)) return;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node, i) => {
      if (labels[i]) node.textContent = labels[i];
    });
  }


  function setListItems(selector, items) {
    if (!Array.isArray(items)) return;
    const host = document.querySelector(selector);
    if (!host) return;
    host.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      host.appendChild(li);
    });
  }

  function renderDimensionCards(selector, cards) {
    if (!Array.isArray(cards)) return;
    const host = document.querySelector(selector);
    if (!host) return;
    host.innerHTML = '';
    cards.forEach((card) => {
      const article = document.createElement('article');
      article.className = 'pay-dimension-item';
      const h4 = document.createElement('h4');
      h4.textContent = card?.title || '';
      const p = document.createElement('p');
      p.textContent = card?.desc || '';
      article.appendChild(h4);
      article.appendChild(p);
      host.appendChild(article);
    });
    if (window.observeReveals) window.observeReveals();
    if (window.initDimCarousel) window.initDimCarousel();
  }

  function syncButtonDefault(node) {
    if (!node) return;
    const tag = node.tagName?.toLowerCase();
    if (tag !== 'button' && !node.id?.includes('btn')) return;
    if (node.dataset) node.dataset.defaultText = node.textContent.trim();
  }

  function ensureLangStyle() {
    if (document.getElementById('site-lang-style')) return;
    const style = document.createElement('style');
    style.id = 'site-lang-style';
    style.textContent = `
      .navbar-lang-select {
        height: 32px;
        padding: 0 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #fff;
        color: #334155;
        font-size: 12px;
        cursor: pointer;
      }
      .navbar-lang-select:focus {
        outline: none;
        border-color: #2563eb;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLangSelect() {
    ensureLangStyle();
    const right = document.querySelector('.navbar-right');
    if (!right) return null;

    const oldLabel = right.querySelector('.navbar-lang');
    if (oldLabel) oldLabel.style.display = 'none';

    let select = right.querySelector('#site-lang-select');
    if (!select) {
      select = document.createElement('select');
      select.id = 'site-lang-select';
      select.className = 'navbar-lang-select';
      select.innerHTML = `
        <option value="zh-Hans">简体中文</option>
        <option value="zh-Hant">繁體中文</option>
        <option value="en">English</option>
      `;
      right.appendChild(select);
    }
    return select;
  }

  function applyCommon(lang) {
    setText('.navbar-nav a[href="index.html"]', pick(COMMON_TEXT.navHome, lang));
    setText('.navbar-nav a[href="hepan.html"]', pick(COMMON_TEXT.navHepan, lang));
    setText('.navbar-nav a[href="blog/"]', pick(COMMON_TEXT.navBlog, lang));
    setText('.navbar-nav a[href="qiming.html"]', pick(COMMON_TEXT.navQiming, lang));
    setText('.navbar-nav a[href="fengshui.html"]', pick(COMMON_TEXT.navFengshui, lang));
    setText('.navbar-nav a[href="my-records.html"]', pick(COMMON_TEXT.navMyRecords, lang));
    setText('.navbar-nav a[href="member.html"]', pick(COMMON_TEXT.navMember, lang));
    setHTML('#footer-biz', pick(COMMON_TEXT.footerBizHtml, lang));
    setHTML('#footer-support', pick(COMMON_TEXT.footerSupportHtml, lang));
    setHTML('#footer-disclaimer', pick(COMMON_TEXT.footerDisclaimerHtml, lang));
  }

  function applyIndex(lang) {
    if (pageName() !== 'index.html') return;

    setText('.hero-badge span:last-child', pick(INDEX_TEXT.badge, lang));
    setHTML('.hero-title', pick(INDEX_TEXT.titleHtml, lang));
    setText('.hero-subtitle', pick(INDEX_TEXT.subtitle, lang));
    setText('#hero-hepan-link', pick(INDEX_TEXT.hepanEntry, lang));
    setText('#hero-audience-title', pick(INDEX_TEXT.audienceTitle, lang));
    setListItems('#hero-audience-list', pick(INDEX_TEXT.audienceList, lang));
    setText('#hero-problem-title', pick(INDEX_TEXT.problemTitle, lang));
    setListItems('#hero-problem-list', pick(INDEX_TEXT.problemList, lang));
    setText('#hero-dimensions-title', pick(INDEX_TEXT.dimensionsTitle, lang));
    setText('#hero-dimensions-sub', pick(INDEX_TEXT.dimensionsSub, lang));
    renderDimensionCards('#hero-dimensions-grid', pick(INDEX_TEXT.dimensionCards, lang));
    setText('.form-title', pick(INDEX_TEXT.formTitle, lang));
    setText('.form-subtitle', pick(INDEX_TEXT.formSubtitle, lang));

    setToggleLabel('lbl-solar', pick(INDEX_TEXT.solar, lang));
    setToggleLabel('lbl-lunar', pick(INDEX_TEXT.lunar, lang));
    setGroupLabelByInputId('year', pick(INDEX_TEXT.yearLabel, lang));
    setGroupLabelByInputId('month', pick(INDEX_TEXT.monthLabel, lang));
    setGroupLabelByInputId('day', pick(INDEX_TEXT.dayLabel, lang));
    setGroupLabelByInputId('hour', pick(INDEX_TEXT.hourLabel, lang));
    setPlaceholder('year', pick(INDEX_TEXT.yearPlaceholder, lang));
    setPlaceholder('day', pick(INDEX_TEXT.dayPlaceholder, lang));
    setOptions('month', pick(INDEX_TEXT.monthOptions, lang));
    setOptions('hour', pick(INDEX_TEXT.hourOptions, lang));

    const genderInput = document.querySelector('input[name="gender"]');
    const genderLabel = genderInput?.closest('.form-group')?.querySelector('.form-label');
    if (genderLabel) genderLabel.textContent = pick(INDEX_TEXT.genderLabel, lang);
    setRadioLabelInContainer('.form-gender', 0, pick(INDEX_TEXT.male, lang));
    setRadioLabelInContainer('.form-gender', 1, pick(INDEX_TEXT.female, lang));

    setGroupLabelByInputId('birthplace', pick(INDEX_TEXT.birthplaceLabel, lang));
    setPlaceholder('birthplace', pick(INDEX_TEXT.birthplacePlaceholder, lang));
    setText('#geo-hint', pick(INDEX_TEXT.geoHint, lang));

    setText('#bazi-form > button.form-submit[type="submit"]', pick(INDEX_TEXT.freeBtn, lang));
    setText('#paid-btn', pick(INDEX_TEXT.paidBtn, lang));
    setText('.hero-form-card .pay-card .pay-card-title', pick(INDEX_TEXT.payTitle, lang));
    setText('.hero-form-card .pay-card .pay-card-sub', pick(INDEX_TEXT.paySub, lang));
    setFeatureList('.hero-form-card .pay-features span', pick(INDEX_TEXT.payFeatures, lang));

    setText('#consult-pay-btn', fillTpl(pick(INDEX_TEXT.consultPayBtn, lang), { price: '499' }));
    setText('#consult-pay-notice', pick(INDEX_TEXT.consultPayNotice, lang));

    setText('#order-recovery-entry-title', pick(INDEX_TEXT.orderRecoveryEntryTitle, lang));
    setText('#order-recovery-entry-hint', pick(INDEX_TEXT.orderRecoveryEntryHint, lang));
    setText('#order-recovery-entry-btn', pick(INDEX_TEXT.orderRecoveryEntryBtn, lang));

    setText('#pdf-sale-title', pick(INDEX_TEXT.pdfSaleTitle, lang));
    setText('#pdf-sale-sub', pick(INDEX_TEXT.pdfSaleSub, lang));
    setText('#pdf-sale-bullet-1', pick(INDEX_TEXT.pdfSaleBullet1, lang));
    setText('#pdf-sale-bullet-2', pick(INDEX_TEXT.pdfSaleBullet2, lang));
    setText('#pdf-sale-bullet-3', pick(INDEX_TEXT.pdfSaleBullet3, lang));
    setText('#pdf-pay-btn', pick(INDEX_TEXT.pdfPayBtn, lang));
    setText('#pdf-sale-nonrefund', pick(INDEX_TEXT.pdfSaleNonRefund, lang));
  }

  function applyHepan(lang) {
    if (pageName() !== 'hepan.html') return;

    setText('.page-tag', pick(HEPAN_TEXT.pageTag, lang));
    setText('.page-title', pick(HEPAN_TEXT.title, lang));
    setText('.page-subtitle', pick(HEPAN_TEXT.subtitle, lang));

    setText('.person-card.male .person-label', pick(HEPAN_TEXT.male, lang));
    setText('.person-card.female .person-label', pick(HEPAN_TEXT.female, lang));
    setText('.bazi-overview .bazi-mini-card:nth-child(1) .mini-label', pick(HEPAN_TEXT.maleChart, lang));
    setText('.bazi-overview .bazi-mini-card:nth-child(2) .mini-label', pick(HEPAN_TEXT.femaleChart, lang));

    setToggleLabel('man-lbl-solar', pick(HEPAN_TEXT.solar, lang));
    setToggleLabel('man-lbl-lunar', pick(HEPAN_TEXT.lunar, lang));
    setToggleLabel('woman-lbl-solar', pick(HEPAN_TEXT.solar, lang));
    setToggleLabel('woman-lbl-lunar', pick(HEPAN_TEXT.lunar, lang));

    setGroupLabelByInputId('man-year', pick(HEPAN_TEXT.yearLabel, lang));
    setGroupLabelByInputId('woman-year', pick(HEPAN_TEXT.yearLabel, lang));
    setPlaceholder('man-year', pick(HEPAN_TEXT.yearPlaceholderMan, lang));
    setPlaceholder('woman-year', pick(HEPAN_TEXT.yearPlaceholderWoman, lang));

    setGroupLabelByInputId('man-month', pick(HEPAN_TEXT.monthLabel, lang));
    setGroupLabelByInputId('woman-month', pick(HEPAN_TEXT.monthLabel, lang));
    setOptions('man-month', pick(HEPAN_TEXT.monthOptions, lang));
    setOptions('woman-month', pick(HEPAN_TEXT.monthOptions, lang));

    setGroupLabelByInputId('man-day', pick(HEPAN_TEXT.dayLabel, lang));
    setGroupLabelByInputId('woman-day', pick(HEPAN_TEXT.dayLabel, lang));
    setPlaceholder('man-day', pick(HEPAN_TEXT.dayPlaceholder, lang));
    setPlaceholder('woman-day', pick(HEPAN_TEXT.dayPlaceholder, lang));

    setGroupLabelByInputId('man-hour', pick(HEPAN_TEXT.hourLabel, lang));
    setGroupLabelByInputId('woman-hour', pick(HEPAN_TEXT.hourLabel, lang));
    setOptions('man-hour', pick(HEPAN_TEXT.hourOptions, lang));
    setOptions('woman-hour', pick(HEPAN_TEXT.hourOptions, lang));

    setText('#hepan-pay-entry-btn', pick(HEPAN_TEXT.payEntryBtn, lang));
    setText('#hepan-pay-btn', pick(HEPAN_TEXT.payBtn, lang));
    setText('#hepan-pay-badge', pick(HEPAN_TEXT.payBriefBadge, lang));
    setText('#hepan-pay-headline', pick(HEPAN_TEXT.payBriefHeadline, lang));
    setText('#hepan-pay-brief', pick(HEPAN_TEXT.payBriefMain, lang));
    setText('#hepan-pay-chip-1', pick(HEPAN_TEXT.payChip1, lang));
    setText('#hepan-pay-chip-2', pick(HEPAN_TEXT.payChip2, lang));
    setText('#hepan-pay-chip-3', pick(HEPAN_TEXT.payChip3, lang));
    setText('#hepan-pay-price-label', pick(HEPAN_TEXT.payPriceLabel, lang));
    setText('#hepan-pay-old-price', pick(HEPAN_TEXT.payOldPrice, lang));
    setText('#hepan-pay-now-price', pick(HEPAN_TEXT.payNowPrice, lang));
    setText('#hepan-pay-footnote', pick(HEPAN_TEXT.payFootnote, lang));
    setText('#pay-card .pay-card-title', pick(HEPAN_TEXT.payTitle, lang));
    setHTML('#pay-card .pay-card-sub', pick(HEPAN_TEXT.paySubHtml, lang));
    setFeatureList('#pay-card .pay-features span', pick(HEPAN_TEXT.payFeatures, lang));
    setText('#pay-card .pay-marketing-copy', pick(HEPAN_TEXT.marketingCopy, lang));
    setText('#hepan-content .mk-card-title', pick(HEPAN_TEXT.resultTitle, lang));
    const loadingEl = document.getElementById('hepan-loading');
    if (loadingEl && loadingEl.style.display !== 'none') {
      loadingEl.innerHTML = pick(HEPAN_TEXT.loadingHtml, lang);
    }
  }

  function applyResult(lang) {
    if (pageName() !== 'result.html') return;
    setText('#result-birth-title', pick(RESULT_TEXT.birthInfo, lang));
    setText('#result-pillars-title', pick(RESULT_TEXT.pillarsTitle, lang));
    setText('#bazi-detail-title', pick(RESULT_TEXT.chartTitle, lang));
    setText('#result-analysis-title', pick(RESULT_TEXT.analysisTitle, lang));
    setText('.back-link', pick(RESULT_TEXT.backLink, lang));
    setText('#paid-btn', pick(RESULT_TEXT.paidBtn, lang));
    setText('#pay-btn', pick(RESULT_TEXT.payBtn, lang));
    setText('#paypal-pay-btn', pick(RESULT_TEXT.paypalBtn, lang));
  }

  function applyLanguage(lang) {
    const normalized = LANGS.includes(lang) ? lang : 'zh-Hans';
    localStorage.setItem(STORAGE_KEY, normalized);

    document.documentElement.setAttribute(
      'lang',
      normalized === 'en' ? 'en' : (normalized === 'zh-Hant' ? 'zh-Hant' : 'zh-CN'),
    );

    const currentPage = pageName();
    const title = TITLES[currentPage] ? pick(TITLES[currentPage], normalized) : '';
    if (title) document.title = title;

    applyCommon(normalized);
    applyIndex(normalized);
    applyHepan(normalized);
    applyResult(normalized);
  }

  function boot() {
    const select = ensureLangSelect();
    if (!select) return;

    const saved = localStorage.getItem(STORAGE_KEY) || 'zh-Hans';
    select.value = LANGS.includes(saved) ? saved : 'zh-Hans';
    applyLanguage(select.value);
    select.addEventListener('change', () => applyLanguage(select.value));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
