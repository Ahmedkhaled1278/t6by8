const features = [
  { icon: "◫", title: "منشوراتك", description: "شارك أفكارك وصورك ولحظاتك، وتفاعل مع المحتوى اللي يهمك.", tone: "mint" },
  { icon: "◎", title: "مجتمعاتك", description: "كوّن مجموعات حول اهتماماتك، وابدأ نقاشات تجمع الناس." , tone: "sand"},
  { icon: "✉", title: "محادثاتك", description: "مراسلة فردية وجماعية ضمن مراحل البناء القادمة." , tone: "lavender"},
  { icon: "◉", title: "مساحتك الشخصية", description: "ملف شخصي يعبّر عنك، مع تحكم أوضح في حضورك ومحتواك." , tone: "blue"},
];

const principles = [
  ["01", "الخصوصية من البداية", "نخطط للصلاحيات وحماية الحسابات قبل فتح الخدمة للجمهور."],
  ["02", "تجربة عربية واضحة", "واجهة عربية كاملة واتجاه من اليمين لليسار على الموبايل والكمبيوتر."],
  ["03", "بناء تدريجي قابل للفحص", "كل مرحلة لها نطاق واختبارات واضحة، من غير ادعاء ميزات لم تكتمل."],
];

export default function Home() {
  return (
    <main id="page_home">
      <header id="section_home_header" className="topbar">
        <a id="link_home_brand" className="brand" href="#home" aria-label="نُور - الرئيسية">
          <span className="brand-mark">ن</span><span>نُور</span>
        </a>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <a id="link_home_nav_feed" href="/feed">المنشورات</a><a id="link_home_nav_features" href="#features">المميزات</a>
          <a id="link_home_nav_vision" href="#vision">رؤيتنا</a>
          <a id="link_home_nav_build" href="#build">مراحل البناء</a>
        </nav>
        <div className="header-actions"><a id="link_home_cta_feed" className="nav-cta" href="/feed">شوف المنشورات <span aria-hidden="true">←</span></a><a id="link_home_cta_account" className="nav-cta" href="/account">حسابك في نُور <span aria-hidden="true">←</span></a></div>
      </header>

      <section className="hero wrap" id="section_home_hero">
        <div className="hero-copy">
          <div className="status-pill"><span className="status-dot" /> مشروع قيد البناء — نبدأ بالأساس الصح</div>
          <h1>مساحة تجمعنا،<br /><span>ونُور يقرّبنا.</span></h1>
          <p className="hero-lead">نُور مشروع لمنصة اجتماعية عربية تجمع المنشورات والمجتمعات والمحادثات في تجربة واحدة. بنبنيها خطوة بخطوة، مع اهتمام بالخصوصية وسهولة الاستخدام.</p>
          <div className="hero-actions">
            <a id="link_home_hero_feed" className="btn btn-primary" href="/feed">افتح المنشورات <span aria-hidden="true">←</span></a>
            <a id="link_home_hero_vision" className="btn btn-quiet" href="#vision">اعرف رؤيتنا</a>
          </div>
          <div className="hero-footnote"><span className="tiny-shield">◇</span><span>واجهة تعريفية؛ جرّب موجز المنشورات أو افتح صفحة الحساب.</span></div>
        </div>

        <div className="visual-stage" aria-label="تصوّر بصري لواجهة نُور">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="floating-note note-top"><span className="note-symbol mint">✦</span><span><b>مساحة للأفكار</b><small>شارك اللي يهمك</small></span></div>
          <div className="app-window">
            <div className="app-window-head"><div className="window-dots"><i /><i /><i /></div><span>مساحة نُور</span><span className="window-menu">•••</span></div>
            <div className="app-welcome"><div className="welcome-mark">ن</div><div><b>أهلًا بيك في نُور</b><small>مكانك للمشاركة والتواصل</small></div></div>
            <div className="mock-story-row"><div className="story-circle add-story">＋</div><div className="story-circle story-a">م</div><div className="story-circle story-b">س</div><div className="story-circle story-c">ع</div><div className="story-circle story-d">ن</div></div>
            <div className="mock-post"><div className="mock-post-head"><span className="person-avatar">م</span><span><b>مساحة المجتمع</b><small>معاينة توضيحية</small></span><span className="mock-more">•••</span></div><div className="mock-post-title">كل بداية كبيرة بتبدأ بفكرة صغيرة.</div><div className="mock-art"><span className="mock-sun" /><span className="mock-mountain mountain-one" /><span className="mock-mountain mountain-two" /><span className="mock-art-text">حكايتك ليها مكان</span></div><div className="mock-reactions"><span>♡ إعجاب</span><span>◯ تعليق</span><span>↗ مشاركة</span></div></div>
            <div className="mock-bottom"><span>⌂ <small>الرئيسية</small></span><span>◎ <small>المجتمعات</small></span><span>＋ <small>مشاركة</small></span><span>◉ <small>حسابي</small></span></div>
          </div>
          <div className="floating-note note-bottom"><span className="note-symbol gold">♡</span><span><b>قريبين من بعض</b><small>مجتمع بروح طيبة</small></span><span className="online-indicator" /></div>
        </div>
      </section>

      <section id="section_home_values" className="value-strip"><div className="wrap value-inner"><span><i>✦</i> تجربة عربية</span><span><i>◇</i> خصوصية أولًا</span><span><i>⌁</i> مجتمع متنوع</span><span><i>♡</i> تواصل باحترام</span></div></section>

      <section className="section wrap" id="features" data-nour-id="section_home_features">
        <div className="section-heading"><div><span className="section-kicker">مكونات نُور</span><h2>كل مساحة ليها دور،<br /><em>وكلها بتجمعنا.</em></h2></div><p>بنأسّس منصة قابلة للتوسع بدل ما نكدّس ميزات فوق بعض. دي المكونات الأساسية اللي هنبنيها ونختبرها على مراحل.</p></div>
        <div id="list_home_features" className="feature-grid">{features.map((feature, index) => <article id={`card_home_feature_${index + 1}`} data-feature-id={feature.title} className="feature-card" key={feature.title}><div className={`feature-icon ${feature.tone}`}>{feature.icon}</div><span className="feature-index">0{index + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p><span className="card-arrow" aria-hidden="true">↙</span></article>)}</div>
      </section>

      <section className="vision-section" id="vision" data-nour-id="section_home_vision"><div className="wrap vision-inner"><div className="vision-emblem"><div className="emblem-ring ring-a" /><div className="emblem-ring ring-b" /><div className="emblem-core">نُور<span>✦</span></div></div><div className="vision-copy"><span className="section-kicker light-kicker">الفكرة وراء الاسم</span><h2>مش مجرد تطبيق.<br />دي مساحة <em>تجمعنا.</em></h2><p>هدف نُور إن التواصل يبقى أسهل وأقرب، وإن الناس تلاقي مكان تشارك فيه اهتماماتها وتبني مجتمعاتها. الطريق طويل، عشان كده هنعلن بوضوح إيه اللي اكتمل وإيه اللي لسه بيتبني.</p><a id="link_home_vision_build" href="#build" className="vision-link">شوف مراحل البناء <span aria-hidden="true">←</span></a></div></div></section>

      <section className="section wrap build-section" id="build" data-nour-id="section_home_build"><div className="section-heading build-heading"><div><span className="section-kicker">خطة التنفيذ</span><h2>نبنيها صح،<br /><em>مرحلة ورا مرحلة.</em></h2></div><p>الواجهة دي بداية مرئية فقط. دي خريطة العمل المتفق عليها عشان نتحول من أساس برمجي إلى خدمة حقيقية.</p></div><div id="list_home_principles" className="principle-list">{principles.map(([number, title, description]) => <article id={`card_home_principle_${number}`} className="principle" key={number}><span className="principle-number">{number}</span><div><h3>{title}</h3><p>{description}</p></div><span className="principle-mark">↙</span></article>)}</div><div className="build-notice"><span className="notice-icon">i</span><p><b>حالة المشروع:</b> الهيكل البرمجي وقاعدة البيانات مبدئيان. تسجيل الحسابات، نشر المحتوى، المراسلة الحقيقية، واختبارات الأمان تحتاج تنفيذًا وربطًا واختبارًا قبل اعتبار الموقع جاهزًا.</p></div></section>

      <footer id="section_home_footer" className="footer"><div className="wrap footer-inner"><a id="link_home_footer_brand" className="brand footer-brand" href="#home"><span className="brand-mark">ن</span><span>نُور</span></a><span className="footer-tagline">مساحة تجمعنا.</span><span className="footer-status">نسخة تأسيسية · 2026</span></div></footer>
    </main>
  );
}
