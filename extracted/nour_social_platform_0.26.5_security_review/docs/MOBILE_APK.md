# بناء تطبيق أندرويد (APK) — نُور

التقنية: **Capacitor 7** + **Next.js 15** + **NestJS** (TypeScript حديث).

التطبيق الأصلي غلاف WebView يعمل كتطبيق أندرويد حقيقي، ويتصل بـ API على السيرفر.

## المتطلبات على جهازك

- Node.js 22+
- pnpm 10+
- Android Studio (مع Android SDK 34+)
- JDK 17 أو 21
- متغير `ANDROID_HOME` مضبوط

## 1) إعداد البيئة

```bash
cp .env.example .env
# مهم للموبايل:
# NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
# WEB_ORIGIN=https://app.your-domain.com,https://localhost,capacitor://localhost
# COOKIE_SAMESITE=none
# COOKIE_SECURE=1
# CAPACITOR_SERVER_URL=https://app.your-domain.com   # مُفضّل
```

> **موصى به:** انشر الواجهة على HTTPS وضع `CAPACITOR_SERVER_URL` على نفس العنوان.
> هكذا المسارات الديناميكية مثل `/u/username` تعمل بدون static export.

## 2) تثبيت الاعتماديات

```bash
pnpm install
pnpm exec cap --version   # بعد إضافة الحزم
```

## 3) بناء الواجهة ومزامنة Capacitor

### أ) وضع السيرفر الحي (موصى به للإنتاج)

```bash
export CAPACITOR_SERVER_URL=https://app.your-domain.com
# أنشئ مجلد out فارغ لو مش موجود (Capacitor يتطلب webDir)
mkdir -p apps/web/out && echo '<html><body>Nūr</body></html>' > apps/web/out/index.html
pnpm exec cap add android   # مرة واحدة فقط
pnpm exec cap sync android
pnpm exec cap open android
```

### ب) وضع الحزمة الثابتة (تجريبي / بدون سيرفر ويب)

```bash
MOBILE_BUILD=1 pnpm --filter @nour/web build
pnpm exec cap sync android
pnpm exec cap open android
```

ملاحظة: التصدير الثابت لا يولد كل صفحات `/u/[username]` مسبقًا؛ الوضع الحي أفضل للشبكات الاجتماعية.

## 4) توليد APK من Android Studio

1. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
2. أو من الطرفية:

```bash
cd android
./gradlew assembleDebug          # APK تجريبي
./gradlew assembleRelease        # يحتاج signing config
```

الملف يظهر في:
`android/app/build/outputs/apk/debug/app-debug.apk`

## 5) توقيع نسخة الإصدار (Release)

أنشئ keystore:

```bash
keytool -genkey -v -keystore nour-release.keystore -alias nour -keyalg RSA -keysize 2048 -validity 10000
```

أضف في `android/app/build.gradle` قسم `signingConfigs` ثم اربط `release` به.

## 6) صلاحيات أندرويد

الملف `android/app/src/main/AndroidManifest.xml` يجب أن يتضمن على الأقل:

- `INTERNET`
- `ACCESS_NETWORK_STATE`
- (اختياري) `POST_NOTIFICATIONS` للإشعارات على Android 13+
- (اختياري) `CAMERA` / `READ_MEDIA_IMAGES` لرفع الوسائط من الجهاز

## 7) المصادقة على الموبايل

- تسجيل الدخول/التسجيل يعيد `token` في JSON.
- التطبيق يخزنه محليًا ويرسل `Authorization: Bearer …`.
- الويب ما زال يستخدم كوكي `nour_session`.

## أوامر سريعة من جذر المشروع

```bash
pnpm mobile:sync      # بناء + مزامنة
pnpm mobile:open      # فتح Android Studio
pnpm mobile:apk       # assembleDebug إن وُجد android/
```

## حدود معروفة

- الـ APK غلاف للتطبيق الويب وليس إعادة كتابة React Native.
- الإشعارات الأصلية تحتاج إعداد Firebase (FCM) لاحقًا مع `@capacitor/push-notifications`.
- لا تنشر على Google Play قبل اختبار حساب حقيقي + HTTPS + سياسات الخصوصية.
