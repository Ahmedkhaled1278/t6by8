# تشغيل نُور محليًا

## المتطلبات
- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

## الخطوات

```bash
# 1) انسخ البيئة
cp .env.example .env

# 2) شغّل قواعد البيانات والتخزين
docker compose up -d postgres redis minio

# 3) أنشئ bucket الوسائط (مرة واحدة)
# افتح http://localhost:9001 (minio / change-me-local-only)
# وأنشئ bucket اسمه: nour-media
# أو استخدم mc إن كان متوفرًا

# 4) ثبّت الاعتماديات
pnpm install

# 5) Prisma
pnpm --filter @nour/api prisma:generate
pnpm --filter @nour/api prisma:push

# 6) شغّل التطوير
pnpm dev
```

- الموقع: http://localhost:3000  
- API صحة: http://localhost:4000/api/health  

## مسارات مهمة
| المسار | الوظيفة |
|--------|---------|
| `/` | الصفحة الرئيسية |
| `/account` | تسجيل / دخول |
| `/feed` | التغذية + نشر + صور + خصوصية |
| `/u/[username]` | ملف شخصي + متابعة + حظر + رسالة + إبلاغ |
| `/messages` | الرسائل الخاصة |
| `/notifications` | الإشعارات |
| `/search` | البحث |
| `/stories` | القصص |

## ملاحظات
- رفع الصور والقصص يحتاج MinIO شغال وbucket `nour-media`.
- الإشعارات والقصص والبلاغات تحتاج `prisma db push` بعد سحب آخر نسخة.
- الرسائل حاليًا بدون Socket (تحديث عند إعادة فتح المحادثة).

## تطبيق أندرويد (APK)

راجع التفاصيل الكاملة في `docs/MOBILE_APK.md`.

```bash
pnpm install
# بعد نشر الموقع على HTTPS:
export CAPACITOR_SERVER_URL=https://app.your-domain.com
pnpm mobile:sync
pnpm mobile:open
# من Android Studio: Build APK
```
