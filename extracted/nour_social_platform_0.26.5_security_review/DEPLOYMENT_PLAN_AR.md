# خطة نشر نُور ثم إنشاء APK

هذه الحزمة تجهّز ملفات وإرشادات النشر؛ لا تنشئ حسابات استضافة أو تنشر المشروع تلقائيًا. يلزم تسجيل الدخول إلى مزود الاستضافة وإضافة الأسرار يدويًا.

## البنية المقترحة

1. **الواجهة:** Vercel (Next.js) من مجلد `apps/web` مع Root Directory على جذر المستودع/إعداد monorepo حسب إعداد Vercel.
2. **API:** خدمة Node على Render أو Railway من جذر المستودع.
3. **قاعدة البيانات:** PostgreSQL مُدارة من مزود الاستضافة.
4. **التخزين المؤقت:** Redis مُدار إذا كانت المزايا المستخدمة تتطلبه.
5. **الصور والفيديو:** مخزن متوافق مع S3 (مثل S3 أو R2)؛ لا تستخدم MinIO المحلي في الإنتاج.
6. **APK:** GitHub Actions يبني غلاف Capacitor ويحمّل موقع HTTPS المنشور.

## متغيرات الإنتاج الأساسية

### واجهة الويب (Vercel)
- `NEXT_PUBLIC_API_URL=https://YOUR-API-HOST/api`

هذا المتغير يُدمج في الواجهة وقت البناء، لذلك أعد نشر الواجهة بعد تغييره.

### API (Render/Railway)
- `DATABASE_URL` — رابط PostgreSQL المُدار.
- `WEB_ORIGIN=https://YOUR-VERCEL-DOMAIN` — أصل الواجهة فقط، دون مسار.
- `API_PORT` — استخدم متغير `PORT` الذي يوفره مزود الاستضافة أو اربط `API_PORT` به.
- `S3_ENDPOINT` — عنوان مخزن S3.
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — لإرسال رسائل تأكيد البريد واستعادة كلمة المرور.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` عند تفعيل Web Push.
- `ADMIN_USERNAMES` — أسماء مسؤولي الإشراف.

في النسخة 0.26.5 يبدأ API في وضع الإنتاج بفشل واضح إذا غاب `WEB_ORIGIN` أو إعداد SMTP أو بيانات مخزن S3، ويرفض `CORS_REFLECT=1` وعنوان S3 غير المشفر. اضبط هذه المتغيرات قبل التشغيل؛ لا تستخدم القيم المحلية الموجودة في `.env.example`.

لا ترفع قيم الأسرار إلى GitHub ولا تستخدم كلمات المرور المحلية الافتراضية في الإنتاج. لا تجعل `S3_PUBLIC_BASE` رابطًا عامًا لوسائط خاصة.

## نشر API

من جذر المستودع:
- Build command: `corepack enable && corepack prepare pnpm@10.12.1 --activate && pnpm install --no-frozen-lockfile && pnpm --filter @nour/api prisma:generate && pnpm --filter @nour/api build`
- Start command: `pnpm --filter @nour/api start`

قبل استقبال المستخدمين، شغّل ترحيلات قاعدة البيانات بطريقة مقصودة. المشروع الحالي يوفّر `prisma:push` وليس سجل migrations متكاملًا؛ راجع تغييرات المخطط وخذ نسخة احتياطية قبل تنفيذ `prisma db push` على قاعدة بيانات إنتاج.

**تنبيه:** افحص دعم `PORT` في خدمة API. الكود الحالي يستمع إلى `API_PORT` (الافتراضي 4000)، لذا اضبط `API_PORT` على قيمة `PORT` التي يوفرها المزود أو عدّل الكود لاستخدام `process.env.PORT ?? process.env.API_PORT ?? 4000` قبل النشر.

## نشر الواجهة

- Root directory: `apps/web` إذا كان مزود الاستضافة يدعم إعدادات monorepo بشكل صحيح، وإلا اترك الجذر واضبط أوامر التثبيت والبناء لتستخدم pnpm workspace.
- Build command من جذر المستودع: `pnpm install --no-frozen-lockfile && pnpm --filter @nour/web build`
- Output: Next.js server deployment (لا تستخدم static export للإنتاج؛ المسارات الديناميكية تتطلب Next.js runtime).
- اضبط `NEXT_PUBLIC_API_URL` قبل البناء.

## التحقق بعد النشر

1. افتح `https://YOUR-API-HOST/api/health` وتأكد من استجابة `status: ok`.
2. افتح الواجهة وتأكد أن طلبات API تشير إلى مضيف API الصحيح.
3. اختبر التسجيل وتسجيل الدخول وتأكيد البريد، ثم رفع صورة باستخدام مخزن S3.
4. تأكد من أن `WEB_ORIGIN` يطابق نطاق الواجهة الفعلي، وأن SMTP والتخزين مضبوطين.
5. لا تستخدم بيانات حقيقية قبل اجتياز اختبارات الأمان والخصوصية.

## إنشاء APK بعد النشر

1. ارفع المشروع إلى GitHub.
2. افتح Actions ثم `Build Android APK` ثم `Run workflow`.
3. أدخل رابط الواجهة المنشورة بصيغة HTTPS، مثل `https://your-app.vercel.app`.
4. بعد نجاح Workflow افتح Artifacts ونزّل `nour-social-platform-debug-apk`.
5. ثبّت APK على هاتف تجريبي واختبر الاتصال بالـ API وتسجيل الدخول والتنقل.

الـ APK الحالي غلاف Capacitor يحمل واجهة الويب المنشورة؛ لا يضم الخادم أو PostgreSQL داخل الهاتف. يلزم إبقاء الواجهة وAPI وقاعدة البيانات متاحة على الإنترنت.
